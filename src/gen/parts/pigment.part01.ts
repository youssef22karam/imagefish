//  Pigment grammar. Colour in fishes is ecology made visible: countershading in
//  open water, mirror-silver where there is nowhere to hide, the seafloor itself
//  on benthic ambushers, aposematic & signalling colours on the reef, red and
//  black where red light never arrives, glass where there is no light at all.
//  Each strategy composes the engine's chromatophore layers in skin space
//  (s snout → caudal base, h 0 dorsal · 0.5 lateral midline · 1 ventral).
// ─────────────────────────────────────────────────────────────────────────────
import type { CaudalSpec, ColorSpec, Layer, MedianFin, PairedFin, Species } from '../engine/types';
import type { Habitat } from './habitats';
import type { Lineage, Niche } from './lineages';
import { chance, clamp, darker, hsl, irange, lighter, mix, pick, r4, range, seq, tone, toHsl, wpick, type Rnd } from './util';
export type Strategy =
  | 'silver' | 'matte' | 'reef' | 'cryptic' | 'disruptive' | 'kelp' | 'grass' | 'riverine' | 'drab' | 'neon'
  | 'deepBlack' | 'deepRed' | 'deepSilver' | 'ghost' | 'polar' | 'jewel' | 'pelagicBold' | 'streamDisplay';
export const STRATEGY_INFO: Record<Strategy, { name: string; why: string }> = {
  silver: { name: 'Countershaded silver', why: 'dark back over the deep, mirror-silver flanks reflecting the water column — near-invisible from every side' },
  matte: { name: 'Countershaded matte', why: 'dark dorsum and pale belly cancel the light gradient from above, flattening its silhouette' },
  reef: { name: 'Reef signal colours', why: 'saturated signal colours and bold contrasts for species recognition and warning on the bright reef' },
  cryptic: { name: 'Background matching', why: 'mottled, speckled skin reproducing the substrate grain so it vanishes against the bottom' },
  disruptive: { name: 'Disruptive bars', why: 'vertical bars break up its outline among stems, roots and shadows' },
  kelp: { name: 'Kelp camouflage', why: 'olive, gold and brown blotches match the dappled light of the kelp canopy' },
  grass: { name: 'Seagrass camouflage', why: 'green tones and longitudinal stripes mimic swaying blades of seagrass' },
  riverine: { name: 'Riverine spotting', why: 'olive back and spotted bronze flanks match a pebble bed under rippling light' },
  drab: { name: 'Turbid-water drab', why: 'in murky water colour carries little information: a dull, dark-backed livery suffices' },
  neon: { name: 'Blackwater neon', why: 'iridescent stripes flash like beacons in tannin-dark water, keeping the school together' },
  deepBlack: { name: 'Abyssal black', why: 'velvet-black skin absorbs bioluminescent searchlights; only its own photophores glow' },
  deepRed: { name: 'Deep-sea red', why: 'red light never reaches this depth, so a scarlet fish is effectively black and invisible' },
  deepSilver: { name: 'Mirror & counter-light', why: 'mirror sides plus ventral photophores erase the silhouette against the faint light from above' },
  ghost: { name: 'Depigmented glass', why: 'with no light at all, pigment is useless and lost — pale, translucent, blood showing through' },
  polar: { name: 'Polar pallor', why: 'pale, low-contrast tones under the sea ice; colourless antifreeze blood in the palest forms' },
  jewel: { name: 'Jewel tones', why: 'iridescent blues and reds displayed in sun-flecked still water to rivals and mates' },
  pelagicBold: { name: 'Pelagic electric', why: 'electric blue-green and gold that can flash during hunts and fade at rest' },
  streamDisplay: { name: 'Breeding colours', why: 'vivid breeding bars and fins in clear, shallow riffles where mates can see them' },
};
export interface FinPaint {
  color: string; tip?: string; alpha?: number; fl?: string;
  d?: Partial<MedianFin>; a?: Partial<MedianFin>; c?: Partial<CaudalSpec>; p?: Partial<PairedFin>; v?: Partial<PairedFin>;
}
export interface Paint { color: ColorSpec; fins: FinPaint; iris: string; iris2?: string; strategy: Strategy; motifs: string[] }
interface Ctx { sp: Species; H: Habitat; niche: Niche; L: Lineage; r: Rnd }
// ── strategy choice ─────────────────────────────────────────────────────────
export function chooseStrategy(sp: Species, H: Habitat, niche: Niche, L: Lineage, r: Rnd): Strategy {
  const open = niche === 'apex' || niche === 'pursuit' || niche === 'planktivore' || niche === 'filter';
  const hide = niche === 'ambush' || niche === 'cryptic' || niche === 'crevice' || niche === 'benthivore';
  const w: Partial<Record<Strategy, number>> = {};
  switch (H.id) {
    case 'reef': Object.assign(w, { reef: 3, disruptive: 0.6, cryptic: hide ? 2.2 : 0.3, silver: open ? 1.2 : 0.1, matte: niche === 'apex' ? 0.8 : 0 }); break;
    case 'kelp': Object.assign(w, { kelp: 2.5, disruptive: 1.2, cryptic: hide ? 1.4 : 0.3, reef: 0.5, silver: open ? 1.5 : 0.1, matte: niche === 'apex' ? 0.8 : 0 }); break;
    case 'seagrass': Object.assign(w, { grass: 2.5, cryptic: 1, disruptive: 0.8, silver: open ? 1.4 : 0.3, reef: 0.6 }); break;
    case 'pelagic': Object.assign(w, { silver: 3, matte: niche === 'apex' ? 2 : 0.4, pelagicBold: 0.9 }); break;
    case 'twilight': Object.assign(w, { deepSilver: niche === 'planktivore' ? 3 : 1.2, deepBlack: 1.5, deepRed: 1.5 }); break;
    case 'abyss': Object.assign(w, { deepBlack: 3, deepRed: 1, ghost: 0.4, deepSilver: 0.3 }); break;
    case 'hadal': Object.assign(w, { ghost: 3, deepBlack: 0.3, deepRed: 0.2 }); break;
    case 'sandflat': Object.assign(w, { cryptic: 3, silver: open ? 1.5 : 0.2, disruptive: 0.4, matte: 0.5 }); break;
    case 'rocky': Object.assign(w, { cryptic: 2.5, disruptive: 1.2, kelp: 0.6, reef: 0.5, silver: open ? 1 : 0.1 }); break;
    case 'polar': Object.assign(w, { polar: 2, cryptic: hide ? 1.4 : 0.4, silver: open ? 1.5 : 0.2, ghost: 0.8 }); break;
    case 'estuary': Object.assign(w, { drab: 2.5, silver: open ? 1.8 : 0.8, cryptic: 1, disruptive: 0.5 }); break;
    case 'stream': Object.assign(w, { riverine: 2.5, streamDisplay: hide || niche === 'picker' ? 1.2 : 0.4, silver: 0.8, cryptic: hide ? 1 : 0.3, disruptive: 0.6 }); break;
    case 'river': Object.assign(w, { drab: 2, riverine: 1, silver: 1, cryptic: hide ? 1.2 : 0.3, disruptive: 0.5 }); break;
    case 'amazon': Object.assign(w, { neon: niche === 'picker' || niche === 'planktivore' ? 2.2 : 0.5, reef: L.kind === 'bony' ? 1 : 0, drab: 1, cryptic: hide ? 1.5 : 0.5, disruptive: 0.8, silver: open ? 1 : 0.2 }); break;
    case 'lake': Object.assign(w, { riverine: 1.5, silver: 1.5, disruptive: 1.5, drab: 0.8, cryptic: 0.6, reef: L.name.startsWith('Cichlid') ? 2.5 : 0.2 }); break;
    case 'swamp': Object.assign(w, { jewel: niche === 'picker' ? 2.5 : 0.8, drab: 1.5, cryptic: 1.5, disruptive: 0.8 }); break;
    case 'cave': Object.assign(w, { ghost: 1 }); break;
  }
  if (niche === 'ambush' || niche === 'cryptic') { w.cryptic = (w.cryptic ?? 0) * 1.8 + 0.4; }
  const k = L.kind;
  if (k === 'shark' || k === 'batoid') {
    for (const s of Object.keys(w) as Strategy[]) if (!['matte', 'cryptic', 'deepBlack', 'polar', 'ghost', 'reef', 'silver'].includes(s)) delete w[s];
    if (w.reef) w.reef *= 0.25;
    if (w.silver) { w.matte = (w.matte ?? 0) + w.silver; delete w.silver; }
    if (!Object.keys(w).length) w.matte = 1;
  }
  if (sp.plan === 'flatR' || sp.plan === 'flatL') { w.cryptic = (w.cryptic ?? 0) + 3; delete w.silver; delete w.deepSilver; }
  return wpick(r, w, 'cryptic');
}
// ── helpers ─────────────────────────────────────────────────────────────────
const hEye = (sp: Species) => clamp(0.5 - sp.eye.y * 0.42, 0.08, 0.92);
const trunk0 = (sp: Species) => clamp(sp.HL * 0.95, 0.1, 0.45);
function band(sc: number, w: number, c: string, edge: string | undefined, bow: number, slant: number): Layer {
  const stops = [0, 0.18, 0.36, 0.54, 0.72, 0.88, 1].map((h) => {
    const off = bow * Math.sin(Math.PI * h) + slant * (h - 0.5);
    return [h, r4(sc - w / 2 + off), r4(sc + w / 2 + off)] as [number, number, number];
  });
  return edge ? { k: 'band', stops, c, edge, ew: 0.0075, soft: 0.0007, rough: 0.0018 } : { k: 'band', stops, c, soft: 0.002, rough: 0.002 };
}
function scheme(c: Ctx) {
  const { r, H } = c;
  const v = 0.55 + 0.45 * H.vivid;
  const seedCol = chance(r, 0.65) && H.accents.length ? pick(r, H.accents) : hsl(range(r, 0, 360), 0.85, 0.52);
  let [h, s, l] = toHsl(seedCol);
  if (s < 0.25 || l < 0.15 || l > 0.9) { h = range(r, 0, 360); s = 0.85; l = 0.52; }
  const base = hsl(h + range(r, -12, 12), clamp(s * v * range(r, 0.9, 1.1), 0.35, 1), clamp(l + range(r, -0.08, 0.06), 0.36, 0.62));
  const harmony = pick(r, ['comp', 'split', 'analog', 'triad', 'mono'] as const);
  const dh = harmony === 'comp' ? 180 : harmony === 'split' ? pick(r, [150, 210]) : harmony === 'analog' ? pick(r, [35, -35]) : harmony === 'triad' ? pick(r, [120, 240]) : 0;
  const acc = harmony === 'mono' ? pick(r, ['#f4f2ea', '#141414', hsl(h, 0.9, 0.78)]) : hsl(h + dh + range(r, -10, 10), clamp(0.8 * v + 0.15), range(r, 0.45, 0.62));
  const acc2 = hsl(h + dh * 0.5 + 180 * (chance(r, 0.3) ? 1 : 0), 0.85 * v, range(r, 0.5, 0.65));
  const dark = hsl(h + range(r, -20, 20), 0.35, range(r, 0.06, 0.11));
  const light = chance(r, 0.7) ? '#f3f1ea' : hsl(h, 0.35, 0.92);
  const electric = pick(r, ['#3ad0ff', '#5ab8ff', '#28e0d0', '#9a7aff']);
  return { base, acc, acc2, dark, light, electric, h };
}
// ── painters ────────────────────────────────────────────────────────────────
type Painter = (c: Ctx) => Omit<Paint, 'strategy'>;
const silver: Painter = (c) => {
  const { r, H, sp } = c;
  const wh = H.water + range(r, -25, 25);
  const top = hsl(wh, range(r, 0.35, 0.65), range(r, 0.12, 0.24));
  const side = hsl(wh, range(r, 0.06, 0.16), range(r, 0.6, 0.72));
  const layers: Layer[] = [{ k: 'grad', c: hsl(wh + 10, 0.5, 0.42), s0: 0.04, s1: 0.98, h0: 0.26, h1: 0.4, soft: 0.04, a: 0.4 }];
  const motifs: string[] = [];
  const t0 = trunk0(sp);
  const opt = pick(r, ['waves', 'stripe', 'row', 'spot', 'bars', 'plain', 'stripe'] as const);
  if (opt === 'waves') { layers.push({ k: 'waves', n: irange(r, 16, 28), c: darker(top, 0.3), w: range(r, 0.006, 0.01), amp: range(r, 0.2, 0.35), freq: range(r, 8, 14), h0: 0, h1: range(r, 0.28, 0.36), s0: t0, s1: 0.96, slant: range(r, -0.2, 0.2), vertical: true, a: 0.85 }); motifs.push('wavy dorsal bars'); }
  if (opt === 'stripe') { const col = pick(r, ['#e8c040', '#d8a050', '#5ad0ff', '#c8d8e0', '#f0e070']); layers.push({ k: 'stripe', h: range(r, 0.36, 0.46), w: range(r, 0.008, 0.02), c: col, s0: t0 * 0.6, s1: 0.98, a: range(r, 0.55, 0.9), soft: 0.004 }); motifs.push('lateral stripe'); }
  if (opt === 'row') { layers.push({ k: 'row', h: range(r, 0.4, 0.5), n: irange(r, 6, 14), r: range(r, 0.005, 0.009), c: darker(top, 0.2), s0: t0, s1: 0.75 }); motifs.push('row of flank spots'); }
  if (opt === 'spot') { layers.push({ k: 'spots', n: 1, r: range(r, 0.012, 0.02), c: darker(top, 0.3), s0: t0 + 0.03, s1: t0 + 0.03, h0: 0.36, h1: 0.36 }); motifs.push('shoulder spot'); }
  if (opt === 'bars') { layers.push({ k: 'bars', at: seq(t0 + 0.08, 0.9, irange(r, 10, 20)), w: 0.005, c: '#e6edf3', h0: 0.52, h1: 0.86, a: 0.35, brk: 0.35, rough: 0.0015 }); motifs.push('pale belly lines'); }
  const finC = mix(top, side, 0.45);
  const yellow = chance(r, 0.25);
  return {
    color: { top, side, belly: '#eef1f2', cs: [range(r, 0.3, 0.4), range(r, 0.53, 0.64)], iri: range(r, 0.5, 0.85), metal: range(r, 0.45, 0.6), rough: range(r, 0.18, 0.26), layers },
    fins: { color: finC, tip: darker(finC, 0.3), alpha: range(r, 0.55, 0.78), c: { color: finC, tip: darker(top, 0.15) }, p: { color: lighter(finC, 0.3) }, v: { color: lighter(finC, 0.4) }, a: yellow ? { color: '#d8b830' } : {}, fl: '#d6b42c', ...(yellow ? { d: { color: '#c8a830' } } : {}) },
    iris: pick(r, ['#d8d4c0', '#c8b070', '#e8e4d0', '#a8a070']), iris2: '#f0ecd8', motifs,
  };
};
const matte: Painter = (c) => {
  const { r, H, sp } = c;
  const warm = chance(r, 0.35);
  const top = warm ? hsl(range(r, 25, 45), range(r, 0.12, 0.3), range(r, 0.26, 0.38)) : hsl(H.water + range(r, -15, 15), range(r, 0.1, 0.3), range(r, 0.28, 0.4));
  const side = lighter(top, 0.22);
  const layers: Layer[] = [];
  const motifs: string[] = [];
  const t0 = trunk0(sp);
  const opt = pick(r, ['plain', 'bars', 'spots', 'lattice', 'plain'] as const);
  if (opt === 'bars') { layers.push({ k: 'bars', at: seq(t0 + 0.05, 0.92, irange(r, 8, 16)), w: range(r, 0.012, 0.02), c: darker(top, 0.35), h0: 0, h1: 0.45, a: 0.55, rough: 0.004, brk: 0.3, taper: 0.5 }); motifs.push('tiger bars'); }
  if (opt === 'spots') { layers.push({ k: 'spots', n: irange(r, 60, 160), r: range(r, 0.005, 0.01), c: darker(top, 0.4), h0: 0, h1: 0.6, s0: 0.05, s1: 0.98, irr: 0.4, even: 0.7, a: 0.7 }); motifs.push('leopard spots'); }
  if (opt === 'lattice') { layers.push({ k: 'lattice', cols: irange(r, 26, 40), rows: irange(r, 5, 7), r: range(r, 0.005, 0.008), c: '#e8ecea', s0: 0.05, s1: 0.98, h0: 0.04, h1: 0.62, jitter: 0.35, skip: 0.15 }); motifs.push('constellation of pale spots'); }
  const finC = mix(top, side, 0.4);
  const tips = pick(r, [undefined, '#101214', '#f0f0ea'] as const);
  if (tips) motifs.push(tips === '#101214' ? 'black fin tips' : 'white fin tips');
  return {
    color: { top, side, belly: '#f0efea', cs: [range(r, 0.38, 0.44), range(r, 0.54, 0.6)], rough: range(r, 0.48, 0.6), layers },
    fins: { color: finC, tip: tips ?? darker(finC, 0.2), alpha: 1 },
    iris: pick(r, ['#20262a', '#2a3a3a', '#3a3428']), motifs,
  };
};
const reef: Painter = (c) => {
  const { r, sp } = c;
  const P = scheme(c);
  const layers: Layer[] = [];
  const motifs: string[] = [];
  const t0 = trunk0(sp), he = hEye(sp);
  let top = darker(P.base, 0.12), side = P.base, belly = mix(P.base, P.light, 0.35);
  const recipe = pick(r, ['bicolor', 'bands', 'bars', 'lines', 'spots', 'masked', 'vermic', 'sunset', 'saddles', 'ocelli'] as const);
  switch (recipe) {
    case 'bicolor': {
      if (chance(r, 0.5)) { layers.push({ k: 'grad', c: P.acc, s0: range(r, 0.42, 0.6), s1: 1.05, h0: -0.05, h1: 1.05, soft: range(r, 0.015, 0.05) }); motifs.push('two-tone split'); }
      else { layers.push({ k: 'grad', c: P.acc, s0: -0.05, s1: 1.05, h0: range(r, 0.45, 0.6), h1: 1.05, soft: range(r, 0.02, 0.04) }); motifs.push('bicolour flanks'); }
      break;
    }
    case 'bands': {
      const n = irange(r, 1, 3), col = chance(r, 0.6) ? P.light : P.acc, edge = chance(r, 0.65) ? P.dark : undefined;
      const st = [clamp(sp.eye.s + range(r, 0.06, 0.1), 0.12, sp.HL + 0.02), range(r, 0.45, 0.58), range(r, 0.86, 0.93)];
      for (let i = 0; i < n; i++) layers.push(band(st[i], range(r, 0.05, 0.085), col, edge, range(r, -0.03, 0.035), range(r, -0.02, 0.02)));
      motifs.push(`${n} ${edge ? 'black-edged ' : ''}bands`);
      break;
    }
    case 'bars': {
      const n = irange(r, 3, 7), col = chance(r, 0.6) ? P.dark : P.acc;
      layers.push({ k: 'bars', at: seq(t0 - 0.02, 0.9, n), w: range(r, 0.025, 0.055), c: col, h0: chance(r, 0.5) ? 0 : range(r, 0.02, 0.15), h1: range(r, 0.75, 1), rough: 0.003, a: range(r, 0.8, 1), taper: range(r, 0, 0.4) });
      motifs.push(`${n} vertical bars`);
      if (chance(r, 0.5)) { layers.push({ k: 'grad', c: pick(r, [P.acc2, '#f0d020']), s0: -0.05, s1: 1.05, h0: -0.05, h1: range(r, 0.25, 0.4), soft: 0.04, a: 0.85 }); motifs.push('coloured back'); }
      break;
    }
    case 'lines': {
      if (chance(r, 0.5)) {
        const n = irange(r, 3, 6);
        for (let i = 0; i < n; i++) layers.push({ k: 'stripe', h: r4(0.18 + (0.64 * (i + 0.5)) / n), w: range(r, 0.006, 0.012), c: P.acc, s0: range(r, 0.02, 0.1), s1: 0.98, wob: range(r, 0, 0.006), rough: 0.001, soft: 0.002 });
        motifs.push(`${n} longitudinal lines`);
      } else {
        layers.push({ k: 'flow', n: irange(r, 12, 30), c: P.acc, w: range(r, 0.004, 0.008), amp: range(r, 0.003, 0.009), freq: range(r, 6, 12), s0: t0 * 0.9, s1: 0.97, h0: 0.02, h1: 0.96, slant: range(r, -0.22, 0.22), a: 0.95 });
        motifs.push('flowing chromatophore lines');
      }
      break;
    }
    case 'spots': {
      const ring = chance(r, 0.35) ? P.dark : undefined;
      layers.push({ k: 'spots', n: irange(r, 40, 180), r: range(r, 0.005, 0.012), c: P.acc, h0: 0.04, h1: 0.96, s0: 0.03, s1: 0.98, irr: 0.3, even: 0.85, ...(ring ? { ring, rw: 0.25 } : {}) });
      motifs.push(ring ? 'ringed spots' : 'polka spots');
      break;
    }
    case 'masked': {
      layers.push({ k: 'eyeband', w: range(r, 0.022, 0.04), c: P.dark, edge: P.light, ew: 0.004, slant: range(r, -0.1, 0.1) });
      if (chance(r, 0.7)) { layers.push({ k: 'spots', n: 1, r: range(r, 0.028, 0.042), c: P.dark, ring: P.light, rw: 0.28, s0: 0.78, s1: 0.78, h0: range(r, 0.18, 0.3), h1: 0.22 }); motifs.push('false eyespot'); }
      if (chance(r, 0.5)) layers.push({ k: 'bars', at: seq(t0 + 0.1, 0.8, irange(r, 2, 4)), w: range(r, 0.02, 0.035), c: mix(P.dark, P.base, 0.3), h0: 0, h1: 1, rough: 0.003, a: 0.7 });
      motifs.push('eye mask');
      break;
    }
    case 'vermic': {
      layers.push({ k: 'vermic', c: P.acc, sc: range(r, 0.018, 0.03), w: range(r, 0.05, 0.09), a: 0.85, h0: 0.02, h1: 0.98 });
      motifs.push('labyrinth vermiculation');
      break;
    }
    case 'sunset': {
      layers.push({ k: 'grad', c: P.acc, s0: -0.05, s1: sp.HL, h0: -0.05, h1: 1.05, soft: 0.05, a: 0.85 });
      layers.push({ k: 'grad', c: P.acc2, s0: range(r, 0.72, 0.82), s1: 1.05, h0: -0.05, h1: 1.05, soft: 0.06, a: 0.85 });
      layers.push({ k: 'line', p: [sp.eye.s + 0.02, he - 0.04, sp.HL + 0.04, he - 0.02, sp.HL + 0.16, he + 0.02], w: 0.007, c: P.electric, taper: 0.5 });
      layers.push({ k: 'line', p: [sp.eye.s - 0.01, he + 0.08, sp.HL * 0.9, he + 0.12], w: 0.006, c: P.electric, taper: 0.4 });
      motifs.push('sunset gradient', 'head lines');
      break;
    }
    case 'saddles': {
      layers.push({ k: 'bars', at: seq(t0, 0.88, irange(r, 3, 5)), w: range(r, 0.05, 0.08), c: P.dark, h0: 0, h1: range(r, 0.35, 0.5), rough: 0.004, taper: 0.45, a: 0.9 });
      motifs.push('dark saddles');
      break;
    }
    case 'ocelli': {
      layers.push({ k: 'spots', n: irange(r, 5, 12), r: range(r, 0.016, 0.026), c: P.acc, ring: P.dark, rw: 0.3, h0: 0.12, h1: 0.88, s0: t0, s1: 0.95, even: 1, irr: 0.15 });
      motifs.push('ocellated spots');
      break;
    }
  }
  // secondary accents
  if (recipe !== 'masked' && chance(r, 0.3)) { layers.push({ k: 'eyeband', w: range(r, 0.012, 0.022), c: P.dark, a: 0.9 }); motifs.push('eye stripe'); }
  if (chance(r, 0.18)) { layers.push({ k: 'spots', n: 1, r: range(r, 0.012, 0.02), c: P.dark, s0: 0.93, s1: 0.93, h0: 0.5, h1: 0.5 }); motifs.push('peduncle spot'); }
  if (chance(r, 0.25)) layers.push({ k: 'grad', c: lighter(P.base, 0.35), s0: 0.02, s1: 0.98, h0: 0.75, h1: 1.05, soft: 0.05, a: 0.55 });
  if (recipe === 'bicolor' && chance(r, 0.5)) { top = side = belly = P.base; }
  const edge = chance(r, 0.55) ? pick(r, [P.electric, P.dark, P.light]) : undefined;
  const cauC = chance(r, 0.5) ? P.acc : P.base;
  const ocel = chance(r, 0.15) ? { u: 0.78, v: 0.42, r: 0.17, col: P.dark, ring: P.light } : undefined;
  if (ocel) motifs.push('dorsal ocellus');
  const cauPat = chance(r, 0.22) ? pick(r, ['bands', 'spots', 'rayspots'] as const) : undefined;
  return {
    color: { top, side, belly, cs: [range(r, 0.22, 0.32), range(r, 0.72, 0.82)], rough: range(r, 0.32, 0.42), iri: range(r, 0.05, 0.25), layers },
    fins: {
      color: mix(P.base, P.acc, 0.25), alpha: range(r, 0.86, 0.96),
      d: { color: P.base, tip: mix(P.base, P.acc, 0.5), ...(edge ? { edge, edgeWidth: range(r, 0.03, 0.07) } : {}), ...(ocel ? { ocellus: ocel } : {}) },
      a: { color: mix(P.base, P.dark, 0.25), ...(edge ? { edge, edgeWidth: range(r, 0.03, 0.06) } : {}) },
      c: { color: cauC, tip: mix(cauC, P.acc2, 0.4), ...(cauPat ? { pattern: cauPat, spotCol: P.dark, spots: irange(r, 4, 9) } : {}), ...(edge && chance(r, 0.5) ? { edge, edgeWidth: 0.05 } : {}) },
      p: { color: lighter(P.base, 0.4), alpha: 0.55 },
      v: { color: chance(r, 0.5) ? P.dark : P.acc, tip: P.light },
    },
    iris: pick(r, ['#f0c020', '#e86a1a', '#d02020', '#3a8aff', '#f0e0a0']), iris2: '#ffe890', motifs,
  };
};
function groundOf(c: Ctx) {
  const g0 = c.H.ground.length ? pick(c.r, c.H.ground) : '#7a6a50';
  return tone(g0, { h: range(c.r, -10, 10), s: range(c.r, 0.85, 1.15), l: range(c.r, -0.05, 0.05) });
}
const cryptic: Painter = (c) => {
  const { r, sp, H } = c;
  const g = groundOf(c);
  const flat = sp.plan === 'flatR' || sp.plan === 'flatL';
  const top = darker(g, range(r, 0.15, 0.3)), side = g;
  const belly = flat ? top : lighter(g, range(r, 0.45, 0.65));
  const layers: Layer[] = [
    { k: 'mottle', c: darker(g, range(r, 0.4, 0.55)), sc: range(r, 0.025, 0.05), th: range(r, 0.5, 0.58), soft: 0.1, a: range(r, 0.55, 0.75), h0: 0, h1: flat ? 1 : 0.85 },
    { k: 'mottle', c: lighter(g, range(r, 0.25, 0.4)), sc: range(r, 0.018, 0.032), th: 0.6, soft: 0.1, a: 0.4, seed: irange(r, 1, 999), h0: 0, h1: flat ? 1 : 0.8 },
    { k: 'spots', n: irange(r, 180, 480), r: range(r, 0.0025, 0.005), c: darker(g, 0.5), h0: 0, h1: flat ? 1 : 0.75, irr: 0.6, a: 0.75 },
  ];
  const motifs = ['mottled skin', 'speckling'];
  if (chance(r, 0.5)) { layers.push({ k: 'blotch', n: irange(r, 6, 12), r: range(r, 0.022, 0.04), c: darker(g, 0.5), a: 0.6, h0: 0, h1: 0.8 }); motifs.push('dark blotches'); }
  if ((H.substrate === 'sand' || flat) && chance(r, 0.55)) { layers.push({ k: 'spots', n: irange(r, 4, 10), r: range(r, 0.011, 0.018), c: pick(r, [lighter(g, 0.5), '#5ab0e0', '#e8d8a8']), ring: darker(g, 0.45), rw: 0.3, h0: 0.1, h1: 0.9, s0: 0.2, s1: 0.95, even: 1 }); motifs.push('ocelli'); }
  if ((H.substrate === 'rock' || H.substrate === 'coral') && chance(r, 0.5)) { layers.push({ k: 'bars', at: seq(trunk0(sp), 0.9, irange(r, 3, 4)), w: range(r, 0.045, 0.07), c: darker(g, 0.45), h0: 0, h1: range(r, 0.5, 0.75), rough: 0.006, taper: 0.4, a: 0.55 }); motifs.push('broken saddles'); }
  if ((H.substrate === 'rock' || H.substrate === 'coral') && chance(r, 0.45)) { layers.push({ k: 'spots', n: irange(r, 25, 70), r: range(r, 0.004, 0.009), c: pick(r, ['#d8583a', '#e07a9a', '#e8a040', '#c84a6a']), irr: 0.7, a: 0.6, h0: 0, h1: 0.9 }); motifs.push('encrusting colour flecks'); }
  const finC = mix(g, top, 0.4);
  return {
    color: { top, side, belly, cs: [0.34, 0.76], rough: range(r, 0.4, 0.55), sheen: 0.15, layers, ...(flat ? { blind: '#f2eee6' } : {}) },
    fins: { color: finC, tip: darker(finC, 0.25), alpha: 0.88, d: { pattern: pick(r, ['spots', 'leopard', 'bands'] as const), spotCol: darker(g, 0.5), spots: irange(r, 4, 8) }, c: { pattern: pick(r, ['spots', 'bands', 'leopard'] as const), spotCol: darker(g, 0.5), spots: irange(r, 4, 8) }, a: { pattern: 'spots', spotCol: darker(g, 0.5), spots: 5 } },
    iris: mix(g, '#c8a050', 0.4), iris2: lighter(g, 0.4), motifs,
  };
};
const disruptive: Painter = (c) => {
  const { r, sp, H } = c;
  const base = chance(r, 0.6) ? hsl(range(r, 48, 95), range(r, 0.35, 0.6), range(r, 0.38, 0.52)) : tone(groundOf(c), { s: 1.3, l: 0.06 });
  const top = darker(base, 0.3), belly = mix(base, '#f4f0dc', 0.7);
  const n = irange(r, 5, 8);
  const layers: Layer[] = [{ k: 'bars', at: seq(trunk0(sp) - 0.02, 0.9, n), w: range(r, 0.028, 0.05), c: darker(base, 0.6), h0: 0, h1: range(r, 0.6, 0.85), taper: range(r, 0.3, 0.6), rough: 0.004, a: range(r, 0.6, 0.85), brk: chance(r, 0.3) ? 0.3 : 0 }];
  const motifs = [`${n} disruptive bars`];
  if (chance(r, 0.35)) { layers.push({ k: 'eyeband', w: 0.018, c: darker(base, 0.6), a: 0.8 }); motifs.push('eye stripe'); }
  if (chance(r, 0.3)) layers.push({ k: 'scaleEdge', c: darker(base, 0.4), a: 0.3 });
  const hot = pick(r, ['#e86a1a', '#d84a2a', '#f0a020', H.accents[0] ?? '#e86a1a']);
  return {
    color: { top, side: base, belly, cs: [0.3, 0.7], rough: 0.36, iri: 0.12, layers },
    fins: { color: mix(base, top, 0.4), alpha: 0.82, d: { color: mix(base, top, 0.3), ...(chance(r, 0.5) ? { ocellus: { u: 0.85, v: 0.35, r: 0.12, col: '#141414' } } : {}) }, v: { color: hot }, a: { color: chance(r, 0.6) ? hot : mix(base, top, 0.3) }, p: { color: lighter(base, 0.2), alpha: 0.6 } },
    iris: pick(r, ['#e8a020', '#d06a20', '#c82020', '#e8d070']), motifs,
  };
};
const kelp: Painter = (c) => {
  const { r, sp } = c;
  const base = hsl(range(r, 28, 70), range(r, 0.35, 0.6), range(r, 0.26, 0.42));
  const layers: Layer[] = [
    { k: 'mottle', c: darker(base, 0.45), sc: range(r, 0.03, 0.05), th: 0.52, soft: 0.1, a: 0.6, h0: 0, h1: 0.8 },
    { k: 'spots', n: irange(r, 40, 120), r: range(r, 0.004, 0.008), c: hsl(range(r, 40, 55), 0.6, 0.6), irr: 0.5, a: 0.6, h0: 0.05, h1: 0.85 },
  ];
  const motifs = ['kelp mottling', 'gold flecks'];
  if (chance(r, 0.5)) { layers.push({ k: 'bars', at: seq(trunk0(sp), 0.9, irange(r, 4, 6)), w: 0.04, c: darker(base, 0.4), h0: 0, h1: 0.7, rough: 0.005, a: 0.45 }); motifs.push('faint bars'); }
  if (chance(r, 0.35)) { layers.push({ k: 'flow', n: irange(r, 6, 12), c: lighter(base, 0.35), w: 0.004, amp: 0.008, freq: 7, s0: 0.02, s1: 0.95, h0: 0.15, h1: 0.85, slant: range(r, -0.3, 0.3), a: 0.5 }); motifs.push('streaks'); }
  return {
    color: { top: darker(base, 0.25), side: base, belly: mix(base, '#e8dcb0', 0.6), cs: [0.32, 0.72], rough: 0.4, layers },
    fins: { color: mix(base, '#c86a20', 0.25), alpha: 0.85, d: { pattern: 'spots', spotCol: darker(base, 0.5), spots: 5 } },
    iris: '#c8a040', motifs,
  };
};
const grass: Painter = (c) => {
  const { r } = c;
  const base = hsl(range(r, 70, 115), range(r, 0.35, 0.55), range(r, 0.34, 0.48));
  const n = irange(r, 2, 4);
  const layers: Layer[] = [];
  for (let i = 0; i < n; i++) layers.push({ k: 'stripe', h: r4(0.22 + (0.5 * i) / Math.max(1, n - 1)), w: range(r, 0.008, 0.02), c: chance(r, 0.5) ? darker(base, 0.45) : lighter(base, 0.5), s0: 0.02, s1: 0.98, wob: 0.004, rough: 0.002, a: 0.75 });
  layers.push({ k: 'spots', n: irange(r, 60, 160), r: 0.003, c: darker(base, 0.4), irr: 0.6, a: 0.6 });
  return {
    color: { top: darker(base, 0.3), side: base, belly: mix(base, '#f0f0c8', 0.65), cs: [0.3, 0.7], rough: 0.36, iri: 0.15, layers },
    fins: { color: mix(base, '#d8d880', 0.3), alpha: 0.75 },
    iris: '#c8c050', motifs: [`${n} grass-blade stripes`, 'fine speckles'],
  };
};
const riverine: Painter = (c) => {
  const { r, sp } = c;
  const top = hsl(range(r, 55, 100), range(r, 0.18, 0.35), range(r, 0.2, 0.3));
  const side = hsl(range(r, 35, 60), range(r, 0.25, 0.45), range(r, 0.52, 0.64));
  const belly = chance(r, 0.25) ? hsl(range(r, 10, 30), 0.7, 0.55) : '#f0ebe0';
  const t0 = trunk0(sp);
  const layers: Layer[] = [{ k: 'spots', n: irange(r, 60, 150), r: range(r, 0.004, 0.007), c: '#1e1a12', h0: 0.03, h1: range(r, 0.5, 0.65), irr: 0.5, a: 0.85 }];
  const motifs = ['dark spotting'];
  const opt = pick(r, ['red', 'parr', 'band', 'char'] as const);
  if (opt === 'red') { layers.push({ k: 'spots', n: irange(r, 15, 30), r: 0.006, c: '#c03020', ring: '#e8e0d0', rw: 0.35, h0: 0.3, h1: 0.6, s0: t0, s1: 0.9 }); motifs.push('haloed red spots'); }
  if (opt === 'parr') { layers.push({ k: 'bars', at: seq(t0, 0.88, irange(r, 8, 10)), w: 0.025, c: darker(side, 0.45), h0: 0.35, h1: 0.62, a: 0.5, rough: 0.003 }); motifs.push('parr marks'); }
  if (opt === 'band') { layers.push({ k: 'stripe', h: 0.45, w: range(r, 0.03, 0.05), c: pick(r, ['#d05070', '#c86a8a', '#e07050']), s0: 0.05, s1: 0.98, a: 0.6, soft: 0.01 }); motifs.push('rose lateral band'); }
  if (opt === 'char') { layers.push({ k: 'spots', n: