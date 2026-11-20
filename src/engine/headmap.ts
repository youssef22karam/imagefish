// ─────────────────────────────────────────────────────────────────────────────
//  Head map: the cranial anatomy of head.ts rendered into one dedicated texture
//  that covers only the head of ONE flank (the other is its mirror image), so it
//  holds several times the detail the whole-body maps can give the head.
//    R, G  relief as surface slopes (∂height/∂s, ∂height/∂girth). Slopes – not
//          heights – so 8 bits never terrace and the shading stays smooth however
//          far the camera closes in on a pore or a suture.
//    B     cavity tone: nostril and pore pits, sutures and grooves darken.
//    A     integument class: 0 head scales · ¼ dermal bone · ½ naked skin · 1 trunk.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { BodyModel } from './model';
import { clamp, hashStr, lerp, rng, smooth } from './math';
import { headAnatomy, spline, type SH } from './head';
const PI = Math.PI;
const HI = typeof navigator !== 'undefined' && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
/** steepest relief slope the derivative channels can hold */
const GMAX = 1.6;
/** integument classes (alpha channel) */
const HEADSCALE = 0, BONE = 64, NAKED = 128, TRUNK = 255;
type G2 = CanvasRenderingContext2D;
type Ch = 0 | 1 | 2;
export interface HeadMap { tex: THREE.DataTexture; s0: number; s1: number; kx: number; ky: number; scaleK: number }
/** separable box blur (in place); two passes ≈ a Gaussian */
function blur(a: Float32Array, W: number, H: number, r: number, passes: number) {
  const b = new Float32Array(a.length), n = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) {
      const o = y * W;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[o + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { b[o + x] = acc / n; acc += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) { a[y * W + x] = acc / n; acc += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x]; }
    }
  }
  return a;
}
const dither = (i: number, k: number) => ((Math.imul(i + k, 0x9e3779b1) >>> 9) & 0xffff) / 65536 - 0.5;
export function paintHeadMap(model: BodyModel, seed: number): HeadMap | null {
  const A = headAnatomy(model, seed);
  if (!A) return null;
  const W = HI ? 1024 : 640, H = W, N = W * H;
  const { s0, s1, traits: T, cover: C, eye } = A;
  const sp = model.sp, L = model.L, hl = sp.HL;
  const k = clamp(hl, 0.12, 0.42); // feature unit: the head length
  const SX = W / (s1 - s0);
  const R = rng(Math.imul(seed | 0, 7919) + hashStr(sp.id) + 17);
  const X = (s: number) => (s - s0) * SX, Y = (h: number) => h * H;
  const sheet = (fill: string) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }) as G2;
    g.fillStyle = fill; g.fillRect(0, 0, W, H);
    return g;
  };
  // gA: broad forms (R raised, G lowered) · gB: fine forms (R raised, G lowered, B pits) · gM: integument class
  const gA = sheet('#000'), gB = sheet('#000'), gM = sheet(T.type === 'shark' ? '#fff' : 'rgb(128,128,128)');
  // First fundamental form of the skin over the head, so that sizes drawn here are true lengths on the fish and a pore
  // is round even where the two skin axes are skewed (steep foreheads): |∂P/∂s|, the part of ∂P/∂h along it, the rest.
  const GX = 44, GY = 30, GS = GX + 1;
  const mA = new Float32Array(GS * (GY + 1)), mB = new Float32Array(GS * (GY + 1)), mC = new Float32Array(GS * (GY + 1));
  {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), ps = new THREE.Vector3(), ph = new THREE.Vector3();
    model.rawMode = true;
    try {
      for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
        const s = clamp(lerp(s0, s1, i / GX), model.sMin + 0.006, 0.99), h = clamp(j / GY, 0.02, 0.98), dh = 0.012, ds = 0.004, o = j * GS + i;
        model.surface(s - ds, h * PI, a); model.surface(Math.min(0.995, s + ds), h * PI, b);
        ps.subVectors(b, a).multiplyScalar(1 / (2 * ds * L));
        model.surface(s, (h - dh) * PI, a); model.surface(s, (h + dh) * PI, b);
        ph.subVectors(b, a).multiplyScalar(1 / (2 * dh * L));
        const c = ph.dot(ps) / Math.max(1e-6, ps.length());
        mA[o] = clamp(ps.length(), 1, 3.2);
        mC[o] = clamp(c, -3, 3);
        mB[o] = Math.max(0.02, Math.sqrt(Math.max(0, ph.lengthSq() - c * c)));
      }
    } finally { model.rawMode = false; }
  }
  const met = (s: number, h: number): [number, number, number] => {
    const fx = clamp((s - s0) / (s1 - s0)) * GX, fy = clamp(h) * GY;
    const i = Math.min(GX - 1, Math.floor(fx)), j = Math.min(GY - 1, Math.floor(fy)), tx = fx - i, ty = fy - j, o = j * GS + i;
    const bl = (q: Float32Array) => lerp(lerp(q[o], q[o + 1], tx), lerp(q[o + GS], q[o + GS + 1], tx), ty);
    return [bl(mA), bl(mB), bl(mC)];
  };
  // ── drawing primitives (all sizes are true surface lengths in SL) ───────────
  const ink = (g: G2, ch: Ch, a: number) => {
    const v = Math.round(255 * clamp(a));
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgb(${ch === 0 ? v : 0},${ch === 1 ? v : 0},${ch === 2 ? v : 0})`;
  };
  const gray = (v: number, a = 1) => { gM.globalCompositeOperation = 'source-over'; gM.fillStyle = `rgba(${v},${v},${v},${a})`; };
  const poly = (g: G2, pts: SH[]) => {
    if (pts.length < 3) return;
    g.beginPath();
    pts.forEach(([s, h], i) => (i ? g.lineTo(X(s), Y(h)) : g.moveTo(X(s), Y(h))));
    g.closePath(); g.fill();
  };
  type Wd = number | ((t: number) => number);
  /** ribbon along a skin polyline: half-width wA on its A side (anterior of a dorsal→ventral line, ventral of a
   *  snout→tail line), wB on the other */
  const ribbon = (g: G2, pts: SH[], wA: Wd, wB: Wd = wA) => {
    const n = pts.length;
    if (n < 2) return;
    const lf: number[] = [], rt: number[] = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const m = met(p[0], p[1]);
      const d0 = b[0] - a[0], d1 = b[1] - a[1];
      let t1 = d0 * m[0] + d1 * m[2], t2 = d1 * m[1]; // tangent in an orthonormal frame of the tangent plane
      const tl = Math.hypot(t1, t2) || 1;
      t1 /= tl; t2 /= tl;
      const t = i / (n - 1);
      const wa = typeof wA === 'number' ? wA : wA(t), wb = typeof wB === 'number' ? wB : wB(t);
      const dh = t1 / m[1], ds = (-t2 - dh * m[2]) / m[0]; // unit normal (−t2, t1) → skin offsets
      lf.push(X(p[0] + ds * wa), Y(p[1] + dh * wa));
      rt.push(X(p[0] - ds * wb), Y(p[1] - dh * wb));
    }
    g.beginPath();
    g.moveTo(lf[0], lf[1]);
    for (let i = 1; i < n; i++) g.lineTo(lf[2 * i], lf[2 * i + 1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(rt[2 * i], rt[2 * i + 1]);
    g.closePath(); g.fill();
  };
  const spot = (g: G2, s: number, h: number, r: number, el = 1) => {
    const m = met(s, h);
    g.beginPath();
    for (let q = 0; q < 16; q++) {
      const t = (q / 16) * 2 * PI, n1 = Math.cos(t) * r * el, n2 = (Math.sin(t) * r) / el;
      const dh = n2 / m[1], ds = (n1 - dh * m[2]) / m[0];
      if (q) g.lineTo(X(s + ds), Y(h + dh)); else g.moveTo(X(s + ds), Y(h + dh));
    }
    g.closePath(); g.fill();
  };
  const ends = (t: number) => Math.sqrt(Math.max(0, Math.sin(PI * clamp(t * 0.94 + 0.03))));
  /** layers needed for a smooth profile across w */
  const steps = (w: number, lo = 3) => clamp(Math.ceil((w * SX) / 2.4), lo, 18);
  /** rounded ridge (ch 0) or groove (ch 1) of full width w */
  const ridge = (g: G2, ch: Ch, pts: SH[], w: number, a: number, taper = true) => {
    const n = steps(w / 2);
    for (let q = 1; q <= n; q++) { ink(g, ch, a / n); const ww = (w / 2) * (q / n); ribbon(g, pts, taper ? (t) => ww * ends(t) : ww); }
  };
  /** one-sided ramp: full height on the curve, dying out over w on its A side */
  const ramp = (g: G2, ch: Ch, pts: SH[], w: number, a: number) => {
    const n = steps(w, 4);
    for (let q = 1; q <= n; q++) { ink(g, ch, a / n); ribbon(g, pts, (t) => w * (q / n) * ends(t), 0.00005); }
  };
  const mound = (g: G2, ch: Ch, s: number, h: number, r: number, a: number) => {
    const n = steps(r);
    for (let q = 1; q <= n; q++) { ink(g, ch, a / n); spot(g, s, h, (r * q) / n); }
  };
  const jawed = model.hasJaw();
  const scaledSkin = sp.skin.scales > 0 && T.scaly > 0 && !!C;
  /** point on the preopercle edge, moved forward onto the cheek by d head lengths */
  const pre = (v: number, d = 0): SH => [Math.max(0.0025, C!.sPre(v) - d * hl), C!.h(v)];
  // ── 1. integument classes ───────────────────────────────────────────────────
  if (T.type !== 'shark') {
    const trunk: SH[] = [[s1 + 0.01, 0]];
    for (let j = 0; j <= 64; j++) trunk.push([A.nape(j / 64), j / 64]);
    trunk.push([s1 + 0.01, 1]);
    gray(TRUNK); poly(gM, trunk);
  }
  if (C && scaledSkin) {
    gray(HEADSCALE);
    if (T.scaly === 2) {
      // tiny scales run forward over the whole head; only lips and snout tip stay naked
      const head: SH[] = [[s0, 0]];
      for (let j = 0; j <= 64; j++) head.push([A.nape(j / 64) - 0.003, j / 64]);
      head.push([s0, 1]);
      poly(gM, head);
      gray(NAKED);
      if (jawed) {
        const lip: SH[] = [], a = Math.max(model.sSym, 0.004), b = model.rictus.s;
        for (let j = 0; j <= 24; j++) { const s = lerp(a, b, j / 24); lip.push([s, model.seamPhi(s) / PI]); }
        ribbon(gM, lip, 0.03 * k + 0.2 * sp.mouth.gape);
      }
      const tip = Math.min(0.02 + 0.1 * k, eye ? eye.s - 1.3 * eye.r : 0.03);
      if (tip > s0) gM.fillRect(0, 0, X(tip), H);
    } else {
      // scaled gill cover, cheek and nape; snout, jaws and the preopercle flange stay naked
      poly(gM, spline([C.op(0.07, 0.07), C.op(0.5, 0.05), C.op(0.9, 0.09), C.op(0.93, 0.3), C.op(0.92, 0.5), C.op(0.8, 0.62), C.op(0.5, 0.7), C.op(0.1, 0.68), C.op(0.05, 0.4), C.op(0.07, 0.07)], 6));
      if (eye) {
        const ck: SH[] = [A.polar(1.8 * eye.r, 96), A.polar(1.78 * eye.r, 45), A.polar(1.9 * eye.r, 4), pre(0.2, 0.06), pre(0.45, 0.055), pre(0.7, 0.06)];
        const jx = jawed ? A.sh(model.hinge.s + 0.5 * eye.r, model.hinge.y + 0.2 * eye.r) : A.polar(2.6 * eye.r, 80);
        if (ck[4][0] - ck[1][0] > 0.3 * eye.r) poly(gM, spline([...ck, jx, ck[0]], 6));
        const top: SH[] = [[eye.s + 0.7 * eye.r, 0], [eye.s + 1.2 * eye.r, eye.h * 0.45], A.polar(2.0 * eye.r, 330), A.polar(2.1 * eye.r, 356), pre(0.05, 0.05)];
        for (let j = 12; j >= 0; j--) { const h = (C.g.h0 * j) / 12; top.push([A.nape(h) - 0.003, h]); }
        poly(gM, top);
      }
    }
  }
  if (C) {
    if (!scaledSkin) {
      gray(BONE, 0.92); // opercle and subopercle: thin skin over bone
      poly(gM, spline([C.op(0.03, 0.05), C.op(0.5, 0.03), C.op(0.92, 0.07), C.op(0.95, 0.3), C.op(0.95, 0.55), C.op(0.9, 0.8), C.op(0.5, 0.86), C.op(0.02, 0.85), C.op(0, 0.45), C.op(0.03, 0.05)], 6));
    } else {
      gray(BONE, 0.85);
      poly(gM, spline([C.op(0.03, 0.7), C.op(0.5, 0.725), C.op(0.9, 0.64), C.op(0.95, 0.8), C.op(0.5, 0.87), C.op(0.02, 0.86), C.op(0.03, 0.7)], 6));
    }
    gray(BONE, 0.85); ribbon(gM, A.preop, (t) => 0.05 * k * ends(t), 0.002); // preopercle flange
  }
  // ── 2. orbit: infraorbital crescent, lachrymal, brow ────────────────────────
  if (eye && T.type !== 'shark') {
    let outer: SH[] = [], inner: SH[] = [], mid: SH[] = [];
    const flush = () => {
      if (outer.length >= 4) {
        gray(BONE, 0.78); poly(gM, [...outer, ...inner.slice().reverse()]);
        ridge(gA, 0, mid, 0.46 * eye.r, 0.14); // the infraorbitals stand as a low shelf under the eye
        ridge(gB, 1, outer, 0.0075 * k, 0.42); // their outer suture
      }
      outer = []; inner = []; mid = [];
    };
    for (let a = -10, i = 0; a <= 205; a += 5, i++) {
      const lach = 1 + 0.38 * smooth(138, 186, a); // the lachrymal reaches forward toward the upper jaw
      const ro = Math.min(T.ioW * eye.r * lach, 0.88 * A.clear(a));
      if (ro < 1.22 * eye.r) { flush(); continue; }
      outer.push(A.polar(ro, a)); inner.push(A.polar(1.1 * eye.r, a)); mid.push(A.polar((1.1 * eye.r + ro) / 2, a));
      if (i % 9 === 5) ridge(gB, 1, [A.polar(1.13 * eye.r, a), A.polar((1.1 * eye.r + ro) / 2, a + 2), A.polar(ro, a + 3)], 0.006 * k, 0.3, false);
    }
    flush();
    let brow: SH[] = [];
    const browOut = () => { if (brow.length > 5) ridge(gA, 0, brow, 0.44 * eye.r, 0.28); brow = []; }; // supraorbital margin of the frontal
    for (let a = 204; a <= 338; a += 6) { if (A.clear(a) > 1.5 * eye.r) brow.push(A.polar(1.3 * eye.r, a)); else browOut(); }
    browOut();
    gray(NAKED); spot(gM, eye.s, eye.h, 1.14 * eye.r); // lid skin
  }
  // ── 3. gill cover: preopercle edge, opercular sutures, striae, membrane, branchiostegal rays ──
  if (C) {
    const mar: SH[] = [];
    for (let j = 0; j <= 40; j++) mar.push(C.op(1, lerp(0.03, 0.97, j / 40)));
    gray(NAKED); ribbon(gM, mar, (t) => 0.022 * k * ends(t), 0.004); // soft opercular membrane at the free margin
    ramp(gA, 1, mar, 0.03 * k, 0.32); // …thinning toward its edge
    // the cheek rises to the crisp free edge of the preopercle, which steps down onto the gill cover
    ramp(gA, 0, A.preop, 0.055 * k, 0.6);
    ridge(gB, 0, A.preop, 0.012 * k, 0.5);
    ink(gB, 1, 0.62); ribbon(gB, A.preop, 0.00005, (t) => 0.011 * k * ends(t));
    if (T.serrate > 0.1) {
      for (let i = Math.floor(A.preop.length * 0.42); i < A.preop.length - 3; i += 2) {
        const p = A.preop[i], q = A.preop[i + 1], m = met(p[0], p[1]);
        let t1 = (q[0] - p[0]) * m[0] + (q[1] - p[1]) * m[2], t2 = (q[1] - p[1]) * m[1];
        const tl = Math.hypot(t1, t2) || 1, d = 0.006 * k;
        t1 /= tl; t2 /= tl;
        const dh = t1 / m[1], ds = (-t2 - dh * m[2]) / m[0];
        mound(gB, 0, p[0] - ds * d, p[1] - dh * d, 0.0045 * k, 0.55 * T.serrate);
      }
    }
    ridge(gB, 1, A.suture, 0.009 * k, 0.62);
    ink(gB, 0, 0.24); ribbon(gB, A.suture, 0.00005, (t) => 0.009 * k * ends(t)); // the opercle overlaps the subopercle
    ridge(gB, 1, A.inter, 0.007 * k, 0.42);
    for (const st of A.striae) ridge(gB, 0, st, 0.0065 * k, (0.16 + 0.3 * R()) * T.striae);
    for (const f of [0.52, 0.7, 0.85]) {
      const ring: SH[] = []; // growth lines parallel to the margin
      for (let j = 0; j <= 20; j++) ring.push(C.op(f, lerp(0.08, 0.6, j / 20)));
      ridge(gB, 1, ring, 0.005 * k, 0.1 + 0.12 * T.striae);
    }
    for (const ray of A.rays) ridge(gB, 0, ray, 0.011 * k, 0.4);
  }
  // ── 4. jaws, frontal ridges, cheek contour, nostrils, sensory pores ─────────
  if (A.maxUp.length) {
    const plate = [...A.maxUp, ...A.maxLo.slice().reverse()];
    ink(gA, 0, 0.46); poly(gA, plate);
    gray(BONE, 0.75); poly(gM, plate);
    ridge(gB, 1, A.maxUp, 0.0068 * k, 0.54); // the groove in which the maxilla slides under the lachrymal
    ridge(gB, 0, A.maxUp, 0.011 * k, 0.24);  // supramaxillary dorsal bevel
  }
  if (A.dentary.length) {
    ridge(gA, 0, A.dentary, 0.022 * k, 0.26); // lower jaw dentary bone ridge
    ridge(gB, 1, A.dentary, 0.0055 * k, 0.32); // mandibular sensory canal groove
    gray(BONE, 0.55); ribbon(gM, A.dentary, 0.012 * k);
  }
  for (const fr of A.frontal) {
    ridge(gA, 0, fr, 0.024 * k, 0.22); // supraorbital frontal crest
    ridge(gB, 0, fr, 0.0075 * k, 0.28);
  }
  if (A.cheekArc.length) {
    ramp(gA, 0, A.cheekArc, 0.036 * k, 0.22); // adductor mandibulae cheek contour
    ridge(gB, 1, A.cheekArc, 0.0055 * k, 0.18);
  }
  if (jawed && T.type !== 'shark') { const j = A.sh(model.hinge.s, model.hinge.y); mound(gA, 0, j[0], j[1], 0.038 * k, 0.28); }
  for (const n of A.nares) {
    if (T.type !== 'shark') { gray(NAKED); spot(gM, n.s, n.h, n.r * 3); }
    mound(gA, 1, n.s, n.h, n.r * 3.2, T.type === 'shark' ? 0.24 : 0.36); // nasal fossa
    mound(gB, 0, n.s, n.h, n.r * (1.45 + 0.55 * n.rim), T.type === 'shark' ? 0.28 : 0.3 + 0.55 * n.rim); // raised rim / nasal flap
    ink(gB, 2, T.type === 'shark' ? 0.85 : 1); spot(gB, n.s, n.h, n.r, T.type === 'shark' ? 2.0 : n.rim < 0.5 ? 1.35 : 1);
  }
  for (const c of A.canals) {
    if (T.type !== 'shark') {
      mound(gB, 0, c.p[0], c.p[1], c.r * 1.65, 0.16);
      ink(gB, 2, 0.72); spot(gB, c.p[0], c.p[1], c.r);
    } else {
      // Ampullae of Lorenzini on sharks are flush pinpoint pores, never raised volcano craters
      ink(gB, 1, 0.08); spot(gB, c.p[0], c.p[1], c.r * 1.15);
      ink(gB, 2, 0.38); spot(gB, c.p[0], c.p[1], c.r * 0.9);
    }
  }
  // ── 5. sculptured dermal bone (gars, bowfin, bony-tongues, catfishes), breeding tubercles, throat pleats ──
  if (T.armor > 0.12 && T.type === 'teleost') {
    const eM = eye ? met(eye.s, eye.h) : [1, 1, 0];
    const free = (p: SH) => p[0] > s0 + 0.008 && p[0] < A.nape(p[1]) - 0.004 && p[1] > 0.015 && p[1] < 0.985
      && (!eye || Math.hypot((p[0] - eye.s) * eM[0] + (p[1] - eye.h) * eM[2], (p[1] - eye.h) * eM[1]) > 1.22 * eye.r);
    const centres: SH[] = eye ? [A.polar(1.9 * eye.r, 290), A.polar(2.5 * eye.r, 335)] : [[0.45 * hl, 0.16], [0.7 * hl, 0.14]];
    if (eye && A.clear(190) > 2.3 * eye.r) centres.push(A.polar(2.3 * eye.r, 205));
    if (C) centres.push(pre(0.5, 0.11));
    for (const c of centres) {
      const n = 14 + Math.floor(R() * 8), m = met(c[0], c[1]);
      for (let i = 0; i < n; i++) {
        const a = ((i + R() * 0.6) / n) * 2 * PI, len = (0.05 + 0.06 * R()) * k, pts: SH[] = [];
        for (let j = 0; j <= 4; j++) {
          const q = lerp(0.22, 1, j / 4) * len, dh = (Math.sin(a) * q) / m[1];
          pts.push([c[0] + (Math.cos(a) * q - dh * m[2]) / m[0], c[1] + dh]);
        }
        if (pts.every(free)) ridge(gB, 0, pts, 0.0065 * k, (0.22 + 0.26 * R()) * T.armor);
      }
    }
    const hTop = eye ? Math.max(0.06, eye.h - 0.05) : 0.3;
    for (let i = 0; i < 260 * T.armor; i++) {
      const p: SH = [lerp(0.012, A.nape(0), R()), lerp(0.02, hTop, R())];
      if (free(p)) { ink(gB, 1, 0.3 * T.armor); spot(gB, p[0], p[1], (0.0028 + 0.003 * R()) * k); }
    }
    gray(BONE, 0.75 * T.armor);
    poly(gM, [[0.012, 0], [A.nape(0) - 0.004, 0], [A.nape(hTop) - 0.004, hTop], [0.012, hTop]]);
  }
  if (T.tubercles > 0 && eye) {
    for (let i = 0; i < 70 * T.tubercles; i++) {
      const a = lerp(100, 300, R()), rho = eye.r * lerp(1.5, 3.2, Math.pow(R(), 0.7));
      if (A.clear(a) < rho + 0.3 * eye.r) continue;
      const p = A.polar(rho, a);
      mound(gB, 0, p[0], p[1], (0.0042 + 0.0025 * R()) * k, 0.7);
    }
  }
  if (T.type === 'soft' && /Eels/.test(sp.group)) {
    for (let i = 0; i < 11; i++) {
      const h0 = lerp(0.56, 0.97, i / 10), pts: SH[] = [];
      for (let j = 0; j <= 16; j++) { const t = j / 16; pts.push([lerp(0.3 * hl, 1.02 * hl, t), h0 + 0.008 * Math.sin(t * 9 + i)]); }
      ridge(gB, 1, pts, 0.007 * k, 0.34);
    }
  }
  // ── 6. compose: heights → slopes, cavity tone, classes ──────────────────────
  const dA = gA.getImageData(0, 0, W, H).data, dB = gB.getImageData(0, 0, W, H).data, dM = gM.getImageData(0, 0, W, H).data;
  const broad = new Float32Array(N), fine = new Float32Array(N), pit = new Float32Array(N), cls = new Float32Array(N);
  for (let i = 0, q = 0; i < N; i++, q += 4) {
    broad[i] = (dA[q] - dA[q + 1]) / 255; fine[i] = (dB[q] - dB[q + 1]) / 255; pit[i] = dB[q + 2] / 255; cls[i] = dM[q] / 255;
  }
  blur(broad, W, H, HI ? 3 : 2, 2); blur(fine, W, H, 1, 1); blur(pit, W, H, 1, 1); blur(cls, W, H, 2, 2);
  const AB = 0.0125 * k, AF = 0.0052 * k, AP = 0.0046 * k; // amplitudes (SL) of broad forms, fine forms and pits
  const fx = new Float32Array(W);
  for (let x = 0; x < W; x++) { const u = (x + 0.5) / W; fx[x] = (1 - smooth(0.935, 0.992, u)) * (model.sMin < 0 ? smooth(0, 0.05, u) : 1); }
  const hgt = new Float32Array(N);
  for (let i = 0; i < N; i++) hgt[i] = (AB * broad[i] + AF * fine[i] - AP * pit[i]) * fx[i % W];
  const low = blur(hgt.slice(), W, H, HI ? 7 : 4, 2);
  const hpRef = model.halfPerim(clamp(0.6 * hl, 0.02, 0.9));
  const gx0 = (0.5 * SX) / GMAX, gy0 = (0.5 * H) / (hpRef * GMAX);
  const data = new Uint8Array(N * 4);
  for (let y = 0, i = 0; y < H; y++) {
    const wy = smooth(0, 3, y) * smooth(0, 3, H - 1 - y); // both flanks meet at the midlines: no crease there
    for (let x = 0; x < W; x++, i++) {
      const q = i * 4;
      const gx = (hgt[x < W - 1 ? i + 1 : i] - hgt[x > 0 ? i - 1 : i]) * gx0;
      const gy = (hgt[y < H - 1 ? i + W : i] - hgt[y > 0 ? i - W : i]) * gy0 * wy;
      data[q] = clamp(Math.round(128 + 127 * clamp(gx, -1, 1) + dither(i, 1)), 0, 255);
      data[q + 1] = clamp(Math.round(128 + 127 * clamp(gy, -1, 1) + dither(i, 77)), 0, 255);
      const dark = clamp(0.85 * pit[i] + 0.34 * Math.max(0, -fine[i]) + 0.1 * Math.max(0, -broad[i])) * fx[x];
      const cav = clamp(((hgt[i] - low[i]) / AF) * 0.11, -0.16, 0.1);
      data[q + 2] = clamp(Math.round((0.5 - 0.5 * dark + 0.09 * Math.max(0, fine[i]) * fx[x] + cav) * 255), 0, 255);
      data[q + 3] = clamp(Math.round(cls[i] * 255), 0, 255);
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return { tex, s0, s1, kx: GMAX * (s1 - s0) * L, ky: GMAX * hpRef * L, scaleK: T.scaleK };
}
/**
 * Living colour of the head, laid softly over the pigment pattern: melanophores crowding the skull roof, the dark
 * orbital rim, guanine sheen on the gill cover, blood showing through the thin opercular and branchiostegal
 * membranes, and flesh-toned lips. Evaluated as smooth fields at low resolution and filtered up.
 */
export function paintHeadTone(g: G2, model: BodyModel, seed: number, TW: number, TH: number) {
  const A = headAnatomy(model, seed);
  if (!A || model.sp.plan !== 'fish') return;
  const sp = model.sp, c = sp.color, hl = sp.HL, { eye, cover: C, traits: T } = A;
  const W0 = 224, H0 = 160;
  const lum = (hex: string) => { const q = new THREE.Color(hex); return 0.2126 * q.r + 0.7152 * q.g + 0.0722 * q.b; };
  const pale = clamp(lum(c.belly) * 1.2), paleS = clamp(lum(c.side) * 1.3);
  const mk = () => { const cv = document.createElement('canvas'); cv.width = W0; cv.height = H0; return cv; };
  const cm = mk(), co = mk();
  const gm = cm.getContext('2d') as G2, go = co.getContext('2d') as G2;
  const im = gm.createImageData(W0, H0), io = go.createImageData(W0, H0);
  const jawed = model.hasJaw();
  const SHEEN = [236, 240, 238], BLUSH = [204, 82, 76], LIP = [214, 128, 118];
  for (let i = 0; i < W0; i++) {
    const u = (i + 0.5) / W0, s = clamp(lerp(A.s0, A.s1, u), 0.003, 0.99);
    const env = (1 - smooth(0.84, 0.98, u)) * (model.sMin < 0 ? smooth(0, 0.06, u) : 1);
    const hp = model.halfPerim(s);
    const hSeam = jawed && s >= model.sSym && s <= model.rictus.s + 0.012 ? model.seamPhi(Math.min(s, model.rictus.s)) / PI : -1;
    for (let j = 0; j < H0; j++) {
      const h = (j + 0.5) / H0, q = (j * W0 + i) * 4;
      let mul = 1 - 0.15 * (1 - smooth(0.04, 0.34, h)) * env;
      let aS = 0, aB = 0, aL = 0;
      if (eye) {
        const rho = Math.hypot(s - eye.s, model.yAt(s, h * PI) - eye.y) / eye.r;
        mul *= 1 - 0.2 * Math.exp(-Math.pow((rho - 1.12) / 0.42, 2)) * env;
      }
      if (C) {
        const v = (h - C.g.h0) / (C.g.h1 - C.g.h0);
        if (v > 0 && v < 1) {
          const f = (s - C.sPre(v)) / Math.max(1e-4, C.sMar(v) - C.sPre(v));
          if (f > 0 && f < 1.04) {
            aS = Math.pow(Math.sin(PI * clamp(f)), 0.8) * Math.pow(Math.sin(PI * clamp(v / 0.78)), 0.8) * 0.17 * (0.3 + T.silver) * env;
            aB = smooth(0.6, 0.99, f) * smooth(0.38, 0.72, v);
          }
        }
        aB = Math.max(aB, 0.7 * smooth(0.85, 0.95, h) * smooth(0.3 * hl, 0.46 * hl, s) * (1 - smooth(0.72 * hl, 0.9 * hl, s)));
        aB *= (0.05 + 0.24 * pale * pale) * env;
      }
      if (hSeam >= 0) aL = Math.exp(-Math.pow((Math.abs(h - hSeam) * hp) / (0.005 + 0.011 * sp.mouth.lip), 2)) * 0.13 * (0.25 + paleS) * env;
      const m = Math.round(255 * clamp(mul));
      im.data[q] = im.data[q + 1] = im.data[q + 2] = m; im.data[q + 3] = 255;
      const a = 1 - (1 - aS) * (1 - aB) * (1 - aL), wsum = aS + aB + aL || 1;
      for (let ch = 0; ch < 3; ch++) io.data[q + ch] = Math.round((SHEEN[ch] * aS + BLUSH[ch] * aB + LIP[ch] * aL) / wsum);
      io.data[q + 3] = Math.round(255 * clamp(a));
    }
  }
  gm.putImageData(im, 0, 0); go.putImageData(io, 0, 0);
  const x0 = model.uOf(A.s0) * TW, w = (model.uOf(A.s1) - model.uOf(A.s0)) * TW;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = true;
  for (const flip of [false, true]) {
    g.save();
    if (flip) { g.translate(0, TH); g.scale(1, -1); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'multiply'; g.drawImage(cm, x0, 0, w, TH / 2);
    g.globalCompositeOperation = 'source-over'; g.drawImage(co, x0, 0, w, TH / 2);
    g.restore();
  }
  g.restore();
}
