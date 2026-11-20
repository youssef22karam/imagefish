import * as THREE from 'three';
import { clamp, lerp, smooth } from './math';
import { faceOut, grid, type C3, type Q4 } from './geom';
import { patchMaterial } from './shader';
import type { Ctx } from './ctx';
import type { GillOpening } from './model';

const PI = Math.PI, PI2 = Math.PI * 2;
const STAND = 0.0005; // stand-off of a closed cover from the shoulder (SL)

/**
 * Gills, built as the organ is built – not painted:
 *  - the body model recesses the flank under every gill cover into a GILL CHAMBER (BodyModel.gillDepth);
 *  - the COVER (operculum + soft opercular membrane, or the septal flap of a shark's slit) is a thin shell
 *    that continues the head skin exactly (same texture, scales and deformation at its welded borders) and
 *    ends in a free hind margin that overlaps the shoulder girdle and stands proud of it;
 *  - in the chamber sit the GILL ARCHES: bony arch + rakers carrying combs of blood-red filaments, stacked
 *    like roof tiles so that each arch shows behind the one outside it. A dark vascular lining closes the
 *    chamber; the inside of the cover is pale membrane;
 *  - breathing swings the cover out about its front hinge (vertex shader, aGill weights): the slit opens,
 *    the arches fan out into it, light falls into the chamber; a feeding strike flares everything wide.
 * The pectoral fin is seated on the shoulder girdle behind the opening (BodyModel.pecStation), so cover and
 * fin can never overlap.
 */
export function buildGills(ctx: Ctx) {
  const { model, u } = ctx;
  if (!model.gills.length) return;
  const coverMat = ctx.skinMat({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const gillMat = patchMaterial(
    new THREE.MeshPhysicalMaterial({
      color: '#ffffff', roughness: 0.3, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.14,
      side: THREE.DoubleSide, envMapIntensity: 0.5,
    }),
    u, undefined, { gill: true },
  );
  ctx.track(coverMat); ctx.track(gillMat);
  for (const side of [1, -1] as const) for (const g of model.gills) opening(ctx, g, side, coverMat, gillMat);
}

function opening(ctx: Ctx, g: GillOpening, side: 1 | -1, coverMat: THREE.Material, gillMat: THREE.Material) {
  const { model, L, addMesh } = ctx;
  const big = g.kind === 'opercle';
  const NA = big ? 64 : g.kind === 'slit' ? 28 : 18;
  // un-recessed skin (+ offset along its normal, SL): the surface the cover follows
  const base = (s: number, h: number, off: number) => {
    const phi = side === 1 ? h * PI : PI2 - h * PI;
    const s1 = clamp(s, 0.002, 0.995);
    model.rawMode = true;
    let p: THREE.Vector3, n: THREE.Vector3;
    try { p = model.surface(s1, phi); n = model.normalAt(s1, phi); } finally { model.rawMode = false; }
    return { p: p.addScaledVector(n, off * L), n, phi, s: s1 };
  };
  // the chamber and its cover follow jaw rotation and head plasticity exactly like the skin they belong to
  const soft = (s: number, phi: number) => {
    const pm = model.seamPhi(s), pf = phi <= PI ? phi : PI2 - phi;
    const lower = pf > pm;
    const jaw = !model.hasJaw() ? 0 : lower ? model.jawWeight(s, (pf - pm) / Math.max(1e-4, PI - pm)) : model.upperJawWeight(s, phi);
    return { jaw, plastic: model.plasticAt(s, phi, lower) as Q4 };
  };
  const withGill = (geo: THREE.BufferGeometry, w: number[]) => {
    geo.setAttribute('aGill', new THREE.Float32BufferAttribute(w, 1));
    return geo;
  };
  const tie = (v: number) => smooth(0, 0.14, v) * (1 - smooth(0.86, 1, v)); // the cover is tied down at both ends
  const overV = (v: number) => g.over * Math.sqrt(Math.max(0, Math.sin(PI * v)));
  const hOf = (v: number) => lerp(g.h0, g.h1, v);
  const outOff = (v: number, frac: number) => tie(v) * (g.thick + STAND) * smooth(0.05, 0.9, frac);
  const sMid = clamp(g.edge((g.h0 + g.h1) / 2), 0.01, 0.99);
  const nFil = clamp(Math.round(((g.h1 - g.h0) * model.halfPerim(sMid)) / 0.0011), 16, 240);

  // ── 1. cover: outer face in head skin, rolled over the free margin ─────────
  {
    const NB = big ? 14 : 8, NV = NB + 2;
    const w: number[] = [], nrm: THREE.Vector3[] = [];
    const geo = grid(NA, NV, (a, rv) => {
      const j = Math.round(rv * NV), h = hOf(a), t = tie(a);
      const E = g.edge(h), len = g.len(h), ov = overV(a);
      const sM = E + ov;
      let s: number, off: number, sh: number;
      if (j <= NB) {
        const frac = 1 - Math.pow(1 - j / NB, 1.5);
        s = E - len + (len + ov) * frac;
        off = outOff(a, frac);
        sh = 1 - 0.07 * smooth(0.88, 1, frac) * t;
      } else if (j === NB + 1) {
        s = sM + 0.45 * g.thick * t; off = outOff(a, 1) - 0.5 * g.thick * t; sh = 0.86;
      } else {
        s = sM; off = Math.max(outOff(a, 1) - g.thick * t, 0.4 * STAND * t); sh = 0.6;
      }
      const b = base(s, h, off);
      const sf = soft(b.s, b.phi);
      w.push(model.gillSwing(g, s, h));
      nrm.push(b.n);
      const col: C3 = [sh, sh * 0.97, sh * 0.96];
      // the texture under the overhang belongs to the shoulder: the cover samples its own skin only
      return { p: b.p, uv: [model.uOf(Math.min(s, E - 0.0012)), b.phi / PI2], jaw: sf.jaw, plastic: sf.plastic, col };
    }, false, true);
    const mid = Math.round(NB / 2) * (NA + 1) + Math.round(NA / 2);
    faceOut(geo, mid, nrm[mid]);
    // welded borders shade exactly like the head skin they continue
    const N = geo.getAttribute('normal') as THREE.BufferAttribute;
    for (let j = 0; j <= NB; j++)
      for (let i = 0; i <= NA; i++) {
        const k = j * (NA + 1) + i;
        const edge = j === 0 || i === 0 || i === NA ? 1 : j === 1 || i === 1 || i === NA - 1 ? 0.5 : 0;
        if (edge <= 0) continue;
        const m = new THREE.Vector3(N.getX(k), N.getY(k), N.getZ(k)).lerp(nrm[k], edge).normalize();
        N.setXYZ(k, m.x, m.y, m.z);
      }
    addMesh(withGill(geo, w), coverMat, 1, true);
  }

  // ── 2. inside of the cover: pale opercular membrane, darkening into the chamber ──
  {
    const NI = big ? 8 : 5;
    const w: number[] = [];
    const geo = grid(NA, NI, (a, rv) => {
      const h = hOf(a), t = tie(a);
      const E = g.edge(h), len = g.len(h), ov = overV(a);
      const frac = lerp(1, 0.12, rv);
      const s = E - len + (len + ov) * frac;
      const off = Math.max(outOff(a, frac) - g.thick * t, s >= E ? 0.4 * STAND * t : -0.4 * model.gillDepth(g, s, h));
      const b = base(s, h, off);
      const sf = soft(b.s, b.phi);
      w.push(model.gillSwing(g, s, h));
      return { p: b.p, jaw: sf.jaw, plastic: sf.plastic, eye: [a * nFil, (1 - frac) * 0.95, 5, 0] };
    });
    addMesh(withGill(geo, w), gillMat, 1, true);
  }

  // ── 3. chamber lining: dark vascular floor rising into the shoulder wall ──────
  {
    const NL = big ? 12 : 6;
    const w: number[] = [];
    const geo = grid(NA, NL, (a, rv) => {
      const h = hOf(a);
      const E = g.edge(h), len = g.len(h);
      const s = lerp(E - len, E, rv);
      const d = model.gillDepth(g, s, h);
      const b = base(s, h, -0.72 * d - 0.0003);
      const sf = soft(b.s, b.phi);
      w.push(model.gillFloor(g, s, h));
      return { p: b.p, jaw: sf.jaw, plastic: sf.plastic, eye: [a * nFil, 0.3 + 0.7 * (d / g.depth), 6, 0] };
    });
    addMesh(withGill(geo, w), gillMat, 1, true);
  }

  // ── 4. gill arches: combs of filaments, the inner ones reaching further back (roof-tile stack) ──
  const n = g.arches;
  for (let k = 0; k < n; k++) {
    const NR = 6;
    const w: number[] = [];
    const tier = (n - 1 - k + 0.5) / n; // 1 just under the cover … 0 on the chamber floor
    const f = lerp(0.62, 0.12, tier);
    const geo = grid(NA, NR, (a, bt) => {
      const v = lerp(0.07, 0.93, a), h = hOf(v);
      const E = g.edge(h), len = g.len(h);
      const wall = Math.min(0.005, 0.3 * len);
      const tipS = E - 0.45 * wall - len * 0.045 * (n - 1 - k);
      const s = lerp(tipS - 0.5 * len, tipS, bt);
      const b = base(s, h, -f * model.gillDepth(g, s, h));
      const sf = soft(b.s, b.phi);
      // the arches fan out into the opening slit as the cover lifts
      w.push(model.gillSwing(g, s, h) * (0.78 - 0.56 * ((k + 0.5) / n)) * Math.pow(bt, 1.5));
      return { p: b.p, jaw: sf.jaw, plastic: sf.plastic, eye: [a * nFil + k * 0.37, bt, f, 0] };
    });
    addMesh(withGill(geo, w), gillMat, 1, true);
  }
}
