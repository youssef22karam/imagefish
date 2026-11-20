import * as THREE from 'three';
import type { BodyModel } from './model';
import type { Layer } from './types';
import { clamp, curve, lerp, rng, smooth } from './math';
import type { SkinLook } from './shader';
import { paintHeadMap, paintHeadTone } from './headmap';
import type { Species } from './types';

const photoSkinCache = new Map<string, HTMLCanvasElement | HTMLImageElement>();

export function registerPhotoSkin(key: string, source: HTMLCanvasElement | HTMLImageElement) {
  if (key) photoSkinCache.set(key, source);
}

export async function ensurePhotoSkinLoaded(sp: Species): Promise<void> {
  const url = sp.color?.photoSkin;
  if (!url || photoSkinCache.has(url) || typeof document === 'undefined') return;
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      photoSkinCache.set(url, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

const HI = typeof navigator !== 'undefined' && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
// Two albedo texels per visible fish pixel at desktop size; microstructure stays procedural at any zoom.
const TEX_BASE = HI ? 2048 : 1536, TEX_MAX = HI ? 4096 : 2048;
let TW = TEX_BASE, TH = TEX_BASE / 2;
/** Square texels on the living surface: u spans the body length and v the full girth, so the albedo sheet takes the
 *  proportions of the fish. A fixed 2:1 sheet smeared pigment along eels, needlefishes and billfishes (few texels per
 *  SL along the body) and blurred it around globe-, box- and disc-shaped fishes (few texels per SL around the girth). */
function sizeSheet(model: BodyModel) {
  const span = 1 - model.sMin;
  let g = 0;
  for (let i = 0; i < 9; i++) g += model.halfPerim(clamp(model.sMin + span * (0.06 + (0.88 * i) / 8), 0.002, 0.999));
  g /= 9;
  const ratio = clamp((2 * g) / span, 0.18, 1);
  const area = TEX_BASE * TEX_BASE * 0.5 * (ratio < 0.3 ? 1.35 : 1);
  const w = clamp(Math.round(Math.sqrt(area / ratio) / 64) * 64, 1024, TEX_MAX);
  TW = w;
  TH = clamp(Math.round((w * ratio) / 64) * 64, 384, TEX_MAX);
}
type Pt = [number, number];
type RGBA = [number, number, number, number];
// ── procedural noise: every pigment outline is displaced by it, mottles and marbling are grown from it ──
function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number, seed: number, oct = 4) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f, seed + i * 31); n += amp; amp *= 0.5; f *= 2.07; }
  return s / n;
}
/** 1-D fractal noise, roughly in [-1, 1] */
const n1 = (x: number, seed: number) => (fbm(x, (seed % 97) * 0.173 + 0.5, seed, 3) - 0.5) * 2.4;
const C0 = new THREE.Color();
/** css colour → sRGB bytes + alpha (accepts #hex, names and rgb()/rgba()) */
function rgbOf(c: string): RGBA {
  const m = /^rgba?\(([^)]+)\)$/i.exec(c.trim());
  if (m) { const v = m[1].split(',').map((x) => parseFloat(x)); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; }
  C0.set(c);
  const hex = C0.getHex(THREE.SRGBColorSpace);
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 1];
}
const css = (q: RGBA | number[], a = 1) => `rgba(${Math.round(q[0])},${Math.round(q[1])},${Math.round(q[2])},${a})`;
/** Catmull-Rom through [s,h] points */
function crm(pts: Pt[], closed: boolean, seg = 10): Pt[] {
  const n = pts.length, out: Pt[] = [];
  if (n < 2) return pts.slice();
  const P = (i: number) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
const pairs = (p: number[]): Pt[] => { const o: Pt[] = []; for (let i = 0; i + 1 < p.length; i += 2) o.push([p[i], p[i + 1]]); return o; };
/** constant-width (SL) ribbon along an [s,h] polyline, built in isotropic skin space (s, h·halfPerim) */
function ribbon(ctx: CanvasRenderingContext2D, pts: Pt[], w: number, hp: (s: number) => number, taper = 0, fadeEnds = false) {
  const iso = pts.map(([s, h]) => [s, h * hp(s)] as Pt);
  const n = iso.length, lf: Pt[] = [], rt: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = iso[Math.max(0, i - 1)], b = iso[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const t = n > 1 ? i / (n - 1) : 0;
    const fade = fadeEnds ? 0.1 + 0.9 * Math.sqrt(smooth(0, 0.07, t) * smooth(0, 0.07, 1 - t)) : 1;
    const ww = (w / 2) * Math.max(0.05, 1 - taper * t) * fade;
    for (const [arr, sg] of [[lf, 1], [rt, -1]] as [Pt[], number][]) {
      const x = iso[i][0] - ty * ww * sg, y = iso[i][1] + tx * ww * sg;
      arr.push([x, y / hp(x)]);
    }
  }
  ctx.beginPath();
  lf.forEach(([s, h], k) => (k ? ctx.lineTo(s, h) : ctx.moveTo(s, h)));
  for (let i = rt.length - 1; i >= 0; i--) ctx.lineTo(rt[i][0], rt[i][1]);
  ctx.closePath();
}
/** contiguous runs of `true` (pigment bands broken into dashes) */
function runs(keep: boolean[], cb: (a: number, b: number) => void) {
  let i0 = -1;
  for (let i = 0; i <= keep.length; i++) {
    const k = i < keep.length && keep[i];
    if (k && i0 < 0) i0 = i;
    if (!k && i0 >= 0) { if (i - 1 - i0 >= 2) cb(i0, i - 1); i0 = -1; }
  }
}
/** the scale lattice shared by the painter (pigment per scale) and the shader (relief per scale) */
export function scaleLattice(model: BodyModel) {
  const n = Math.max(8, model.sp.skin.scales);
  const aspect = [0.15, 0.3, 0.5, 0.7, 0.85].reduce((a, q) => a + model.halfPerim(q), 0) / 5;
  return { n, rows: Math.max(6, Math.round(n * aspect)), aspect };
}
/** optical / structural description of the integument, evaluated per pixel in the shader */
export function makeSkinLook(model: BodyModel, bumpTex: THREE.Texture, seed = 1): SkinLook {
  const sp = model.sp, c = sp.color, k = sp.skin.kind;
  const span = 1 - model.sMin;
  const { n, rows, aspect } = scaleLattice(model);
  // the dedicated cranial map (headmap.ts): relief slopes, cavity tone and integument class of the head
  let headMap: ReturnType<typeof paintHeadMap> = null;
  try { headMap = paintHeadMap(model, seed); } catch { headMap = null; }
  const scaled = sp.skin.scales > 0 && (k === 'cycloid' || k === 'ctenoid' || k === 'ganoid');
  const se = c.layers?.find((l) => l.k === 'scaleEdge') as Extract<Layer, { k: 'scaleEdge' }> | undefined;
  return {
    n: n * span, rows, aspect: aspect / span,
    girth: Array.from({ length: 16 }, (_, i) => model.halfPerim(clamp(model.sMin + (span * i) / 15, 0.002, 0.999)) / span),
    kind: scaled ? (k === 'cycloid' ? 1 : k === 'ctenoid' ? 2 : 3) : k === 'placoid' ? 4 : k === 'warty' || k === 'bony' ? 5 : 0,
    bump: scaled ? clamp(sp.skin.bump, 0.3, 1.4) : clamp(sp.skin.bump, 0.1, 2),
    head0: model.uOf(sp.HL * (k === 'ctenoid' ? 0.58 : 0.76)),
    head1: model.uOf(sp.HL * 1.06),
    edge: new THREE.Color(se?.c ?? '#000000'),
    edgeA: se ? (se.a ?? 0.35) : 0,
    silver: clamp((c.metal ?? 0.08) * 1.5 + (c.iri ?? 0) * 0.4, 0, 1),
    speck: c.trans ? 0.12 : k === 'placoid' ? 0.22 : 0.32,
    mottle: k === 'warty' ? 0.22 : k === 'smooth' || k === 'placoid' ? 0.11 : 0.08,
    texBump: 0.0035 * (k === 'warty' ? 2.6 : k === 'bony' ? 1.7 : 1),
    bumpTex,
    headMap: headMap?.tex ?? null,
    headU0: headMap ? model.uOf(headMap.s0) : 0,
    headU1: headMap ? model.uOf(headMap.s1) : 0,
    headK: new THREE.Vector2(headMap?.kx ?? 1, headMap?.ky ?? 1),
    headScaleK: headMap?.scaleK ?? 1.6,
  };
}
/** anatomical landmarks of the head and flank in texture space (s, h) – shared by albedo and relief */
function landmarks(model: BodyModel) {
  const sp = model.sp, e = sp.eye, m = sp.mouth, hl = sp.HL;
  const hp = (s: number) => model.halfPerim(clamp(s, 0.002, 0.999));
  const oper: Pt[] = [];
  const g0 = model.gills.find((q) => q.kind === 'opercle');
  if (g0) for (let k = 0; k <= 48; k++) { const h = lerp(g0.h0 + 0.02, g0.h1 - 0.02, k / 48); oper.push([g0.edge(h), h]); }
  const gsh: Pt[][] = model.gills.map((q) => Array.from({ length: 33 }, (_, k) => {
    const v = 0.03 + 0.94 * (k / 32), h = lerp(q.h0, q.h1, v);
    return [q.edge(h) + q.over * Math.sqrt(Math.sin(Math.PI * v)), h] as Pt;
  }));
  const preop: Pt[] = [];
  if (model.hasOpercle() && e.d > 0) {
    const s0 = Math.max(e.s + e.d * 0.9, hl * 0.62);
    for (let k = 0; k <= 30; k++) {
      const t = k / 30;
      preop.push([s0 + (hl * 0.8 - s0) * 0.15 * Math.sin(Math.PI * t * 0.5) - 0.1 * hl * t * t, 0.42 + 0.4 * t]);
    }
  }
  const maxUp: Pt[] = [], maxLo: Pt[] = [];
  if (model.hasJaw() && m.gape >= 0.055 && model.wrap >= 0 && sp.skin.kind !== 'placoid' && m.lip < 0.75) {
    const { mouthTip: mt, rictus: rc } = model;
    const len = rc.s - mt.s;
    for (let k = 0; k <= 36; k++) {
      const t = k / 36;
      const s = lerp(mt.s + 0.1 * len, rc.s + 0.16 * len, t);
      const hc = model.seamPhi(Math.min(s, rc.s)) / Math.PI;
      const w = (0.003 + 0.17 * m.gape * Math.pow(t, 1.4)) * (1 - smooth(0.9, 1, t) * 0.85);
      maxUp.push([s, hc - w / hp(s)]);
      maxLo.push([s, hc]);
    }
  }
  const nares: [number, number, number][] = [];
  if (e.d > 0 && sp.plan !== 'ray' && sp.skin.kind !== 'placoid') {
    const hE = model.phiAtY(Math.max(0.002, e.s), model.normY(e.s, model.eyeYn)) / Math.PI;
    const sn = e.s - Math.min(e.d * 0.72, e.s * 0.42);
    const hMouth = model.hasJaw() && sn <= model.rictus.s ? model.seamPhi(sn) / Math.PI : 1;
    const hn = Math.min(hE - 0.02, hMouth - 0.075);
    if (sn >= 0.01 && hn > 0.055) nares.push([sn, hn, clamp(e.d * 0.044, 0.0011, 0.0026)]);
  }
  const branch: Pt[][] = [];
  if (model.hasOpercle() && hl > 0.14 && sp.plan === 'fish') {
    for (let i = 0; i < 5; i++) {
      const line: Pt[] = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        line.push([lerp(hl * (0.5 + 0.035 * i), hl * (1.0 - 0.025 * i), t), 0.868 + 0.024 * i - 0.012 * Math.sin(Math.PI * t)]);
      }
      branch.push(line);
    }
  }
  const lat: Pt[] = [];
  if (sp.plan === 'fish' && !sp.body.disc && !sp.body.bend && sp.skin.kind !== 'placoid' && hl < 0.6) {
    const cnt = Math.round(clamp(sp.skin.scales > 0 ? sp.skin.scales * (1 - hl) : 70, 24, 110));
    for (let i = 0; i < cnt; i++) {
      const t = (i + 0.5) / cnt;
      lat.push([lerp(hl * 1.03, 0.985, t), 0.33 + 0.17 * Math.pow(t, 1.3)]);
    }
  }
  return { oper, gsh, preop, maxUp, maxLo, nares, branch, lat };
}
/**
 * The ventral "face" of batoids: nostrils with the nasal curtain, the transverse mouth and five pairs of gill slits,
 * placed by exact inversion of the body section (lateral offset z → skin coordinate h on the underside).
 */
function rayFace(model: BodyModel) {
  const sp = model.sp;
  const out = { mouth: [] as Pt[], nares: [] as Pt[][], curtain: [] as Pt[], slits: [] as Pt[][] };
  if (!(sp.plan === 'ray' || /Rays/.test(sp.group))) return out;
  const hz = (s: number, z: number) => {
    let lo = Math.PI / 2, hi = Math.PI;
    for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (Math.abs(model.sectionYZ(s, m)[1]) > z) lo = m; else hi = m; }
    return (lo + hi) / 2 / Math.PI;
  };
  const P = (s: number, z: number): Pt => [s, hz(s, Math.max(0, z))];
  const oval = (cs: number, cz: number, a: number, b: number, th: number) => Array.from({ length: 21 }, (_, k) => {
    const t = (k / 20) * Math.PI * 2;
    return P(cs + Math.cos(t) * a * Math.cos(th) - Math.sin(t) * b * Math.sin(th), cz + Math.cos(t) * a * Math.sin(th) + Math.sin(t) * b * Math.cos(th));
  });
  const slit = (cs: number, cz: number, len: number, bow: number, tilt: number) => Array.from({ length: 11 }, (_, k) => {
    const t = k / 10;
    return P(cs + (t - 0.5) * len * tilt + bow * Math.sin(Math.PI * t), cz + (t - 0.5) * len);
  });
  const disc = sp.body.disc;
  if (disc && !model.hasJaw()) {
    // stingrays & skates: a small, gently arched transverse mouth well behind the snout
    const k = (disc.end / 0.5) * 1.3;
    const sM = disc.end * 0.22, zM = disc.span * 0.098;
    for (let i = 0; i <= 18; i++) { const t = i / 18; out.mouth.push(P(sM - 0.006 * (1 - t * t) + 0.0016 * Math.sin(t * 9), t * zM)); }
    out.nares.push(oval(sM - 0.025 * k, zM * 0.64, 0.0088 * k, 0.0033 * k, 0.62));
    out.curtain = [P(sM - 0.036 * k, 0), P(sM - 0.036 * k, zM * 0.4), P(sM - 0.018 * k, zM * 0.5), P(sM - 0.005 * k, zM * 0.46), P(sM - 0.0045 * k, 0.001)];
    for (let i = 0; i < 5; i++) out.slits.push(slit(sM + (0.036 + i * 0.016) * k, zM * (1.78 - i * 0.15), 0.017 * k * (1 - i * 0.08), 0.0022, 0.25));
  } else if (disc) {
    // mobulids: five long gill slits on the underside behind the terminal mouth
    for (let i = 0; i < 5; i++) {
      const s = 0.13 + i * 0.031, z0 = 0.05 + i * 0.004, z1 = z0 + 0.072 * (1 - i * 0.1);
      out.slits.push(Array.from({ length: 13 }, (_, j) => { const t = j / 12; return P(s - 0.009 * Math.sin(Math.PI * t) + 0.006 * t, lerp(z0, z1, t)); }));
    }
  } else {
    // sawfishes: shark-like ventral head – nostrils in front of the mouth, five gill slits behind it
    const sM = sp.mouth.s, hl = sp.HL;
    const zN = model.hw(Math.max(0.01, sM - 0.02)) * 0.42;
    out.nares.push(oval(sM - 0.022, zN, 0.0075, 0.003, 0.5));
    for (let i = 0; i < 5; i++) {
      const s = hl * (0.78 + i * 0.07);
      out.slits.push(slit(s, model.hw(s) * (0.4 - i * 0.012), 0.016 * (1 - i * 0.06), 0.0018, 0.2));
    }
  }
  return out;
}
/**
 * Texture space: u = s (snout→tail), v = φ / 2π.
 * Patterns are authored in (s, h) with h = φ/π: 0 dorsal midline, 0.5 lateral midline, 1 ventral midline – and mirrored onto both flanks.
 * Each layer is drawn on a scratch sheet and composited with its own feathering, so pigment boundaries are soft, organic and
 * never accumulate where shapes overlap (one pigment field per layer, as chromatophores are).
 */
export function paintSkin(model: BodyModel, seed: number) {
  const sp = model.sp;
  sizeSheet(model);
  const c = sp.color;
  const cv = document.createElement('canvas');
  cv.width = TW; cv.height = TH;
  const g = cv.getContext('2d')!;
  const spanS = 1 - model.sMin;
  const SX = TW / spanS, OX = (-model.sMin / spanS) * TW;
  const hp = (s: number) => model.halfPerim(Math.min(0.999, Math.max(model.sMin + 0.002, s)));
  const flank = (ctx: CanvasRenderingContext2D, flip: boolean, fn: () => void) => {
    ctx.save();
    ctx.setTransform(SX, 0, 0, flip ? -TH / 2 : TH / 2, OX, flip ? TH : 0);
    fn();
    ctx.restore();
  };
  const both = (ctx: CanvasRenderingContext2D, fn: () => void) => {
    flank(ctx, false, fn);
    flank(ctx, true, fn);
  };
  // ── countershading: smooth S-shaped transitions, no linear kinks ─────────
  {
    const [a, b] = c.cs ?? [0.3, 0.68];
    const w = clamp((b - a) * 0.8, 0.035, 0.24);
    const T = rgbOf(c.top), S = rgbOf(c.side), B = rgbOf(c.belly);
    const grad = g.createLinearGradient(0, 0, 0, TH / 2);
    for (let i = 0; i <= 48; i++) {
      const h = i / 48;
      const t1 = smooth(a - w / 2, a + w / 2, h), t2 = smooth(b - w / 2, b + w / 2, h);
      grad.addColorStop(h, css([0, 1, 2].map((k) => lerp(lerp(T[k], S[k], t1), B[k], t2))));
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, TW, TH / 2);
    g.save(); g.translate(0, TH); g.scale(1, -1); g.fillRect(0, 0, TW, TH / 2); g.restore();
  }
  // ── cylindrically unwrapped 2D specimen skin albedo (seamless dorsal/ventral & mirrored flanks) ──
  const photoUrl = c.photoSkin;
  const photoBlend = clamp(c.photoBlend ?? 0.84, 0, 1);
  let asyncPhotoTarget: { url: string } | null = null;
  if (photoUrl && photoBlend > 0.01) {
    const src = photoSkinCache.get(photoUrl);
    if (src) {
      g.save();
      g.globalAlpha = photoBlend;
      g.imageSmoothingEnabled = true;
      g.drawImage(src, OX, 0, SX, TH / 2);
      g.save();
      g.translate(0, TH);
      g.scale(1, -1);
      g.drawImage(src, OX, 0, SX, TH / 2);
      g.restore();
      g.restore();
    } else if (typeof Image !== 'undefined') {
      asyncPhotoTarget = { url: photoUrl };
    }
  }
  // seamless rostral pigmentation blending into the head skin for integrated bills, swords, paddles and saws
  if (model.sMin < 0 && sp.rostrum?.color) {
    const q = rgbOf(sp.rostrum.color);
    const uEnd = model.uOf(0.055);
    for (const flip of [false, true]) {
      g.save();
      if (flip) { g.translate(0, TH); g.scale(1, -1); }
      const gx = g.createLinearGradient(0, 0, uEnd * TW, 0);
      gx.addColorStop(0, css(q, 0.88)); gx.addColorStop(0.68, css(q, 0.55)); gx.addColorStop(1, css(q, 0));
      g.fillStyle = gx;
      g.fillRect(0, 0, uEnd * TW, TH * 0.42);
      g.restore();
    }
  }
  // ── scratch sheet + feathered compositing ────────────────────────────────
  const sc = document.createElement('canvas');
  sc.width = TW; sc.height = TH;
  const d = sc.getContext('2d')!;
  const canBlur = typeof (g as unknown as { filter?: unknown }).filter === 'string';
  const flush = (soft: number, alpha = 1, op: GlobalCompositeOperation = 'source-over') => {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = clamp(alpha, 0, 1);
    g.globalCompositeOperation = op;
    const px = soft * SX;
    if (canBlur && px > 0.4) g.filter = `blur(${px.toFixed(2)}px)`;
    g.drawImage(sc, 0, 0);
    g.restore();
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.shadowBlur = 0; d.shadowColor = 'rgba(0,0,0,0)';
    d.clearRect(0, 0, TW, TH);
  };
  /** per-pixel pigment field (mottles, marbling, vermiculation) evaluated at low resolution and filtered up */
  const fieldOnto = (W0: number, fn: (s: number, y: number, h: number) => number, s0: number, s1: number, h0: number, h1: number) => {
    const H0 = Math.max(16, Math.round(W0 / 4));
    const fc = document.createElement('canvas');
    fc.width = W0; fc.height = H0;
    const fx = fc.getContext('2d')!;
    const img = fx.createImageData(W0, H0), D = img.data;
    for (let i = 0; i < W0; i++) {
      const s = model.sMin + ((i + 0.5) / W0) * spanS;
      const ws = (s0 <= model.sMin + 1e-3 ? 1 : smooth(s0 - 0.015, s0 + 0.015, s)) * (s1 >= 0.999 ? 1 : 1 - smooth(s1 - 0.015, s1 + 0.015, s));
      if (ws <= 0) continue;
      const hs = hp(s);
      for (let j = 0; j < H0; j++) {
        const h = (j + 0.5) / H0;
        const wh = (h0 <= 0 ? 1 : smooth(h0 - 0.03, h0 + 0.03, h)) * (h1 >= 1 ? 1 : 1 - smooth(h1 - 0.03, h1 + 0.03, h));
        if (wh <= 0) continue;
        const a = fn(s, h * hs, h) * ws * wh;
        if (a <= 0.004) continue;
        const k = (j * W0 + i) * 4;
        D[k] = 255; D[k + 1] = 255; D[k + 2] = 255; D[k + 3] = Math.round(clamp(a) * 255);
      }
    }
    fx.putImageData(img, 0, 0);
    d.save();
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.imageSmoothingEnabled = true; d.imageSmoothingQuality = 'high';
    d.drawImage(fc, 0, 0, TW, TH / 2);
    d.translate(0, TH); d.scale(1, -1); d.drawImage(fc, 0, 0, TW, TH / 2);
    d.restore();
  };
  /** colourise the scratch (white mask) with one pigment */
  const tint = (col: RGBA) => {
    d.save(); d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-in'; d.fillStyle = css(col); d.fillRect(0, 0, TW, TH);
    d.restore();
  };
  /** spread n points over a region – dart throwing with a minimum spacing gives the even, never-overlapping spread of real spots */
  const place = (n: number, s0: number, s1: number, h0: number, h1: number, bias: number, even: number, R: () => number): Pt[] => {
    const pts: Pt[] = [];
    const midGirth = hp((s0 + s1) / 2);
    const area = Math.abs(s1 - s0) * Math.abs(h1 - h0) * midGirth;
    const dmin = even * Math.sqrt(area / Math.max(1, n));
    const cell = Math.max(dmin, 1e-4);
    const grid = new Map<number, Pt[]>();
    const key = (i: number, j: number) => i * 92821 + j;
    let tries = 0;
    while (pts.length < n && tries < n * 40) {
      tries++;
      const s = s0 + R() * (s1 - s0);
      const h = h0 + Math.pow(R(), bias) * (h1 - h0);
      // Spots are pigment islands on actual skin area, not uniformly stamped UVs.
      if (R() > clamp(hp(s) / Math.max(midGirth, 0.015), 0.08, 1)) continue;
      if (dmin > 0) {
        const y = h * hp(s);
        const gi = Math.floor(s / cell), gj = Math.floor(y / cell);
        let ok = true;
        for (let di = -1; di <= 1 && ok; di++) for (let dj = -1; dj <= 1 && ok; dj++) {
          const arr = grid.get(key(gi + di, gj + dj));
          if (arr) for (const [qs, qy] of arr) if ((qs - s) ** 2 + (qy - y) ** 2 < dmin * dmin) { ok = false; break; }
        }
        if (!ok) continue;
        const kk = key(gi, gj), arr = grid.get(kk);
        if (arr) arr.push([s, y]); else grid.set(kk, [[s, y]]);
      }
      pts.push([s, h]);
    }
    return pts;
  };
  /** organic blob (low harmonics of the outline) of radius r (SL) at (s, h); q = 6 shape seeds */
  const blob = (ctx: CanvasRenderingContext2D, s: number, h: number, r: number, irr: number, el: number, ang: number, q: number[]) => {
    const hs = hp(s), K = r > 0.015 ? 32 : 18;
    const a1 = 0.24 * irr * (0.4 + q[3]), a2 = 0.15 * irr * (0.4 + q[4]), a3 = 0.08 * irr * (0.4 + q[5]);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.beginPath();
    for (let k = 0; k < K; k++) {
      const t = (k / K) * Math.PI * 2;
      const rr = r * (1 + a1 * Math.sin(2 * t + q[0] * 6.28) + a2 * Math.sin(3 * t + q[1] * 6.28) + a3 * Math.sin(5 * t + q[2] * 6.28));
      const x = Math.cos(t) * rr * el, y = (Math.sin(t) * rr) / el;
      const ps = s + x * ca - y * sa, ph = h + Math.min(0.5, (x * sa + y * ca) / hs);
      if (k === 0) ctx.moveTo(ps, ph); else ctx.lineTo(ps, ph);
    }
    ctx.closePath();
  };
  const drawBars = (L: Extract<Layer, { k: 'bars' }>, li: number) => {
    const h0 = L.h0 ?? 0, h1 = L.h1 ?? 1, rough = L.rough ?? 0.0012;
    const sd = seed * 7 + li * 101 + 7;
    const thr = L.brk ? (L.brk - 0.5) * 0.9 : -9;
    const col = rgbOf(L.c);
    const draw = (w: number, q: RGBA) => {
      d.fillStyle = css(q);
      for (const at of L.at) {
        const N = 84;
        const lf: Pt[] = [], rt: Pt[] = [], keep: boolean[] = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N, h = lerp(h0, h1, t);
          const off = (L.wob ?? 0) * Math.sin(h * (L.wf ?? 9) + at * 40) + (L.slant ?? 0) * (h - 0.5) + rough * 0.9 * n1(h * 6 + at * 31, sd);
          const ends = 0.6 + 0.4 * Math.pow(Math.sin(Math.PI * Math.min(1, t + 0.0001)), 0.3);
          const tp = 1 - (L.taper ?? 0) * Math.abs(t - 0.5) * 2;
          const ww = (w * ends * tp) / 2;
          lf.push([at + off - ww + rough * n1(h * 21 + at * 7, sd + 1), h]);
          rt.push([at + off + ww + rough * n1(h * 21 + at * 11, sd + 2), h]);
          keep.push(n1(h * 4.5 + at * 13, sd + 3) > thr);
        }
        both(d, () => runs(keep, (i0, i1) => {
          d.beginPath();
          for (let i = i0; i <= i1; i++) d.lineTo(lf[i][0], lf[i][1]);
          for (let i = i1; i >= i0; i--) d.lineTo(rt[i][0], rt[i][1]);
          d.closePath(); d.fill();
        }));
      }
    };
    if (L.edge) draw(L.w + (L.ew ?? 0.012) * 2, rgbOf(L.edge));
    draw(L.w, col);
    flush(L.soft ?? 0.0014, (L.a ?? 1) * col[3]);
  };
  const drawBand = (L: Extract<Layer, { k: 'band' }>, li: number) => {
    if (L.stops.length < 2) return;
    const front = curve(L.stops.map(([h, s]) => [h, s]));
    const back = curve(L.stops.map(([h, , s]) => [h, s]));
    const h0 = L.stops[0][0], h1 = L.stops[L.stops.length - 1][0];
    const sd = seed * 43 + li * 137;
    const N = 180, lf: Pt[] = [], rt: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const h = lerp(h0, h1, i / N);
      const rough = L.rough ?? 0.0016;
      lf.push([front(h) + rough * (n1(h * 17, sd) + 0.35 * n1(h * 41, sd + 3)), h]);
      rt.push([back(h) + rough * (n1(h * 16, sd + 9) + 0.35 * n1(h * 43, sd + 12)), h]);
    }
    const fill = (edge: number, color: string, gradient = false) => {
      if (gradient && L.shade) {
        const s0 = Math.min(...lf.map(([s]) => s)), s1 = Math.max(...rt.map(([s]) => s));
        const gr = d.createLinearGradient(s0, 0, s1, 0);
        gr.addColorStop(0, L.shade);
        gr.addColorStop(0.3, color);
        gr.addColorStop(0.74, color);
        gr.addColorStop(1, L.shade);
        d.fillStyle = gr;
      } else d.fillStyle = color;
      both(d, () => {
        d.beginPath();
        lf.forEach(([s, h], i) => (i ? d.lineTo(s - edge, h) : d.moveTo(s - edge, h)));
        for (let i = N; i >= 0; i--) d.lineTo(rt[i][0] + edge, rt[i][1]);
        d.closePath(); d.fill();
      });
    };
    if (L.edge) fill(L.ew ?? 0.008, L.edge);
    fill(0, L.c, true);
    flush(L.soft ?? 0.0007, L.a ?? 1);
  };
  const lattice = scaleLattice(model);
  let li = 0;
  for (const L of (c.layers ?? []) as Layer[]) {
    li++;
    switch (L.k) {
      case 'grad': {
        // one vertical soft band masked by a horizontal soft window (no strip banding)
        const rgb = rgbOf(L.c).slice(0, 3).join(',');
        const soft = L.soft ?? 0.04, softU = soft / spanS;
        const tmp = document.createElement('canvas');
        tmp.width = TW; tmp.height = TH / 2;
        const tg = tmp.getContext('2d')!;
        const win = (a0: number, a1: number, px: number, horizontal: boolean, cc: string, sf: number) => {
          const span = a1 - a0 + 2 * sf;
          const gr = horizontal ? tg.createLinearGradient((a0 - sf) * px, 0, (a1 + sf) * px, 0) : tg.createLinearGradient(0, (a0 - sf) * px, 0, (a1 + sf) * px);
          const st = Math.min(0.49, sf / span);
          for (let k = 0; k <= 6; k++) {
            const t = k / 6, e = t * t * (3 - 2 * t);
            gr.addColorStop(st * t, `rgba(${cc},${e.toFixed(3)})`);
            gr.addColorStop(1 - st * t, `rgba(${cc},${e.toFixed(3)})`);
          }
          tg.fillStyle = gr;
          tg.fillRect(0, 0, TW, TH / 2);
        };
        win(L.h0, L.h1, TH / 2, false, rgb, soft);
        tg.globalCompositeOperation = 'destination-in';
        win(model.uOf(L.s0), model.uOf(L.s1), TW, true, '0,0,0', softU);
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = (L.a ?? 1) * rgbOf(L.c)[3];
        g.drawImage(tmp, 0, 0);
        g.translate(0, TH); g.scale(1, -1);
        g.drawImage(tmp, 0, 0);
        g.restore();
        break;
      }
      case 'bars': drawBars(L, li); break;
      case 'band': drawBand(L, li); break;
      case 'eyeband': {
        const e = sp.eye;
        drawBars({ k: 'bars', at: [e.s + (L.ds ?? 0)], w: L.w, c: L.c, h0: L.h0 ?? 0, h1: L.h1 ?? 0.78, edge: L.edge, ew: L.ew, slant: L.slant ?? 0.04, rough: 0.0016, a: L.a, soft: L.soft }, li);
        break;
      }
      case 'stripe': {
        const s0 = L.s0 ?? 0, s1 = L.s1 ?? 1, rough = L.rough ?? 0.0008;
        const sd = seed * 7 + li * 101 + 13;
        const thr = L.brk ? (L.brk - 0.5) * 0.9 : -9;
        const col = rgbOf(L.c);
        const N = 150, up: Pt[] = [], dn: Pt[