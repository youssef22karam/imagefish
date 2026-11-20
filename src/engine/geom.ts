import * as THREE from 'three';
import { clamp } from './math';
export type Q4 = [number, number, number, number];
export type C3 = [number, number, number];
export interface V {
  p: THREE.Vector3;
  jaw?: number;
  flap?: number;
  gill?: number;
  side?: number;
  plastic?: Q4;
  uv?: [number, number];
  fin?: Q4;
  eye?: Q4;
  col?: C3; // vertex colour (only written when the grid is built with colours)
}
interface Acc { pos: number[]; uv: number[]; jaw: number[]; flap: number[]; gill: number[]; side: number[]; pl: number[]; fin: number[]; eye: number[]; idx: number[]; col?: number[] }
function finalize(g: THREE.BufferGeometry, a: Acc) {
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
  g.setAttribute('aJaw', new THREE.Float32BufferAttribute(a.jaw, 1));
  g.setAttribute('aFlap', new THREE.Float32BufferAttribute(a.flap, 1));
  g.setAttribute('aGill', new THREE.Float32BufferAttribute(a.gill, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(a.side, 1));
  g.setAttribute('aPlastic', new THREE.Float32BufferAttribute(a.pl, 4));
  g.setAttribute('aFin', new THREE.Float32BufferAttribute(a.fin, 4));
  g.setAttribute('aEye', new THREE.Float32BufferAttribute(a.eye, 4));
  if (a.col) g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, 3));
  g.setIndex(a.idx);
  return g;
}
const Z4: Q4 = [0, 0, 0, 0];
const W3: C3 = [1, 1, 1];
/** regular (u,v) surface patch */
export function grid(nu: number, nv: number, fn: (u: number, v: number) => V, flipWinding = false, withColor = false) {
  const a: Acc = { pos: [], uv: [], jaw: [], flap: [], gill: [], side: [], pl: [], fin: [], eye: [], idx: [], col: withColor ? [] : undefined };
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      const r = fn(u, v);
      a.pos.push(r.p.x, r.p.y, r.p.z);
      a.uv.push(r.uv ? r.uv[0] : u, r.uv ? r.uv[1] : v);
      a.jaw.push(r.jaw ?? 0);
      a.flap.push(r.flap ?? 0);
      a.gill.push(r.gill ?? 0);
      a.side.push(r.side ?? 0);
      a.pl.push(...(r.plastic ?? Z4));
      a.fin.push(...(r.fin ?? Z4));
      a.eye.push(...(r.eye ?? Z4));
      if (a.col) a.col.push(...(r.col ?? W3));
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const p = j * (nu + 1) + i, b = p + 1, c = p + nu + 1, d = c + 1;
      if (flipWinding) a.idx.push(p, c, b, b, c, d);
      else a.idx.push(p, b, c, b, d, c);
    }
  const g = finalize(new THREE.BufferGeometry(), a);
  g.computeVertexNormals();
  return g;
}
/**
 * Make a patch face outward: if the shading normal at vertex `vi` points against `out`,
 * reverse the triangle winding and the normals.
 */
export function faceOut(g: THREE.BufferGeometry, vi: number, out: THREE.Vector3) {
  const N = g.getAttribute('normal') as THREE.BufferAttribute;
  if (N.getX(vi) * out.x + N.getY(vi) * out.y + N.getZ(vi) * out.z >= 0) return g;
  const idx = g.getIndex();
  if (idx) {
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) { const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t; }
    idx.needsUpdate = true;
  }
  for (let i = 0; i < N.count; i++) N.setXYZ(i, -N.getX(i), -N.getY(i), -N.getZ(i));
  N.needsUpdate = true;
  return g;
}
/** Exact mirror reflection across z = 0 – guarantees bilateral symmetry */
export function mirrorZ(src: THREE.BufferGeometry, sideVal = -1, mirrorSkin = false) {
  const g = src.clone();
  const P = g.getAttribute('position') as THREE.BufferAttribute;
  const N = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const S = g.getAttribute('aSide') as THREE.BufferAttribute | undefined;
  const U = mirrorSkin ? g.getAttribute('uv') : undefined;
  for (let i = 0; i < P.count; i++) {
    P.setZ(i, -P.getZ(i));
    if (N) N.setZ(i, -N.getZ(i));
    if (S) S.setX(i, sideVal);
    if (U) U.setY(i, 1 - U.getY(i));
  }
  const idx = g.getIndex();
  if (idx) {
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) { const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t; }
    idx.needsUpdate = true;
  }
  return g;
}
/** accumulates many small baked primitives into one geometry */
export class Batch {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; jaw: number[] = []; flap: number[] = []; side: number[] = []; pl: number[] = []; fin: number[] = []; idx: number[] = [];
  add(src: THREE.BufferGeometry, m: THREE.Matrix4, jaw = 0, flapFn?: (p: THREE.Vector3, i: number) => number, side = 0, plastic: Q4 = Z4, fin: Q4 = Z4) {
    const P = src.getAttribute('position'), N = src.getAttribute('normal'), U = src.getAttribute('uv');
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const base = this.pos.length / 3;
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      const local = v.clone();
      v.applyMatrix4(m);
      n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z);
      this.uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
      this.jaw.push(jaw); this.flap.push(flapFn ? flapFn(local, i) : 0); this.side.push(side);
      this.pl.push(...plastic); this.fin.push(...fin);
    }
    if (src.index) for (let i = 0; i < src.index.count; i++) this.idx.push(base + src.index.getX(i));
    else for (let i = 0; i < P.count; i++) this.idx.push(base + i);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aJaw', new THREE.Float32BufferAttribute(this.jaw, 1));
    g.setAttribute('aFlap', new THREE.Float32BufferAttribute(this.flap, 1));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(this.side, 1));
    g.setAttribute('aPlastic', new THREE.Float32BufferAttribute(this.pl, 4));
    g.setAttribute('aFin', new THREE.Float32BufferAttribute(this.fin, 4));
    g.setIndex(this.idx);
    return g;
  }
  get empty() { return this.pos.length === 0; }
}
export const orient = (pos: THREE.Vector3, dir: THREE.Vector3, sx = 1, sy = 1, sz = 1) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return new THREE.Matrix4().compose(pos, q, new THREE.Vector3(sx, sy, sz));
};
/** tube along a polyline with parallel-transport frames (no Frenet flips on straight spines) */
export function tubeAlong(pts: THREE.Vector3[], rad: (k: number) => number, nR: number, at: (k: number) => Partial<V> = () => ({})) {
  const n = pts.length;
  const T = pts.map((_, k) => pts[Math.min(n - 1, k + 1)].clone().sub(pts[Math.max(0, k - 1)]).normalize());
  const ref = Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  let nn = ref.clone().addScaledVector(T[0], -ref.dot(T[0])).normalize();
  const N: THREE.Vector3[] = [];
  for (let k = 0; k < n; k++) { nn = nn.clone().addScaledVector(T[k], -nn.dot(T[k])).normalize(); N.push(nn.clone()); }
  return grid(nR, n - 1, (uu, vv) => {
    const k = Math.round(vv * (n - 1));
    const B = new THREE.Vector3().crossVectors(T[k], N[k]);
    const a = uu * Math.PI * 2, r = rad(k);
    return { p: pts[k].clone().addScaledVector(N[k], Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r), ...at(k) };
  });
}
export interface ShellSample { p: THREE.Vector3; n: THREE.Vector3 }
export interface ShellSpec {
  nu: number;
  nv: number;
  rays: number;
  vPow?: number;
  mid: (u: number, v: number) => ShellSample; // membrane mid-surface + unit normal
  thick: (u: number, v: number) => number; // half thickness (world), closures included
  ridge: number; // extra half-thickness of each bony ray (world)
  pleat: number; // accordion pleat amplitude (world)
  root?: (u: number, sgn: 1 | -1) => { p: THREE.Vector3; n?: THREE.Vector3 } | null; // root row ON the body skin
  uv: (u: number, v: number, sgn: 1 | -1, p: THREE.Vector3) => [number, number]; // body-texture coords used for the fleshy root blend
  weight: (u: number, v: number) => number; // joint weight (0 welded … 1 free)
  kind: number;
  side: number;
  plastic?: Q4;
  shape?: (u: number, v: number, sgn: 1 | -1, p: THREE.Vector3) => THREE.Vector3;
  pose?: (u: number, v: number, sgn: 1 | -1) => { jaw?: number; plastic?: Q4; gill?: number };
  flap?: (u: number, v: number) => number;
  sealSides?: boolean;
}
/**
 * Closed two-layer fin: fleshy root fillet welded to the body skin, bony rays raised on both faces,
 * thin pleated membrane between them, both layers meeting at the free margin.
 */
export function finShell(o: ShellSpec) {
  const { nu, nv } = o;
  const stride = nu + 1, layer = (nu + 1) * (nv + 1);
  const a: Acc = { pos: [], uv: [], jaw: [], flap: [], gill: [], side: [], pl: [], fin: [], eye: [], idx: [] };
  const rootN: (THREE.Vector3 | undefined)[] = [];
  for (let L = 0; L < 2; L++) {
    const sgn: 1 | -1 = L === 0 ? 1 : -1;
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, v = Math.pow(j / nv, o.vPow ?? 1);
        let q: THREE.Vector3 | null = null;
        if (j === 0 && o.root) {
          const r = o.root(u, sgn);
          if (r) { q = r.p; rootN[L * layer + i] = r.n; }
        }
        if (!q) {
          const S = o.mid(u, v);
          const rx = u * o.rays;
          const env = clamp(v * 6) * (1 - 0.55 * v);
          const pleat = o.rays > 0 ? o.pleat * Math.sin(Math.PI * rx) * env : 0;
          const t = o.thick(u, v);
          const rid = o.rays > 0 && t > 1e-7 ? Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * (rx - 0.5)), 4) * clamp(v * 8) * (1 - 0.7 * v) : 0;
          q = S.p.clone().addScaledVector(S.n, pleat + sgn * (t + o.ridge * rid));
          if (o.shape) q = o.shape(u, v, sgn, q);
        }
        a.pos.push(q.x, q.y, q.z);
        const tuv = o.uv(u, v, sgn, q);
        a.uv.push(tuv[0], tuv[1]);
        a.fin.push(o.weight(u, v), u, v, o.kind);
        const pose = o.pose?.(u, v, sgn);
        a.side.push(o.side); a.jaw.push(pose?.jaw ?? 0); a.flap.push(o.flap?.(u, v) ?? 0); a.gill.push(pose?.gill ?? 0);
        a.pl.push(...(pose?.plastic ?? o.plastic ?? Z4)); a.eye.push(0, 0, 0, 0);
      }
  }
  const s0 = o.mid(0.5, 0.4), s1 = o.mid(0.56, 0.4), s2 = o.mid(0.5, 0.46);
  const flip = new THREE.Vector3().crossVectors(s1.p.clone().sub(s0.p), s2.p.clone().sub(s0.p)).dot(s0.n) < 0;
  for (let L = 0; L < 2; L++) {
    const off = L * layer, fl = L === 0 ? flip : !flip;
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const p = off + j * stride + i, b = p + 1, c = p + stride, d = c + 1;
        if (fl) a.idx.push(p, c, b, b, c, d); else a.idx.push(p, b, c, b, d, c);
      }
  }
  if (o.sealSides) {
    const bridge = (from: number, to: number) => {
      if (flip) a.idx.push(from, to + layer, to, from, from + layer, to + layer);
      else a.idx.push(from, to, to + layer, from, to + layer, from + layer);
    };
    for (let j = 0; j < nv; j++) {
      bridge(j * stride, (j + 1) * stride);
      bridge((j + 1) * stride + nu, j * stride + nu);
    }
    for (let i = 0; i < nu; i++) bridge(nv * stride + i, nv * stride + i + 1);
  }
  const g = finalize(new THREE.BufferGeometry(), a);
  g.computeVertexNormals();
  // weld root shading to the body normals across the basal fillet rows → silky C2 join where fin meets skin
  const N = g.getAttribute('normal') as THREE.BufferAttribute;
  rootN.forEach((n, k) => {
    if (!n) return;
    N.setXYZ(k, n.x, n.y, n.z);
    const k2 = k + stride;
    const m2 = new THREE.Vector3(N.getX(k2), N.getY(k2), N.getZ(k2)).lerp(n, 0.62).normalize();
    N.setXYZ(k2, m2.x, m2.y, m2.z);
    if (nv >= 3) {
      const k3 = k + stride * 2;
      const m3 = new THREE.Vector3(N.getX(k3), N.getY(k3), N.getZ(k3)).lerp(n, 0.26).normalize();
      N.setXYZ(k3, m3.x, m3.y, m3.z);
    }
  });
  return g;
}
