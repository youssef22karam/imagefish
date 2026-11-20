import * as THREE from 'three';
import { clamp, lerp, rng, smooth } from './math';
import { Batch, faceOut, grid, type C3, type Q4 } from './geom';
import { patchMaterial } from './shader';
import type { Ctx } from './ctx';
const PI = Math.PI, PI2 = Math.PI * 2;
/** fused dental plates: enamel gradient, median suture, growth lines, tooth mosaic at the cutting edge */
function beakTexture(color: string, seed: number) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d')!;
  const R = rng(seed + 4711);
  const base = new THREE.Color(color), white = new THREE.Color('#fbf7ea');
  const css = (c: THREE.Color) => '#' + c.getHexString();
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, css(base.clone().lerp(white, 0.78)));
  gr.addColorStop(0.22, css(base.clone().lerp(white, 0.4)));
  gr.addColorStop(1, css(base.clone().multiplyScalar(0.82)));
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 128);
  // growth lines running from the base to the cutting edge
  for (let x = 0; x < 256; x += 2 + R() * 3) {
    g.fillStyle = `rgba(0,0,0,${0.02 + R() * 0.07})`;
    g.fillRect(x, 0, 1 + R(), 128);
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(255,255,255,${0.03 + R() * 0.05})`;
    g.fillRect(0, 24 + i * 17 + R() * 6, 256, 2);
  }
  // mosaic of fused teeth along the cutting edge
  for (let i = 0; i < 150; i++) {
    const x = R() * 256, y = R() * R() * 34;
    g.fillStyle = `rgba(255,255,250,${0.1 + R() * 0.22})`;
    g.beginPath(); g.ellipse(x, y, 2 + R() * 2.5, 1.5 + R() * 2, 0, 0, PI2); g.fill();
  }
  // median suture between the left and right plate
  g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(124, 0, 8, 128);
  g.fillStyle = 'rgba(8,10,10,0.62)'; g.fillRect(127, 0, 2, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
/**
 * Lips, labial webs, oral cavity, tongue, dentition / beak – all scaled to the measured jaw.
 *
 * Everything is built on ONE curve, the oral rim (seam of the body loft), parametrised by 3D arc
 * length from the midline to the rictus. Along it a moving frame is carried: T (along the rim), N (the
 * true skin normal) and B (across the rim, toward the upper jaw – found by probing the skin). Each
 * lip is a rounded fold of the head skin that lives entirely on ITS side of the seam: its root row
 * lies on the skin (dropped onto the analytic surface, welded normals, same texture), it swells and
 * rolls over to the seam, then turns into the mouth. Closed lips therefore meet in one clean crease
 * instead of two tubes pushed through each other.
 */
export function buildMouth(ctx: Ctx) {
  const { sp, model, L, u, seed, addMesh } = ctx;
  if (!model.hasJaw()) return;
  const m = sp.mouth, c = sp.color;
  const { rictus: rc, sSym, wrap } = model;
  const s00 = wrap === 0 ? 0 : sSym;
  const fold = (phi: number) => (phi <= PI ? phi : PI2 - phi);
  const blendWeights = (from: Q4, to: Q4, t: number): Q4 =>
    [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t), lerp(from[3], to[3], t)];
  // ── the oral rim by arc length: 0 on the midline … 1 at the rictus ────────
  const NR = 240;
  const rs: number[] = [], rl: number[] = [];
  {
    let prev: THREE.Vector3 | null = null, acc = 0;
    for (let i = 0; i <= NR; i++) {
      const t = i / NR, s = s00 + (rc.s - s00) * t * t;
      const p = model.surface(s, model.seamPhi(s));
      if (i === 0) p.z = 0;
      if (prev) acc += p.distanceTo(prev);
      rs.push(s); rl.push(acc); prev = p;
    }
  }
  const rimLen = Math.max(1e-6, rl[NR]);
  const rimS = (uu: number) => {
    const target = clamp(uu) * rimLen;
    let lo = 0, hi = NR;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rl[mid] < target) lo = mid; else hi = mid; }
    return lerp(rs[lo], rs[hi], (target - rl[lo]) / Math.max(1e-9, rl[hi] - rl[lo]));
  };
  interface Rim { s: number; phi: number; p: THREE.Vector3 }
  /** signed rim parameter: + right flank, − left flank */
  const rimAt = (sg: number): Rim => {
    const uu = Math.min(1, Math.abs(sg));
    const s = rimS(uu);
    const pf = model.seamPhi(s);
    const phi = sg >= 0 ? pf : PI2 - pf;
    const p = model.surface(s, phi);
    if (uu < 1e-6) p.z = 0;
    return { s, phi, p };
  };
  interface Col { A: Rim; N: THREE.Vector3; Bup: THREE.Vector3; u: number }
  const colAt = (sg: number): Col => {
    const A = rimAt(sg);
    const T = rimAt(sg + 0.008).p.sub(rimAt(sg - 0.008).p);
    if (T.lengthSq() < 1e-14) T.set(0, 0, 1);
    T.normalize();
    const N = model.normalAt(A.s, A.phi);
    if (Math.abs(sg) < 1e-6) { N.z = 0; T.set(0, 0, 1); }
    N.addScaledVector(T, -N.dot(T));
    if (N.lengthSq() < 1e-10) N.copy(model.frame(A.s).T).negate();
    N.normalize();
    const B = new THREE.Vector3().crossVectors(N, T).normalize();
    // which way lies the upper jaw? probe the skin on both sides of the seam
    const probe = Math.max(0.0015 * L, 0.03 * rimLen);
    const upperness = (sign: number) => {
      const q = model.drop(A.p.clone().addScaledVector(B, sign * probe), N, probe);
      return model.seamPhi(q.s) - fold(q.phi);
    };
    if (upperness(1) < upperness(-1)) B.negate();
    return { A, N, Bup: B, u: Math.min(1, Math.abs(sg)) };
  };
  // ── proportions ──────────────────────────────────────────────────────────
  const fleshy = clamp(m.lip, 0, 1);
  const lipW0 = clamp(m.gape * (0.038 + 0.13 * fleshy), 0.0007, 0.009) * L;
  const lipH0 = lipW0 * (0.18 + 0.30 * fleshy);
  const isBeak = m.teeth === 'beak';
  const beakU = 0.74; // dental plates span this much of the rim either side of the midline
  const beakH = clamp(m.gape * 0.19, 0.0016, 0.011) * L; // exposed plate height at the midline
  const beakT = beakH * 0.26;
  const beakHat = (uu: number, lower: boolean) =>
    isBeak && uu < beakU ? beakH * Math.pow(Math.cos((PI / 2) * (uu / beakU)), 0.55) * (lower ? 0.85 : 1) : 0;
  /** thickness of a dental plate above the gum at distance d from its cutting edge */
  const plateT = (d: number, H: number, lower: boolean) => {
    if (H <= 1e-9) return 0;
    const x = clamp(d / (H * 1.25));
    const k = x < 0.3 ? lerp(lower ? 0.2 : 0.55, 1, smooth(0, 0.3, x)) : lerp(1, 0.04, smooth(0.3, 1, x));
    return beakT * Math.sqrt(H / beakH) * k;
  };
  // ── 1. LIPS ───────────────────────────────────────────────────────────────
  const NA = 96, OUT = 7, INN = 3, NV = OUT + INN;
  const cols: Col[] = [];
  for (let i = 0; i <= NA; i++) cols.push(colAt((i / NA) * 2 - 1));
  const triggerLips = sp.id === 'clown-triggerfish';
  const lipMat = triggerLips
    ? patchMaterial(new THREE.MeshPhysicalMaterial({ color: '#e6b422', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, vertexColors: true }), u)
    : ctx.tintMat;
  if (triggerLips) ctx.track(lipMat);
  const flesh: C3 = [1, lerp(1, 0.8, 0.3 + 0.5 * fleshy), lerp(1, 0.78, 0.3 + 0.5 * fleshy)];
  const inside: C3 = [0.4, 0.19, 0.19];
  for (const isLower of [false, true]) {
    const sgn = isLower ? -1 : 1;
    const rootN: THREE.Vector3[] = [];
    const edge: { p: THREE.Vector3; s: number; phi: number }[] = [];
    const g = grid(NA, NV, (uu, vv) => {
      const i = Math.round(uu * NA), k = Math.round(vv * NV);
      const C = cols[i];
      const taper = (0.045 + 0.955 * (1 - smooth(0.67, 1, C.u))) * (isLower ? 0.92 : 1);
      const w = lipW0 * taper, hmax = lipH0 * taper;
      const Hb = beakHat(C.u, isLower);
      const off = Hb * 0.58; // on beaked fishes the lip is drawn back and rests on the dental plate
      const hEdge = 0.5 * hmax + plateT(off, Hb, isLower) * 1.05;
      let q: { p: THREE.Vector3; s: number; phi: number }, h: number, tint: number, col: C3;
      if (k <= OUT) {
        const e = k / OUT; // 0 root on the skin … 1 free edge at the seam
        const d = off + w * Math.pow(1 - e, 1.1);
        q = d < 1e-7 ? { p: C.A.p.clone(), s: C.A.s, phi: C.A.phi }
          : model.drop(C.A.p.clone().addScaledVector(C.Bup, sgn * d), C.N, 0.5 * d + 0.002 * L);
        h = hmax * (e < 0.62 ? smooth(0, 0.62, e) : 1 - 0.5 * Math.pow((e - 0.62) / 0.38, 2))
          + plateT(d, Hb, isLower) * 1.05 * smooth(0, 0.45, e);
        if (k === 0) rootN[i] = model.normalAt(q.s, q.phi);
        if (k === OUT) edge[i] = { p: q.p.clone(), s: q.s, phi: q.phi };
        tint = smooth(0.08, 0.7, e);
        col = [lerp(1, flesh[0], tint), lerp(1, flesh[1], tint), lerp(1, flesh[2], tint)];
        q.p.addScaledVector(C.N, h).addScaledVector(C.Bup, sgn * 0.02 * w * smooth(0.8, 1, e));
      } else {
        const t = (k - OUT) / INN; // rolling into the mouth
        const eb = edge[i];
        q = { p: eb.p.clone(), s: eb.s, phi: eb.phi };
        q.p.addScaledVector(C.N, hEdge - t * (hEdge + 1.3 * hmax + 0.003 * L * taper)).addScaledVector(C.Bup, sgn * 0.02 * w);
        const f = Math.pow(t, 0.7);
        col = [lerp(flesh[0], inside[0], f), lerp(flesh[1], inside[1], f), lerp(flesh[2], inside[2], f)];
      }
      const skin = model.poseAt(q.s, q.phi);
      const bite = model.poseAt(C.A.s, C.A.phi, isLower);
      const e = smooth(0, OUT, k);
      q.p.x += lerp(skin.jut, bite.jut, e);
      return { p: q.p, jaw: lerp(skin.jaw, bite.jaw, e), plastic: blendWeights(skin.plastic, bite.plastic, e), uv: skin.uv, col };
    }, false, true);
    const probe = Math.round(NA * 0.75);
    faceOut(g, 3 * (NA + 1) + probe, cols[probe].N);
    // weld the root of the fold to the head skin: same position, same shading normal → no visible join
    const GN = g.getAttribute('normal') as THREE.BufferAttribute;
    for (let i = 0; i <= NA; i++) {
      const n = rootN[i];
      if (!n) continue;
      GN.setXYZ(i, n.x, n.y, n.z);
      const k2 = i + NA + 1;
      const mm = new THREE.Vector3(GN.getX(k2), GN.getY(k2), GN.getZ(k2)).lerp(n, 0.5).normalize();
      GN.setXYZ(k2, mm.x, mm.y, mm.z);
    }
    addMesh(g, lipMat, 2, true).name = isLower ? 'lip:lower' : 'lip:upper';
  }
  // ── 2. LABIAL WEBS (plicae) – stretchy membranes in the corners of the mouth ──
  const webMat = patchMaterial(
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.side).lerp(new THREE.Color('#6a3036'), 0.5), roughness: 0.34, clearcoat: 0.6, side: THREE.DoubleSide }),
    u,
  );
  ctx.track(webMat);
  for (const side of [1, -1] as const) {
    const web = grid(22, 13, (uu, vv) => {
      const A = rimAt(side * lerp(0.62, 1, uu));
      const p = A.p.clone();
      const mid = Math.sin(PI * vv);
      // The web is a concave gusset *inside* the gape, not a flap over the cheek.
      const relief = (0.0018 + m.gape * 0.04 * (1 - uu) * mid) * L;
      p.addScaledVector(model.normalAt(A.s, A.phi), -relief);
      const upper = model.poseAt(A.s, A.phi, false);
      const lower = model.poseAt(A.s, A.phi, true);
      return { p, jaw: lerp(upper.jaw, lower.jaw, vv), plastic: blendWeights(upper.plastic, lower.plastic, vv) };
    }, side === -1);
    addMesh(web, webMat, 2, true);
  }
  // ── 3. ORAL CAVITY: vaulted palate, hyoid floor, tongue, pharynx ──────────
  // pale mucosa that darkens toward the throat (the cavity is unlit: depth = darkness)
  const mucosa = new THREE.Color('#c98f8c').lerp(new THREE.Color(c.belly), 0.25);
  const interiorMat = patchMaterial(
    new THREE.MeshPhysicalMaterial({ color: mucosa, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25, side: THREE.DoubleSide, vertexColors: true }),
    u,
  );
  ctx.track(interiorMat);
  const shade = (v: number, k = 1): C3 => { const f = lerp(0.8, 0.08, Math.pow(clamp(v), 0.75)) * k; return [f, f * 0.9, f * 0.9]; };
  const si0 = s00, si1 = rc.s + Math.min(0.018, m.gape * 0.27);
  const lipAtS = (s: number, side: 1 | -1) => {
    const pm = model.seamPhi(s);
    return model.surface(s, side === 1 ? pm : PI2 - pm);
  };
  const mid = (s: number) => ({ y: model.mouthY(s), top: model.top(s), bot: model.bot(s) });
  // Both cavity walls share their respective oral rim motion. Along the centreline the walls
  // arch into the head, not out through the snout; the rear wall stays dark.
  for (const lower of [false, true]) {
    addMesh(grid(26, 38, (uu, vv) => {
      const s = lerp(si0, si1, vv);
      const a = lipAtS(s, -1), b = lipAtS(s, 1);
      const edge = Math.sin(PI * uu);
      const { y, top, bot } = mid(s);
      const pm = model.seamPhi(s);
      const phi = lerp(PI2 - pm, pm, uu);
      const w = model.poseAt(s, uu < 0.5 ? PI2 - pm : pm, lower);
      const p = a.lerp(b, uu);
      p.z *= 1 - 0.10 * edge;
      const dep = (lower ? y + bot : top - y) * 0.38 * edge * smooth(si0, lerp(si0, si1, 0.38), s);
      p.addScaledVector(model.frame(s).N, (lower ? -1 : 1) * dep * L);
      const pl = blendWeights(w.plastic, model.plasticAt(s, phi, lower), 0.42 * edge);
      // No cheek expansion on the free centre of the oral lining.
      pl[1] *= 1 - 0.9 * edge;
      return { p, jaw: w.jaw, plastic: pl, col: shade(vv, lower ? 0.90 : 0.64) };
    }, lower, true), interiorMat, 1, true).name = lower ? 'oral:floor' : 'oral:palate';
  }
  // fleshy tongue (basihyal) on the floor of the mouth
  const ts0 = lerp(si0, rc.s, 0.22), ts1 = rc.s + 0.012;
  if (ts1 - ts0 > 0.012) {
    const tongueMat = patchMaterial(
      new THREE.MeshPhysicalMaterial({ color: mucosa.clone().lerp(new THREE.Color('#a8545c'), 0.45), roughness: 0.34, clearcoat: 0.75, side: THREE.DoubleSide, vertexColors: true }),
      u,
    );
    addMesh(grid(12, 16, (uu, vv) => {
      const s = lerp(ts0, ts1, vv);
      const hwT = Math.abs(lipAtS(s, 1).z) * 0.46 * Math.pow(Math.sin(PI * clamp(vv * 0.88 + 0.08)), 0.55);
      const { y, bot } = mid(s);
      const baseY = y - 0.34 * Math.max(0.004, y + bot);
      const dome = Math.max(0.003, (y + bot) * 0.26) * Math.sin(PI * uu) * Math.sin(PI * clamp(vv * 0.92 + 0.05));
      const p = model.local(s, baseY + dome, Math.sin((uu - 0.5) * PI) * hwT / L);
      p.x += model.jutAt(s, 0.3) * L * 0.6;
      const pl = model.plasticAt(s, PI * 0.95, true);
      return { p, jaw: model.jawWeight(s, 0.35), plastic: [0, 0, pl[2] * 0.8, 0], col: shade(0.15 + 0.8 * vv, 1.1) };
    }, false, true), tongueMat, 2);
  }
  // pharyngeal wall (deep shadow → the open mouth reads as a cavity, not a pink notch)
  const pharynxMat = patchMaterial(new THREE.MeshStandardMaterial({ color: '#12050a', roughness: 0.75, side: THREE.DoubleSide }), u);
  ctx.track(pharynxMat);
  addMesh(grid(12, 6, (uu, vv) => {
    const s = si1;
    const a = lipAtS(s, 1), b = lipAtS(s, -1);
    const { y, top, bot } = mid(s);
    const p = a.clone().lerp(b, uu);
    p.z *= 0.91;
    const up = 0.52 * Math.max(0.004, top - y) * Math.sin(PI * uu);
    const dn = -0.48 * Math.max(0.004, y + bot) * Math.sin(PI * uu);
    p.addScaledVector(model.frame(s).N, lerp(up, dn, vv) * L);
    const w = lerp(model.upperJawWeight(s, model.seamPhi(s)), model.jawWeight(s, 0.15), vv);
    const pl = model.plasticAt(s, PI * 0.9, true);
    return { p, jaw: w, plastic: [0, pl[1] * 0.8, pl[2] * 0.85 * vv, 0] };
  }), pharynxMat, 1, true);
  // ── 4. DENTITION ──────────────────────────────────────────────────────────
  if (isBeak) {
    // Fused dental plates (parrotfishes, puffers): two veneers that grow out of the gum and END at the
    // cleft. The upper plate overbites the lower by a few percent and stands slightly prouder, so the
    // closed beak shows one bite line – the plates can no longer pass through each other.
    const tex = beakTexture(m.beak ?? '#ece3ce', seed);
    const beakMat = patchMaterial(
      new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: tex, roughness: 0.26, clearcoat: 0.85, clearcoatRoughness: 0.12 }),
      u,
    );
    ctx.track(beakMat); ctx.track(tex);
    const NB = 64, NVB = 10;
    const bcols: Col[] = [];
    for (let i = 0; i <= NB; i++) bcols.push(colAt(((i / NB) * 2 - 1) * beakU));
    for (const isLower of [false, true]) {
      const sgn = isLower ? -1 : 1;
      const g = grid(NB, NVB, (uu, vv) => {
        const i = Math.round(uu * NB), k = Math.round(vv * NVB);
        const C = bcols[i];
        const H = beakHat(C.u, isLower);
        const edgeD = (isLower ? 0.018 : -0.024) * H; // + = on its own jaw, − = overbite across the cleft
        let d: number, t: number;
        if (k === 0) { d = edgeD + 0.14 * H; t = -0.9 * beakT * Math.sqrt(H / beakH); } // inner face of the cutting edge
        else if (k === 1) { d = edgeD + 0.03 * H; t = plateT(0, H, isLower) * 0.4; }
        else {
          const x = (k - 2) / (NVB - 2);
          d = lerp(edgeD, H * 1.25, Math.pow(x, 1.15));
          t = plateT(Math.max(0, d), H, isLower);
        }
        const q = Math.abs(d) < 1e-7 ? { p: C.A.p.clone() }
          : model.drop(C.A.p.clone().addScaledVector(C.Bup, sgn * d), C.N, 0.5 * Math.abs(d) + 0.002 * L);
        const p = q.p.addScaledVector(C.N, t);
        const jw = isLower ? model.jawWeight(C.A.s, 0) : model.upperJawWeight(C.A.s, C.A.phi);
        if (isLower) p.x += model.jutAt(C.A.s, 0) * L;
        return { p, jaw: jw, plastic: model.plasticAt(C.A.s, C.A.phi, isLower), uv: [uu, clamp((k - 1) / (NVB - 1))] as [number, number] };
      });
      const probe = Math.round(NB * 0.5);
      faceOut(g, 5 * (NB + 1) + probe, bcols[probe].N);
      addMesh(g, beakMat, 2, true);
    }
  } else if (m.teeth !== 'none' && m.tn > 0) {
    const batch = new Batch();
    // Sculpted, tapered tooth crown with pinched alveolar root neck and slight lingual recurve
    const cone = new THREE.ConeGeometry(0.24, 1, 12, 5);
    cone.translate(0, 0.5, 0);
    {
      const P = cone.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) {
        const y = clamp(P.getY(i), 0, 1);
        // Root collar narrows at y=0, swells slightly at y=0.14, then tapers smoothly to a sharp apex at y=1
        const profile = y < 0.999 ? (y < 0.15 ? lerp(0.72, 1.04, y / 0.15) : Math.pow(1 - (y - 0.15) / 0.85, 0.82) / Math.max(1e-4, 1 - y)) : 1;
        const curveZ = -0.055 * y * y * (1 - 0.35 * y);
        P.setXYZ(i, P.getX(i) * profile, y, P.getZ(i) * profile + curveZ);
      }
      cone.computeVertexNormals();
    }
    const tr = rng(seed + 77);
    const rows = m.teeth === 'shark' ? 2 : 1; // functional outer row + inner replacement row in sharks
    // snaggle-toothed: only deep-sea fang hunters and shortfin mako expose fangs outside the closed lips
    const snaggle = ['shortfin-mako', 'sloane-s-viperfish', 'black-dragonfish', 'humpback-anglerfish'].some((id) => sp.id === id || sp.id.startsWith(id + '~'))
      || (m.teeth === 'fang' && m.ts >= 0.017 && /Deep sea/.test(sp.group));
    const lipR = Math.max(lipH0 * 1.35, 0.0011 * L);
    // Exact 3D skin ceiling and floor at (station s, lateral offset zAbs in SL)
    const jawEnvelopeAt = (s0: number, zAbsSL: number) => {
      const s = clamp(s0, Math.max(0.0025, model.sMin + 0.002), 0.96);
      const wMax = model.hw(s);
      const zC = Math.min(zAbsSL, wMax * 0.82);
      const phiUp = model.phiAtZ(s, zC, true);
      const phiLo = model.phiAtZ(s, zC, false);
      const yCeil = model.sectionYZ(s, phiUp)[0] * L;
      const yFloor = model.sectionYZ(s, phiLo)[0] * L;
      return { s, wMax: wMax * L, yCeil, yFloor };
    };
    for (let row = 0; row < rows; row++)
      for (const side of [1, -1] as const)
        for (const upper of [true, false]) {
          const n = m.tn;
          for (let i = 0; i < n; i++) {
            const t = ((i + 0.5) / (n + 0.45)) * 0.84;
            const R0 = rimAt(side * t);
            const ctr = model.local(R0.s, model.mouthY(Math.min(R0.s, rc.s)), 0);
            const inset = (snaggle ? 0.10 : m.teeth === 'shark' ? 0.24 : 0.20) + row * 0.085;
            const f = model.frame(R0.s);
            const backOff = lipR * (snaggle ? 0.45 : m.teeth === 'shark' ? 1.45 : 1.25) + row * lipR * 0.6;
            const pBite = R0.p.clone().lerp(ctr, inset).addScaledVector(f.T, backOff);
            if (!upper) pBite.x += model.jutAt(R0.s, 0) * L;
            const sLoc = clamp(0.5 - pBite.x / L, Math.max(0.0025, model.sMin + 0.002), 0.96);
            const env = jawEnvelopeAt(sLoc, Math.abs(pBite.z) / L);
            // Keep dental arch strictly inside lateral cheek skin
            const maxZ = env.wMax * (snaggle ? 0.82 : 0.74);
            if (Math.abs(pBite.z) > maxZ) pBite.z = side * maxZ;
            const spanY = env.yCeil - env.yFloor;
            if (spanY < 0.0022 * L) continue;
            const ySeam = clamp(pBite.y, env.yFloor + 0.16 * spanY, env.yCeil - 0.16 * spanY);
            const availUp = Math.max(0, env.yCeil - ySeam);
            const availLo = Math.max(0, ySeam - env.yFloor);
            const availOwn = upper ? availUp : availLo;
            const availOpp = upper ? availLo : availUp;
            if (availOwn < 0.001 * L || availOpp < 0.0009 * L) continue;
            let h = m.ts * L * (row === 0 ? 1 : 0.72);
            let rad = 1, flatK = 1;
            switch (m.teeth) {
              case 'fang': h *= (i % 3 === 0 ? 1.42 : 0.64) * (1.16 - t * 0.52) * (0.9 + tr() * 0.2); rad = 0.46; break;
              case 'tri': rad = 1.42; flatK = 0.30; h *= 1.02 - 0.32 * t; break;
              case 'shark': rad = 1.45; flatK = 0.26; h *= (upper ? 1.04 : 0.84) * (1.05 - 0.42 * t); break;
              case 'needle': rad = 0.42; h *= 0.82 + tr() * 0.34; break;
              case 'fine': h *= 0.55; rad = 0.65; break;
            }
            // Seat the tooth base `lp` on the alveolar ridge inside its own jaw, leaving >= 68% of the jaw thickness outside the root!
            const rootDepth = Math.min(h * (snaggle ? 0.14 : 0.26), availOwn * 0.30);
            const lp = pBite.clone();
            lp.y = ySeam + (upper ? 1 : -1) * rootDepth;
            const dir = f.N.clone()
              .multiplyScalar(upper ? -1 : 1)
              .addScaledVector(f.T, (m.teeth === 'shark' || m.teeth === 'tri' ? 0.22 : 0.30) + row * 0.22)
              .add(new THREE.Vector3(0, 0, -side * (0.20 + 0.12 * t)))
              .normalize();
            const vCos = Math.max(0.35, Math.abs(dir.y));
            // Bound tooth height so closed-mouth teeth never pierce the opposite jaw skin (chin or snout)
            const maxCross = snaggle ? availOpp * 0.84 : Math.min(availOpp * 0.44, spanY * 0.34);
            const maxH = (rootDepth + maxCross) / vCos;
            h = Math.min(h, maxH, availOwn * 1.45);
            if (h < 0.0007 * L) continue;
            // Verify 3D tip clearance at the tip station so curved/subterminal snouts never expose tips at 0° gape
            const tip = lp.clone().addScaledVector(dir, h);
            const sTip = clamp(0.5 - tip.x / L, Math.max(0.0025, model.sMin + 0.002), 0.96);
            const envTip = jawEnvelopeAt(sTip, Math.abs(tip.z) / L);
            const margin = (snaggle ? 0.08 : 0.24) * (envTip.yCeil - envTip.yFloor);
            if (!snaggle) {
              if (upper && tip.y < envTip.yFloor + margin) {
                const safeY = envTip.yFloor + margin;
                if (lp.y > safeY && dir.y < -1e-4) h = Math.min(h, (lp.y - safeY) / -dir.y);
                else continue;
              } else if (!upper && tip.y > envTip.yCeil - margin) {
                const safeY = envTip.yCeil - margin;
                if (lp.y < safeY && dir.y > 1e-4) h = Math.min(h, (safeY - lp.y) / dir.y);
                else continue;
              }
            }
            if (h < 0.0007 * L) continue;
            // Align the tooth's wide mesio-distal blade along the dental arch tangent and its thin labio-lingual axis across the jaw
            const tA = rimAt(side * Math.min(0.98, t + 0.025)).p.sub(rimAt(side * Math.max(0.001, t - 0.025)).p);
            if (tA.lengthSq() < 1e-12) tA.set(0, 0, side);
            const yAx = dir.clone().normalize();
            const xAx = tA.addScaledVector(yAx, -tA.dot(yAx));
            if (xAx.lengthSq() < 1e-10) xAx.set(0, 0, 1).addScaledVector(yAx, -yAx.z);
            xAx.normalize();
            const zAx = new THREE.Vector3().crossVectors(xAx, yAx).normalize();
            // Ensure +zAx points lingually (into the mouth cavity) so the lingual recurve hooks inward
            const toCenter = ctr.clone().sub(lp);
            if (zAx.dot(toCenter) < 0) { xAx.negate(); zAx.negate(); }
            const mat4 = new THREE.Matrix4().makeBasis(
              xAx.multiplyScalar(h * rad),
              yAx.multiplyScalar(h),
              zAx.multiplyScalar(h * rad * flatK),
            ).setPosition(lp);
            const jw = upper ? model.upperJawWeight(R0.s, R0.phi) : model.jawWeight(R0.s, 0);
            batch.add(cone, mat4, jw, undefined, 0, model.plasticAt(R0.s, R0.phi, !upper));
          }
        }
    // Enameloid gradient from warm dentine root collar (v=0) to gleaming translucent white cusp (v=1)
    const tData = new Uint8Array(64 * 4);
    for (let y = 0; y < 64; y++) {
      const v = y / 63;
      const r = Math.round(lerp(210, 255, Math.pow(v, 0.55)));
      const g = Math.round(lerp(196, 254, Math.pow(v, 0.58)));
      const b = Math.round(lerp(172, 250, Math.pow(v, 0.65)));
      const o = y * 4;
      tData[o] = r; tData[o + 1] = g; tData[o + 2] = b; tData[o + 3] = 255;
    }
    const toothTex = new THREE.DataTexture(tData, 1, 64, THREE.RGBAFormat);
    toothTex.colorSpace = THREE.SRGBColorSpace;
    toothTex.magFilter = THREE.LinearFilter;
    toothTex.minFilter = THREE.LinearFilter;
    toothTex.needsUpdate = true;
    const toothMat = patchMaterial(new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: toothTex, roughness: 0.18, clearcoat: 0.78, clearcoatRoughness: 0.12 }), u);
    ctx.track(toothTex);
    cone.dispose();
    if (!batch.empty) addMesh(batch.build(), toothMat, 2).name = 'teeth';
  }
}
