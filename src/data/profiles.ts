import type { DeepPartial, Species } from '../engine/types';
import { compileProfile, measureOutline } from '../engine/profile';
import { merge } from './factory';
import { OUTLINES_1, type OutlineEntry } from './outlines1';
import { OUTLINES_2 } from './outlines2';

export const OUTLINES: Record<string, OutlineEntry> = { ...OUTLINES_1, ...OUTLINES_2 };

/**
 * Give a species its measured lateral outline.
 *  1. landmark / fin corrections that belong to the outline are merged in,
 *  2. the outline is normalised to the measured maximum body depth,
 *  3. the classical morphometrics (depth, deepest stations, peduncle depth and offset) are read back off the
 *     curve, so everything that still consumes those numbers (fins, caudal joint, UI) agrees with the silhouette.
 */
export function applyOutline(sp0: Species): Species {
  const e = OUTLINES[sp0.id];
  if (!e || sp0.body.disc) return sp0;
  const sp = e.fix ? merge(sp0, e.fix as DeepPartial<Species>) : sp0;
  const D = e.D ?? sp.body.D;
  const raw = measureOutline(compileProfile({ d: e.d, v: e.v, n: e.n }));
  const k = D / Math.max(1e-6, raw.D);
  const scale = (a: number[]) => a.map((x, i) => (i % 2 ? x * k : x));
  const body = {
    ...sp.body,
    D, df: raw.df, pD: raw.pD, pV: raw.pV, P: raw.P * k, pedY: raw.pedY * k,
    prof: { d: scale(e.d), v: scale(e.v), n: e.n, D },
  };
  delete body.bumps;
  delete body.nape;
  return { ...sp, body };
}
