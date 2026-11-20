// ─────────────────────────────────────────────────────────────────────────────
//  Head livery. On a living fish the pattern of the trunk does not simply run on
//  over the face: spots shrink and crowd, labyrinths tighten, and the head wears
//  marks of its own that are tied to its anatomy – lines radiating from the eye,
//  a tear stripe, an "ear" on the gill cover, painted lips, a dark skull cap, a
//  flushed throat. They are registered here on the finished skull of the genome
//  (the same cranial anatomy the engine sculpts), so they sit where bones do.
//  The livery draws on its own random stream: adding it never changes the body,
//  the fins or the name of a specimen.
// ─────────────────────────────────────────────────────────────────────────────
import { BodyModel } from '../engine/model';
import { headAnatomy, type SH } from '../engine/head';
import type { Layer, Species } from '../engine/types';
import type { Strategy } from './pigment';
import { chance, clamp, hashSeed, hsl, irange, isHex, lerp, makeRng, mix, pick, r4, range, toHsl, tone } from './util';
const SIGNAL = new Set<Strategy>(['reef', 'neon', 'jewel', 'streamDisplay', 'pelagicBold']);
const SILVER = new Set<Strategy>(['silver', 'deepSilver']);
const DEEP = new Set<Strategy>(['deepBlack', 'deepRed', 'ghost']);
/** pigment fields that would otherwise blanket head and trunk alike */
const WIDE = new Set<Layer['k']>(['vermic', 'mottle', 'reticulate', 'spots', 'flow', 'lattice', 'blotch']);
export function headLivery(sp: Species, strategy: Strategy, seed: number): { sp: Species; motifs: string[] } {
  const none = { sp, motifs: [] as string[] };
  if (DEEP.has(strategy) || sp.plan !== 'fish') return none;
  const model = new BodyModel(sp, 2);
  const A = headAnatomy(model, seed);
  if (!A || !A.eye) return none;
  const r = makeRng(hashSeed('head-livery', seed, strategy));
  const E = A.eye, C = A.cover, hl = sp.HL, u = clamp(hl / 0.25, 0.6, 1.8), c = sp.color;
  const signal = SIGNAL.has(strategy), silver = SILVER.has(strategy);
  const jawed = model.hasJaw();
  let layers: Layer[] = [...(c.layers ?? [])];
  const motifs: string[] = [];
  const flat = (pts: SH[]) => pts.flatMap(([s, h]) => [r4(s), r4(h)]);
  const add = (name: string, ...ls: Layer[]) => { layers.push(...ls); motifs.push(name); };
  // ── palette: the accent already used on the body, plus darks, pales and a structural blue ──
  const hexes = layers.map((l) => (l as { c?: string }).c).filter(isHex);
  const vivid = hexes.map((x) => ({ x, q: toHsl(x) })).filter(({ q }) => q[2] > 0.28 && q[2] < 0.8).sort((a, b) => b.q[1] - a.q[1])[0];
  const acc = vivid && vivid.q[1] > 0.35 ? vivid.x : hsl(toHsl(c.side)[0] + pick(r, [150, 180, 210]), 0.8, 0.55);
  const dark = mix(c.top, '#0a0d10', 0.74), pale = mix(c.belly, '#fbf7ec', 0.62);
  const electric = pick(r, ['#3ad0ff', '#5ab8ff', '#28e0d0', '#9a7aff', '#ffe14a']);
  const warm = pick(r, ['#f08a2a', '#e8502a', '#f0c832', '#e84a6a']);
  // ── the trunk pattern stops at the shoulder; the head gets a finer edition of it ──
  const headPat: Layer[] = [];
  layers = layers.map((l) => {
    if (!WIDE.has(l.k) || (l.k === 'spots' && l.n < 16)) return l;
    const q = l as Layer & { s0?: number };
    if ((q.s0 ?? 0) > 0.7 * hl || !chance(r, signal ? 0.75 : silver ? 0.6 : 0.45)) return l;
    const t0 = r4(hl * range(r, 0.94, 1.02));
    if (chance(r, 0.7)) {
      if (l.k === 'spots') headPat.push({ ...l, n: Math.max(6, Math.round(l.n * hl * 2.2)), r: r4(l.r * 0.55), s0: 0.012, s1: r4(hl * 0.95), seed: (l.seed ?? 0) + 7 });
      else if (l.k === 'vermic' || l.k === 'mottle') headPat.push({ ...l, sc: r4(l.sc * 0.58), s0: undefined, s1: r4(hl * 0.96), seed: (l.seed ?? 0) + 5 });
    }
    if (l.k === 'spots') return { ...l, n: Math.max(4, Math.round((l.n * (1 - t0)) / (1 - (l.s0 ?? 0.02)))), s0: t0 };
    return { ...q, s0: t0 } as Layer;
  });
  if (headPat.length) { layers.push(...headPat); motifs.push('finer pattern on the head'); }
  const hasEyeband = layers.some((l) => l.k === 'eyeband');
  // ── ornaments, each tied to a landmark of the skull ──
  /** lines radiating from the orbit over cheek and gill cover, and forward over the snout (wrasses, angelfishes) */
  const faceLines = () => {
    const n = irange(r, 3, 5), col = pick(r, [electric, electric, pale, dark]), w = r4(range(r, 0.2, 0.32) * E.r);
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      const a = lerp(-22, 78, (i + 0.5) / n) + range(r, -5, 5), reach = Math.min(A.clear(a), 3.3 * E.r);
      if (reach < 1.9 * E.r) continue;
      const bend = range(r, -10, 10);
      const pts: SH[] = [A.polar(1.28 * E.r, a), A.polar(lerp(1.28 * E.r, reach, 0.5), a + bend * 0.5), A.polar(reach * 0.96, a + bend)];
      if (C && a < 60) pts.push(C.op(range(r, 0.45, 0.85), clamp(0.12 + ((a + 22) / 100) * 0.6, 0.08, 0.7)));
      layers.push({ k: 'line', p: flat(pts), w, c: col, a: 0.92, taper: 0.35, soft: 0.0012 });
      drawn++;
    }
    for (const a0 of [168, 205]) {
      const a = a0 + range(r, -8, 8), reach = Math.min(A.clear(a) * 0.92, 3 * E.r);
      if (reach > 1.8 * E.r) { layers.push({ k: 'line', p: flat([A.polar(1.28 * E.r, a), A.polar(reach, a + range(r, -8, 8))]), w: r4(w * 0.9), c: col, a: 0.9, taper: 0.3, soft: 0.0012 }); drawn++; }
    }
    if (drawn) motifs.push('lines radiating from the eye');
    return drawn > 0;
  };
  const maze = () => add('facial labyrinth', { k: 'vermic', c: pick(r, [acc, electric, dark]), sc: r4(range(r, 0.011, 0.017) * u), w: range(r, 0.06, 0.09), a: 0.85, s1: r4(hl * 0.96), h0: 0.02, h1: 0.98, seed: 3 });
  const cheekSpots = (col: string, big: boolean) => add(big ? 'spotted gill cover' : 'freckled cheeks', {
    k: 'spots', n: big ? irange(r, 5, 12) : irange(r, 12, 34), r: r4((big ? range(r, 0.006, 0.009) : range(r, 0.0032, 0.0056)) * u), c: col,
    s0: r4(E.s + 1.3 * E.r), s1: r4(hl * 0.95), h0: r4(Math.max(0.05, E.h - 0.06)), h1: 0.78, irr: 0.4, even: 0.85, a: 0.82, seed: 11,
    ...(big && chance(r, 0.5) ? { ring: pale, rw: 1.5 } : {}),
  });
  /** dark blotch with a bright margin on the upper gill cover (sunfishes, cichlids) */
  const earSpot = () => {
    const p = C!.op(range(r, 0.7, 0.82), range(r, 0.16, 0.3));
    add('opercular ear spot', { k: 'spots', n: 1, r: r4(range(r, 0.085, 0.13) * hl), c: dark, ring: pick(r, [pale, electric, warm]), rw: range(r, 1.25, 1.4), s0: r4(p[0]), s1: r4(p[0]), h0: r4(p[1]), h1: r4(p[1]), rv: 0, irr: 0.25 });
  };
  /** dark streak running down from the eye toward the angle of the jaw */
  const tear = () => {
    const reach = Math.min(A.clear(100), 3.3 * E.r);
    if (reach < 1.9 * E.r) return false;
    add('tear stripe', { k: 'line', p: flat([A.polar(1.12 * E.r, 92), A.polar(lerp(1.12 * E.r, reach, 0.5), 98), A.polar(reach * 0.95, 104)]), w: r4(range(r, 0.34, 0.5) * E.r), c: dark, a: 0.85, taper: 0.45, soft: 0.0015 });
    return true;
  };
  /** horizontal dark stripe from the snout through the eye onto the gill cover: hides the eye */
  const eyeStripe = () => {
    const w = r4(range(r, 0.55, 0.75) * E.r), back = Math.min(A.clear(4), 3.2 * E.r), fwd = Math.min(A.clear(183) * 0.94, 3.2 * E.r);
    const ls: Layer[] = [];
    if (fwd > 1.5 * E.r) ls.push({ k: 'line', p: flat([A.polar(fwd, 184), A.polar(1.04 * E.r, 181)]), w, c: dark, a: 0.72, soft: 0.002 });
    if (back > 1.5 * E.r) {
      const pts: SH[] = [A.polar(1.04 * E.r, 1), A.polar(back * 0.95, 4)];
      if (C) pts.push(C.op(0.5, clamp((E.h - C.g.h0) / (C.g.h1 - C.g.h0), 0.06, 0.6)));
      ls.push({ k: 'line', p: flat(pts), w, c: dark, a: 0.72, taper: 0.3, soft: 0.002 });
    }
    if (ls.length) add('dark eye stripe', ...ls);
    return ls.length > 0;
  };
  const lips = (col: string) => {
    const a = Math.max(model.sSym, 0.003), b = model.rictus.s, pts: SH[] = [];
    for (let j = 0; j <= 8; j++) { const s = lerp(a, b, j / 8); pts.push([s, model.seamPhi(s) / Math.PI]); }
    // Lip pigment lives ON the lip fold: the band is as wide as the fold itself (see mouth.ts) and dies out before
    // the corner of the mouth. Sharks have no lips, and a thin-lipped predator never wears a painted muzzle – the
    // old band (up to 2.2 % SL of near-black at 85 %) read as a black mask smeared around the jaws.
    const fleshy = clamp(sp.mouth.lip, 0, 1);
    if (sp.skin.kind === 'placoid' || fleshy < 0.2) return;
    const dusky = col === dark;
    const tint = dusky ? mix(dark, mix(c.side, '#b86a5e', 0.35), 0.55) : col;
    add(dusky ? 'dusky lips' : 'painted lips', { k: 'line', p: flat(pts), w: r4(clamp(sp.mouth.gape * (0.05 + 0.16 * fleshy), 0.0016, 0.0062)), c: tint, a: dusky ? 0.42 : 0.6 + 0.2 * fleshy, taper: 0.6, soft: 0.0012 });
  };
  const throat = (col: string, name: string) => add(name, { k: 'grad', c: col, s0: -0.05, s1: r4(hl * 0.86), h0: r4(range(r, 0.76, 0.84)), h1: 1.05, soft: 0.035, a: range(r, 0.55, 0.85) });
  /** bright ring around the orbit */
  const spectacle = () => {
    const k = clamp(model.halfPerim(clamp(E.s, 0.01, 0.9)) / model.halfPerim(0.4), 0.48, 1.12);
    add('ringed eye', { k: 'spots', n: 1, r: r4((1.24 * E.r) / k), c: '#000000', ring: pick(r, [electric, pale, '#ffd84a']), rw: range(r, 1.22, 1.36), hole: true, rv: 0, irr: 0.1, s0: r4(E.s), s1: r4(E.s), h0: r4(E.h), h1: r4(E.h) });
  };
  const margin = () => add('edged gill cover', { k: 'line', p: flat([0.1, 0.3, 0.5, 0.68].map((v) => C!.op(0.9, v))), w: r4(0.035 * hl), c: pick(r, [acc, electric, warm, dark]), a: 0.8, soft: 0.003 });
  const cap = () => add('dark skull cap', { k: 'grad', c: mix(c.top, '#0a1014', 0.5), s0: -0.05, s1: r4(hl * 0.9), h0: -0.05, h1: r4(Math.max(0.06, E.h - range(r, 0.02, 0.07))), soft: 0.03, a: range(r, 0.5, 0.75) });
  const blaze = () => add('forehead blaze', { k: 'grad', c: pick(r, [pale, acc, electric]), s0: -0.05, s1: r4(E.s + E.r), h0: -0.05, h1: 0.07, soft: 0.02, a: 0.85 });
  const crownBars = () => add('banded crown', { k: 'bars', at: [E.s - 1.4 * E.r, E.s + 0.2 * E.r, E.s + 2 * E.r].filter((s) => s > 0.01).map(r4), w: r4(0.5 * E.r), c: dark, h0: 0, h1: r4(Math.max(0.05, E.h - 0.04)), a: 0.55, rough: 0.002, taper: 0.2 });
  if (silver) {
    // open-water mirrors: a dark roof, gilded or spotted gill covers, little else
    if (chance(r, 0.7)) cap();
    if (chance(r, 0.55)) add('gilded cheeks', { k: 'grad', c: pick(r, ['#c9a24a', '#b9a878', '#d8b060', '#a8b4a0']), s0: r4(E.s - E.r), s1: r4(hl * 0.97), h0: r4(E.h - 0.02), h1: 0.8, soft: 0.04, a: range(r, 0.28, 0.45) });
    if (chance(r, 0.4)) add('dusky snout', { k: 'grad', c: mix(dark, c.top, 0.35), s0: -0.05, s1: r4(Math.max(0.02, 0.4 * (E.s - E.r))), h0: -0.05, h1: r4(Math.min(0.62, E.h + 0.12)), soft: 0.03, a: 0.3 });
    if (chance(r, 0.5)) cheekSpots(dark, true);
    if (C && chance(r, 0.3)) earSpot();
    if (!hasEyeband && chance(r, 0.2)) eyeStripe();
  } else if (signal) {
    // signalling liveries: the face is the billboard
    if (chance(r, 0.65)) add('tinted head', { k: 'grad', c: tone(c.side, { h: range(r, -28, 28), s: range(r, 1.05, 1.4), l: range(r, -0.12, 0.05) }), s0: -0.05, s1: r4(hl * 0.92), h0: -0.05, h1: 1.05, soft: 0.05, a: range(r, 0.3, 0.55) });
    const style = pick(r, ['lines', 'lines', 'maze', 'spots', 'plain'] as const);
    let lined = false;
    if (style === 'lines') lined = faceLines();
    else if (style === 'maze' && !headPat.length) maze();
    else if (style === 'spots') cheekSpots(pick(r, [acc, dark, electric]), false);
    if (chance(r, 0.4)) spectacle();
    if (jawed && chance(r, 0.45)) lips(pick(r, [acc, electric, dark, pale, '#e86a4a']));
    if (C && chance(r, 0.35)) earSpot();
    if (C && chance(r, 0.25)) margin();
    if (chance(r, 0.3)) throat(pick(r, [warm, pale]), 'flushed throat');
    if (!hasEyeband && !lined && chance(r, 0.3)) tear();
    if (chance(r, 0.2)) blaze();
    if (motifs.length < 2 && !lined && !faceLines()) spectacle();
  } else {
    // camouflage: break up the outline of the head and hide the eye
    if (chance(r, 0.5)) add('tinted head', { k: 'grad', c: tone(c.side, { h: range(r, -18, 18), s: range(r, 0.95, 1.25), l: range(r, -0.1, 0.04) }), s0: -0.05, s1: r4(hl * 0.92), h0: -0.05, h1: 1.05, soft: 0.05, a: range(r, 0.3, 0.5) });
    if (chance(r, 0.5)) cap();
    if (!hasEyeband && chance(r, 0.45) && !(chance(r, 0.5) ? eyeStripe() : tear())) crownBars();
    if (chance(r, 0.45)) cheekSpots(dark, false);
    if (chance(r, 0.3)) crownBars();
    if (chance(r, 0.35)) throat(pale, 'pale throat');
    if (C && chance(r, 0.2)) earSpot();
    if (jawed && chance(r, 0.15)) lips(pick(r, [pale, dark]));
  }
  return motifs.length ? { sp: { ...sp, color: { ...c, layers } }, motifs } : none;
}
