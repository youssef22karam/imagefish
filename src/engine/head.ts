// ─────────────────────────────────────────────────────────────────────────────
//  Cranial anatomy. A fish head is not a tapered piece of trunk: it is a skull
//  wrapped in thin skin. This module derives, from the morphometrics of one
//  species, where its dermal bones, sutures, nostrils, sensory canals and scale
//  fields lie – in the same skin coordinates every other part of the engine uses.
//  headmap.ts turns the result into relief, shading and integument classes;
//  BodyModel.headForm sculpts the matching brow, cheek and preopercular step.
// ─────────────────────────────────────────────────────────────────────────────
import type { BodyModel, GillOpening } from './model';
import { clamp, hashStr, lerp, rng, smooth } from './math';
const PI = Math.PI;
/** a point on the skin: station s (snout → tail), girth position h (0 dorsal midline … 1 ventral midline) */
export type SH = [number, number];
export interface HeadTraits {
  /** teleost: bony gill cover · soft: skin-covered head with a restricted opening (eels, puffers) · shark: naked slits */
  type: 'teleost' | 'soft' | 'shark';
  /** 0 naked head (salmon, carp, herring) · 1 scaled cheek, gill cover and nape (perch, wrasse) · 2 scaled to the lips (tangs, angelfishes) */
  scaly: 0 | 1 | 2;
  armor: number; // 0..1 sculptured dermal bone (gars, bowfin, bony-tongues, catfishes)
  serrate: number; // 0..1 serrated preopercle (spiny-rayed fishes)
  striae: number; // 0..1 radiating striae of the opercle
  pores: number; // prominence of the sensory canal pores
  branch: number; // branchiostegal rays
  tubercles: number; // 0..1 breeding tubercles (minnows, carps)
  ioW: number; // outer radius of the infraorbital ring / eye radius
  scaleK: number; // density of head scales relative to trunk scales
  silver: number; // guanine in the skin
}
export interface HeadCover {
  g: GillOpening;
  h: (v: number) => number; // girth position at v = 0 dorsal end … 1 isthmus
  sMar: (v: number) => number; // free hind margin
  sSeam: (v: number) => number; // anterior hinge line of the moving cover
  sPre: (v: number) => number; // free hind edge of the preopercle
  /** point on the opercular plates: u = 0 preopercle edge … 1 free margin */
  op: (u: number, v: number) => SH;
}
export interface HeadAnatomy {
  traits: HeadTraits;
  /** stations covered by the head map */
  s0: number; s1: number;
  /** lateral eye: centre (s, lateral height y, girth h) and radius. Null for blind fishes and flatfishes. */
  eye: { s: number; y: number; h: number; r: number } | null;
  /** free distance (SL) from the eye centre along a lateral bearing before the mouth or the outline is met */
  clear: (aDeg: number) => number;
  /** lateral-projection point (station, height) → skin */
  sh: (s: number, y: number) => SH;
  /** eye-centred lateral polar grid: 0° behind the eye · 90° below · 180° in front · 270° above */
  polar: (rho: number, aDeg: number) => SH;
  cover: HeadCover | null;
  preop: SH[]; // free hind margin of the preopercle, dorsal → ventral
  suture: SH[]; // opercle / subopercle
  inter: SH[]; // subopercle / interopercle
  striae: SH[][];
  rays: SH[][]; // branchiostegal rays
  nares: { s: number; h: number; r: number; rim: number }[];
  maxUp: SH[]; maxLo: SH[]; // maxilla: dorsal edge and lip edge
  dentary: SH[]; // mandibular / dentary bone contour along the lower jaw
  frontal: SH[][]; // paired supraorbital frontal ridges on the neurocranium roof
  cheekArc: SH[]; // adductor mandibulae cheek contour from lachrymal to preopercle
  canals: { p: SH; r: number }[]; // pores of the cephalic lateral-line canals (ampullae of Lorenzini on sharks)
  /** station where trunk skin (scales, epaxial muscle) begins at girth position h */
  nape: (h: number) => number;
}
/** Catmull-Rom through skin points */
export function spline(pts: SH[], seg = 8): SH[] {
  const n = pts.length, out: SH[] = [];
  if (n < 3) return pts.slice();
  const P = (i: number) => pts[clamp(i, 0, n - 1)];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}
/** Cranial character of a species, read from its integument, gill construction and lineage. */
export function headTraits(model: BodyModel, seed: number): HeadTraits | null {
  const sp = model.sp, k = sp.skin.kind, c = sp.color;
  if (sp.plan === 'ray' || sp.body.disc || model.bent || sp.mouth.kind === 'disc' || /Rays/.test(sp.group) || sp.HL < 0.06) return null;
  const is = (re: RegExp) => re.test(sp.group) || re.test(sp.id);
  const type = model.gills.some((q) => q.kind === 'opercle') ? 'teleost' : k === 'placoid' ? 'shark' : 'soft';
  const R = rng((seed ^ hashStr(sp.id)) + 0x51ed);
  const scaled = sp.skin.scales > 0 && (k === 'cycloid' || k === 'ctenoid');
  let scaly: 0 | 1 | 2 = 0;
  if (scaled && type === 'teleost') {
    if (is(/Reef fishes|tang|angelfish|butterfly|damsel|clown|surgeon|moorish|chromis|Labyrinth|Livebearers/)) scaly = 2;
    else if (k === 'ctenoid' || is(/Wrasses|Cichlids|Bony-tongues|Tarpons|Sunfishes|Groupers|Gobies|Predators|Jacks|Scorpion/)) scaly = 1;
  }
  const armor = (k === 'ganoid' ? 1 : k === 'bony' ? 0.8 : is(/Primitive/) ? 0.85 : is(/Bony-tongues/) ? 0.7 : is(/Catfishes|Scorpion/) ? 0.55 : is(/Tarpons/) ? 0.3 : k === 'warty' ? 0.3 : 0.07) * (0.85 + 0.3 * R());
  const striae = is(/Carps|Primitive/) ? 0.95 : is(/Herrings|Tarpons/) ? 0.7 : is(/Characins|Salmon/) ? 0.5 : is(/Cods|Catfishes/) ? 0.4 : scaly ? 0.16 : 0.42;
  return {
    type, scaly,
    armor: clamp(armor, 0, 1),
    serrate: type !== 'teleost' ? 0 : is(/Groupers|Sunfishes|Scorpion|Reef fishes/) ? 0.85 : k === 'ctenoid' ? 0.6 : 0,
    striae: striae * (0.8 + 0.4 * R()),
    pores: (is(/Deep sea/) ? 1.3 : is(/Cods|Eels/) ? 1.15 : is(/Gobies/) ? 0.95 : 0.75) * (0.85 + 0.3 * R()),
    branch: is(/Tarpons/) ? 13 : is(/Salmon/) ? 11 : is(/Herrings/) ? 8 : is(/Cods/) ? 7 : is(/Carps/) ? 3 : is(/Characins/) ? 4 : 6,
    tubercles: is(/Carps/) && R() < 0.55 ? 0.5 + 0.5 * R() : 0,
    ioW: is(/Scorpion/) ? 1.95 : is(/Catfishes|Eels/) ? 1.45 : 1.5 + 0.14 * R(),
    scaleK: scaly === 2 ? 2.1 : 1.6,
    silver: clamp((c.metal ?? 0.08) * 1.5 + (c.iri ?? 0) * 0.4, 0, 1),
  };
}
const CACHE = new WeakMap<BodyModel, HeadAnatomy | null>();
/** The cranial anatomy of one built fish (cached per body model). Null for batoids, lampreys and seahorses. */
export function headAnatomy(model: BodyModel, seed: number): HeadAnatomy | null {
  if (!CACHE.has(model)) CACHE.set(model, build(model, seed));
  return CACHE.get(model) ?? null;
}
function build(model: BodyModel, seed: number): HeadAnatomy | null {
  const T = headTraits(model, seed);
  if (!T) return null;
  const sp = model.sp, e = sp.eye, m = sp.mouth, hl = sp.HL;
  const R = rng(Math.imul(seed | 0, 0x9e3779b1) ^ hashStr(sp.id) ^ 0x7a31);
  const s0 = model.sMin < 0 ? -0.012 : 0;
  const s1 = clamp(hl * 1.15 + 0.012, 0.1, 0.92);
  const sC = (s: number) => clamp(s, 0.0025, 0.995);
  const sh = (s: number, y: number): SH => {
    const q = sC(s);
    return [q, model.phiRaw(q, clamp(y, -model.bot(q) * 0.985, model.top(q) * 0.985)) / PI];
  };
  const jawed = model.hasJaw();
  const seamH = (s: number) => model.seamPhi(s) / PI;
  // ── orbit ──────────────────────────────────────────────────────────────────
  const eye = e.d > 0 && sp.plan === 'fish' ? { s: e.s, y: model.normY(e.s, model.eyeYn), h: 0, r: e.d / 2 } : null;
  if (eye) eye.h = sh(eye.s, eye.y)[1];
  const mSide = eye && jawed && eye.y < model.mouthY(clamp(eye.s, model.sSym, model.rictus.s)) ? -1 : 1;
  const blocked = (s: number, y: number) => {
    if (s < 0.004 || s > s1 - 0.004) return true;
    if (y > model.top(s) * 0.9 || y < -model.bot(s) * 0.9) return true;
    return jawed && s >= model.sSym && s <= model.rictus.s + 0.003 && (y - model.mouthY(s)) * mSide < 0.0035;
  };
  const lat = (rho: number, aDeg: number): [number, number] => {
    const a = (aDeg * PI) / 180;
    return [eye!.s + rho * Math.cos(a), eye!.y - rho * Math.sin(a)];
  };
  const memo = new Map<number, number>();
  const clear = (aDeg: number) => {
    if (!eye) return 0;
    const key = Math.round(aDeg);
    let v = memo.get(key);
    if (v === undefined) {
      v = 3.4 * eye.r;
      for (let k = 12; k <= 42; k++) {
        const [s, y] = lat(k * 0.08 * eye.r, key);
        if (blocked(s, y)) { v = (k - 1) * 0.08 * eye.r; break; }
      }
      memo.set(key, v);
    }
    return v;
  };
  const polar = (rho: number, aDeg: number): SH => { const [s, y] = lat(rho, aDeg); return sh(s, y); };
  // ── gill cover: the preopercle, and behind it opercle, subopercle and interopercle ──
  const g = T.type === 'teleost' ? model.gills.find((q) => q.kind === 'opercle') ?? null : null;
  const cover: HeadCover | null = g ? (() => {
    const h = (v: number) => lerp(g.h0, g.h1, v);
    const sMar = (v: number) => g.edge(h(v)) + g.over * Math.sqrt(Math.max(0, Math.sin(PI * clamp(v))));
    const sSeam = (v: number) => g.edge(h(v)) - g.len(h(v));
    const sPre = (v: number) => model.preopS(g, h(v));
    const op = (u: number, v: number): SH => [sC(lerp(sPre(v), sMar(v), u)), h(v)];
    return { g, h, sMar, sSeam, sPre, op };
  })() : null;
  const uv = (q: [number, number][], seg = 8) => spline(q.map(([u, v]) => cover!.op(u, v)), seg);
  let preop: SH[] = [], suture: SH[] = [], inter: SH[] = [];
  const striae: SH[][] = [], rays: SH[][] = [];
  if (cover && g) {
    const ctl: SH[] = [];
    for (let k = 0; k <= 10; k++) { const v = lerp(0.05, 0.92, k / 10); ctl.push([sC(cover.sPre(v)), cover.h(v)]); }
    preop = spline(ctl, 6);
    // the subopercle is a sickle along the lower hind margin; the interopercle a strap under the preopercle
    suture = uv([[0.0, 0.64], [0.3, 0.7], [0.62, 0.685], [0.86, 0.6], [0.985, 0.5]]);
    inter = uv([[-0.04, 0.83], [0.4, 0.855], [0.8, 0.84], [0.98, 0.79]]);
    // striae radiate from the articulation with the hyomandibula toward the margin and the suture
    const hinge = [0.06, 0.14], tg: [number, number][] = [[0.9, 0.04], [0.97, 0.25], [0.97, 0.47], [0.84, 0.57], [0.6, 0.645], [0.3, 0.66]];
    const nS = Math.round(lerp(13, 22, R()));
    for (let i = 0; i < nS; i++) {
      const u = ((i + 0.5 + (R() - 0.5) * 0.5) / nS) * (tg.length - 1), k = Math.min(tg.length - 2, Math.floor(u)), t = u - k;
      const tf = lerp(tg[k][0], tg[k + 1][0], t), tv = lerp(tg[k][1], tg[k + 1][1], t);
      const a = 0.2 + 0.12 * R(), b = 0.84 + 0.13 * R();
      const pts: SH[] = [];
      for (let j = 0; j <= 6; j++) { const q = lerp(a, b, j / 6); pts.push(cover.op(lerp(hinge[0], tf, q), lerp(hinge[1], tv, q))); }
      striae.push(pts);
    }
    // branchiostegal rays run back under the gill cover from the hyoid bar
    const nB = Math.min(T.branch, 7);
    for (let i = 0; i < nB; i++) {
      const hh = lerp(cover.h(0.875), 0.972, nB > 1 ? i / (nB - 1) : 0.5);
      const vv = clamp((hh - g.h0) / (g.h1 - g.h0));
      const sA = cover.sPre(vv) + 0.004 + 0.003 * i, sB = cover.sMar(vv) - 0.003 - Math.max(0, hh - g.h1) * 0.5 * hl;
      if (sB - sA < 0.018) continue;
      const pts: SH[] = [];
      for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push([sC(lerp(sA, sB, t)), hh - 0.004 * Math.sin(PI * t)]); }
      rays.push(pts);
    }
  }
  // ── nostrils: two on each side in most bony fishes, the anterior one rimmed or tubular ──
  const nares: HeadAnatomy['nares'] = [];
  if (eye && T.type !== 'shark') {
    const rn = clamp(0.1 * eye.r, 0.0011, 0.003), snout = eye.s - eye.r;
    const put = (s: number, y: number, r: number, rim: number) => {
      if (s < 0.008) return;
      const yy = Math.min(y, model.top(s) * 0.72);
      if (blocked(s, yy - 2 * r * mSide)) return;
      const p = sh(s, yy);
      nares.push({ s: p[0], h: p[1], r, rim });
    };
    if (snout > 1.9 * eye.r) {
      put(eye.s - 1.62 * eye.r, eye.y + 0.34 * eye.r, rn * 1.1, 0.3);
      put(eye.s - Math.min(2.5 * eye.r, eye.r + 0.8 * snout), eye.y + 0.14 * eye.r, rn * 0.85, 1);
    } else if (snout > 0.5 * eye.r) put(eye.s - eye.r - 0.5 * snout, eye.y + 0.3 * eye.r, rn, 0.7);
  }
  // ── maxilla, dentary, frontal ridges & cheek contour ──────────────────────
  const maxUp: SH[] = [], maxLo: SH[] = [], dentary: SH[] = [], frontal: SH[][] = [], cheekArc: SH[] = [];
  if (jawed && m.gape >= 0.045 && model.wrap >= 0 && sp.skin.kind !== 'placoid' && m.lip < 0.75) {
    const mt = model.mouthTip, rc = model.rictus, len = rc.s - mt.s;
    for (let k = 0; k <= 36; k++) {
      const t = k / 36, s = lerp(mt.s + 0.1 * len, rc.s + 0.16 * len, t);
      const hc = seamH(Math.min(s, rc.s));
      const w = (0.003 + 0.17 * m.gape * Math.pow(t, 1.4)) * (1 - smooth(0.9, 1, t) * 0.85);
      maxUp.push([s, hc - w / model.halfPerim(sC(s))]);
      maxLo.push([s, hc]);
    }
  }
  if (jawed && T.type !== 'shark') {
    const mt = model.mouthTip, rc = model.rictus, len = rc.s - mt.s;
    if (len > 0.025) {
      for (let k = 0; k <= 24; k++) {
        const t = k / 24, s = lerp(Math.max(0.006, mt.s + 0.08 * len), model.hinge.s, t);
        const hc = seamH(Math.min(s, rc.s));
        dentary.push([sC(s), clamp(hc + (0.028 + 0.032 * Math.sin(PI * t)) * (1 - hc), hc + 0.015, 0.96)]);
      }
    }
  }
  if (eye && T.type === 'teleost') {
    // Paired supraorbital / frontal bone ridges on the dorsal skull roof
    const sF0 = Math.max(0.01, eye.s - 1.4 * eye.r), sF1 = Math.min(hl * 0.82, eye.s + 2.1 * eye.r);
    if (sF1 - sF0 > 0.03 && eye.h > 0.14) {
      const ridge1: SH[] = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16, s = lerp(sF0, sF1, t);
        const hCurve = clamp(eye.h * (0.42 + 0.24 * Math.sin(PI * t) + 0.12 * t), 0.04, Math.max(0.08, eye.h - 0.06));
        ridge1.push([sC(s), hCurve]);
      }
      frontal.push(ridge1);
    }
    // Adductor mandibulae cheek contour between the suborbital shelf and preopercle
    if (cover) {
      const cPts: SH[] = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14;
        const p0 = polar(lerp(1.45, 2.1, Math.sin(PI * t)) * eye.r, lerp(115, 18, t));
        const p1 = [sC(cover.sPre(lerp(0.58, 0.28, t)) - 0.02 * hl), cover.h(lerp(0.58, 0.28, t))] as SH;
        cPts.push([lerp(p0[0], p1[0], t * 0.65), lerp(p0[1], p1[1], t * 0.55)]);
      }
      cheekArc.push(...spline(cPts, 4));
    }
  }
  // ── cephalic lateral line: rows of pores over, under and behind the eye, down the preopercle, along the jaw ──
  const canals: HeadAnatomy['canals'] = [];
  const rp = clamp(0.0038 * hl * (0.6 + 0.5 * T.pores), 0.0006, 0.0015);
  const pore = (p: SH, k = 1) => canals.push({ p, r: rp * k * (0.85 + 0.3 * R()) });
  const sOcc = cover ? lerp(eye ? eye.s + 1.6 * eye.r : 0.5 * hl, cover.sMar(0), 0.55) : hl * 0.93;
  const nape = (h: number) => {
    if (!cover || !g) return hl * 0.95;
    if (h <= g.h0) return lerp(sOcc, cover.sMar(0) + 0.003, Math.pow(smooth(0, g.h0, h), 1.7));
    if (h <= g.h1) return cover.sMar((h - g.h0) / (g.h1 - g.h0)) + 0.003;
    return cover.sMar(1) + 0.003 - (h - g.h1) * 0.3 * hl;
  };
  if (T.type !== 'shark') {
    if (eye) {
      for (let a = 2; a <= 198; a += 26 + 7 * R()) {
        const ro = Math.min(T.ioW * eye.r, 0.86 * clear(a));
        if (ro > 1.24 * eye.r) pore(polar((1.1 * eye.r + ro) / 2, a));
      }
      for (let a = 228; a <= 322; a += 31) if (clear(a) > 1.72 * eye.r) pore(polar(1.5 * eye.r, a + 6 * (R() - 0.5)), 0.9);
      // temporal canal: from the orbit back to the origin of the trunk lateral line
      const a0 = polar(1.85 * eye.r, 335), b0: SH = [hl, Math.min(0.33, (g?.h0 ?? 0.36) - 0.03)];
      if (clear(335) > 2 * eye.r) for (const t of [0.15, 0.5, 0.82]) pore([lerp(a0[0], b0[0], t), lerp(a0[1], b0[1], t)], 0.9);
      for (const hh of [0.07, 0.17]) if (nape(hh) - 0.012 > eye.s + eye.r) pore([nape(hh) - 0.012, hh], 0.8); // supratemporal commissure
    }
    if (cover) { const n = hl > 0.2 ? 6 : 5; for (let i = 0; i < n; i++) { const v = lerp(0.14, 0.86, i / (n - 1)); pore([sC(cover.sPre(v) - 0.03 * hl), cover.h(v)]); } }
    if (jawed) {
      const mt = model.mouthTip, rc = model.rictus, len = rc.s - mt.s, n = len > 0.05 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const s = lerp(mt.s + 0.16 * len, rc.s - 0.04 * len, i / (n - 1));
        if (s > 0.006 && s > model.sSym) pore([s, lerp(seamH(s), 1, 0.38)], 0.92);
      }
    }
  } else {
    // sharks: ampullae of Lorenzini – structured electroreceptor sensory tracts (supraorbital, infraorbital, buccal, ventral rostral, mandibular)
    const sE = eye ? eye.s : 0.3 * hl, ra = clamp(0.0014 * hl, 0.00032, 0.00062);
    const safeSharkPore = (s: number, h: number, scale = 1) => {
      if (s < 0.007 || s > hl * 0.88 || h < 0.04 || h > 0.97) return;
      if (eye && Math.hypot(s - eye.s, (h - eye.h) * 0.45) < eye.r * 1.45) return;
      if (jawed && s >= model.sSym - 0.006 && s <= model.rictus.s + 0.014 && Math.abs(h - seamH(Math.min(s, model.rictus.s))) < 0.055) return;
      canals.push({ p: [s, h], r: ra * scale * (0.82 + 0.35 * R()) });
    };
    // 1. Supraorbital & dorsal rostral sensory line
    for (let i = 0; i < 24; i++) {
      const t = i / 23, s = lerp(0.01, sE + 0.12 * hl, t);
      const h = lerp(0.18, 0.26, Math.sin(PI * t)) + (R() - 0.5) * 0.035;
      safeSharkPore(s, h, 0.9);
    }
    // 2. Infraorbital & buccal tract curving beneath the eye toward the snout
    for (let i = 0; i < 28; i++) {
      const t = i / 27, s = lerp(0.012, sE + 0.18 * hl, t);
      const h = lerp(0.52, 0.64, t) + 0.04 * Math.sin(PI * t) + (R() - 0.5) * 0.035;
      safeSharkPore(s, h, 0.95);
    }
    // 3. Ventral rostral field (underside of snout ahead of the mouth arch)
    const sMouth0 = Math.max(0.018, model.sSym - 0.005);
    for (let i = 0; i < 42; i++) {
      const s = lerp(0.008, sMouth0, Math.pow(R(), 0.85));
      const h = lerp(0.66, 0.95, R());
      safeSharkPore(s, h, 0.85);
    }
    // 4. Mandibular row behind the lower lip
    if (jawed) {
      for (let i = 0; i < 12; i++) {
        const t = i / 11, s = lerp(model.sSym + 0.008, model.rictus.s, t);
        const h = clamp(seamH(s) + 0.065 + 0.015 * R(), 0.65, 0.96);
        safeSharkPore(s, h, 0.85);
      }
    }
    nares.push({ s: clamp(m.s * 0.52, 0.014, 0.18), h: 0.78, r: clamp(0.022 * hl, 0.0016, 0.0042), rim: 0.52 });
    if (eye && !/white|mako|blue|whale|thresher|hammer/.test(sp.id) && clear(340) > 2.1 * eye.r) canals.push({ p: polar(1.9 * eye.r, 340), r: clamp(0.18 * eye.r, 0.001, 0.0022) });
  }
  return { traits: T, s0, s1, eye, clear, sh, polar, cover, preop, suture, inter, striae, rays, nares, maxUp, maxLo, dentary, frontal, cheekArc, canals, nape };
}
