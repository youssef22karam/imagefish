import * as THREE from 'three';
import { clamp, lerp, smooth } from './math';
import { Batch, faceOut, finShell, grid, mirrorZ, orient, tubeAlong, type Q4 } from './geom';
import { patchMaterial } from './shader';
import { finMaterial } from './fins';
import type { Ctx } from './ctx';

/** Sawfish rostral denticles, lamprey disc, barbels / lures / cirri, spikes & spines, seadragon fronds.
 *  (Bills, swords, paddles, saws and forceps/pipette snouts are lofted directly as part of BodyModel.) */
export function buildExtras(ctx: Ctx) {
  const { sp, model, L, u, addMesh } = ctx;
  const disposables = { push: (d: { dispose: () => void }) => ctx.track(d) };
  const m = sp.mouth;
  // ── SAWFISH ROSTRAL TEETH (socketed along the body-lofted saw margin) ──────
  if (sp.rostrum?.kind === 'saw') {
    const ro = sp.rostrum;
    const batch = new Batch();
    const cone = new THREE.ConeGeometry(0.28, 1, 6); cone.translate(0, 0.5, 0);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const s = lerp(-ro.len * 0.94, -ro.len * 0.06, i / (n - 1));
      const w = model.hw(s);
      for (const sd of [1, -1] as const) {
        const p = model.local(s, 0, sd * w * 0.92);
        batch.add(cone, orient(p, new THREE.Vector3(0.18, 0, sd).normalize(), 0.0065 * L, 0.028 * L, 0.004 * L));
      }
    }
    cone.dispose();
    addMesh(batch.build(), patchMaterial(new THREE.MeshPhysicalMaterial({ color: '#f1ead9', roughness: 0.28, clearcoat: 0.45 }), u), 2);
  }

  // ── mobulid cephalic lobes ─────────────────────────────────────────────────
  // Continuations of the leading edge of the wing, with two converging skin faces.
  // The feeding lobe is a shallow, recurved scoop, not a fleshy tube or a barbel.
  if (sp.plan === 'ray' && sp.cephalic && sp.body.disc) {
    const d = sp.body.disc, lobe = sp.cephalic;
    const NU = 34, NV = 40;
    const head = d.head ?? 0.092;
    const length = lobe.length * L;
    const widthSL = clamp(lobe.width, head * 0.45, head * 0.76);
    const centerZ = head * 0.99;
    const roots = Array.from({ length: NU + 1 }, (_, i) => {
      const t = i / NU;
      const z = centerZ + (t - 0.5) * widthSL;
      let lo = 0.002, hi = Math.min(d.pW, 0.22);
      for (let k = 0; k < 22; k++) {
        const s = (lo + hi) * 0.5;
        if (model.hw(s) * 0.967 < z) lo = s; else hi = s;
      }
      const s = hi;
      const width = Math.min(z, model.hw(s) * 0.967);
      const top = model.phiAtZ(s, width, true), bottom = model.phiAtZ(s, width, false);
      const surfaceAt = (phi: number) => ({ p: model.surface(s, phi), n: model.normalAt(s, phi), pose: model.poseAt(s, phi), phi });
      const dorsal = surfaceAt(top), oral = surfaceAt(bottom);
      return { dorsal, oral, s, p: dorsal.p.clone().lerp(oral.p, 0.5) };
    });
    const root = (a: number) => roots[Math.round(a * NU)];
    const middle = root(0.5).p;
    const baseFace = (a: number, side: number) => side > 0 ? root(a).dorsal : root(a).oral;
    const mid = (a: number, t: number) => {
      const foot = root(a), k = a - 0.5;
      const spread = Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.65)));
      const roll = lobe.curl * (0.18 + 0.85 * smooth(0, 0.95, t));
      const theta = roll * k;
      const width = widthSL * L * (1 + 0.12 * Math.sin(Math.PI * t));
      const twist = 0.22 + 0.48 * smooth(0, 1, t);
      const cup = width * spread * (1 - Math.cos(theta)) / Math.max(0.15, roll);
      const lateral = width * spread * Math.sin(theta) / Math.max(0.15, roll);
      const p = middle.clone().lerp(foot.p, 1 - smooth(0, 0.34, t));
      const style = smooth(0, 0.34, t);
      const arc = Math.sin(t * Math.PI * 0.5);
      p.x += length * (0.99 * arc - 0.05 * arc * arc) - style * cup * 0.22;
      p.y += length * (-0.20 * arc - 0.32 * arc * arc) + style * (-cup + lateral * Math.sin(twist));
      p.z += length * (0.085 * Math.sin(Math.PI * arc) - 0.152 * arc * arc) + style * lateral * Math.cos(twist);
      const n = new THREE.Vector3(0.18 + 0.35 * t, Math.cos(twist), -Math.sin(twist) + theta * style).normalize();
      return { p, n };
    };
    const g = finShell({
      nu: NU, nv: NV, rays: 0, mid, kind: 0, side: 1, ridge: 0, pleat: 0, sealSides: true,
      thick: (a, t) => 0.0018 * L * Math.pow(Math.max(0, Math.sin(Math.PI * a)), 0.65) * (1 - smooth(0.35, 1, t)),
      root: (a, side) => {
        const b = baseFace(a, side);
        return { n: b.n, p: b.p.clone().addScaledVector(b.n, -0.00042 * L) };
      },
      shape: (a, t, side, p) => {
        const b = baseFace(a, side);
        const offset = b.p.clone().sub(root(a).p);
        return p.addScaledVector(offset, 1 - smooth(0, 0.24, t));
      },
      uv: (a, t, side) => {
        const b = baseFace(a, side);
        const v = lerp(b.phi, side > 0 ? 0.66 : 2.51, smooth(0, 0.58, t));
        return [model.uOf(root(a).s + 0.013 * Math.sin(Math.PI * t)), v / (Math.PI * 2)];
      },
      pose: (a, _t, side) => baseFace(a, side).pose,
      flap: (_a, t) => Math.pow(t, 1.62) * 0.57,
      weight: () => 0,
    });
    const mat = ctx.skinMat({ roughness: 0.53, clearcoat: 0.09 });
    ctx.track(mat);
    addMesh(g, mat, 2, true).name = 'cephalic:R';
    addMesh(mirrorZ(g, -1, true), mat, 2, true).name = 'cephalic:L';
  }

  // ── lamprey oral disc ─────────────────────────────────────────────────────
  if (m.kind === 'disc') {
    const fr0 = model.frame(0.02);
    const fwd = fr0.T.clone().negate();
    const dn = fr0.N.clone().negate();
    const face = fwd.clone().multiplyScalar(0.55).addScaledVector(dn, 0.85).normalize();
    const ctr = model.local(0.035, -model.bot(0.035) * 0.55, 0).addScaledVector(face, 0.01 * L);
    const r = model.bot(0.04) * 1.15 * L;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), face);
    const b1 = new Batch(), b2 = new Batch(), b3 = new Batch();
    b1.add(new THREE.TorusGeometry(r, r * 0.22, 10, 40), new THREE.Matrix4().compose(ctr, q, new THREE.Vector3(1, 1, 1)));
    b2.add(new THREE.CircleGeometry(r, 40), new THREE.Matrix4().compose(ctr.clone().addScaledVector(face, -r * 0.1), q, new THREE.Vector3(1, 1, 1)));
    const cone = new THREE.ConeGeometry(0.3, 1, 5); cone.translate(0, 0.5, 0); cone.rotateX(Math.PI / 2);
    for (let ringI = 0; ringI < 3; ringI++)
      for (let i = 0; i < 14 + ringI * 6; i++) {
        const a = (i / (14 + ringI * 6)) * Math.PI * 2;
        const rr = r * (0.25 + ringI * 0.25);
        const p = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0).applyQuaternion(q).add(ctr);
        b3.add(cone, new THREE.Matrix4().compose(p, q, new THREE.Vector3(r * 0.12, r * 0.12, r * 0.2)));
      }
    addMesh(b1.build(), patchMaterial(new THREE.MeshPhysicalMaterial({ color: sp.color.belly, roughness: 0.5 }), u), 2);
    addMesh(b2.build(), patchMaterial(new THREE.MeshStandardMaterial({ color: '#6a2c2c', side: THREE.DoubleSide }), u), 2);
    addMesh(b3.build(), patchMaterial(new THREE.MeshPhysicalMaterial({ color: '#f0d890', roughness: 0.3 }), u), 3);
  }

  // ── BARBELS, LURES, CIRRI ─────────────────────────────────────────────────
  const barbelMat = patchMaterial(new THREE.MeshPhysicalMaterial({ color: sp.color.side, roughness: 0.5, clearcoat: 0.3 }), u);
  disposables.push(barbelMat);
  const bulbBatch = new Batch();
  let bulbColor = '#9ff';
  const barbelList = [...(sp.barbels ?? [])];
  for (const bb of barbelList) {
    for (const side of (bb.pairs === false ? [1] : [1, -1]) as (1 | -1)[]) {
      const at = model.attach(bb.s, bb.y, side);
      const fr = model.frame(bb.s);
      if (bb.pairs === false) {
        at.phi = bb.y < 0 ? Math.PI : 0;
        at.p = model.surface(bb.s, at.phi);
        at.n = model.normalAt(bb.s, at.phi);
      }
      const d = fr.T.clone().multiplyScalar(-bb.dir[0]).addScaledVector(fr.N, bb.dir[1]).add(new THREE.Vector3(0, 0, side * bb.dir[2])).normalize();
      d.addScaledVector(at.n, Math.max(0, 0.24 - d.dot(at.n))).normalize();
      const K = 29;
      const spec = model.poseAt(bb.s, at.phi);
      const jw = spec.jaw, pl: Q4 = [...spec.plastic];
      const pts = Array.from({ length: K + 1 }, (_, k) => {
        const t = k / K;
        return at.p.clone().addScaledVector(at.n, -bb.r * L * 0.43 + bb.len * L * 0.05 * Math.sin(Math.PI * t))
          .addScaledVector(d, t * bb.len * L)
          .addScaledVector(fr.N, -bb.droop * t * t * bb.len * L)
          .addScaledVector(fr.T, (bb.bulb ? 0.06 : 0.17) * t * t * bb.len * L);
      });
      if (bb.pairs === false) pts.forEach((p) => (p.z = 0));
      const geo = tubeAlong(pts, (k) => bb.r * L * (0.065 + 0.935 * Math.pow(1 - k / K, 1.15)), 11,
        (k) => ({ jaw: jw, plastic: pl, flap: Math.pow(k / K, 1.55) * (bb.bulb ? 0 : 0.31), side: bb.pairs === false ? 0 : side }));
      addMesh(geo, barbelMat, 2, true).name = 'barbel';
      if (bb.bulb) {
        bulbColor = bb.bulb;
        const bulb = new THREE.SphereGeometry(1, 16, 12);
        bulbBatch.add(bulb, new THREE.Matrix4().compose(pts[K], new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(bb.r * L * 2.6)), jw, undefined, 0, pl);
        bulb.dispose();
      }
      if (bb.pairs === false) break;
    }
  }
  if (!bulbBatch.empty) addMesh(bulbBatch.build(), patchMaterial(new THREE.MeshStandardMaterial({ color: bulbColor, emissive: bulbColor, emissiveIntensity: 1.6 }), u), 3);

  // ── SPIKES / HORNS / SCUTES / SPINES (symmetrically paired) ───────────────
  const spikeB = new Batch();
  const spikeCone = new THREE.ConeGeometry(0.35, 1, 6); spikeCone.translate(0, 0.5, 0);
  for (const k of sp.spikes ?? []) {
    for (const side of (k.mirror === false ? [1] : [1, -1]) as (1 | -1)[]) {
      const at = model.attach(k.s, k.y, side);
      if (k.mirror === false) {
        at.phi = k.y >= 0 ? 0 : Math.PI;
        at.p = model.surface(k.s, at.phi);
        at.n = model.normalAt(k.s, at.phi);
      }
      const fr = model.frame(k.s);
      const d = fr.T.clone().multiplyScalar(-k.dir[0]).addScaledVector(fr.N, k.dir[1]).add(new THREE.Vector3(0, 0, side * k.dir[2]));
      if (d.lengthSq() < 1e-8) d.copy(at.n);
      d.normalize().addScaledVector(at.n, Math.max(0, 0.24 - d.dot(at.n))).normalize();
      const hornK = clamp(k.horn ?? 0, 0, 1);
      const h = k.len * L, r = Math.min(h * (k.r ?? 0.26) * 0.56, (0.029 + 0.006 * hornK) * L);
      const tangent = fr.T.clone().addScaledVector(at.n, -fr.T.dot(at.n));
      if (tangent.lengthSq() < 1e-8) tangent.crossVectors(fr.N, at.n);
      tangent.normalize();
      const binormal = new THREE.Vector3().crossVectors(at.n, tangent).normalize();
      const N = 32, R = 30;
      const joint = model.poseAt(k.s, at.phi);
      const centers = Array.from({ length: R + 1 }, (_, j) => {
        const t = j / R;
        return at.p.clone().addScaledVector(d, h * t)
          .addScaledVector(at.n, h * 0.15 * (1 - Math.exp(-t * 5)) * (1 - t * 0.42))
          .addScaledVector(fr.N, hornK * h * 0.1 * t * t * Math.sign(k.dir[1] || 1));
      });
      const frames = centers.map((_, j) => new THREE.Quaternion().setFromUnitVectors(at.n,
        centers[Math.min(j + 1, R)].clone().sub(centers[Math.max(j - 1, 0)]).normalize()));
      const seams = Array.from({ length: N + 1 }, (_, i) => {
        const a = i / N * 2 * Math.PI;
        const dir = tangent.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal, Math.sin(a));
        const root = model.drop(at.p.clone().addScaledVector(dir, r * (1.51 + 0.2 * hornK)), at.n, r * (1.5 + 0.25 * hornK) + 0.002 * L);
        return { dir, at: root, n: model.normalAt(root.s, root.phi), skin: model.poseAt(root.s, root.phi) };
      });
      const horn = grid(N, R, (a, t) => {
        const base = seams[Math.round(a * N)], j = Math.round(t * R);
        const taper = (1 - t) ** lerp(0.82, 0.92, hornK);
        // horn: a broad cone whose root flares out into the carapace, with faint growth annuli
        const profile = r * (lerp(0.80, 0.74, hornK) + lerp(0.46, 0.9, hornK) * Math.exp(-t * lerp(12, 9, hornK))) * taper
          * (1 + hornK * 0.035 * Math.sin(t * 46) * smooth(0.12, 0.3, t) * (1 - t));
        const ring = centers[j].clone().addScaledVector(base.dir.clone().applyQuaternion(frames[j]), profile);
        const fade = smooth(0, lerp(0.31, 0.2, hornK), t);
        const p = base.at.p.clone().addScaledVector(base.n, -0.00031 * L + h * t * 0.30).lerp(ring, fade);
        // The first ring carries the exact texture and normal of the carapace.
        let vDelta = joint.uv[1] - base.skin.uv[1];
        if (vDelta > 0.5) vDelta -= 1;
        if (vDelta < -0.5) vDelta += 1;
        const uv: [number, number] = [lerp(base.skin.uv[0], joint.uv[0], fade), base.skin.uv[1] + vDelta * fade];
        p.x += lerp(base.skin.jut, joint.jut, fade);
        const pl = base.skin.plastic.map((v, i) => lerp(v, joint.plastic[i], fade)) as Q4;
        return { p, uv, jaw: lerp(base.skin.jaw, joint.jaw, fade), plastic: pl, gill: lerp(base.skin.gill, joint.gill, fade) };
      }, false, true);
      const probe = Math.round(R * 0.18) * (N + 1);
      faceOut(horn, probe, seams[0].dir);
      const normals = horn.getAttribute('normal');
      for (let i = 0; i <= N; i++) {
        const n = seams[i].n;
        normals.setXYZ(i, n.x, n.y, n.z);
        const j = i + N + 1;
        const n1 = new THREE.Vector3().fromBufferAttribute(normals, j).lerp(n, 0.59).normalize();
        normals.setXYZ(j, n1.x, n1.y, n1.z);
      }
      addMesh(horn, ctx.tintMat, 2, true).name = 'horn';
    }
  }
  spikeCone.dispose();
  if (!spikeB.empty) addMesh(spikeB.build(), patchMaterial(new THREE.MeshPhysicalMaterial({ color: sp.spines?.c ?? sp.color.side, roughness: 0.4, clearcoat: 0.3 }), u), 2);

  // ── FRONDS (seadragons) ───────────────────────────────────────────────────
  if (sp.fronds) {
    for (const [s, y, len] of sp.fronds.at) {
      const midline = Math.abs(y) > 0.92;
      const at = model.attach(s, y, 1);
      if (midline) at.p.z = 0;
      const out = midline ? model.frame(s).N.clone().multiplyScalar(Math.sign(y)) : at.n.clone();
      const nf = midline ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3().crossVectors(out, new THREE.Vector3(1, 0, 0)).normalize();
      const b = new THREE.Vector3().crossVectors(nf, out).normalize();
      const frondMat = finMaterial(ctx, { color: sp.fronds.c, tip: sp.fronds.c, alpha: 0.9, rays: 3 }, undefined, false);
      disposables.push(frondMat);
      // 'paddle': one leaf-shaped blade on a thin stalk, leaning back (weedy seadragon); 'leaf': three-lobed frond
      const paddle = sp.fronds.style === 'paddle';
      for (let l = paddle ? 1 : 0; l < (paddle ? 2 : 3); l++) {
        const a = (l - 1) * 0.52;
        const d = out.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
        if (paddle) d.addScaledVector(model.frame(s).T, 0.45).normalize();
        const gR = grid(10, 8, (uu, vv) => {
          const H = len * L * (l === 1 ? 1 : 0.75);
          const w = paddle
            ? L * (0.0022 + 0.2 * len * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (vv - 0.4) / 0.6))), 0.7))
            : 0.022 * L * Math.sin(Math.PI * vv) * (0.6 + 0.4 * Math.sin(vv * 9));
          const p = at.p.clone().addScaledVector(d, vv * H).addScaledVector(b, (uu - 0.5) * w * 2);
          return { p, flap: vv * 0.8, side: 0 };
        });
        addMesh(gR, frondMat, 4, true);
        if (!midline) addMesh(mirrorZ(gR, 0), frondMat, 4, true);
      }
    }
  }

}
