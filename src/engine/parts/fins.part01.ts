import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CaudalSpec, FinMark, FinOcellus, FinPattern, FinShape, MedianFin, PairedFin } from './types';
import { clamp, curve, DEG, lerp, smooth } from './math';
import { finShell, mirrorZ, tubeAlong, type ShellSample } from './geom';
import { patchMaterial, type FinLook, type Joint } from './shader';
import type { Ctx } from './ctx';

// ── ichthyological fin outlines (normalised height along the base) ─────────
const SHAPES: Record<FinShape, [number, number][]> = {
  tri: [[0, 0.24], [0.16, 1], [0.52, 0.62], [0.86, 0.26], [1, 0.14]],
  falcate: [[0, 0.22], [0.11, 1], [0.28, 0.72], [0.56, 0.28], [0.86, 0.13], [1, 0.1]],
  round: [[0, 0.22], [0.22, 0.84], [0.56, 1], [0.85, 0.8], [1, 0.28]],
  even: [[0, 0.26], [0.07, 0.9], [0.5, 1], [0.93, 0.9], [1, 0.34]],
  spiny: [[0, 0.34], [0.15, 0.94], [0.38, 1], [0.7, 0.76], [0.92, 0.48], [1, 0.28]],
  sail: [[0, 0.35], [0.12, 1], [0.44, 0.96], [0.78, 0.56], [1, 0.14]],
  adipose: [[0, 0.08], [0.34, 0.78], [0.68, 1], [0.9, 0.78], [1, 0.2]],
  shark: [[0, 0.08], [0.14, 0.64], [0.28, 1], [0.5, 0.66], [0.74, 0.26], [0.88, 0.12], [1, 0.16]],
  lobe: [[0, 0.26], [0.26, 0.88], [0.56, 1], [0.82, 0.82], [1, 0.25]],
  flag: [[0, 0.3], [0.09, 1], [0.22, 0.76], [0.5, 0.36], [1, 0.2]],
  pennant: [[0, 0.3], [0.09, 0.8], [0.3, 0.94], [0.62, 1], [0.86, 0.9], [1, 0.62]],
  veil: [[0, 0.38], [0.28, 0.94], [0.68, 1.06], [0.92, 1.02], [1, 0.85]],
  fan: [[0, 0.42], [0.28, 0.95], [0.64, 1], [0.9, 0.82], [1, 0.55]],
  rect: [[0, 0.55], [0.12, 0.92], [0.5, 1], [0.9, 0.92], [1, 0.6]],
  low: [[0, 0.2], [0.1, 0.96], [0.9, 0.98], [1, 0.3]],
  leaf: [[0, 0.14], [0.35, 0.88], [0.6, 1], [0.88, 0.65], [1, 0.14]],
  squami: [[0, 0.22], [0.14, 0.6], [0.38, 0.8], [0.68, 0.98], [0.84, 1], [0.95, 0.78], [1, 0.26]],
  marlin: [[0, 0.28], [0.085, 1], [0.18, 0.46], [0.34, 0.19], [0.65, 0.11], [1, 0.06]],
  // filamentous feeler: a few fused rays drawn out into a thread (gourami & angelfish pelvics, oarfish oars)
  thread: [[0, 0.7], [0.5, 1], [1, 0.7]],
  wing: [[0, 0.3], [0.1, 0.82], [0.3, 1], [0.58, 0.95], [0.82, 0.7], [1, 0.32]],
  crest: [[0, 0.3], [0.07, 0.92], [0.17, 0.66], [0.28, 1], [0.4, 0.7], [0.52, 0.96], [0.64, 0.68], [0.76, 0.9], [0.88, 0.6], [1, 0.28]],
  scythe: [[0, 0.26], [0.05, 1], [0.13, 0.52], [0.28, 0.2], [0.6, 0.12], [1, 0.1]],
  notch: [[0, 0.3], [0.12, 1], [0.32, 0.82], [0.46, 0.28], [0.54, 0.64], [0.74, 0.74], [0.92, 0.52], [1, 0.22]],
  saddle: [[0, 0.42], [0.1, 0.95], [0.3, 0.62], [0.5, 0.46], [0.7, 0.62], [0.9, 0.95], [1, 0.42]],
  plume: [[0, 0.18], [0.25, 0.42], [0.5, 0.7], [0.78, 0.98], [0.9, 1], [1, 0.72]],
  streamer: [[0, 0.6], [0.04, 1], [0.1, 0.3], [0.3, 0.17], [0.7, 0.14], [1, 0.12]],
  comb: [[0, 0.4], [0.12, 1], [0.3, 0.96], [0.55, 0.88], [0.8, 0.7], [1, 0.4]],
};
const shapeFns: Partial<Record<FinShape, (u: number) => number>> = {};
export const shapeH = (s: FinShape, u: number) => (shapeFns[s] ??= curve(SHAPES[s] ?? SHAPES.tri))(u);
const customFinFns = new WeakMap<MedianFin, (u: number) => number>();
export const finShapeH = (f: MedianFin, u: number) => {
  if (f.customProfile && f.customProfile.length >= 2) {
    let fn = customFinFns.get(f);
    if (!fn) {
      fn = curve(f.customProfile);
      customFinFns.set(f, fn);
    }
    return clamp(fn(u), 0.02, 1.35);
  }
  return shapeH(f.shape, u);
};
const customCaudalFns = new WeakMap<CaudalSpec, (u: number) => number>();
export const caudalTrailFactor = (cs: CaudalSpec, uu: number) => {
  if (cs.customTrail && cs.customTrail.length >= 2) {
    let fn = customCaudalFns.get(cs);
    if (!fn) {
      fn = curve(cs.customTrail);
      customCaudalFns.set(cs, fn);
    }
    return clamp(fn(uu), 0.04, 2.8);
  }
  return null;
};
const PATTERN: Record<FinPattern, number> = { none: 0, spots: 1, leopard: 2, bands: 3, reticulate: 4, rayspots: 5 };
const Z = new THREE.Vector3(0, 0, 1);

interface Look {
  color?: string; tip?: string; mid?: string; alpha?: number; rays?: number; incise?: number; edge?: string;
  spots?: number; spotCol?: string; pattern?: FinPattern; fray?: number; solid?: boolean; root?: number;
  edgeWidth?: number; marks?: FinMark[];
  ocellus?: FinOcellus;
}

/** Fin material: membrane colours/rays/patterns + the body skin texture for the fleshy root blend */
export function finMaterial(ctx: Ctx, o: Look, joint?: Joint, withSkin = true) {
  const fs = ctx.sp.fins;
  const c = (x: string) => new THREE.Color(x);
  const solid = o.solid ?? false;
  const base = c(o.color ?? fs.color);
  const tip = c(o.tip ?? o.color ?? fs.tip ?? fs.color);
  const oc = o.ocellus;
  const look: FinLook = {
    rays: o.rays ?? 14, incise: o.incise ?? 0, membrane: solid ? 1 : (o.alpha ?? fs.alpha),
    base, mid: o.mid ? c(o.mid) : base.clone().lerp(tip, 0.5), tip,
    edge: c(o.edge ?? '#000'), edgeW: o.edge ? (o.edgeWidth ?? 0.065) : 0,
    spots: o.spots ?? 0, spotCol: c(o.spotCol ?? '#111'),
    pattern: PATTERN[o.pattern ?? (o.spots ? 'spots' : 'none')], fray: o.fray ?? 0,
    root: withSkin ? (o.root ?? 0.16) : 0,
    marks: (o.marks ?? []).slice(0, 3).map((m) => ({
      range: new THREE.Vector4(m.v0, m.v1, m.u0 ?? 0, m.u1 ?? 1), color: c(m.c),
    })),
    ocel: oc ? new THREE.Vector4(oc.u, oc.v, oc.r, 1) : undefined,
    ocelCol: oc ? c(oc.col ?? '#0c0d10') : undefined,
    ocelRing: oc ? c(oc.ring ?? '#f8f6ec') : undefined,
  };
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map: withSkin ? ctx.skinTex : null,
    roughness: solid ? (ctx.sp.color.rough ?? 0.52) : 0.47, transparent: !solid, depthWrite: solid,
    clearcoat: solid ? 0.13 : 0.22, clearcoatRoughness: 0.38,
    side: withSkin ? THREE.FrontSide : THREE.DoubleSide,
  });
  // the fleshy fin root carries the body's own integument (scales, pigment, relief)
  patchMaterial(m, ctx.u, look, { joint, skin: withSkin ? ctx.skinLook : undefined });
  ctx.track(m);
  return m;
}

/** Bind-space skin envelope used by the vertex shader as a contact stop during each stroke. */
function pairedEnvelope(ctx: Ctx) {
  const { model, L, u } = ctx;
  const w = 257, h = 129;
  const wasRaw = model.rawMode;
  model.rawMode = true;
  const x0 = model.local(0, 0, 0).x;
  const bent = model.bent;
  let s0 = model.sMin, s1 = 1, low = 0, high = 0, scale = 0;
  const S = 144, P = 48;
  // A bent fish cannot use arc length as its x ordinate. Rasterize the same analytic skin in
  // bind-space XY instead, retaining the front-most half-width wherever the body curves back.
  const curved = bent ? Array.from({ length: (S + 1) * (P + 1) }, (_, i) => {
    const s = lerp(model.sMin, 1, Math.floor(i / (P + 1)) / S);
    const q = model.surface(s, Math.PI * (i % (P + 1)) / P);
    q.x = (x0 - q.x) / L;
    s0 = Math.min(s0, q.x); s1 = Math.max(s1, q.x);
    low = Math.min(low, q.y); high = Math.max(high, q.y); scale = Math.max(scale, q.z);
    return q;
  }) : null;
  if (!curved) {
    for (let x = 0; x < w; x++) {
      const s = lerp(s0, s1, x / (w - 1));
      low = Math.min(low, -model.bot(s) * L);
      high = Math.max(high, model.top(s) * L);
      scale = Math.max(scale, model.hw(s) * L);
    }
  }
  low -= 0.002 * L; high += 0.002 * L; scale = Math.max(0.005, scale * 1.28);
  const widths = new Float32Array(w * h);
  if (curved) {
    for (const q of curved) { q.x = (q.x - s0) * (w - 1) / (s1 - s0); q.y = (q.y - low) * (h - 1) / (high - low); }
    const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
      const dx = b.x - a.x, dy = b.y - a.y, ex = c.x - a.x, ey = c.y - a.y;
      const det = dx * ey - dy * ex;
      if (Math.abs(det) < 1e-8) return;
      const minX = Math.max(0, Math.ceil(Math.min(a.x, b.x, c.x) - 1e-6)), maxX = Math.min(w - 1, Math.floor(Math.max(a.x, b.x, c.x) + 1e-6));
      const minY = Math.max(0, Math.ceil(Math.min(a.y, b.y, c.y) - 1e-6)), maxY = Math.min(h - 1, Math.floor(Math.max(a.y, b.y, c.y) + 1e-6));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const j = ((x - a.x) * ey - (y - a.y) * ex) / det;
        const k = (dx * (y - a.y) - dy * (x - a.x)) / det;
        if (j >= -1e-6 && k >= -1e-6 && j + k <= 1 + 1e-6) {
          const id = y * w + x;
          widths[id] = Math.max(widths[id], a.z * (1 - j - k) + b.z * j + c.z * k);
        }
      }
    };
    for (let s = 0; s < S; s++) for (let p = 0; p < P; p++) {
      const a = s * (P + 1) + p, b = a + 1, c = a + P + 1, d = c + 1;
      triangle(curved[a], curved[b], curved[c]); triangle(curved[b], curved[d], curved[c]);
    }
  } else for (let y = 0; y < h; y++) {
    const ySL = lerp(low, high, y / (h - 1)) / L;
    for (let x = 0; x < w; x++) widths[y * w + x] = model.skinWidthAt(lerp(s0, s1, x / (w - 1)), ySL) * L;
  }
  model.rawMode = wasRaw;
  // Two normalized bytes store width losslessly enough for contact, without a float-texture extension.
  const bytes = new Uint8Array(w * h * 4);
  for (let i = 0; i < widths.length; i++) {
    const code = Math.round(clamp(widths[i] / scale) * 65025);
    bytes[i * 4] = Math.floor(code / 255); bytes[i * 4 + 1] = code % 255; bytes[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(bytes, w, h);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  u.uPairMap.value = tex;
  u.uPairRange.value.set(s0, 1 / (s1 - s0), low, 1 / (high - low));
  u.uPairSize.value.set(w, h, scale);
  ctx.track(tex);
  return (p: THREE.Vector3) => {
    const x = ((x0 - p.x) / L - s0) * (w - 1) / (s1 - s0), y = (p.y - low) * (h - 1) / (high - low);
    if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1) return 0;
    const ix = Math.floor(x), iy = Math.floor(y), i = iy * w + ix;
    return lerp(lerp(widths[i], widths[i + 1], x - ix), lerp(widths[i + w], widths[i + w + 1], x - ix), y - iy);
  };
}

export function buildFins(ctx: Ctx) {
  const { sp, model, L, addMesh } = ctx;
  const fs = sp.fins;
  const labriform = sp.swim.mode === 'labriform';
  const finSpots = sp.color.layers?.some((l) => l.k === 'spots' && (l.h1 ?? 1) > 0.3 && l.n > 40) ? 3 : 0;
  const isSpiny = (f: MedianFin) => f.shape === 'spiny' || (f.incise ?? 0) >= 0.18;
  const hasSpinyDorsal = (fs.dorsal ?? []).some(isSpiny);
  const spineMat = (color: string | undefined, joint: Joint) => {
    const m = patchMaterial(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color ?? fs.color).lerp(new THREE.Color('#efe7d6'), 0.35), roughness: 0.34, clearcoat: 0.6 }), ctx.u, undefined, { joint });
    ctx.track(m);
    return m;
  };

  // ── 1. median fins: fillet welded to the dorsal/ventral skin, rays, pleats, 3D spines ──
  let finIdx = 0;
  const median = (f: MedianFin, side: 1 | -1, leadSpines = 0) => {
    const idx = finIdx++;
    const squami = f.shape === 'squami';
    const sw = (f.sweep ?? (f.shape === 'shark' ? 30 : f.shape === 'falcate' || f.shape === 'marlin' ? 32 : squami ? 18 : f.shape === 'spiny' ? 16 : 12)) * DEG;
    const bendBack = f.curve ?? (f.shape === 'falcate' || f.shape === 'marlin' || f.shape === 'veil' || f.shape === 'flag' || f.shape === 'pennant' ? 0.32 : f.shape === 'shark' || squami ? 0.2 : 0.14);
    const cart = f.shape === 'shark' || f.shape === 'adipose' || ((f.foil ?? 0) >= 1 && f.rays === 0);
    const lobe = f.shape === 'lobe';
    const spiny = isSpiny(f);
    const sail = f.shape === 'sail' || f.shape === 'marlin' || f.shape === 'flag';
    const sheath = f.sheath ?? (cart ? 0.29 : lobe ? 0.33 : squami ? 0.48 : sail ? 0.20 : 0.17);
    const lenS = Math.max(0.004, f.s1 - f.s0);
    const rays = cart ? 0 : Math.round(f.spines ?? f.rays ?? clamp(Math.round(lenS * (spiny ? 50 : 62)), 3, 32));
    const mid = (uu: number, vv: number): ShellSample => {
      const s = lerp(f.s0, f.s1, uu);
      const B = model.local(s, side > 0 ? model.top(s) : -model.bot(s), 0);
      const fr = model.frame(s);
      const a = sw * (0.85 + 0.35 * uu);
      const dir = fr.N.clone().multiplyScalar(side * Math.cos(a)).addScaledVector(fr.T, Math.sin(a));
      const H = f.h * finShapeH(f, uu) * L;
      // squamipinniform soft rear lobe bulges gracefully backward to frame the caudal peduncle
      const rearCurtain = squami ? 0.34 * Math.pow(smooth(0.54, 1, uu), 1.35) * Math.sin(Math.PI * Math.pow(clamp(vv), 0.72)) * H : 0;
      const rise = vv * lerp(0.16, 1, smooth(0, cart || sail ? 0.21 : 0.16, vv));
      return { p: B.addScaledVector(dir, rise * H).addScaledVector(fr.T, bendBack * vv * vv * H + rearCurtain), n: Z };
    };
    const rootPhiAt = (uu: number, tSL: number) => {
      const s = lerp(f.s0, f.s1, uu);
      return model.phiAtZ(s, Math.min(tSL, model.hw(s) * 0.92), side > 0);
    };
    const tRoot = (uu: number) => {
      const s = lerp(f.s0, f.s1, uu);
      const k = cart ? 0.29 : lobe ? 0.36 : sail ? 0.22 : 0.26;
      const cap = cart ? 0.095 : sail ? 0.074 : lobe ? 0.19 : 0.14;
      return Math.min(model.hw(s) * k, f.h * cap, lenS * 0.12) * L * Math.pow(Math.sin(Math.PI * clamp(uu)), 0.57);
    };
    const filletV = cart || sail ? 0.22 : lobe ? 0.42 : 0.24;
    const thick = (uu: number, vv: number) => {
      const closeU = Math.pow(Math.max(0, Math.sin(Math.PI * uu)), 0.62);
      const blade = 1 - smooth(0.74, 1, vv);
      const root = tRoot(uu) * Math.pow(1 - smooth(0, filletV, vv), 1.7);
      if (cart) {
        const chord = 1.52 * Math.sqrt(uu) * Math.pow(1 - uu, 1.3);
        const gauge = Math.min(f.h * 0.061, lenS * 0.043) * clamp(f.foil ?? 1, 0.55, 1.45);
        const core = L * gauge * chord * smooth(0, filletV, vv) * Math.pow(1 - vv, 1.02);
        return (root + core) * blade;
      }
      return (root + L * (sail ? 0.00048 : 0.00082) * closeU * smooth(0, filletV, vv)) * blade;
    };
    const projectSide = (uu: number, q: THREE.Vector3, sgn: 1 | -1) => {
      const s = model.bent ? lerp(f.s0, f.s1, uu) : clamp(0.5 - q.x / L, model.sMin + 0.0001, 0.999);
      const p0 = model.phiAtZ(s, Math.min(Math.abs(q.z) / L, model.hw(s) * 0.89), side > 0);
      return { s, phi: sgn > 0 ? p0 : 2 * Math.PI - p0 };
    };
    const spacing = (lenS * L) / Math.max(1, rays);
    const g = finShell({
      nu: clamp((rays || 14) * 4, 28, 140), nv: 22, rays, vPow: 1.52, mid, thick,
      ridge: Math.min(0.17 * spacing, f.h * L * 0.029, 0.0028 * L) * (spiny ? 1.12 : 1),
      pleat: Math.min((spiny ? 0.22 : 0.14) * spacing, 0.004 * L),
      shape: (uu, vv, sgn, q) => {
        if (vv >= filletV) return q;
        const at = projectSide(uu, q, sgn);
        const S = model.surface(at.s, at.phi);
        const base = model.local(at.s, side > 0 ? model.top(at.s) : -model.bot(at.s), 0);
        return q.addScaledVector(S.sub(base).setZ(0), 1 - smooth(0, filletV, vv));
      },
      root: (uu, sgn) => {
        const t = thick(uu, 0) / L;
        if (t < 1e-5) return null;
        const s = lerp(f.s0, f.s1, uu);
        const ph = rootPhiAt(uu, t);
        const phi = sgn > 0 ? ph : 2 * Math.PI - ph;
        return { p: model.surface(s, phi).addScaledVector(model.normalAt(s, phi), -0.00035 * L), n: model.normalAt(s, phi) };
      },
      uv: (uu, vv, sgn, q) => {
        const at = projectSide(uu, q, sgn);
        const tip = side > 0 ? (sgn > 0 ? 0.015 : 2 * Math.PI - 0.015) : Math.PI;
        return [model.uOf(at.s), lerp(at.phi, tip, smooth(0, Math.max(0.2, sheath), vv)) / (2 * Math.PI)];
      },
      pose: (uu, _vv, sgn) => {
        const s = lerp(f.s0, f.s1, uu);
        const phi = rootPhiAt(uu, tRoot(uu) / L);
        return model.poseAt(s, sgn > 0 ? phi : 2 * Math.PI - phi);
      },
      weight: (_u, vv) => Math.pow(clamp(vv), lerp(1.25, 1.65, smooth(0.2, 0.65, sheath))),
      kind: 1, side: 0,
    });
    const joint: Joint = { kind: 1, amp: f.h * (spiny ? 0.07 : cart ? 0.03 : squami ? 0.11 : 0.16), freq: 5.2, phase: idx * 1.37 };
    addMesh(g, finMaterial(ctx, { ...f, rays, solid: cart, spots: f.spots ?? finSpots, root: sheath }, joint), cart ? 2 : 4, true).name = `fin:${side > 0 ? 'dorsal' : 'anal'}:${idx}`;

    const nSp = spiny ? rays : Math.min(leadSpines, rays);
    if (nSp > 0) {
      const parts: THREE.BufferGeometry[] = [];
      const r0 = clamp(0.32 * spacing, 0.0012 * L, 0.009 * L);
      const K = 12;
      for (let i = 0; i < nSp; i++) {
        const uI = (i + 0.5) / rays;
        const p1 = mid(uI, 1).p, p9 = mid(uI, 0.9).p;
        const pts = Array.from({ length: K + 1 }, (_, k) => {
          const vk = (k / K) * 1.1;
          return vk <= 1 ? mid(uI, vk).p : p1.clone().add(p1.clone().sub(p9).multiplyScalar((vk - 1) / 0.1));
        });
        const rr = r0 * (1.15 - 0.3 * (i / Math.max(1, nSp)));
        const sUV = model.uOf(lerp(f.s0, f.s1, uI));
        parts.push(tubeAlong(pts, (k) => rr * Math.pow(1 - k / K, 1.25) + 0.00025 * L, 7,
          (k) => ({ fin: [Math.pow(clamp((k / K) * 1.1), 1.25), uI, (k / K) * 1.1, 1], uv: [sUV, side > 0 ? 0.004 : 0.5] })));
      }
      addMesh(mergeGeometries(parts), spineMat(f.color, joint), 3, true);
      parts.forEach((p) => p.dispose());
    }
  };
  for (const f of fs.dorsal ?? []) median(f, 1);
  (fs.anal ?? []).forEach((f, i) => median(f, -1, i === 0 && hasSpinyDorsal && !isSpiny(f) ? 3 : 0));
  if (fs.finlets) {
    const fl = fs.finlets;
    for (let i = 0; i < fl.n; i++) {
      const s = lerp(fl.s0, fl.s1, i / Math.max(1, fl.n - 1));
      const w = ((fl.s1 - fl.s0) / fl.n) * 0.78;
      for (const sd of [1, -1] as const) median({ s0: s, s1: s + w, h: fl.h, shape: 'falcate', sweep: 38, rays: 3, color: fl.color, alpha: 0.96 }, sd);
    }
  }

  // ── 2. caudal fin: root continues the peduncle skin exactly, procurrent rays, flexible rays ──
  const caudal = (cs: CaudalSpec) => {
    if (cs.span <= 0.01 || cs.type === 'none') return;
    const len = cs.len ?? cs.span * 0.6;
    const up = cs.up ?? (cs.type === 'hetero' ? 0.68 : 0.5);
    const D: Record<string, { fork: number; p: number; lu: number; ld: number; tuft?: number }> = {
      forked: { fork: 0.38, p: 1.2, lu: 1, ld: 1 },
      lunate: { fork: 0.16, p: 0.82, lu: 1, ld: 1 },
      emarginate: { fork: 0.82, p: 1.65, lu: 1, ld: 1 },
      truncate: { fork: 0.96, p: 2.1, lu: 1, ld: 1 },
      rounded: { fork: 1, p: 2, lu: 0.52, ld: 0.52 },
      pointed: { fork: 1, p: 1, lu: 0.08, ld: 0.08 },
      hetero: { fork: 0.3, p: 1.12, lu: 1, ld: 0.48 },
      diphy: { fork: 0.8, p: 2, lu: 0.45, ld: 0.45, tuft: 0.45 },
      halfmoon: { fork: 1, p: 2.8, lu: 0.86, ld: 0.86 },
      lyre: { fork: 0.3, p: 2.6, lu: 1, ld: 1 },
      delta: { fork: 1, p: 1, lu: 1, ld: 1 },
      swallow: { fork: 0.1, p: 0.62, lu: 1.55, ld: 1.55 },
      hypo: { fork: 0.3, p: 1.1, lu: 0.78, ld: 1.42 },
      trilobe: { fork: 0.8, p: 2, lu: 0.5, ld: 0.5, tuft: 0.62 },
    };
    const d = D[cs.type] ?? D.forked;
    const lu = cs.lenUp ?? d.lu * len, ld = cs.lenDn ?? d.ld * len, lc = (cs.fork ?? d.fork) * len;
    const cart = sp.skin.kind === 'placoid' || cs.type === 'hetero';
    const rays = cart ? 0 : (cs.rays ?? 22);
    const flowing = cs.type === 'delta' || cs.type === 'halfmoon' || cs.type === 'veil' || cs.type === 'crown' || cs.type === 'double' || (cs.fray ?? 0) > 0.3;
    const sbAt = (uu: number) => 1 - (cart ? 0 : 0.035) * Math.pow(Math.max(0, 1 - Math.min(uu, 1 - uu) / 0.14), 2);
    const NU = clamp((rays || 12) * 4, 48, 144), NV = 18;
    const cache = Array.from({ length: NU + 1 }, (_, i) => {
      const uu = i / NU, sb = sbAt(uu);
      const yb = lerp(model.top(sb), -model.bot(sb), uu) * 0.985;
      const ph = model.phiAtY(sb, yb);
      const [y, z] = model.sectionYZ(sb, ph);
      return { sb, yb, y, z: Math.abs(z), ph };
    });
    const rc = (uu: number) => cache[Math.round(clamp(uu) * NU)];
    const sample = (uu: number, vv: number) => {
      const r = rc(uu);
      let yE = lerp(cs.span * up, -cs.span * (1 - up), uu) + sp.body.pedY;
      let xE: number;
      const customReach = caudalTrailFactor(cs, uu);
      if (customReach !== null) {
        xE = customReach * len;
      } else if (cs.type === 'rounded' || cs.type === 'halfmoon') {
        const th = (uu - 0.5) * Math.PI;
        const rLobe = cs.type === 'halfmoon' ? len : len * 1.15;
        xE = rLobe * Math.pow(Math.max(0, Math.cos(th * 0.94)), cs.type === 'halfmoon' ? 0.32 : 0.55);
        yE = lerp(cs.span * up, -cs.span * (1 - up), 0.5 - 0.5 * Math.cos(uu * Math.PI)) + sp.body.pedY;
      } else if (cs.type === 'delta') {
        xE = len * (0.86 + 0.14 * Math.cos((uu - 0.5) * Math.PI * 0.9));
      } else if (cs.type === 'spade') {
        xE = len * (0.34 + 0.92 * Math.pow(1 - Math.abs(2 * uu - 1), 1.1));
      } else if (cs.type === 'double') {
        xE = len * (0.3 + 0.86 * Math.pow(Math.sin(Math.PI * uu), 0.6)) * (1 - 0.52 * Math.exp(-Math.pow((uu - 0.5) / 0.085, 2)));
      } else if (cs.type === 'crown') {
        const nR = Math.max(7, Math.round((cs.rays ?? 18) / 2));
        const base = len * 1.05 * Math.pow(Math.max(0, Math.cos((uu - 0.5) * Math.PI * 0.94)), 0.34);
        xE = base * (0.74 + 0.26 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * uu * nR), 2.4));
        yE = lerp(cs.span * up, -cs.span * (1 - up), 0.5 - 0.5 * Math.cos(uu * Math.PI)) + sp.body.pedY;
      } else if (cs.type === 'whip') {
        xE = len * 0.36 * Math.pow(Math.max(0, Math.sin(Math.PI * uu)), 0.7) + len * 2.4 * Math.exp(-Math.pow((uu - 0.5) / 0.032, 2));
      } else if (cs.type === 'clavus') {
        xE = len * (0.5 + 0.5 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * uu * 4.5), 0.8)) * Math.pow(Math.max(0, Math.sin(Math.PI * uu)), 0.22);
      } else if (cs.type === 'veil') {
        xE = len * (0.55 + 1.05 * Math.pow(Math.max(0, Math.sin(Math.PI * clamp(uu * 0.86 + 0.1))), 0.8));
        yE -= 0.32 * xE;
      } else if (cs.type === 'sword') {
        xE = len * 0.9 * Math.pow(Math.max(0, Math.sin(Math.PI * (uu * 0.9 + 0.05))), 0.3) + len * 1.7 * Math.exp(-Math.pow((uu - 0.9) / 0.065, 2));
      } else if (cs.type === 'doubleEm') {
        xE = len * (0.79 + 0.21 * Math.cos(4 * Math.PI * (uu - 0.5)));
      } else if (uu < up) {
        const t = 1 - uu / up;
        xE = lc + (lu - lc) * Math.pow(t, d.p);
        if (cs.type === 'hetero') xE -= (lu - lc) * 0.17 * Math.exp(-Math.pow((t - 0.82) / 0.065, 2));
      } else {
        const t = (uu - up) / Math.max(1e-4, 1 - up);
        xE = lc + (ld - lc) * Math.pow(t, d.p);
      }
      if (d.tuft) xE += d.tuft * len * Math.exp(-Math.pow((uu - up) / 0.08, 2));
      const B = model.local(r.sb, r.yb, 0);
      const E = model.local(1 + xE, yE, 0);
      return new THREE.Vector3(lerp(B.x, E.x, Math.pow(vv, 1.12)), lerp(B.y, E.y, Math.pow(vv, 0.82)), 0);
    };
    const pedW = Math.max(0.006, model.hw(0.96)) * L;
    const thick = (uu: number, vv: number) => {
      const closeU = Math.sqrt(smooth(0, 0.03, uu) * smooth(1, 0.97, uu));
      const closeV = 1 - Math.pow(vv, 6);
      const tr = rc(uu).z * L;
      if (cart) {
        const axisBias = cs.type === 'hetero' ? 0.35 + 0.85 * Math.exp(-Math.pow((uu - 0.12) / 0.22, 2)) : 0.7;
        return Math.max(tr * Math.pow(1 - smooth(0, 0.3, vv), 2), pedW * axisBias * (1 - 0.75 * Math.pow(vv, 0.65)) * closeU) * closeV;
      }
      const core = cs.type === 'lunate' || (cs.foil ?? 0) > 0 ? pedW * 0.5 * (1 - smooth(0, 0.45, vv)) * Math.exp(-Math.pow((uu - 0.5) / 0.3, 2)) : 0;
      return (tr * Math.pow(1 - smooth(0, 0.22, vv), 2.2) + core + 0.0012 * L * closeU) * closeV;
    };
    const spacing = (cs.span * L) / Math.max(1, rays);
    const g = finShell({
      nu: NU, nv: NV, rays, vPow: 1.35,
      mid: (uu, vv) => ({ p: sample(uu, vv), n: Z }),
      thick, ridge: Math.min(0.28 * spacing, 0.005 * L), pleat: Math.min(0.2 * spacing, 0.01 * L) * (flowing ? 1.4 : 1),
      root: (uu, sgn) => {
        const r = rc(uu);
        return { p: model.local(r.sb, r.y, sgn * r.z), n: model.normalAt(r.sb, sgn > 0 ? r.ph : 2 * Math.PI - r.ph) };
      },
      uv: (uu, _vv, sgn) => {
        const r = rc(uu);
        const phi = sgn > 0 ? r.ph : 2 * Math.PI - r.ph;
        return [model.uOf(r.sb), phi / (2 * Math.PI)];
      },
      weight: (_u, vv) => Math.pow(clamp(vv), 1.2),
      kind: 3, side: 0,
    });
    const joint: Joint = { kind: 3, pivot: model.local(1, sp.body.pedY, 0), amp: cs.span * (cart ? 0.02 : flowing ? 0.09 : 0.05) };
    const mat = finMaterial(ctx, {
      color: cs.color, tip: cs.tip, mid: cs.mid, alpha: cart ? 1 : (cs.alpha ?? 0.92), rays, solid: cart, edge: cs.edge,
      spots: cs.spots ?? finSpots, spotCol: cs.spotCol, pattern: cs.pattern, fray: cs.fray, root: cart ? 0.3 : 0.14,
    }, joint);
    addMesh(g, mat, cart ? 2 : 4, true);
  };
  if (!sp.body.bend) caudal(fs.caudal);

  // ── 3. paired fins: a pinned root chord, an outward stroke and a symmetric clearance stop ──
  const contact = fs.pec || fs.pel ? pairedEnvelope(ctx) : undefined;
  const paired = (f: PairedFin, which: 'pec' | 'pel') => {
    const station = which === 'pec' ? model.pecStation : f.s;
    const at = model.attach(station, f.y, 1);
    const fr = model.frame(station);
    const el = f.elev * DEG, splay = f.splay * DEG;
    const sw = (f.sweep ?? (f.shape === 'shark' ? 24 : f.shape === 'falcate' ? 16 : 6)) * DEG;
    const dir = fr.T.clone().multiplyScalar(Math.cos(splay) * Math.cos(el) + Math.sin(sw) * Math.sin(splay) * 0.44)
      .addScaledVector(fr.N, Math.sin(el)).addScaledVector(Z, Math.sin(splay) * Math.cos(el * 0.42)).normalize();
    const minOut = model.bent ? 0.44 : 0.30;
    dir.addScaledVector(at.n, Math.max(0, minOut - dir.dot(at.n)) * 1.55).normalize();
    const chord = fr.N.clone().multiplyScalar(-Math.cos(splay)).addScaledVector(fr.T, Math.sin(splay));
    chord.addScaledVector(dir, -chord.dot(dir)).normalize();
    const finN = new THREE.Vector3().crossVectors(chord, dir).normalize();
    if (finN.dot(Z.clone().multiplyScalar(Math.cos(splay)).addScaledVector(fr.N, Math.sin(splay))) < 0) finN.negate();
    const basal = chord.clone().addScaledVector(at.n, -chord.dot(at.n)).normalize();
    const baseN = model.normY(station, f.y);
    const spread = (f.shape === 'fan' ? 49 : f.shape === 'veil' ? 32 : f.shape === 'round' ? 24 : f.shape === 'thread' ? 0.7 : 15) * DEG;
    const cart = f.shape === 'shark' || ((f.foil ?? 0) > 0 && (f.rays ?? 12) === 0);
    const lobe = f.shape === 'lobe';
    const rays = cart ? 0 : (f.rays ?? 12);
    const NU = clamp((rays || 13) * 4, 26, 88), NV = 19;
    const baseAt = (uu: number) => {
      const offset = (uu - 0.40) * f.base;
      const s = clamp(station + offset * basal.dot(fr.T), 0.002, 0.98);
      const phi = model.phiAtY(s, baseN + offset * basal.dot(fr.N));
      return { s, phi, p: model.surface(s, phi), n: model.normalAt(s, phi), pose: model.poseAt(s, phi) };
    };
    const cache = Array.from({ length: NU + 1 }, (_, i) => baseAt(i / NU));
    const base = (uu: number) => Math.abs(uu * NU - Math.round(uu * NU)) < 1e-6 ? cache[Math.round(uu * NU)] : baseAt(uu);
    const radius = Math.min(f.len * (cart ? 0.041 : 0.038), f.base * 0.13, 0.007) * L;
    const mid = (uu: number, vv: number): ShellSample => {
      const b = base(uu);
      const a = (uu - 0.42) * spread;
      const H = f.len * shapeH(f.shape, uu) * L;
      const ray = dir.clone().multiplyScalar(Math.cos(a)).addScaledVector(chord, Math.sin(a));
      ray.addScaledVector(b.n, Math.max(0, minOut - ray.dot(b.n)) * 1.4).normalize();
      const p = b.p.clone().addScaledVector(b.n, -0.00075 * L + H * 0.10 * smooth(0, 0.27, vv) * (1 - vv * 0.47))
        .addScaledVector(ray, vv * H)
        .addScaledVector(chord, (cart || f.shape === 'falcate' ? 0.15 : 0.075) * vv * vv * H)
        .addScaledVector(finN, Math.sin(vv * Math.PI * 0.8) * H * 0.035);
      return { p, n: finN };
    };
    const thick = (uu: number, vv: number) => {
      const edge = Math.pow(Math.max(0, Math.sin(Math.PI * uu)), cart ? 0.78 : 0.56) * (1 - smooth(0.79, 1, vv));
      if (cart) return radius * edge * clamp(f.foil ?? 1, 0.6, 1.3) * Math.pow(1 - vv, 1.04);
 