import type { DeepPartial, FinShape, MedianFin, PairedFin, Species } from '../engine/types';

const BASE: Omit<Species, 'id' | 'name' | 'sci' | 'group' | 'note'> = {
  lenM: 0.5,
  plan: 'fish',
  HL: 0.26,
  body: { D: 0.25, df: 0.5, pD: 0.38, pV: 0.42, P: 0.09, pedY: 0, bD: 0.38, bV: 0.42, tD: 1.24, tV: 1.22, W: 0.55, Wh: 1, Wt: 0.6, sq: 2.2 },
  mouth: { s: 0, y: 0, gape: 0.08, angle: 15, curve: 0, open: 30, jut: 0, lip: 0.32, teeth: 'fine', tn: 10, ts: 0.006, kind: 'jaw' },
  eye: { s: 0.1, y: 0.35, d: 0.05, iris: '#c8a040' },
  fins: { caudal: { type: 'forked', span: 0.3 }, color: '#9aa4a8', alpha: 0.7 },
  color: { top: '#4a5a60', side: '#9aa8ae', belly: '#e8ecee' },
  skin: { scales: 60, kind: 'cycloid', bump: 0.6 },
  swim: { mode: 'subcarangiform' },
};

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
export function merge<T>(a: T, b: DeepPartial<T> | undefined): T {
  if (!b) return a;
  const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
  for (const [k, v] of Object.entries(b as Record<string, unknown>)) {
    if (v === undefined) { delete out[k]; continue; }
    const cur = out[k];
    out[k] = isObj(cur) && isObj(v) ? merge(cur, v as never) : v;
  }
  return out as T;
}

export type SP = DeepPartial<Species> & { id: string; name: string; sci: string; group: string; note: string };

export function make(arch: DeepPartial<Species> | DeepPartial<Species>[], over: SP): Species {
  let s = BASE as Species;
  for (const a of Array.isArray(arch) ? arch : [arch]) s = merge(s, a);
  return merge(s, over as DeepPartial<Species>);
}

/** median fin helper */
export const M = (s0: number, s1: number, h: number, shape: FinShape, x: Partial<MedianFin> = {}): MedianFin => ({ s0, s1, h, shape, ...x });
/** paired fin helper */
export const Pf = (s: number, y: number, base: number, len: number, shape: FinShape, elev: number, splay: number, x: Partial<PairedFin> = {}): PairedFin => ({ s, y, base, len, shape, elev, splay, ...x });

// ── archetypes ──────────────────────────────────────────────────────────────
export const A = {
  perch: {
    body: { D: 0.3, df: 0.55, pD: 0.36, pV: 0.42, P: 0.1, bD: 0.36, bV: 0.44, tD: 1.26, tV: 1.24, W: 0.44 },
    mouth: { lip: 0.38, protrude: 0.45, gular: 0.35 },
    skin: { scales: 60, kind: 'ctenoid', bump: 0.7 },
    fins: {
      pec: Pf(0.29, -0.32, 0.048, 0.16, 'round', -10, 28),
      pel: Pf(0.33, -0.94, 0.03, 0.13, 'tri', -38, 22, { incise: 0 }),
      caudal: { type: 'emarginate', span: 0.3, len: 0.2 },
    },
    swim: { mode: 'subcarangiform' },
  },
  salmonid: {
    lenM: 0.7,
    body: { D: 0.22, df: 0.52, pD: 0.38, pV: 0.45, P: 0.085, bD: 0.32, bV: 0.38, tD: 1.22, tV: 1.22, W: 0.55 },
    mouth: { lip: 0.28, protrude: 0.16, gular: 0.24 },
    skin: { scales: 120, kind: 'cycloid', bump: 0.35 },
    HL: 0.22,
    fins: {
      dorsal: [M(0.4, 0.53, 0.125, 'tri'), M(0.8, 0.86, 0.036, 'adipose', { alpha: 1, rays: 0, foil: 1 })],
      anal: [M(0.72, 0.82, 0.095, 'tri')],
      pec: Pf(0.23, -0.62, 0.036, 0.14, 'tri', -18, 34),
      pel: Pf(0.52, -0.92, 0.03, 0.1, 'tri', -25, 24),
      caudal: { type: 'emarginate', span: 0.3, len: 0.18 },
    },
    swim: { mode: 'subcarangiform' },
  },
  clupeid: {
    lenM: 0.3,
    body: { D: 0.2, df: 0.45, pD: 0.4, pV: 0.42, P: 0.065, bD: 0.28, bV: 0.32, W: 0.45, tD: 1.32, tV: 1.32, keelVentral: 0.72 },
    mouth: { lip: 0.22, protrude: 0.52, gular: 0.34 },
    skin: { scales: 50, kind: 'cycloid', bump: 0.5 },
    HL: 0.24,
    color: { top: '#2f5a6e', side: '#c6d4dc', belly: '#f2f6f8', iri: 0.8, metal: 0.55, rough: 0.25 },
    fins: {
      dorsal: [M(0.42, 0.55, 0.105, 'tri')],
      anal: [M(0.78, 0.9, 0.042, 'low')],
      pec: Pf(0.25, -0.75, 0.026, 0.115, 'tri', -16, 26),
      pel: Pf(0.5, -0.94, 0.02, 0.07, 'tri', -22, 18),
      caudal: { type: 'forked', span: 0.34, len: 0.24, fork: 0.25 },
      color: '#b8c4c8', alpha: 0.5,
    },
    swim: { mode: 'carangiform' },
  },
  cyprinid: {
    body: { D: 0.3, df: 0.6, pD: 0.36, pV: 0.48, P: 0.12, bD: 0.38, bV: 0.46, nape: 0.14, W: 0.55 },
    skin: { scales: 36, kind: 'cycloid', bump: 0.9 },
    HL: 0.23,
    mouth: { s: 0.012, y: -0.25, gape: 0.05, angle: 11, open: 32, teeth: 'none', tn: 0, lip: 0.7, protrude: 0.75, gular: 0.38 },
    fins: {
      dorsal: [M(0.4, 0.74, 0.13, 'tri', { sweep: 15 })],
      anal: [M(0.74, 0.82, 0.1, 'tri')],
      pec: Pf(0.24, -0.72, 0.038, 0.14, 'round', -18, 38),
      pel: Pf(0.46, -0.93, 0.03, 0.11, 'round', -26, 26),
      caudal: { type: 'forked', span: 0.36, len: 0.25, fork: 0.35 },
    },
  },
  scombrid: {
    lenM: 1,
    body: { D: 0.27, df: 0.5, pD: 0.38, pV: 0.42, P: 0.035, bD: 0.3, bV: 0.32, tD: 1.65, tV: 1.65, W: 0.72, Wt: 0.9, sq: 2, keel: 0.022 },
    skin: { scales: 0, kind: 'smooth', bump: 0.2 },
    HL: 0.27,
    mouth: { gape: 0.085, angle: 18, lip: 0.26, protrude: 0.22, gular: 0.28, teeth: 'fine', tn: 14, ts: 0.004 },
    eye: { s: 0.09, y: 0.38, d: 0.042, iris: '#2a2a20' },
    color: { top: '#0d2346', side: '#8fa0b4', belly: '#eef1f4', cs: [0.36, 0.55], iri: 0.5, metal: 0.55, rough: 0.22 },
    fins: {
      dorsal: [M(0.28, 0.46, 0.075, 'spiny', { incise: 0.2 }), M(0.5, 0.59, 0.12, 'falcate')],
      anal: [M(0.56, 0.64, 0.11, 'falcate')],
      finlets: { s0: 0.66, s1: 0.93, n: 8, h: 0.025, color: '#e0c030' },
      pec: Pf(0.27, -0.08, 0.032, 0.18, 'falcate', -12, 34),
      pel: Pf(0.3, -0.94, 0.02, 0.07, 'tri', -30, 18),
      caudal: { type: 'lunate', span: 0.5, len: 0.2 },
      color: '#2a3550', alpha: 0.92,
    },
    swim: { mode: 'thunniform' },
  },
  shark: {
    lenM: 3,
    HL: 0.22,
    body: { D: 0.18, df: 0.55, pD: 0.36, pV: 0.42, P: 0.04, bD: 0.26, bV: 0.24, W: 0.76, Wh: 1.12, sq: 2.05, bellyFlat: 0.3, tD: 1.18, tV: 1.22 },
    skin: { scales: 0, kind: 'placoid', bump: 0.5 },
    mouth: {
      s: 0.055, y: -0.78, gape: 0.072, angle: 12, curve: 0.06, open: 26,
      lip: 0.22, protrude: 0.2, gular: 0.22, teeth: 'shark', tn: 12, ts: 0.011, throat: 0.08,
    },
    eye: { s: 0.075, y: 0.25, d: 0.018, iris: '#20262a' },
    color: { top: '#5f6d78', side: '#7d8b96', belly: '#f2f2ef', cs: [0.42, 0.56], rough: 0.55 },
    fins: {
      dorsal: [M(0.35, 0.47, 0.125, 'shark', { foil: 1 }), M(0.77, 0.82, 0.03, 'shark', { foil: 1 })],
      anal: [M(0.79, 0.84, 0.026, 'shark', { foil: 1 })],
      pec: Pf(0.23, -0.68, 0.072, 0.22, 'shark', -20, 72, { alpha: 1, rays: 0, foil: 1 }),
      pel: Pf(0.58, -0.88, 0.048, 0.075, 'shark', -22, 56, { alpha: 1, rays: 0, foil: 1 }),
      caudal: { type: 'hetero', span: 0.42, len: 0.3 },
      alpha: 1, color: '#66737e',
    },
    swim: { mode: 'carangiform' },
  },
  eel: {
    HL: 0.12,
    lenM: 1,
    body: { D: 0.065, df: 0.5, pD: 0.35, pV: 0.38, P: 0.02, bD: 0.4, bV: 0.45, tD: 0.9, tV: 0.9, W: 0.75, Wt: 0.35, sq: 2 },
    skin: { scales: 0, kind: 'smooth', bump: 0.15 },
    mouth: { gape: 0.04, angle: 8, lip: 0.32, protrude: 0.08, teeth: 'fine', tn: 12, ts: 0.003 },
    eye: { s: 0.03, y: 0.45, d: 0.012 },
    fins: { caudal: { type: 'pointed', span: 0.04, len: 0.04 }, alpha: 0.75 },
    swim: { mode: 'anguilliform' },
  },
  reef: {
    lenM: 0.25,
    body: { D: 0.5, df: 0.52, pD: 0.4, pV: 0.45, P: 0.12, bD: 0.55, bV: 0.6, W: 0.3, tD: 1.1, tV: 1.1 },
    skin: { scales: 45, kind: 'ctenoid', bump: 0.5 },
    mouth: { gape: 0.03, angle: 10, open: 28, lip: 0.42, protrude: 0.45, tn: 8, ts: 0.004 },
    eye: { s: 0.17, y: 0.35, d: 0.075 },
    HL: 0.3,
    fins: {
      pec: Pf(0.32, -0.25, 0.05, 0.16, 'round', -6, 28),
      pel: Pf(0.33, -0.92, 0.03, 0.13, 'tri', -42, 18),
      caudal: { type: 'truncate', span: 0.35, len: 0.18 },
    },
    swim: { mode: 'labriform' },
  },
  ray: {
    plan: 'ray',
    HL: 0.1,
    skin: { scales: 0, kind: 'placoid', bump: 0.6 },
    body: { D: 0.08, df: 0.6, pD: 0.35, pV: 0.35, P: 0.02, bD: 0.7, bV: 0.7, W: 1, sq: 2.1, tD: 1, tV: 1 },
    mouth: { gape: 0, kind: 'none' },
    eye: { s: 0.12, y: 0.9, d: 0.02, iris: '#3b3a2a' },
    fins: { caudal: { type: 'none', span: 0 }, alpha: 1 },
    swim: { mode: 'rajiform' },
  },
  flat: {
    plan: 'flatR',
    HL: 0.22,
    body: { D: 0.45, df: 0.5, pD: 0.42, pV: 0.45, P: 0.1, bD: 0.46, bV: 0.46, tD: 1.28, tV: 1.28, W: 0.18, sq: 2.2 },
    skin: { scales: 90, kind: 'ctenoid', bump: 0.4 },
    mouth: { s: 0.0, y: 0.1, gape: 0.04, angle: 30, lip: 0.38, protrude: 0.35, tn: 8, ts: 0.003 },
    eye: { s: 0.09, y: 0.62, d: 0.04 },
    fins: {
      pec: Pf(0.22, 0.0, 0.03, 0.09, 'round', 0, 28),
      pel: Pf(0.2, -0.95, 0.02, 0.05, 'round', -30, 12),
      caudal: { type: 'rounded', span: 0.28, len: 0.2 },
      alpha: 0.85,
    },
    swim: { mode: 'subcarangiform' },
  },
} satisfies Record<string, DeepPartial<Species>>;
