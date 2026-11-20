import * as THREE from 'three';
import { clamp, DEG, hashStr, lerp, smooth } from './math';
import { faceOut, grid, type C3, type Q4 } from './geom';
import { patchMaterial, type EyeTurn } from './shader';
import type { Ctx } from './ctx';
import type { PupilKind, Species } from './types';

const PUPIL: Record<PupilKind, number> = { round: 0, pear: 1, slitV: 2, slitH: 3, crescent: 4 };

/** How the eye of a species is built – derived from its taxon and proportions, overridable in EyeSpec. */
export interface EyeForm {
  /** protrusion 0…1: 0.1 flush under the skin (tunas) · 0.2 ordinary lateral eye · 0.5 goby · 1 periscope turret */
  p: number;
  pupil: number;
  /** pupil radius / iris radius */
  rp: number;
  shine: number;
  shineCol: string;
  adipose: number;
  /** reflectance of the argentea (guanine layer of the iris) */
  metal: number;
  /** how freely the globe turns (turret eyes swivel like a chameleon's) */
  mobile: number;
  /** iridescent cornea (gobies, flatfishes, puffers, triggerfishes) */
  irid: number;
  /** dorsal pigment cap of the iris */
  cap: number;
}

export function eyeForm(sp: Species): EyeForm {
  const e = sp.eye, c = sp.color;
  const is = (re: RegExp) => re.test(sp.id);
  const grp = (re: RegExp) => re.test(sp.group);
  const mobulid = !!sp.cephalic;
  const shark = sp.skin.kind === 'placoid' && sp.plan === 'fish' && !grp(/Rays/);
  const batoid = sp.plan === 'ray' || grp(/Rays/);
  // small fishes with big eyes: the globe is wider than the skull can hide
  const rel = clamp((e.d / Math.max(0.05, sp.HL) - 0.16) / 0.3);
  let p = 0.17 + 0.14 * rel;
  if (is(/mudskipper/)) p = 1;
  else if (grp(/Flatfish/)) p = 0.62;
  else if (is(/stingray|skate/)) p = 0.6;
  else if (is(/stonefish/)) p = 0.56;
  else if (is(/blenny/)) p = 0.55;
  else if (is(/goby|frogfish|seahorse|seadragon|pipefish/)) p = 0.5;
  else if (is(/porcupine|puffer/)) p = 0.42;
  else if (mobulid || is(/cowfish|trigger|goldfish|lionfish/)) p = 0.34;
  else if (is(/catfish|moray/)) p = 0.28;
  else if (shark) p = 0.08;
  else if (grp(/Tunas|Billfish|Jacks/)) p = 0.1;
  else if (grp(/Herring|Tarpon/)) p = 0.14;
  if (e.bulge !== undefined) p = e.bulge;

  let pupil: PupilKind = 'round';
  if ((batoid && !mobulid) || grp(/Flatfish/)) pupil = 'crescent';
  else if (shark) pupil = is(/mako|white|whale|greenland|hammerhead/) ? 'round' : 'slitV';
  else if (is(/mudskipper|goby|stonefish|catfish/)) pupil = 'slitH';
  else if (grp(/Predators|Salmon|Sunfishes|Groupers|Cods|Tunas|Jacks|Billfish|Tarpons/)) pupil = 'pear';
  if (e.pupil) pupil = e.pupil;

  const deep = grp(/Deep sea/);
  const turret = p > 0.45;
  return {
    p,
    pupil: PUPIL[pupil],
    rp: pupil === 'crescent' ? 0.5 : deep ? 0.56 : shark ? 0.48 : turret ? 0.37 : 0.42,
    shine: e.shine ?? (is(/walleye/) ? 0.24 : shark ? (is(/white|mako|blue/) ? 0.12 : 0.22) : deep ? 0.38 : is(/catfish|bowfin|gar/) ? 0.24 : grp(/Tarpon/) ? 0.18 : 0.04),
    shineCol: is(/walleye/) ? '#f4f1d2' : shark ? '#2e7d78' : deep ? '#4ca8cc' : '#76a8b2',
    adipose: e.adipose ?? (is(/herring|sardine/) ? 0.55 : is(/mackerel/) ? 0.5 : is(/bonefish/) ? 0.6 : is(/tarpon/) ? 0.3 : is(/trevally/) ? 0.25 : 0),
    metal: shark ? 0.14 : clamp(0.24 + 0.88 * (c.metal ?? 0.08) + 0.32 * (c.iri ?? 0), 0.22, 0.84),
    mobile: turret || is(/trigger|puffer|porcupine|cowfish/) ? 1 : 0.45,
    irid: is(/goby|mudskipper|blenny|trigger|puffer|porcupine|cowfish/) || grp(/Flatfish/) ? 0.8 : 0.12,
    cap: shark ? 0.18 : turret ? 0.25 : 0.42,
  };
}

/**
 * Eyes built as the organ is built:
 *  - a GLOBE that really turns in its socket (vertex shader, about the globe centre): spherical where it is
 *    exposed, oblate behind the lids. Its front carries the recessed iris dish with the spherical lens
 *    standing in the pupil, under a clear corneal dome – so the eye has depth, parallax and two highlights;
 *  - the protrusion is a species character: flush under the skin in tunas, a low dome in ordinary fishes,
 *    half a ball in gobies and flatfishes, a periscope turret looking sideways in mudskippers;
 *  - the ORBIT is head skin shrink-wrapped from the lid margin over the ball down onto the skull (same
 *    texture, same integument, welded normals), so every eye sits in its own socket or on its own stalk;
 *  - every part is anchored to the skin, so the eye rides on the cheek when the head inflates in a strike.
 */
export function buildEyes(ctx: Ctx) {
  const { sp, model, L, u, addMesh } = ctx;
  const e = sp.eye;
  if (e.d <= 0) return;
  const F = eyeForm(sp);
  const r = (e.d / 2) * L; // radius of the visible eye (world)
  const p = clamp(F.p, 0.02, 1);
  const tau = smooth(0.55, 1, p); // turret-ness
  const TAU = Math.PI * 2;
  const flat = sp.plan === 'flatR' || sp.plan === 'flatL';
  // Curvature of the skull at the orbit: a globe flatter than the head it sits in would push the skin around
  // it into a goggle. The exposed globe therefore curves at least as much as the head does (big-eyed small
  // fishes get a strongly domed eye, a tuna a nearly flat one).
  let sag = 0;
  const yn0 = flat ? e.y : model.eyeYn;
  const a0 = model.attach(e.s, yn0, sp.plan === 'flatL' ? -1 : 1);
  {
    const T0 = model.frame(e.s).T;
    const x0 = T0.clone().addScaledVector(a0.n, -T0.dot(a0.n));
    if (x0.lengthSq() > 1e-8) {
      x0.normalize();
      const y0 = new THREE.Vector3().crossVectors(a0.n, x0);
      for (let k = 0; k < 8; k++) {
        const al = (k / 8) * TAU;
        const q = model.drop(a0.p.clone().addScaledVector(x0, Math.cos(al) * r).addScaledVector(y0, Math.sin(al) * r), a0.n, 0.5 * r + 0.002 * L);
        sag += clamp(-q.p.sub(a0.p).dot(a0.n), 0, r) / 8;
      }
    }
  }
  // Skull clearance bound: an eyeball can never exceed the neurocranium half-width or dorsal/ventral skull height
  const hd0 = ((model.top(e.s) + model.bot(e.s)) / 2) * L;
  const yEye0 = model.normY(e.s, yn0) * L;
  const zClear = flat ? hd0 * 0.9 : Math.max(0.45 * r, Math.abs(a0.p.z) * 0.95);
  const dorsClear = Math.max(0.5 * r, (model.top(e.s) * L - yEye0) * 1.15);
  const ventClear = Math.max(0.5 * r, (yEye0 + model.bot(e.s) * L) * 1.15);
  const maxRg = tau > 0.25 ? 1.65 * r : Math.max(1.06 * r, Math.min(zClear * 1.26, dorsClear * 1.24, ventClear * 1.24, 1.56 * r));
  const thSkull = Math.asin(clamp(r / maxRg, 0.56, 0.95));
  const thHead = Math.asin(clamp((1.7 * sag) / r, 0, 0.8));
  const thAp = Math.max(lerp(38, 66, Math.pow(p, 0.78)) * DEG, thHead, thSkull); // half-angle of the lid aperture seen from the globe centre
  const Rg = (r / Math.sin(thAp)) * lerp(1, 0.84, tau); // radius of curvature of the exposed globe
  const gain = clamp((Math.asin(0.22 * Math.sin(thAp)) / 0.5) * (0.7 + 0.8 * F.mobile), 0.12, 0.85);
  const rotMax = 0.5 * gain;
  const thI = thAp * 1.035; // limbus: the iris just fills the aperture
  const thEnd = Math.min(Math.PI * 0.78, thAp + rotMax + (4.5 + 22 * tau) * DEG); // compact pure-spherical socket skirt
  const rI = Rg * Math.sin(thI);
  const capH = Rg * (1 - Math.cos(thI));
  const dome = lerp(0.24, 0.36, smooth(0.05, 0.35, p)); // height of the cornea over the limbus plane / iris radius
  const extra = rI * Math.max(0.04, dome - Math.tan(thI / 2));
  const xp = F.rp * 0.96;
  const hIris = 0.3 * capH;
  const hLens = F.pupil < 1.5 ? Math.max(0, Math.min(0.42 * xp * rI, 0.7 * capH + extra - 0.05 * rI)) : 0;

  const sides: { side: 1 | -1; s: number; y: number }[] = [];
  if (flat) {
    const sd = sp.plan === 'flatR' ? 1 : -1;
    sides.push({ side: sd, s: e.s, y: e.y }, { side: sd, s: e.s + e.d * 0.95, y: e.y - 0.4 });
  } else sides.push({ side: 1, s: e.s, y: model.eyeYn }, { side: -1, s: e.s, y: model.eyeYn });

  const iris = new THREE.Color(e.iris);
  const irisLum = 0.2126 * iris.r + 0.7152 * iris.g + 0.0722 * iris.b;
  const iris2 = e.iris2
    ? new THREE.Color(e.iris2)
    : irisLum < 0.07
      ? iris.clone().lerp(new THREE.Color('#4a5866'), 0.24)
      : iris.clone().lerp(new THREE.Color('#ffe9b0'), 0.28);
  const globeCol = new THREE.Color(e.ring ?? e.iris).multiplyScalar(0.16);
  const seed = (hashStr(sp.id) % 97) / 9.7 + (ctx.seed % 13) * 0.71;
  const Z4: Q4 = [0, 0, 0, 0];
  const hasCephalofoil = !!(sp.body.wbumps && sp.body.wbumps.some((b) => b[1] > 0.04));

  sides.forEach(({ side, s, y }, eyeIdx) => {
    let at = model.attach(s, y, side);
    const aperture = Rg * Math.sin(thAp);
    const rhoOut = Math.max(aperture * 1.30, Math.min(aperture * 1.54, (1.28 + 0.12 * tau) * aperture));
    // For bilateral fishes with high dorsal / turret eyes, ensure the attachment sits far enough from the
    // dorsal midline z = 0 so the entire orbital collar (radius rhoOut) stays on its own flank without tearing.
    // The collar term scales with model.eyeClose so close-set turret eyes (mudskipper, gobies/blennies)
    // keep the narrower stance the body model placed them at instead of being pushed back out to the flanks.
    if (!flat) {
      const minZ = Math.min(model.hw(s) * L * 0.88, rhoOut * 0.94 * model.eyeClose + 0.0022 * L);
      if (Math.abs(at.p.z) < minZ) {
        let yn = y;
        for (let k = 0; k < 48 && yn > 0.18; k++) {
          yn -= 0.015;
          const cand = model.attach(s, yn, side);
          if (Math.abs(cand.p.z) >= minZ) { at = cand; break; }
          if (Math.abs(cand.p.z) > Math.abs(at.p.z)) at = cand;
        }
      }
    }
    const fr = model.frame(s);
    const n = at.n.clone();
    const up = fr.N, fwd = fr.T.clone().negate();
    const zs = new THREE.Vector3(0, 0, flat ? 0 : side);
    if (hasCephalofoil && !flat) {
      // Hammerhead cephalofoil: eye sits on the lateral wing margin looking outward and slightly forward
      const latFoil = zs.clone().multiplyScalar(0.95).addScaledVector(fwd, 0.22).addScaledVector(up, 0.06).normalize();
      n.lerp(latFoil, 0.78).normalize();
    }
    // optical axis: coaxial with or gently tilted from the footprint normal so the socket never folds under the aperture
    const upness = n.dot(up);
    const wT = flat ? 0 : clamp(0.38 * tau + smooth(0.45, 0.75, p) * smooth(0.65, 0.96, upness) * 0.28, 0, 0.45);
    const aLat = zs.clone().multiplyScalar(Math.cos(28 * DEG)).addScaledVector(up, Math.sin(28 * DEG)).addScaledVector(fwd, 0.16 + 0.16 * tau).normalize();
    const a = n.clone().lerp(aLat, wT).normalize();
    // orbit frames around the skin normal (footprint) and around the optical axis (aperture, globe)
    const ref = up.clone().addScaledVector(zs, -0.3);
    const frameOf = (z: THREE.Vector3) => {
      const ex = fwd.clone().addScaledVector(z, -fwd.dot(z));
      if (ex.lengthSq() < 1e-8) ex.copy(up);
      ex.normalize();
      const ey = new THREE.Vector3().crossVectors(z, ex);
      if (ey.dot(ref) < 0) ey.negate();
      return { ex, ey };
    };
    const { ex: exN, ey: eyN } = frameOf(n);
    const { ex: exA, ey: eyA } = frameOf(a);
    // globe centre: coaxial with at.p along `a` so every radial ray from aCenter matches the footprint around at.p
    const stalk = clamp(e.stalk ?? 0, 0, 1);
    const turretLift = (0.48 + 0.62 * stalk) * Rg * tau;
    const C = at.p.clone().addScaledVector(a, -Rg * Math.cos(thAp) + 0.079 * r + turretLift);
    const polar = (th: number, al: number, rad: number, o = C) =>
      o.clone().addScaledVector(a, Math.cos(th) * rad).addScaledVector(exA, Math.sin(th) * Math.cos(al) * rad).addScaledVector(eyA, Math.sin(th) * Math.sin(al) * rad);

    // skin-anchor: the whole eye translates with the skin at the orbit centre
    const pose = model.poseAt(s, at.phi, false);
    const ancJ = pose.jaw;
    const ancPl = pose.plastic;
    const aCenter = C.clone().addScaledVector(a, Rg * Math.cos(thAp));
    // Explicit opening in the body skin. Bounded axial depth ensures dorsal turret cuts never pierce the midline.
    u.uOrbitC.value[eyeIdx].set(aCenter.x, aCenter.y, aCenter.z, aperture * 1.075);
    const cutDepth = Math.min(r * (0.42 * (1 - 0.65 * tau) + 0.08), at.p.distanceTo(model.local(s, 0, 0)) * 0.52);
    u.uOrbitN.value[eyeIdx].set(a.x, a.y, a.z, Math.max(0.06 * r, cutDepth));
    const anchor = (g: THREE.BufferGeometry, w: (i: number) => number) => {
      const cnt = g.getAttribute('position').count;
      const A = new Float32Array(cnt * 4), Pl = new Float32Array(cnt * 4), W = new Float32Array(cnt);
      for (let i = 0; i < cnt; i++) {
        A.set([at.p.x, at.p.y, at.p.z, ancJ], i * 4);
        Pl.set(ancPl, i * 4);
        W[i] = w(i);
      }
      g.setAttribute('aAnc', new THREE.BufferAttribute(A, 4));
      g.setAttribute('aAncPl', new THREE.BufferAttribute(Pl, 4));
      g.setAttribute('aAncW', new THREE.BufferAttribute(W, 1));
      return g;
    };

    const turn: EyeTurn = { c: C, ax: exA, ay: eyA, az: a, gain };
    const eyeMat = patchMaterial(
      new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.3, envMapIntensity: 0.38 }),
      u, undefined, {
        turn,
        eye: {
          iris, iris2, pupil: new THREE.Color('#010203'), globe: globeCol,
          parm: new THREE.Vector4(F.pupil, F.rp, F.shine, F.metal * 0.7),
          geo: new THREE.Vector4(thAp, F.adipose, seed + eyeIdx * 3.3, F.cap),
          shine: new THREE.Color(F.shineCol),
        },
      },
    );
    // cornea: a clear coat only. It adds its reflections on top of the iris (ONE, 1-a) and turns opaque
    // only where a highlight is bright enough to hide what lies beneath. Under water a cornea barely mirrors
    // its surroundings (same refractive index as the sea), so it carries the glints of the lights, not the sky.
    const corneaMat = patchMaterial(
      new THREE.MeshPhysicalMaterial({
        color: '#000000', roughness: 0.09, metalness: 0, transparent: true, opacity: 0.012,
        clearcoat: 0.38, clearcoatRoughness: 0.075, ior: 1.376, specularIntensity: 0.26, depthWrite: false, envMapIntensity: 0.095,
        iridescence: F.irid * 0.16, iridescenceIOR: 1.6,
        iridescenceThicknessMinimum: 260, iridescenceThicknessMaximum: 480,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
      }),
      u, undefined, { glass: true, glassAp: thAp, turn },
    );
    ctx.track(eyeMat); ctx.track(corneaMat);

    // ── 1. globe: lens dome → iris dish → limbus → pure compact sphere about C (never pokes through skin)
    const prof: { rad: number; z: number; rho: number }[] = [];
    const NIR = 22, NSP = 8;
    for (let k = 0; k <= NIR; k++) {
      const x = k / NIR, th = x * thI;
      // C1-smooth lens dome at x = xp so vertex normals never kink into a ring at the pupil margin
      const uLens = x < xp ? Math.max(0, 1 - (x / xp) * (x / xp)) : 0;
      const lens = hLens * uLens * Math.sqrt(uLens);
      prof.push({ rad: Rg * Math.sin(th), z: Rg * Math.cos(thI) + hIris * (1 - x * x) + lens, rho: x });
    }
    for (let k = 1; k <= NSP; k++) {
      const th = lerp(thI, thEnd, k / NSP);
      prof.push({ rad: Rg * Math.sin(th), z: Rg * Math.cos(th), rho: th / thI });
    }
    const NA = 64, NR = prof.length - 1;
    const globeG = grid(NA, NR, (uu, vv) => {
      const q = prof[Math.round(vv * NR)], al = uu * TAU;
      const ca = Math.cos(al), sa = Math.sin(al);
      return {
        p: C.clone().addScaledVector(a, q.z).addScaledVector(exA, q.rad * ca).addScaledVector(eyA, q.rad * sa),
        plastic: Z4, eye: [q.rho * ca, q.rho * sa, 0, side],
      };
    });
    const poleNormals = (g: THREE.BufferGeometry) => {
      const N = g.getAttribute('normal');
      for (let i = 0; i <= NA; i++) N.setXYZ(i, a.x, a.y, a.z);
    };
    faceOut(globeG, Math.round(NIR / 2) * (NA + 1) + 3, a);
    poleNormals(globeG);
    // Smooth the normals across the pupil-to-iris transition so tapetum eyeshine is a soft central glow
    {
      const GN = globeG.getAttribute('normal') as THREE.BufferAttribute;
      const GP = globeG.getAttribute('position') as THREE.BufferAttribute;
      const vTmp = new THREE.Vector3();
      for (let k = 0; k <= NIR; k++) {
        const x = k / NIR;
        const wSph = x <= xp * 1.12 ? 0.65 * (1 - smooth(xp * 0.5, xp * 1.12, x)) : 0;
        if (wSph <= 0) continue;
        for (let i = 0; i <= NA; i++) {
          const idx = k * (NA + 1) + i;
          vTmp.fromBufferAttribute(GP, idx).sub(C).normalize();
          const nx = lerp(GN.getX(idx), vTmp.x, wSph);
          const ny = lerp(GN.getY(idx), vTmp.y, wSph);
          const nz = lerp(GN.getZ(idx), vTmp.z, wSph);
          const l = Math.hypot(nx, ny, nz) || 1;
          GN.setXYZ(idx, nx / l, ny / l, nz / l);
        }
      }
      GN.needsUpdate = true;
    }
    addMesh(anchor(globeG, () => 1), eyeMat, 2).name = `eye:globe:${eyeIdx}`;

    // ── 2. cornea: clear dome over iris and lens, running flush into the globe at the limbus
    const thC = thI * 1.03, NC = 14, eps = 0.006 * r;
    const corneaG = grid(NA, NC, (uu, vv) => {
      const th = vv * thC, al = uu * TAU;
      const k = 1 - vv * vv;
      return { p: polar(th, al, Rg + eps).addScaledVector(a, extra * k * k), plastic: Z4, eye: [0, 0, 0, side] };
    });
    faceOut(corneaG, 6 * (NA + 1) + 3, a);
    poleNormals(corneaG);
    addMesh(anchor(corneaG, () => 1), corneaMat, 3).name = `eye:cornea:${eyeIdx}`;

    // ── 3. annular lid and socket ──────────────────────────────────────────
    // In the fixed optical frame every skin row is outside the aperture. Skin-facing rows
    // shrink-wrap to the skull, never toward the pupil. This also works for dorsal flatfish eyes.
    const reach = r * 0.68 + (2 + 0.7 * clamp(e.stalk ?? 0, 0, 1)) * Rg * tau + 0.002 * L;
    const rows: [number, number, number][] = [
      [-1, 0.29, 1], [0, 0.70, 1], [0.085, 0.87, 1], [0.19, 0.96, 0.98],
      [0.34, 1, 0.82], [0.51, 1, 0.61], [0.68, 1, 0.36], [0.84, 1, 0.14], [1, 1, 0],
    ];
    const NU = 72, NW = rows.length - 1;
    const outerN: THREE.Vector3[] = [];
    const around = Array.from({ length: NU + 1 }, (_, i) => {
      const al = TAU * i / NU;
      const radial = exA.clone().multiplyScalar(Math.cos(al)).addScaledVector(eyA, Math.sin(al));
      const radialN = exN.clone().multiplyScalar(Math.cos(al)).addScaledVector(eyN, Math.sin(al));
      const desired = at.p.clone().addScaledVector(radial, rhoOut);
      if (!flat && desired.z * side < 0.0018 * L) desired.z = side * 0.0018 * L;
      let foot = model.drop(desired, n, reach);
      if (foot.p.clone().sub(aCenter).dot(radial) < aperture * 1.18) {
        const d2 = at.p.clone().addScaledVector(radialN, rhoOut * 1.06);
        if (!flat && d2.z * side < 0.0018 * L) d2.z = side * 0.0018 * L;
        const f2 = model.drop(d2, n, reach);
        if (f2.p.clone().sub(aCenter).dot(radial) > foot.p.clone().sub(aCenter).dot(radial)) foot = f2;
      }
      if (!flat && foot.p.z * side < 0.0012 * L) {
        foot.phi = side > 0 ? Math.max(0.035, Math.min(foot.phi, Math.PI - 0.035)) : Math.min(TAU - 0.035, Math.max(foot.phi, Math.PI + 0.035));
        foot.p = model.surface(foot.s, foot.phi);
      }
      return { al, radial, foot };
    });
    const rimG = grid(NU, NW, (uu, vv) => {
      const k = Math.round(vv * NW), i = Math.round(uu * NU);
      const { al, radial, foot } = around[i];
      const [w, sh] = rows[k];
      const poseU = Math.max(0, w);
      const lid = polar(thAp * 1.012, al, Rg + 0.011 * r);
      const outerPos = foot.p.clone();
      const rrFoot = outerPos.clone().sub(aCenter).dot(radial);
      if (rrFoot < aperture * 1.18) {
        outerPos.addScaledVector(radial, aperture * 1.18 - rrFoot);
        const re = model.drop(outerPos, n, 0.35 * r);
        if (re.p.clone().sub(aCenter).dot(radial) >= aperture * 1.16 && (flat || re.p.z * side > 0.001 * L)) {
          outerPos.copy(re.p);
          foot.s = re.s; foot.phi = re.phi;
        }
      }
      let pos: THREE.Vector3;
      if (w < 0) pos = polar(thAp * 0.992, al, Rg - 0.023 * r);
      else if (w === 1) {
        outerN[i] = model.normalAt(foot.s, foot.phi);
        pos = outerPos.clone().addScaledVector(outerN[i], -0.00018 * L);
      } else {
        // Blend between a spherical turret hood around C (for turret eyes) and skull-dropped lid tissue
        const thHood = lerp(thAp * 1.012, Math.min(Math.PI * 0.68, thAp + 0.52), Math.pow(poseU, 0.85));
        const hood = polar(thHood, al, Rg + 0.012 * r).lerp(outerPos, smooth(0.32, 1, poseU));
        const ideal = lid.clone().lerp(outerPos, poseU);
        const q = model.drop(ideal, n, reach);
        const skinAx = q.p.clone().sub(aCenter).dot(a);
        const h = ideal.clone().sub(aCenter).dot(a);
        const endAx = Math.max(h, skinAx + 0.015 * r * (1 - 0.7 * tau));
        const t = smooth(0.08, 0.75, poseU);
        const flushPos = ideal.clone().addScaledVector(a, (endAx - h) * t);
        pos = flushPos.lerp(hood, tau * (1 - smooth(0.65, 1, poseU)));
        const rr = pos.clone().sub(aCenter).dot(radial);
        const minR = aperture * (1.017 + 0.16 * poseU);
        if (rr < minR) pos.addScaledVector(radial, minR - rr);
      }
      if (!flat && pos.z * side < 0.0008 * L) pos.z = side * 0.0008 * L;
      const col: C3 = [sh, sh * 0.992, sh * 0.98];
      const skin = model.locate(pos);
      const q = w === 1 ? foot : skin;
      const P = model.poseAt(q.s, q.phi);
      if (w === 1) pos.x += P.jut;
      return { p: pos, uv: P.uv, jaw: P.jaw, plastic: P.plastic, gill: P.gill, col };
    }, false, true);
    {
      const P = rimG.getAttribute('position') as THREE.BufferAttribute;
      const vi = 2 * (NU + 1) + 5;
      faceOut(rimG, vi, new THREE.Vector3(P.getX(vi), P.getY(vi), P.getZ(vi)).sub(C).normalize().lerp(n, 0.35));
    }
    // the outermost ring is welded to the head: same position, same shading normal
    const RN = rimG.getAttribute('normal') as THREE.BufferAttribute;
    for (let i = 0; i <= NU; i++) {
      const nn = outerN[i];
      if (nn) RN.setXYZ(NW * (NU + 1) + i, nn.x, nn.y, nn.z);
    }
    // inner rows ride rigidly with the eye, the outer row deforms exactly like the head skin
    addMesh(anchor(rimG, (i) => rows[Math.floor(i / (NU + 1))]?.[2] ?? 0), ctx.tintMat, 1, true).name = `eye:orbit:${eyeIdx}`;
  });
}
