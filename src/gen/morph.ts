//  Morphology operators: hybridise two genomes, re-proportion a silhouette,
//  mutate within natural variation. All operate on the engine's own Species
//  description, so the result is lofted by exactly the same anatomy code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ProfileSpec, Species } from '../engine/types';
import { compileProfile, measureOutline } from '../engine/profile';
import { isSuperior } from '../engine/model';
import { clamp, isHex, lerp, mix, r4, sstep, type Rnd } from './util';
export const clone = <T,>(x: T): T => (x === undefined ? x : (JSON.parse(JSON.stringify(x)) as T)); // painted genomes carry explicit `undefined` organs
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
/** resampling stations: dense at the snout (forehead shape) and at the peduncle */
export const STATIONS = [0.006, 0.014, 0.025, 0.04, 0.058, 0.08, 0.105, 0.135, 0.17, 0.21, 0.25, 0.3, 0.35, 0.41, 0.47, 0.53, 0.59, 0.65, 0.71, 0.77, 0.82, 0.87, 0.91, 0.945, 0.975, 1];
export function sampleProfile(p: ProfileSpec) {
  const o = compileProfile(p);
  return { d: STATIONS.map((s) => o.top(s)), v: STATIONS.map((s) => o.bot(s)) };
}
export function buildProfile(d: number[], v: number[], n: number): ProfileSpec {
  const dd: number[] = [], vv: number[] = [];
  STATIONS.forEach((s, i) => {
    dd.push(s, r4(Math.max(0.0008, d[i])));
    vv.push(s, r4(Math.max(0.0008, v[i])));
  });
  return { d: dd, v: vv, n: r4(clamp(n, 0.4, 1)) };
}
/** read the classical morphometrics back off the outline so fins, caudal joint and UI agree with it */
export function remeasure(sp: Species): Species {
  const p = sp.body.prof;
  if (!p || sp.body.disc) return sp;
  const m = measureOutline(compileProfile(p));
  sp.body = { ...sp.body, D: r4(m.D), df: r4(m.df), pD: r4(m.pD), pV: r4(m.pV), P: r4(Math.max(0.004, m.P)), pedY: r4(m.pedY), prof: { ...p, D: r4(m.D) } };
  return sp;
}
/** bake an individual's body.D / prof.D rescale into the outline itself */
function bake(sp: Species) {
  const p = sp.body.prof;
  if (!p) return;
  const k = p.D ? sp.body.D / p.D : 1;
  if (Math.abs(k - 1) < 1e-4) return;
  const sc = (a: number[]) => a.map((x, i) => (i % 2 ? x * k : x));
  sp.body.prof = { ...p, d: sc(p.d), v: sc(p.v), D: sp.body.D };
}
export interface Reshape {
  depth?: number; // overall depth factor
  ped?: number; // peduncle depth factor (tapers in from s≈0.6)
  hump?: number; // nuchal hump (fraction of D)
  belly?: number; // ventral fullness (fraction of D)
  back?: number; // dorsal arch shift (+ arches the back, − flattens it)
  n?: number; // snout exponent override (forehead bluntness)
}
/** re-proportion the silhouette; analytic bodies get the equivalent numeric change */
export function reshape(sp0: Species, o: Reshape): Species {
  const sp = clone(sp0);
  const depth = o.depth ?? 1, ped = o.ped ?? 1;
  if (sp.body.disc) return sp;
  if (!sp.body.prof) {
    sp.body.D = r4(clamp(sp.body.D * depth, 0.03, 1));
    sp.body.P = r4(clamp(sp.body.P * depth * ped, 0.008, sp.body.D * 0.8));
    return sp;
  }
  bake(sp);
  const p = sp.body.prof!;
  const { d, v } = sampleProfile(p);
  const D0 = Math.max(...d.map((y, i) => y + v[i]));
  for (let i = 0; i < STATIONS.length; i++) {
    const s = STATIONS[i];
    const pk = lerp(1, ped, sstep(0.6, 1, s));
    const front = sstep(0.0, 0.1, s); // never inflate the snout tip itself
    d[i] *= depth * pk;
    v[i] *= depth * pk;
    if (o.hump) d[i] += o.hump * D0 * Math.exp(-(((s - 0.27) / 0.12) ** 2)) * front;
    if (o.belly) v[i] += o.belly * D0 * Math.exp(-(((s - 0.43) / 0.17) ** 2)) * front;
    if (o.back) d[i] += o.back * D0 * Math.sin(Math.PI * clamp(s / 0.85)) * 0.5 * front * (1 - sstep(0.75, 1, s));
    d[i] = Math.max(0.001, d[i]);
    v[i] = Math.max(0.001, v[i]);
  }
  sp.body.prof = buildProfile(d, v, o.n ?? p.n ?? 0.62);
  return remeasure(sp);
}
// ── hybridisation ───────────────────────────────────────────────────────────
const INT_KEYS = new Set(['tn', 'rays', 'spines', 'n', 'scales', 'spots', 'cols', 'rows']);
const KEEP_KEYS = new Set(['layers', 'marks', 'at', 'bend', 'bumps', 'wbumps', 'd', 'v', 'dir', 'stops', 'p']);
function mixDeep(x: unknown, y: unknown, w: number, key: string): unknown {
  if (typeof x === 'number' && typeof y === 'number') {
    if (key === 'lenM') return r4(Math.exp(lerp(Math.log(Math.max(1e-3, x)), Math.log(Math.max(1e-3, y)), w)));
    const v = lerp(x, y, w);
    return INT_KEYS.has(key) ? Math.round(v) : r4(v);
  }
  if (isHex(x) && isHex(y)) return mix(x, y, w);
  if (Array.isArray(x) && Array.isArray(y)) {
    if (KEEP_KEYS.has(key)) return clone(x);
    if (x.length === y.length && x.every(isObj) && y.every(isObj)) return x.map((e, i) => mixDeep(e, y[i], w, key));
    if (x.length === y.length && x.every((e) => typeof e === 'number')) return x.map((e, i) => r4(lerp(e as number, y[i] as number, w)));
    return clone(x);
  }
  if (isObj(x) && isObj(y)) {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(x)) o[k] = k in y ? mixDeep(x[k], y[k], w, k) : clone(x[k]);
    return o;
  }
  return clone(x);
}
/** compatibility: same body plan, jaw construction and loft type */
export const compatKey = (s: Species) =>
  [s.plan, !!s.body.disc, !!s.cephalic, !!s.body.snout, s.rostrum?.kind ?? '-', s.mouth.kind ?? 'jaw', !!s.body.prof, !!s.body.bend, s.skin.kind === 'placoid'].join('|');
/**
 * Offspring of two genomes. The dominant parent (share ≥ 50 %) passes on every discrete character
 * (fin formula, caudal skeleton, jaw construction, appendages, pigment pattern); continuous characters
 * are interpolated — the silhouettes are resampled onto shared stations and blended point by point.
 */
export function blendSpecies(a: Species, b: Species, tB: number): Species {
  const dom = tB <= 0.5 ? a : b;
  const sub = dom === a ? b : a;
  const w = dom === a ? tB : 1 - tB;
  const out = mixDeep(dom, sub, w, '') as Species;
  const pa = dom.body.prof, pb = sub.body.prof;
  if (pa && pb && !dom.body.disc) {
    const A = clone(dom), B = clone(sub);
    bake(A); bake(B);
    const sa = sampleProfile(A.body.prof!), sb = sampleProfile(B.body.prof!);
    out.body.prof = buildProfile(sa.d.map((y, i) => lerp(y, sb.d[i], w)), sa.v.map((y, i) => lerp(y, sb.v[i], w)), lerp(pa.n ?? 0.62, pb.n ?? 0.62, w));
    remeasure(out);
  }
  out.mouth.sup = isSuperior(dom.mouth);
  return out;
}
/** natural variation of one individual (± a few percent on every measured proportion) */
export function mutate(sp0: Species, r: Rnd, amt: number, flexMouth = true): Species {
  const q = (p: number) => 1 + (r() * 2 - 1) * p * amt;
  let sp = reshape(sp0, { depth: q(0.07), ped: q(0.1), hump: (r() - 0.45) * 0.05 * amt, belly: (r() - 0.45) * 0.05 * amt });
  sp = clone(sp);
  sp.eye.d = r4(sp.eye.d * q(0.07));
  sp.HL = r4(clamp(sp.HL * q(0.03), 0.04, 0.5));
  const f = sp.fins;
  f.dorsal = f.dorsal?.map((d) => ({ ...d, h: r4(d.h * q(0.14)) }));
  f.anal = f.anal?.map((d) => ({ ...d, h: r4(d.h * q(0.14)) }));
  if (f.pec) f.pec = { ...f.pec, len: r4(f.pec.len * q(0.1)) };
  if (f.pel) f.pel = { ...f.pel, len: r4(f.pel.len * q(0.1)) };
  f.caudal = { ...f.caudal, span: r4(f.caudal.span * q(0.07)) };
  if (flexMouth && sp.mouth.gape > 0.004) sp.mouth = { ...sp.mouth, gape: r4(sp.mouth.gape * q(0.07)), angle: r4(sp.mouth.angle + (r() - 0.5) * 4 * amt), sup: isSuperior(sp.mouth) };
  sp.lenM = r4(sp.lenM * q(0.15));
  return sp;
}
