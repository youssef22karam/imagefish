import type { CaudalSpec, ColorSpec, EyeSpec, Layer, MedianFin, PairedFin, Species } from '../engine/types';

/**
 * Natural colouration of one species, read off its reference photograph (fish-images library) and checked against
 * field-guide descriptions: body pigment layers, head marks, every fin and the iris.
 */
export interface Pal {
  c?: ColorSpec; // full integument (replaces the measured placeholder)
  set?: Partial<ColorSpec>; // or: tweak the base colours of the measured spec…
  add?: Layer[]; // …and lay extra marks on top of it
  f?: {
    color?: string; tip?: string; alpha?: number;
    d?: Partial<MedianFin>[]; a?: Partial<MedianFin>[]; // per dorsal / anal fin, by index
    c?: Partial<CaudalSpec>; p?: Partial<PairedFin>; v?: Partial<PairedFin>;
    fl?: string; // finlets
  };
  e?: Partial<EyeSpec>;
  r?: string; // rostrum (bill, sword, paddle, saw)
  fr?: string; // seadragon appendages
}

/** n evenly spaced stations from a to b */
export const seq = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => +(a + ((b - a) * i) / Math.max(1, n - 1)).toFixed(4));

export function applyPalette(sp: Species, PAL: Record<string, Pal>): Species {
  const p = PAL[sp.id];
  if (!p) return sp;
  let color: ColorSpec = p.c ? { ...p.c } : { ...sp.color, ...(p.set ?? {}) };
  if (p.add) color = { ...color, layers: [...(color.layers ?? []), ...p.add] };
  const f = p.f ?? {};
  const fins = { ...sp.fins };
  if (f.color) fins.color = f.color;
  if (f.tip) fins.tip = f.tip;
  if (f.alpha !== undefined) fins.alpha = f.alpha;
  if (f.d && fins.dorsal) fins.dorsal = fins.dorsal.map((x, i) => (f.d![i] ? { ...x, ...f.d![i] } : x));
  if (f.a && fins.anal) fins.anal = fins.anal.map((x, i) => (f.a![i] ? { ...x, ...f.a![i] } : x));
  if (f.c) fins.caudal = { ...fins.caudal, ...f.c };
  if (f.p && fins.pec) fins.pec = { ...fins.pec, ...f.p };
  if (f.v && fins.pel) fins.pel = { ...fins.pel, ...f.v };
  if (f.fl && fins.finlets) fins.finlets = { ...fins.finlets, color: f.fl };
  return {
    ...sp,
    color,
    fins,
    eye: p.e ? { ...sp.eye, ...p.e } : sp.eye,
    rostrum: p.r && sp.rostrum ? { ...sp.rostrum, color: p.r } : sp.rostrum,
    fronds: p.fr && sp.fronds ? { ...sp.fronds, c: p.fr } : sp.fronds,
  };
}
