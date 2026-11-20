import type { ProfileSpec } from './types';

/**
 * Explicit lateral outline of a species.
 *
 * The analytic two-piece body formula (rise to the deepest point, cosine fall to the peduncle) can only
 * produce symmetric spindles. Real fishes are told apart by exactly what that formula cannot express:
 * the straight back and hanging belly of an arowana, the humped nape of a perch, the parallel-sided
 * trunk and duck-bill of a pike, the concave forehead that runs out into a butterflyfish's forceps.
 *
 * A ProfileSpec therefore stores the dorsal and ventral silhouette as measured points (s, height) and
 * this module turns them into smooth curves:
 *   • monotone cubic interpolation (Fritsch–Carlson) – passes through every point, never overshoots,
 *     so a measured hump stays a hump and a straight back stays straight;
 *   • the abscissa is warped x = s^q, which makes the snout tip leave the axis like s^q:
 *     q ≈ 0.5 bluff rounded forehead · 0.62 ordinary rounded snout · 0.85–1 pointed wedge;
 *   • the result is tabulated and lightly diffused so curvature (and therefore shading) is continuous.
 */
export interface Outline {
  /** dorsal height above the snout axis (SL) */
  top: (s: number) => number;
  /** ventral depth below the snout axis (SL) */
  bot: (s: number) => number;
  /** snout exponent actually used */
  q: number;
}

const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** shape-preserving piecewise cubic Hermite interpolant */
function pchip(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n < 2) return () => ys[0] ?? 0;
  const h = new Array<number>(n - 1), dl = new Array<number>(n - 1), m = new Array<number>(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    h[i] = Math.max(1e-9, xs[i + 1] - xs[i]);
    dl[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  if (n === 2) {
    m[0] = m[1] = dl[0];
  } else {
    for (let i = 1; i < n - 1; i++) {
      if (dl[i - 1] * dl[i] > 0) {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]);
      }
    }
    const end = (h0: number, h1: number, d0: number, d1: number) => {
      let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (v * d0 <= 0) v = 0;
      else if (d0 * d1 <= 0 && Math.abs(v) > 3 * Math.abs(d0)) v = 3 * d0;
      return v;
    };
    m[0] = end(h[0], h[1], dl[0], dl[1]);
    m[n - 1] = end(h[n - 2], h[n - 3], dl[n - 2], dl[n - 3]);
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid; else hi = mid;
    }
    const t = (x - xs[lo]) / h[lo], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h[lo] * m[lo] + (-2 * t3 + 3 * t2) * ys[lo + 1] + (t3 - t2) * h[lo] * m[lo + 1];
  };
}

const N = 1024;

function tabulate(pairs: number[], q: number): Float64Array {
  const xs = [0], ys = [0];
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const s = Math.min(1, Math.max(1e-5, pairs[i]));
    const x = Math.pow(s, q);
    if (x <= xs[xs.length - 1] + 1e-7) continue;
    xs.push(x);
    ys.push(Math.max(0, pairs[i + 1]));
  }
  if (xs[xs.length - 1] < 1) { xs.push(1); ys.push(ys[ys.length - 1]); }
  const f = pchip(xs, ys);
  let t = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) t[i] = f(i / N);
  // light diffusion (σ ≈ 0.5 % of the warped length): C1 Hermite joints become curvature-continuous.
  // The snout tip and the caudal base are left exactly as measured.
  const R = 4;
  for (let pass = 0; pass < 3; pass++) {
    const o = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const r = Math.min(R, i, N - i);
      let a = 0;
      for (let k = -r; k <= r; k++) a += t[i + k];
      o[i] = t[i] + (a / (2 * r + 1) - t[i]) * sstep(0.03, 0.1, i / N);
    }
    t = o;
  }
  return t;
}

const cache = new WeakMap<ProfileSpec, Outline>();

export function compileProfile(p: ProfileSpec): Outline {
  const hit = cache.get(p);
  if (hit) return hit;
  const q = Math.min(1, Math.max(0.35, p.n ?? 0.62));
  const tT = tabulate(p.d, q), tB = tabulate(p.v, q);
  const at = (t: Float64Array, s: number) => {
    const x = Math.pow(s <= 0 ? 0 : s >= 1 ? 1 : s, q) * N;
    const i = Math.min(N - 1, Math.floor(x)), u = x - i;
    const p0 = t[Math.max(0, i - 1)], p1 = t[i], p2 = t[i + 1], p3 = t[Math.min(N, i + 2)];
    return Math.max(0, p1 + 0.5 * u * (p2 - p0 + u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0))));
  };
  const o: Outline = { top: (s) => at(tT, s), bot: (s) => at(tB, s), q };
  cache.set(p, o);
  return o;
}

/** classical morphometrics read back off an outline */
export function measureOutline(o: Outline) {
  let D = 0, mt = 0, mb = 0, pD = 0.4, pV = 0.4;
  for (let i = 1; i <= 500; i++) {
    const s = i / 500, t = o.top(s), b = o.bot(s);
    if (t + b > D) D = t + b;
    if (t > mt) { mt = t; pD = s; }
    if (b > mb) { mb = b; pV = s; }
  }
  const t1 = o.top(1), b1 = o.bot(1);
  return { D, df: mt / Math.max(1e-6, mt + mb), pD, pV, P: t1 + b1, pedY: (t1 - b1) / 2 };
}
