import * as THREE from 'three';
import { BodyModel } from './model';
import type { Species } from './types';
import { clamp, DEG, lerp } from './math';
import { ensureAttrs, makeUniforms, patchMaterial, type FishUniforms } from './shader';
import { makeSkinLook, paintBump, paintSkin } from './skin';
import { buildMouth } from './mouth';
import { buildEyes } from './eyes';
import { buildGills } from './gills';
import { buildFins } from './fins';
import { buildExtras } from './extras';
import { buildDermis } from './dermis';
import type { Ctx } from './ctx';
const SWIM: Record<string, { amp: number; wave: number; freq: number; a0: number; pow: number; flap: number; finWave: number }> = {
  carangiform: { amp: 0.05, wave: 7, freq: 7, a0: 0.1, pow: 2.2, flap: 0.012, finWave: 0.003 },
  subcarangiform: { amp: 0.06, wave: 6.5, freq: 6, a0: 0.14, pow: 1.8, flap: 0.012, finWave: 0.003 },
  thunniform: { amp: 0.045, wave: 5.5, freq: 9, a0: 0.04, pow: 3.6, flap: 0.004, finWave: 0.0 },
  anguilliform: { amp: 0.065, wave: 12, freq: 6, a0: 0.3, pow: 1.1, flap: 0.01, finWave: 0.004 },
  ostraciiform: { amp: 0.06, wave: 2.5, freq: 8, a0: 0, pow: 7, flap: 0.03, finWave: 0.006 },
  labriform: { amp: 0.018, wave: 5, freq: 4, a0: 0.1, pow: 2, flap: 0.035, finWave: 0.004 },
  rajiform: { amp: 0.01, wave: 6, freq: 3, a0: 0, pow: 3, flap: 0.004, finWave: 0 },
  syngnathiform: { amp: 0.0, wave: 4, freq: 2, a0: 0, pow: 2, flap: 0.02, finWave: 0.015 },
  // sharks & sawfishes: stiff head and trunk, less than one wavelength on the body, the tail does the work
  selachian: { amp: 0.058, wave: 5.2, freq: 4.4, a0: 0.035, pow: 2.1, flap: 0.008, finWave: 0.002 },
  still: { amp: 0.012, wave: 5, freq: 3, a0: 0.1, pow: 2, flap: 0.01, finWave: 0.002 },
};
export interface FishBuild {
  group: THREE.Group;
  model: BodyModel;
  uniforms: FishUniforms;
  swim: (typeof SWIM)[string];
  wing: number;
  radius: number;
  dispose: () => void;
}
const PI = Math.PI, PI2 = Math.PI * 2;
/** An eyeball never outgrows the skull that houses it (generated, hybrid and measured heads alike). Oversized globes on a
 *  narrow forehead made the two orbital collars cross the dorsal midline and fold the skull into shards, and pushed the
 *  cornea out of the head like a bubble. The globe is limited by the local skull half-width and depth and kept behind
 *  the snout tip; turret eyes, bent bodies and batoids keep their own laws. */
export const EYE_FIT = { w: 1.3, d: 0.46 };
export function fitEye(sp: Species, L = 2): Species {
  const e = sp.eye, b = sp.body;
  if (!(e.d > 0) || sp.plan !== 'fish' || b.disc || (b.bend && b.bend.length > 1) || e.y >= 0.72) return sp;
  const m = new BodyModel(sp, L);
  const s = clamp(e.s, 0.01, 0.6);
  const depth = m.top(s) + m.bot(s), hw = m.hw(s);
  const dMax = Math.max(0.006, Math.min(EYE_FIT.w * hw, EYE_FIT.d * depth));
  const d = Math.min(e.d, dMax);
  const sNew = Math.max(e.s, d * 0.6 + 0.006);
  if (d >= e.d - 1e-6 && sNew <= e.s + 1e-6) return sp;
  return { ...sp, eye: { ...e, d: +d.toFixed(4), s: +sNew.toFixed(4) } };
}
// ─────────────────────────────────────────────────────────────────────────────
export function buildFish(sp: Species, seed = 1, { paint = true }: { paint?: boolean } = {}): FishBuild {
  const L = 2;
  // measured atlas species keep their photographed proportions; generated, hybrid and offspring heads are fitted
  if (sp.id.includes('~') || sp.id.startsWith('novo-')) sp = fitEye(sp, L);
  const model = new BodyModel(sp, L);
  const u = makeUniforms();
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const addMesh = (g: THREE.BufferGeometry, m: THREE.Material, order = 0, shareMat = false) => {
    ensureAttrs(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = order;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    group.add(mesh);
    disposables.push(g);
    if (!shareMat) disposables.push(m);
    return mesh;
  };
  const { rictus: rc, sSym, wrap } = model;
  const jawed = model.hasJaw();
  // ── BODY LOFT ──────────────────────────────────────────────────────────────
  // rings run continuously from the true anterior tip (sMin = −rostrum.len on billfishes/paddlefish/sawfish,
  // 0 otherwise) to the caudal base, packed at the tip and head and snapped onto jaw landmarks
  const NS0 = 264, nU = 30, nL = 26;
  const ring = 2 * (nU + nL) + 4;
  const sAt: number[] = [];
  if (model.sMin < 0) {
    const NR = 64;
    for (let i = 0; i < NR; i++) {
      const f = 0.5 - 0.5 * Math.cos((PI * i) / NR);
      sAt.push(lerp(model.sMin, 0, f));
    }
  }
  for (let i = 0; i <= NS0; i++) sAt.push(Math.pow(i / NS0, 1.55));
  // the rounded snout cap leaves the axis like √s: a few extra rings right at the pole keep it smooth
  if (model.sMin >= 0) {
    sAt.push(1.2e-5, 4.5e-5, 9.5e-5, 3.3e-4, 7.2e-4);
    sAt.sort((a, b) => a - b);
  }
  if (jawed) {
    // Explicit landmark stations prevent any triangle from straddling the point where the cleft starts.
    for (const v of [sSym, model.mouthTip.s, rc.s, model.hinge.s]) {
      if (v <= model.sMin || v >= 1) continue;
      const close = sAt.findIndex((s) => Math.abs(s - v) < 1e-5);
      if (close > 0) sAt[close] = v;
      else if (close < 0) sAt.push(v);
    }
    sAt.sort((a, b) => a - b);
  }
  const NS = sAt.length - 1;
  const nV = (NS + 1) * ring;
  const pos = new Float32Array(nV * 3);
  const uvs = new Float32Array(nV * 2);
  const jaw = new Float32Array(nV);
  const gill = new Float32Array(nV);
  const plastic = new Float32Array(nV * 4);
  const v3 = new THREE.Vector3();
  for (let i = 0; i <= NS; i++) {
    const s = sAt[i];
    const pm = model.seamPhi(s);
    const seg: [number, number, number, number][] = [
      [0, pm, nU, 0],
      [pm, PI, nL, 1],
      [PI, PI2 - pm, nL, -1],
      [PI2 - pm, PI2, nU, 0],
    ];
    let k = i * ring;
    for (const [a, b, n, lj] of seg) {
      for (let j = 0; j <= n; j++) {
        const phi = lerp(a, b, j / n);
        model.surface(s, phi, v3);
        const pose = model.poseAt(s, phi, lj !== 0);
        v3.x += pose.jut;
        jaw[k] = pose.jaw;
        plastic.set(pose.plastic, k * 4);
        gill[k] = pose.gill;
        pos.set([v3.x, v3.y, v3.z], k * 3);
        uvs.set([model.uOf(s), phi / PI2], k * 2);
        k++;
      }
    }
  }
  const idx: number[] = [];
  const segStart = [0, nU + 1, nU + nL + 2, nU + 2 * nL + 3];
  const segN = [nU, nL, nL, nU];
  for (let i = 0; i < NS; i++)
    for (let q = 0; q < 4; q++)
      for (let j = 0; j < segN[q]; j++) {
        // No ribbon of collapsed vertices in front of a wrapped mouth: once the
        // jaws separate that ribbon would become a visible triangular flap.
        if (jawed && sAt[i + 1] <= sSym + 1e-9 && (wrap > 0 ? q === 0 || q === 3 : wrap < 0 && (q === 1 || q === 2))) continue;
        const a = i * ring + segStart[q] + j, b = a + 1, c = a + ring, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
  const bodyG = new THREE.BufferGeometry();
  bodyG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  bodyG.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  bodyG.setAttribute('aJaw', new THREE.BufferAttribute(jaw, 1));
  bodyG.setAttribute('aGill', new THREE.BufferAttribute(gill, 1));
  bodyG.setAttribute('aPlastic', new THREE.BufferAttribute(plastic, 4));
  bodyG.setIndex(idx);
  bodyG.computeVertexNormals();
  {
    // weld the shading across the four seams of every ring. Coincident vertices share one normal, except
    // across the open cleft where the upper and lower lip must keep their own (that crease IS the mouth).
    const N = bodyG.getAttribute('normal') as THREE.BufferAttribute;
    const cleft0 = wrap === 0 ? 0 : sSym;
    for (let i = 0; i <= NS; i++) {
      const o = i * ring;
      const open = jawed && sAt[i] >= cleft0 - 1e-9 && sAt[i] < rc.s - 1e-9;
      const J: [number, boolean][] = [
        [o, false], [o + nU, false], [o + nU + 1, true], [o + nU + nL + 1, true],
        [o + nU + nL + 2, true], [o + nU + 2 * nL + 2, true], [o + nU + 2 * nL + 3, false], [o + ring - 1, false],
      ];
      const used = J.map(() => false);
      for (let a = 0; a < J.length; a++) {
        if (used[a]) continue;
        const grp = [J[a][0]];
        const ax = pos[J[a][0] * 3], ay = pos[J[a][0] * 3 + 1], az = pos[J[a][0] * 3 + 2];
        for (let b = a + 1; b < J.length; b++) {
          if (used[b]) continue;
          const dx = pos[J[b][0] * 3] - ax, dy = pos[J[b][0] * 3 + 1] - ay, dz = pos[J[b][0] * 3 + 2] - az;
          if (dx * dx + dy * dy + dz * dz < 1e-14 && (!open || J[a][1] === J[b][1])) { grp.push(J[b][0]); used[b] = true; }
        }
        if (grp.length < 2) continue;
        let x = 0, y = 0, z = 0;
        for (const q of grp) { x += N.getX(q); y += N.getY(q); z += N.getZ(q); }
        const l = Math.hypot(x, y, z) || 1;
        for (const q of grp) N.setXYZ(q, x / l, y / l, z / l);
      }
    }
    N.needsUpdate = true;
  }
  // Geometry diagnostics may skip rasterizing pigments; the lofts and the shader pose are identical.
  const neutral = () => new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  const skin = paint ? paintSkin(model, seed) : { tex: neutral() };
  const bump = paint ? paintBump(model, seed) : neutral();
  const look = makeSkinLook(model, bump, seed);
  if (look.headMap) disposables.push(look.headMap);
  const c = sp.color;
  const armored = sp.skin.kind === 'ganoid' || sp.skin.kind === 'bony';
  const matt = sp.skin.kind === 'placoid' || sp.skin.kind === 'warty';
  const skinParams = (): THREE.MeshPhysicalMaterialParameters => ({
    map: skin.tex,
    roughness: c.rough ?? 0.48,
    metalness: c.metal ?? 0.025,
    // The mucus film is thin. A thick glossy clearcoat turned red/orange tissue into pale plastic.
    clearcoat: matt ? 0.12 : armored ? 0.2 : 0.18,
    clearcoatRoughness: 0.38,
    iridescence: c.iri ?? 0,
    iridescenceIOR: 1.55,
    iridescenceThicknessMinimum: 180,
    iridescenceThicknessMaximum: 430,
    sheen: c.sheen ?? 0,
    sheenColor: new THREE.Color(c.side),
    transparent: !!c.trans,
    opacity: c.trans ? 1 - c.trans : 1,
  });
  const bodyMat = patchMaterial(new THREE.MeshPhysicalMaterial(skinParams()), u, undefined, { skin: look, cutSockets: true }) as THREE.MeshPhysicalMaterial;
  const tintMat = patchMaterial(new THREE.MeshPhysicalMaterial({ ...skinParams(), vertexColors: true }), u, undefined, { skin: look }) as THREE.MeshPhysicalMaterial;
  addMesh(bodyG, bodyMat, 1).name = 'body';
  disposables.push(skin.tex, bump, tintMat);
  // ── anatomical sub-builders (all positioned through the same BodyModel) ──
  const ctx: Ctx = {
    sp, model, L, u, seed, addMesh, bodyMat, tintMat, skinLook: look, skinTex: skin.tex, bump,
    skinMat: (extra) => patchMaterial(new THREE.MeshPhysicalMaterial({ ...skinParams(), ...extra }), u, undefined, { skin: look }) as THREE.MeshPhysicalMaterial,
    track: (d) => disposables.push(d),
  };
  if (jawed) buildMouth(ctx);
  buildEyes(ctx);
  buildGills(ctx);
  buildFins(ctx);
  buildExtras(ctx);
  buildDermis(ctx);
  // ── animation constants & plan orientation ────────────────────────────────
  const swim = SWIM[sp.swim.mode] ?? SWIM.carangiform;
  const fwd0 = model.frame(0).T.clone().negate();
  u.uFwd.value.set(fwd0.x, fwd0.y).normalize();
  u.uHinge.value.copy(model.hingeXY());
  u.uMaxGape.value = model.jawAngle() * DEG;
  u.uProtrude.value = model.protrudeAmt();
  u.uGular.value = model.gularAmt();
  {
    // opercular pump: amplitude of the free margin and the head ellipse that gives the outward direction
    const sH = clamp(sp.HL, 0.03, 0.9);
    const t = model.top(sH), b = model.bot(sH), w = model.hw(sH);
    u.uGillAmp.value = model.gills.length ? clamp(w * 0.17, 0.0035, 0.011) : 0;
    u.uGillE.value.set(model.local(sH, (t - b) / 2, 0).y, 1 / Math.pow(Math.max(1e-3, ((t + b) / 2) * L), 2), 1 / Math.pow(Math.max(1e-3, w * L), 2));
  }
  u.uL.value = L;
  u.uX0.value = model.local(0, 0, 0).x;
  u.uAmp.value = sp.body.bend ? 0 : swim.amp;
  u.uWave.value = swim.wave;
  u.uFreq.value = swim.freq;
  u.uA0.value = swim.a0;
  u.uPow.value = swim.pow;
  u.uFlap.value = swim.flap;
  u.uFinWave.value = swim.finWave;
  let wing = 0;
  if (sp.plan === 'ray') {
    wing = !!sp.cephalic ? 0.22 : 0.1;
    u.uSpan.value = (sp.body.disc?.span ?? 0.5) * L;
    u.uWingF.value = !!sp.cephalic ? 1.4 : 2.2;
  }
  u.uWing.value = wing;
  if (sp.plan === 'flatR') group.rotation.x = -Math.PI / 2;
  if (sp.plan === 'flatL') group.rotation.x = Math.PI / 2;
  const box = new THREE.Box3().setFromObject(group);
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const ctr = box.getCenter(new THREE.Vector3());
  const localCtr = ctr.clone().applyQuaternion(group.quaternion.clone().invert());
  // preserve exact z = 0 symmetry plane for all bilateral fishes & rays!
  if (sp.plan === 'fish' || sp.plan === 'ray') localCtr.z = 0;
  group.children.forEach((ch) => ch.position.sub(localCtr));
  return {
    group, model, uniforms: u, swim, wing, radius,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
