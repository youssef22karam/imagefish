// ─────────────────────────────────────────────────────────────────────────────
//  DERMIS · skin outgrowths grown out of the living integument.
//
//  Cirri, leafy flaps, filaments, papilla warts, bony tubercles and dermal prickles are not objects glued onto
//  the fish: each one is the skin itself drawn out into an appendage.
//
//   1. PLACEMENT – blue-noise (Mitchell best-candidate) on the true 3D skin, area-weighted, optionally clumped
//      into patches by a smooth noise field; anatomical sites (brow, jaw fringe, nape, ridge, flank, belly…) are
//      resolved against the real head. Outgrowths keep clear of the eyes, the mouth seam, the free margin of
//      the gill cover and the fin bases, and of each other (one shared occupancy list for all fields).
//   2. ROOT – the root ring is solved in the skin's own (s, φ) parameter space, so every root vertex lies
//      exactly on the analytic body surface and carries the body's UV, normal and jaw / plasticity / gill pose
//      (the outgrowth opens with the mouth and rides on the breathing gill cover).
//   3. FILLET – a concave skirt flows from the root ring into the shaft (exponential flare), with the root normals
//      welded to the body normals: no seam, no gap, no hard edge.
//   4. SHAFT – a swept, tapering cross-section along a curved centreline: rounded tips, flattened leaf blades
//      with scalloped margins, lumpy papillae, sharp spinules with elongated bases; cirri branch like antlers.
//   5. PIGMENT – the outgrowth keeps the UV of its root, so it carries the skin's own pattern; vertex colours
//      (relative to the painted texel under the root) shade it toward translucent tips, ring bands and a soft
//      occlusion crease at the junction.
//   6. MOTION – soft outgrowths drift in the water and stream back with the swim (vertex shader, aFin.w = 0.3);
//      the weight is zero across the fillet so the junction never opens.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Ctx } from './ctx';
import type { BodyModel } from './model';
import type { Species, TagField, TagKind } from './types';
import { clamp, lerp, rng, smooth } from './math';
import { faceOut, grid, type C3, type Q4 } from './geom';

const PI = Math.PI, PI2 = Math.PI * 2;
const Z4: Q4 = [0, 0, 0, 0];

interface KindSpec {
  r: number; lean: number; curl: number; sway: number; flat: number; fringe: number;
  N: number; R: number; flare: number; tF: number; sink: number; tip: number; base: [number, number];
}
/** per-kind defaults: base radius / len, lean (deg), curl, sway, flattening, fringe, mesh resolution, fillet */
const KIND: Record<TagKind, KindSpec> = {
  cirrus: { r: 0.13, lean: 20, curl: 0.22, sway: 0.75, flat: 0.22, fringe: 0.3, N: 9, R: 16, flare: 2.1, tF: 0.2, sink: 0.35, tip: 1.28, base: [1, 1] },
  filament: { r: 0.055, lean: 30, curl: 0.4, sway: 1, flat: 0, fringe: 0, N: 6, R: 20, flare: 2.6, tF: 0.12, sink: 0.4, tip: 1.22, base: [1, 1] },
  flap: { r: 0.42, lean: 50, curl: 0.16, sway: 0.5, flat: 0.84, fringe: 0.5, N: 14, R: 13, flare: 1.32, tF: 0.22, sink: 0.25, tip: 1.18, base: [1, 0.5] },
  wart: { r: 1.7, lean: 0, curl: 0, sway: 0, flat: 0, fringe: 0.25, N: 12, R: 9, flare: 1.45, tF: 0.42, sink: 0.3, tip: 1.1, base: [1, 1] },
  tubercle: { r: 0.62, lean: 8, curl: 0, sway: 0, flat: 0, fringe: 0, N: 10, R: 9, flare: 1.6, tF: 0.28, sink: 0.15, tip: 1.2, base: [1, 1] },
  prickle: { r: 0.17, lean: 63, curl: 0.05, sway: 0, flat: 0, fringe: 0, N: 8, R: 10, flare: 1.9, tF: 0.2, sink: 0.25, tip: 1.38, base: [1, 1.6] },
};
const roundTip = (t: number, t1: number) => (t <= t1 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - t1) / (1 - t1)) ** 2)));
/** cross-section radius along the shaft, as a fraction of the base radius */
const PROFILE: Record<TagKind, (t: number) => number> = {
  cirrus: (t) => Math.pow(1 - 0.78 * t, 1.05) * roundTip(t, 0.9),
  filament: (t) => (1 - 0.82 * t) * roundTip(t, 0.95),
  flap: (t) => (0.4 + 0.6 * Math.pow(Math.sin(PI * (0.16 + 0.8 * t)), 0.75)) * roundTip(t, 0.86),
  wart: (t) => Math.pow(Math.max(0, 1 - t * t), 0.62),
  tubercle: (t) => (1 - 0.4 * t) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 4))),
  prickle: (t) => Math.pow(1 - t, 1.2),
};

/** every outgrowth field of a species: explicit tags + the legacy `spines` and `cirri` switches */
export function tagFields(sp: Species): TagField[] {
  const out = [...(sp.tags ?? [])];
  if (sp.spines && !out.some((f) => f.kind === 'prickle')) {
    out.push({ kind: 'prickle', n: sp.spines.n, len: sp.spines.len, site: 'body', c: sp.spines.c, lean: sp.spines.len > 0.03 ? 56 : 66, jitter: 0.3, r: 0.15 });
  }
  if (sp.cirri && !out.some((f) => f.site === 'brow')) out.push({ kind: 'cirrus', n: 2, len: 0.05, site: 'brow', branch: 0.65, sym: true, lean: 6 });
  return out;
}

// smooth value noise for clumping
const hash = (x: number, y: number, s: number) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi, s), hash(xi + 1, yi, s), u), lerp(hash(xi, yi + 1, s), hash(xi + 1, yi + 1, s), u), v);
};

interface Site { s: number; phi: number; size: number; r0: number; key: number }
interface Occ { p: THREE.Vector3; r: number }

/** the painted albedo under any skin point (downsampled once), for colours relative to the real pigment */
function texSampler(tex: THREE.Texture): ((u: number, v: number) => C3) | null {
  try {
    const im = tex.image as HTMLCanvasElement;
    if (!im || !im.width) return null;
    const W = 256, H = Math.max(8, Math.round((256 * im.height) / im.width));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d') as CanvasRenderingContext2D | null;
    if (!g) return null;
    g.drawImage(im, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    return (u, v) => {
      const x = clamp(Math.floor(u * W), 0, W - 1), y = clamp(Math.floor((1 - v) * H), 0, H - 1), q = (y * W + x) * 4;
      return [d[q] / 255, d[q + 1] / 255, d[q + 2] / 255];
    };
  } catch { return null; }
}
const srgb = (c: string): C3 => { const k = new THREE.Color(c); k.convertLinearToSRGB(); return [k.r, k.g, k.b]; };
const ratio = (a: C3, b: C3): C3 => [0, 1, 2].map((i) => clamp(a[i] / Math.max(0.05, b[i]), 0.22, 3.4)) as C3;
const mixC = (a: C3, b: C3, t: number): C3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** placement statistics of the last build (QA tools and the field guide) */
export const DERMIS_STATS: { kind: TagKind; site: string; want: number; placed: number }[] = [];
export function buildDermis(ctx: Ctx) {
  DERMIS_STATS.length = 0;
  const { sp, model, L, seed, addMesh } = ctx;
  const fields = tagFields(sp);
  if (!fields.length) return;
  const geos: THREE.BufferGeometry[] = [];
  const occ: Occ[] = [];
  const sample = texSampler(ctx.skinTex);
  let budget = 1400; // outgrowths per specimen
  fields.forEach((f, fi) => {
    const R = rng(((seed * 7919) ^ (fi * 104729) ^ ((f.seed ?? 0) * 2654435761)) >>> 0 || 1);
    const sites = place(f, sp, model, L, R, occ, Math.min(f.n, budget));
    budget -= sites.length;
    DERMIS_STATS.push({ kind: f.kind, site: f.site ?? (f.rows ? 'rows' : 'region'), want: f.n, placed: sites.length });
    for (const st of sites) {
      try { geos.push(...grow(f, st, model, L, sample)); } catch { /* a degenerate footprint is simply skipped */ }
    }
  });
  if (!geos.length) return;
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) return;
  addMesh(merged, ctx.tintMat, 2, true).name = 'dermis';
}

// ── 1. PLACEMENT ────────────────────────────────────────────────────────────
function place(f: TagField, sp: Species, model: BodyModel, L: number, R: () => number, occ: Occ[], n: number): Site[] {
  const K = KIND[f.kind], e = sp.eye, HL = sp.HL;
  const hp = (s: number) => model.halfPerim(clamp(s, model.sMin + 0.002, 0.999));
  const hEye = e.d > 0 ? model.phiAtY(e.s, model.normY(e.s, model.eyeYn)) / PI : 0.3;
  let reg = { s0: 0.03, s1: 0.965, h0: 0, h1: 1 };
  switch (f.site) {
    case 'brow': { const dh = (e.d * 0.6) / Math.max(1e-3, hp(e.s)); reg = { s0: e.s - e.d * 0.35, s1: e.s + e.d * 0.35, h0: Math.max(0, hEye - dh - 0.1), h1: Math.max(0.02, hEye - dh + 0.01) }; break; }
    case 'head': reg = { s0: 0.015, s1: HL * 1.02, h0: 0, h1: 0.92 }; break;
    case 'nape': reg = { s0: HL * 0.55, s1: HL * 1.45, h0: 0, h1: 0.32 }; break;
    case 'ridge': reg = { s0: HL * 0.8, s1: 0.95, h0: 0, h1: 0.1 }; break;
    case 'flank': reg = { s0: HL * 0.9, s1: 0.94, h0: 0.14, h1: 0.78 }; break;
    case 'belly': reg = { s0: HL * 0.7, s1: 0.86, h0: 0.58, h1: 1 }; break;
    case 'tail': reg = { s0: 0.62, s1: 0.96, h0: 0, h1: 1 }; break;
    case 'lateral': reg = { s0: HL, s1: 0.95, h0: 0.36, h1: 0.52 }; break;
    default: break;
  }
  reg = { s0: f.s0 ?? reg.s0, s1: f.s1 ?? reg.s1, h0: f.h0 ?? reg.h0, h1: f.h1 ?? reg.h1 };
  reg.s0 = clamp(reg.s0, Math.max(0.01, model.sMin + 0.01), 0.97); reg.s1 = clamp(reg.s1, reg.s0 + 0.005, 0.975);
  reg.h0 = clamp(reg.h0, 0, 1); reg.h1 = clamp(reg.h1, reg.h0 + 0.01, 1);
  let hpMax = 1e-4, hpBody = 1e-4;
  for (let i = 0; i <= 24; i++) { hpMax = Math.max(hpMax, hp(lerp(reg.s0, reg.s1, i / 24))); hpBody = Math.max(hpBody, hp(0.04 + 0.9 * i / 24)); }
  const jaw = model.hasJaw();
  const eyeP = e.d > 0 ? [model.attach(e.s, model.eyeYn, 1).p, model.attach(e.s, model.eyeYn, -1).p] : [];
  const flat = sp.plan === 'flatR' || sp.plan === 'flatL';
  const fins = sp.fins;
  const pecP = fins.pec ? [model.attach(model.pecStation, fins.pec.y, 1).p, model.attach(model.pecStation, fins.pec.y, -1).p] : [];
  const pelP = fins.pel ? [model.attach(fins.pel.s, fins.pel.y, 1).p, model.attach(fins.pel.s, fins.pel.y, -1).p] : [];
  const sizeAt = (s: number, j: number) => {
    const local = f.site === 'brow' || f.site === 'jaw' ? 1 : lerp(0.58, 1, Math.sqrt(clamp(hp(s) / hpBody)));
    return f.len * (1 + (f.jitter ?? 0.35) * (j * 2 - 1)) * local;
  };
  const rOf = (size: number) => size * (f.r ?? K.r) * Math.max(K.base[0], K.base[1]) * K.flare;
  const blocked = (s: number, phi: number, rSL: number, p: THREE.Vector3, twin?: Occ) => {
    const hS = phi <= PI ? phi / PI : (PI2 - phi) / PI, side = phi <= PI ? 0 : 1, h = hp(s);
    if (s > 0.975 || s < model.sMin + 0.006) return true;
    const eyeClear = f.site === 'brow' ? e.d * 0.56 + rSL * 0.3 : e.d * 0.68 + rSL * 1.25;
    if (eyeP.length && !flat && p.distanceTo(eyeP[side]) < eyeClear * L) return true;
    if (eyeP.length && flat && Math.min(p.distanceTo(eyeP[0]), p.distanceTo(eyeP[1])) < (e.d * 0.75 + rSL) * L) return true;
    if (jaw && f.site !== 'jaw' && s < model.rictus.s + 0.03 && Math.abs(hS - model.seamPhi(s) / PI) * h < rSL * 1.7 + 0.004) return true;
    for (const d of fins.dorsal ?? []) if (s > d.s0 - rSL - 0.008 && s < d.s1 + rSL + 0.008 && hS * h < rSL * 1.5 + 0.004) return true;
    for (const a of fins.anal ?? []) if (s > a.s0 - rSL - 0.008 && s < a.s1 + rSL + 0.008 && (1 - hS) * h < rSL * 1.5 + 0.004) return true;
    if (pecP.length && fins.pec && p.distanceTo(pecP[side]) < (fins.pec.base * 0.75 + rSL * 1.4) * L) return true;
    if (pelP.length && fins.pel && p.distanceTo(pelP[side]) < (fins.pel.base * 0.75 + rSL * 1.4) * L) return true;
    // the free margin of the gill cover swings with every breath: never straddle it
    const dS = rSL * 1.2, dP = (rSL * 1.2 * PI) / Math.max(h, 1e-3);
    const g = [model.gillWeight(s, phi), model.gillWeight(clamp(s - dS, 0, 1), phi), model.gillWeight(clamp(s + dS, 0, 1), phi), model.gillWeight(s, phi - dP), model.gillWeight(s, phi + dP)];
    if (Math.max(...g) - Math.min(...g) > 0.14) return true;
    for (const o of occ) if (o !== twin && o.p.distanceTo(p) < (o.r + rSL) * L * 0.92) return true;
    if (twin && twin.p.distanceTo(p) < rSL * L * 0.7) return true; // a mirrored pair may stand close, never merged
    return false;
  };
  const sites: Site[] = [];
  const accept = (s: number, phi: number, size: number) => {
    const r0 = rOf(size), p = model.surface(s, phi);
    occ.push({ p, r: r0 });
    sites.push({ s, phi, size, r0, key: R() });
  };
  const norm = (phi: number) => ((phi % PI2) + PI2) % PI2;

  // regular ridge rows (tubercles of seahorse rings, lumpfish ridges)
  if (f.rows?.length) {
    for (const hRow of f.rows) for (let i = 0; i < n; i++) {
      const s = lerp(reg.s0, reg.s1, (i + 0.5) / n) + (R() - 0.5) * 0.15 * (reg.s1 - reg.s0) / n;
      const size = sizeAt(s, R());
      const sides = hRow < 0.015 || hRow > 0.985 ? [1] : [1, -1];
      for (const sd of sides) {
        const phi = norm(sd > 0 ? hRow * PI : PI2 - hRow * PI), p = model.surface(s, phi);
        if (!blocked(s, phi, rOf(size), p)) accept(s, phi, size);
      }
    }
    return sites;
  }
  // jaw fringe: a row of lappets just under the mouth seam, on the lower jaw (they open with it)
  if (f.site === 'jaw' && jaw) {
    const a = model.mouthTip.s, b = Math.min(model.rictus.s + 0.02, HL * 0.9);
    const per = Math.max(1, Math.round(n / 2));
    for (let i = 0; i < per; i++) {
      const s = lerp(a + (b - a) * 0.12, b, (i + 0.5) / per);
      const size = sizeAt(s, R());
      const off = (rOf(size) * 1.25 + 0.003) / Math.max(1e-3, hp(s));
      const hS = clamp(model.seamPhi(s) / PI + off, 0.02, 0.985);
      for (const sd of [1, -1]) {
        const phi = norm(sd > 0 ? hS * PI : PI2 - hS * PI), p = model.surface(s, phi);
        if (!blocked(s, phi, rOf(size) * 0.6, p)) accept(s, phi, size);
      }
    }
    return sites;
  }
  // blue noise on the skin, area-weighted and clumped
  const clump = clamp(f.clump ?? 0), cs = R() * 100;
  const sym = !!f.sym;
  const draw = () => {
    for (let tries = 0; tries < 40; tries++) {
      const s = lerp(reg.s0, reg.s1, R());
      if (R() > hp(s) / hpMax) continue;
      const h = lerp(reg.h0, reg.h1, R());
      if (clump > 0 && R() > lerp(1, smooth(0.32, 0.72, vnoise(s * 9, h * 5.5, cs)), clump)) continue;
      const sd = sym ? 1 : R() < 0.5 ? 1 : -1;
      const phi = norm(sd > 0 ? h * PI : PI2 - h * PI);
      return { s, phi };
    }
    return null;
  };
  const target = sym ? Math.ceil(n / 2) : n;
  for (let i = 0, misses = 0; sites.length < (sym ? n : target) && i < target * 3 && misses < target + 20; i++) {
    let best: { s: number; phi: number; p: THREE.Vector3; d: number; sz: number } | null = null;
    const j = R();
    for (let k = 0; k < 10; k++) {
      const c = draw();
      if (!c) continue;
      const p = model.surface(c.s, c.phi), sz = sizeAt(c.s, j);
      if (blocked(c.s, c.phi, rOf(sz), p)) continue;
      let d = 1e9;
      for (const o of occ) d = Math.min(d, o.p.distanceTo(p) - o.r * L);
      if (!best || d > best.d) best = { ...c, p, d, sz };
    }
    if (!best) { misses++; continue; }
    const sz = best.sz, rSL = rOf(sz);
    accept(best.s, best.phi, sz);
    if (sym) {
      const phi2 = norm(PI2 - best.phi), p2 = model.surface(best.s, phi2);
      if (best.phi > 0.03 && best.phi < PI - 0.03 && !blocked(best.s, phi2, rSL, p2, occ[occ.length - 1])) {
        occ.push({ p: p2, r: rSL });
        sites.push({ s: best.s, phi: phi2, size: sz, r0: rSL, key: sites[sites.length - 1].key });
      }
    }
  }
  return sites;
}

// ── 2–6. GROWTH ─────────────────────────────────────────────────────────────
function grow(f: TagField, st: Site, model: BodyModel, L: number, sample: ((u: number, v: number) => C3) | null): THREE.BufferGeometry[] {
  const K = KIND[f.kind], kind = f.kind;
  const { s, phi, size } = st;
  const len = size * L; // shaft length (object units)
  const r0 = size * (f.r ?? K.r) * L; // shaft base radius
  const rootR = r0 * K.flare;
  const flat = clamp(f.flat ?? K.flat), fringe = clamp(f.fringe ?? K.fringe);
  const sway = clamp(f.sway ?? K.sway);
  const tR = (key: number, k: number) => { const x = Math.sin((key + 1) * 9301.7 + k * 49297.3) * 233280.1; return x - Math.floor(x); }; // per-outgrowth stable randoms
  const ph = tR(st.key, 1) * PI2;
  // local frame on the skin: n out, bk toward the tail, b across
  const P0 = model.surface(s, phi), n = model.normalAt(s, phi);
  const T = model.frame(s).T;
  const bk = T.clone().addScaledVector(n, -T.dot(n));
  if (bk.lengthSq() < 1e-8) bk.set(0, 1, 0).addScaledVector(n, -n.y);
  bk.normalize();
  const b = new THREE.Vector3().crossVectors(n, bk).normalize();
  const lean = ((f.lean ?? K.lean) + (tR(st.key, 2) - 0.5) * (kind === 'prickle' ? 8 : 26)) * (PI / 180);
  const az = (tR(st.key, 3) - 0.5) * (kind === 'prickle' ? 0.25 : kind === 'cirrus' || kind === 'filament' ? 1.1 : 0.6);
  const back = bk.clone().multiplyScalar(Math.cos(az)).addScaledVector(b, Math.sin(az));
  const d = n.clone().multiplyScalar(Math.cos(lean)).addScaledVector(back, Math.sin(lean)).normalize();
  const curl = (f.curl ?? K.curl) * (0.7 + 0.6 * tR(st.key, 4));
  const wig = kind === 'cirrus' || kind === 'filament' ? 0.08 + 0.1 * tR(st.key, 5) : 0;
  const sinkC = r0 * K.sink;
  const C = (t: number) => P0.clone().addScaledVector(n, -sinkC)
    .addScaledVector(d, len * t)
    .addScaledVector(back, curl * len * t * t)
    .addScaledVector(b, wig * len * Math.sin(PI * t * 1.4 + ph) * t);
  const tau = (t: number) => C(Math.min(1, t + 0.01)).sub(C(Math.max(0, t - 0.01))).normalize();
  // cross-section frame: leaf blades lie back over the skin with their face outward (twisted a little, like
  // overlapping leaves); spinule bases stretch along the body
  const twist = (tR(st.key, 6) - 0.5) * (kind === 'flap' ? 0.8 : 0.4);
  const ref0 = b.clone().applyAxisAngle(n, twist);
  const frameAt = (t: number) => {
    const tg = tau(t);
    const e1 = ref0.clone().addScaledVector(tg, -ref0.dot(tg));
    if (e1.lengthSq() < 1e-8) e1.crossVectors(tg, n);
    e1.normalize();
    return { tg, e1, e2: new THREE.Vector3().crossVectors(tg, e1).normalize() };
  };
  const F0 = frameAt(0);
  const u1 = F0.e1.clone().addScaledVector(n, -F0.e1.dot(n)).normalize();
  const u2 = F0.e2.clone().addScaledVector(n, -F0.e2.dot(n));
  if (u2.lengthSq() < 1e-8) u2.crossVectors(n, u1);
  u2.normalize();
  // skin-parameter Jacobian at the centre: tangent offsets → (Δs, Δφ), so the root ring lies exactly on the skin
  const es = clamp(0.0015, 1e-4, Math.max(1e-4, 0.999 - s)), ep = 0.01;
  const dS = model.surface(Math.min(0.9995, s + es), phi).sub(model.surface(Math.max(model.sMin + 1e-5, s - es), phi)).multiplyScalar(1 / (2 * es));
  const dP = model.surface(s, phi + ep).sub(model.surface(s, phi - ep)).multiplyScalar(1 / (2 * ep));
  const a11 = dS.dot(dS), a12 = dS.dot(dP), a22 = dP.dot(dP), det = a11 * a22 - a12 * a12;
  const onSkin = (o: THREE.Vector3) => {
    const b1 = o.dot(dS), b2 = o.dot(dP);
    const al = det > 1e-14 ? (b1 * a22 - b2 * a12) / det : 0, be = det > 1e-14 ? (a11 * b2 - a12 * b1) / det : 0;
    const s1 = clamp(s + al, model.sMin + 1e-4, 0.9995), p1 = ((phi + be) % PI2 + PI2) % PI2;
    return { s: s1, phi: p1 };
  };
  // resolution follows the footprint: broad papillae and knobs get round silhouettes, small ones stay cheap
  const big = kind === 'wart' || kind === 'tubercle' || kind === 'flap' ? clamp(rootR / (0.022 * L), 0.8, 1.9) : 1;
  const N = Math.round(clamp(K.N * big, K.N, 22)), Rn = Math.round(clamp(K.R * Math.sqrt(big), K.R, K.R + 4));
  const [bx, by] = K.base;
  const seams = Array.from({ length: N + 1 }, (_, i) => {
    const th = (i / N) * PI2;
    const lump = kind === 'wart' ? 1 + fringe * 0.22 * (0.6 * Math.sin(3 * th + ph) + 0.4 * Math.sin(5 * th + ph * 1.7)) : 1;
    const o = u1.clone().multiplyScalar(Math.cos(th) * rootR * bx * lump).addScaledVector(u2, Math.sin(th) * rootR * by * lump * (1 - flat * 0.55));
    const q = onSkin(o);
    return { th, s: q.s, phi: q.phi, p: model.surface(q.s, q.phi), n: model.normalAt(q.s, q.phi), pose: model.poseAt(q.s, q.phi) };
  });
  const joint = model.poseAt(s, phi);
  // pigment: the texel under the root, the tip colour and optional ring bands, as multipliers of that texel
  const base: C3 = sample ? sample(joint.uv[0], joint.uv[1]) : [0.6, 0.6, 0.6];
  const lum = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2];
  const tipMul: C3 = f.c ? ratio(srgb(f.c), base) : (() => { const k = K.tip + (lum < 0.18 ? 0.25 : 0); return [k, k, k] as C3; })();
  const bandMul: C3 | null = f.band ? ratio(srgb(f.band), base) : null;
  const bands = 3 + Math.floor(tR(st.key, 7) * 4);
  const mott = kind === 'cirrus' || kind === 'flap' || kind === 'filament' ? 0.16 : 0.06;
  const tF = K.tF;
  const colAt = (t: number, k = 0): C3 => {
    let c = mixC([1, 1, 1], tipMul, Math.pow(smooth(0.12, 1, t), 0.85));
    if (bandMul) c = mixC(c, bandMul, 0.82 * smooth(0.35, 0.65, 0.5 + 0.5 * Math.sin(t * PI * bands * 2 + ph + k)) * smooth(tF * 0.6, tF * 1.3, t));
    const m = 1 + mott * (Math.sin(t * 13 + ph * 2 + k) * 0.6 + Math.sin(t * 29 + ph) * 0.4) * smooth(0, tF, t);
    const crease = 1 - 0.2 * Math.exp(-Math.pow((t - tF * 0.38) / (tF * 0.26), 2)) * smooth(0, tF * 0.25, t);
    return [c[0] * m * crease, c[1] * m * crease, c[2] * m * crease];
  };
  const amp = sway > 0 ? size * sway * 0.55 : 0;
  const finAt = (t: number): Q4 => (amp > 0 ? [Math.pow(smooth(tF, 1, t), 1.35), tR(st.key, 8), amp, 0.3] : Z4);
  const prof = PROFILE[kind];
  const lobes = 3 + Math.floor(tR(st.key, 9) * 4);
  const radius = (t: number, th: number) => {
    let r = r0 * prof(t);
    if (kind === 'flap' && fringe > 0) r *= 1 - fringe * 0.42 * Math.pow(0.5 + 0.5 * Math.cos(lobes * PI2 * t + ph), 3) * Math.pow(Math.abs(Math.cos(th)), 4) * smooth(0.1, 0.3, t);
    if (kind === 'cirrus' && fringe > 0) r *= 1 + fringe * 0.16 * Math.sin(t * 31 + ph) * smooth(0.25, 0.5, t);
    if (kind === 'wart') r *= 1 + fringe * 0.2 * (0.6 * Math.sin(3 * th + ph) + 0.4 * Math.sin(5 * th + ph * 1.7)) * (1 - t);
    return r;
  };
  const flare = (t: number) => (rootR - r0 * prof(0)) * Math.exp(-t * (3.2 / tF));
  const tAt = (v: number) => Math.pow(v, 1.38); // rings packed toward the fillet
  const trunk = grid(N, Rn, (a, v) => {
    const i = Math.round(a * N), t = tAt(v);
    const sm = seams[i];
    const fr = frameAt(t);
    const th = sm.th;
    const rr = radius(t, th) + flare(t);
    const sy = kind === 'prickle' ? lerp(by, 1, smooth(0, 0.5, t)) : 1;
    const ring = C(t).addScaledVector(fr.e1, Math.cos(th) * rr * (kind === 'prickle' ? 1 : bx)).addScaledVector(fr.e2, Math.sin(th) * rr * (1 - flat) * sy);
    const fade = smooth(0, tF, t);
    const p = sm.p.clone().addScaledVector(sm.n, -0.00035 * L).lerp(ring, fade);
    let dv = joint.uv[1] - sm.pose.uv[1];
    if (dv > 0.5) dv -= 1;
    if (dv < -0.5) dv += 1;
    p.x += lerp(sm.pose.jut, joint.jut, fade);
    return {
      p,
      uv: [lerp(sm.pose.uv[0], joint.uv[0], fade), sm.pose.uv[1] + dv * fade] as [number, number],
      jaw: lerp(sm.pose.jaw, joint.jaw, fade),
      plastic: sm.pose.plastic.map((x, k) => lerp(x, joint.plastic[k], fade)) as Q4,
      gill: lerp(sm.pose.gill, joint.gill, fade),
      col: v === 0 ? [1, 1, 1] as C3 : colAt(t),
      fin: finAt(t),
    };
  }, false, true);
  const probeJ = Math.round(Rn * 0.5), probe = probeJ * (N + 1);
  const Pp = new THREE.Vector3().fromBufferAttribute(trunk.getAttribute('position') as THREE.BufferAttribute, probe);
  faceOut(trunk, probe, Pp.sub(C(tAt(probeJ / Rn))));
  weld(trunk, N, Rn, seams.map((q) => q.n));
  const out = [trunk];

  // antler branching of cirri: tines leave the trunk and curve outward, each finer than its parent
  const branch = kind === 'cirrus' ? clamp(f.branch ?? 0) : 0;
  if (branch > 0.05) {
    const nB = Math.max(1, Math.round(branch * 3.4 * (0.6 + 0.8 * tR(st.key, 10))));
    const tine = (from: (t: number) => THREE.Vector3, fromR: (t: number) => number, fromTau: (t: number) => THREE.Vector3, t0: number, t1: number, lenP: number, depth: number, k0: number, wBase: (t: number) => number, cBase: (t: number) => number) => {
      for (let j = 0; j < (depth === 0 ? nB : Math.max(0, Math.round(branch * 1.6 * tR(st.key, 20 + k0)))); j++) {
        const kk = k0 * 7 + j * 3 + depth * 31;
        const tb = lerp(t0, t1, (j + 0.3 + 0.4 * tR(st.key, 30 + kk)) / Math.max(1, depth === 0 ? nB : 2));
        const start = from(tb), tg = fromTau(tb);
        const side = new THREE.Vector3().crossVectors(tg, n);
        if (side.lengthSq() < 1e-8) side.copy(b);
        side.normalize().applyAxisAngle(tg, (j % 2 ? 1 : -1) * (0.5 + 1.1 * tR(st.key, 40 + kk)) + (depth ? 1.3 : 0));
        const ang = (0.5 + 0.45 * tR(st.key, 50 + kk));
        const dir = tg.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)).normalize();
        const lc = lenP * (1 - tb) * (0.55 + 0.4 * tR(st.key, 60 + kk));
        const rc = fromR(tb) * 0.82;
        const Cc = (t: number) => start.clone().addScaledVector(dir, lc * t).addScaledVector(d, 0.28 * lc * t * t);
        const tc = (t: number) => Cc(Math.min(1, t + 0.02)).sub(Cc(Math.max(0, t - 0.02))).normalize();
        const w0 = wBase(tb), c0 = cBase(tb);
        const Nc = Math.max(5, N - 2 - depth), Rc = Math.max(7, Math.round(Rn * 0.6));
        const prc = (t: number) => rc * Math.pow(1 - 0.75 * t, 1.1) * roundTip(t, 0.86);
        const g = grid(Nc, Rc, (a, t) => {
          const th = a * PI2, tg2 = tc(t);
          const e1 = b.clone().addScaledVector(tg2, -b.dot(tg2));
          if (e1.lengthSq() < 1e-8) e1.crossVectors(tg2, n);
          e1.normalize();
          const e2 = new THREE.Vector3().crossVectors(tg2, e1);
          const p = Cc(t).addScaledVector(e1, Math.cos(th) * prc(t)).addScaledVector(e2, Math.sin(th) * prc(t) * (1 - flat));
          p.x += joint.jut;
          const tg = lerp(c0, 1, t);
          return { p, uv: joint.uv, jaw: joint.jaw, plastic: joint.plastic, gill: joint.gill, col: colAt(tg, kk), fin: amp > 0 ? [lerp(w0, 1, Math.pow(t, 1.2)), tR(st.key, 8), amp, 0.3] as Q4 : Z4 };
        }, false, true);
        const pi = Math.round(Rc * 0.4) * (Nc + 1);
        faceOut(g, pi, new THREE.Vector3().fromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute, pi).sub(Cc(0.4)));
        weld(g, Nc, Rc);
        out.push(g);
        if (depth < 1 && branch > 0.45) tine(Cc, prc, tc, 0.35, 0.8, lc, depth + 1, kk + 1, (t) => lerp(w0, 1, Math.pow(t, 1.2)), (t) => lerp(c0, 1, t));
      }
    };
    const trunkR = (t: number) => r0 * prof(t);
    tine(C, trunkR, tau, 0.38, 0.82, len, 0, 0, (t) => Math.pow(smooth(tF, 1, t), 1.35), (t) => t);
  }
  return out;
}

/** average the duplicated seam column and weld the root ring to the body normals */
function weld(g: THREE.BufferGeometry, N: number, Rn: number, rootN?: THREE.Vector3[]) {
  const nr = g.getAttribute('normal') as THREE.BufferAttribute;
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let j = 0; j <= Rn; j++) {
    const a = j * (N + 1), z = a + N;
    v.fromBufferAttribute(nr, a).add(w.fromBufferAttribute(nr, z));
    if (v.lengthSq() > 1e-12) { v.normalize(); nr.setXYZ(a, v.x, v.y, v.z); nr.setXYZ(z, v.x, v.y, v.z); }
  }
  if (rootN) {
    for (let i = 0; i <= N; i++) {
      const q = rootN[i];
      nr.setXYZ(i, q.x, q.y, q.z);
      const j = i + N + 1;
      v.fromBufferAttribute(nr, j).lerp(q, 0.55).normalize();
      nr.setXYZ(j, v.x, v.y, v.z);
    }
  }
  nr.needsUpdate = true;
}
