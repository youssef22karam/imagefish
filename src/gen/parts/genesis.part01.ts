//  IchthyoGenesis — DE-NOVO MORPHOGENESIS.
//
//  No atlas species is used as a parent. A fish is grown from first principles:
//
//    habitat physics ─┐
//    ecological niche ─┼─►  cruising speed, manoeuvring demand, light, substrate
//    seed             ─┘
//         │
//         ▼
//    BAUPLAN (13 constructions, each a continuous shape space, weighted per habitat)
//         │      spindle · disc · arrow · eel · ribbon · bottom · globe · maw · hatchet · tadpole · shark · ray · flat
//         ▼
//    OUTLINE SYNTHESIS  — dorsal + ventral silhouette drawn from ~16 shape genes (apex, forehead, hump,
//                         forceps snout, belly keel, taper law, peduncle) → a measured-style ProfileSpec
//         ▼
//    ORGANS BY RULE     — jaws from diet, eyes from light × body-size allometry, median-fin architecture
//                         (10 dorsal constructions × 4 anal × 12 tails), paired fins from gait, skin from lifestyle
//         ▼
//    HABITAT SIGNATURES — keels & finlets offshore, lures in the abyss, barbels in mud, fronds in kelp,
//                         periscope eyes on mudflats, veils in still water, adipose fins in rivers …
//
//  Every decision is recorded as a field note, so the result is explainable as well as coherent.
// ─────────────────────────────────────────────────────────────────────────────
import type { Barbel, CaudalSpec, CaudalType, FinShape, MedianFin, MouthSpec, PairedFin, Species, Spike, TeethKind } from '../engine/types';
import { A, M, Pf, make, type SP } from '../data/factory';
import type { Habitat, HabitatId } from './habitats';
import type { Kind, Lineage, LineageId, Niche } from './lineages';
import { buildProfile, remeasure, STATIONS } from './morph';
import { caudalGeom, type Note } from './adapt';
import { chance, clamp, irange, lerp, pick, r4, range, wpick, type Rnd } from './util';

export type Plan = 'spindle' | 'disc' | 'arrow' | 'eel' | 'ribbon' | 'bottom' | 'globe' | 'maw' | 'hatchet' | 'tadpole' | 'shark' | 'ray' | 'flat';
export interface Novo { sp: Species; plan: Plan; niche: Niche; L: Lineage; lineage: LineageId; clade: string; notes: Note[]; speed: number }

// ── which constructions each environment selects for (its identity) ─────────
const PLANS: Record<HabitatId, Partial<Record<Plan, number>>> = {
  reef: { disc: 3, spindle: 1.8, globe: 1.4, eel: 0.9, bottom: 0.9, arrow: 0.7, shark: 0.5, ray: 0.3 },
  kelp: { spindle: 2.4, bottom: 1.3, arrow: 1.3, disc: 1.1, eel: 0.7, shark: 0.5, globe: 0.4, ribbon: 0.4 },
  seagrass: { arrow: 2.2, spindle: 1.5, disc: 0.9, globe: 0.8, bottom: 0.8, ray: 0.7, eel: 0.6, flat: 0.5 },
  pelagic: { spindle: 3, shark: 1.7, arrow: 1.2, ray: 0.6, ribbon: 0.6, disc: 0.5 },
  twilight: { hatchet: 1.8, maw: 1.8, spindle: 1.3, ribbon: 1.2, eel: 0.8, shark: 0.5, tadpole: 0.4 },
  abyss: { maw: 2, eel: 1.3, tadpole: 1.4, ribbon: 1.1, globe: 1.1, arrow: 0.5, shark: 0.35 },
  hadal: { tadpole: 2.6, eel: 1.3, ribbon: 0.9, bottom: 0.8, globe: 0.4 },
  sandflat: { flat: 2.6, ray: 2.2, bottom: 1.6, arrow: 1, spindle: 0.9, shark: 0.6, eel: 0.5 },
  rocky: { bottom: 2.5, spindle: 1.5, eel: 1.2, arrow: 0.8, disc: 0.6, globe: 0.6, shark: 0.4, flat: 0.3 },
  polar: { spindle: 2, bottom: 1.8, tadpole: 1.1, eel: 1, flat: 0.8, shark: 0.5, arrow: 0.5 },
  estuary: { bottom: 2.2, spindle: 1.5, arrow: 1.2, eel: 0.8, flat: 0.7, ray: 0.7, globe: 0.6, disc: 0.5, shark: 0.4 },
  stream: { spindle: 2.6, bottom: 2.1, arrow: 1, eel: 0.5 },
  river: { bottom: 2.1, spindle: 1.9, arrow: 1.4, eel: 0.8, ribbon: 0.6, disc: 0.5, ray: 0.3, shark: 0.25 },
  amazon: { disc: 2.1, spindle: 1.6, ribbon: 1.05, bottom: 1.4, arrow: 1, hatchet: 0.9, eel: 0.6, ray: 0.5, globe: 0.3 },
  lake: { spindle: 2.5, disc: 1.4, arrow: 1.2, bottom: 1.1, eel: 0.4 },
  swamp: { disc: 1.7, spindle: 1.5, eel: 1.3, arrow: 1.2, bottom: 1, ribbon: 0.5, globe: 0.4 },
  cave: { arrow: 1.6, bottom: 1.6, eel: 1.5, spindle: 1.2, tadpole: 0.6 },
};
// ── which diets a construction can serve ─────────────────────────────────────
const AFF: Record<Plan, Partial<Record<Niche, number>>> = {
  spindle: { pursuit: 2, apex: 1.4, planktivore: 1.6, picker: 1.2, benthivore: 1, scavenger: 1, grazer: 0.8, crusher: 0.8, ambush: 0.9, filter: 0.5 },
  disc: { picker: 2.2, grazer: 2, planktivore: 1.5, crusher: 1, benthivore: 0.5, ambush: 0.25 },
  arrow: { ambush: 2, pursuit: 2, cryptic: 1.2, picker: 0.8, planktivore: 0.7, apex: 0.8, filter: 0.3 },
  eel: { crevice: 2.4, ambush: 1.4, scavenger: 1.1, benthivore: 1.1, lure: 0.5 },
  ribbon: { planktivore: 1.5, pursuit: 1.2, picker: 1.1, ambush: 1, scavenger: 0.8 },
  bottom: { benthivore: 2.5, ambush: 1.6, scavenger: 1.2, grazer: 1.1, crusher: 1, picker: 0.8, cryptic: 0.8, lure: 0.5 },
  globe: { crusher: 2.2, picker: 1.5, grazer: 1, lure: 1.2, planktivore: 0.5 },
  maw: { lure: 2.6, ambush: 2, pursuit: 0.7, scavenger: 0.5, filter: 0.5 },
  hatchet: { planktivore: 2.6, picker: 1.2 },
  tadpole: { benthivore: 2, scavenger: 2, picker: 0.7 },
  shark: { apex: 2, pursuit: 1.5, scavenger: 1.1, benthivore: 1.1, ambush: 0.6, filter: 0.45, crusher: 0.6 },
  ray: { benthivore: 2.2, crusher: 1.5, ambush: 0.8, filter: 0.5 },
  flat: { ambush: 2, benthivore: 2, crusher: 0.5 },
};
const SPEED: Record<Niche, number> = { apex: 0.85, pursuit: 0.9, planktivore: 0.55, filter: 0.5, picker: 0.35, grazer: 0.35, ambush: 0.25, lure: 0.1, benthivore: 0.3, crusher: 0.3, scavenger: 0.4, cryptic: 0.1, crevice: 0.3, parasite: 0.4 };
const PLAN_SPEED: Partial<Record<Plan, number>> = { disc: -0.1, globe: -0.25, bottom: -0.12, maw: -0.1, eel: -0.05, tadpole: -0.15, hatchet: -0.1, arrow: 0.05 };

interface PlanInfo { clade: string; kind: Kind; lineage: LineageId; roots: string[]; nouns: string[]; what: string }
const INFO: Record<Plan, PlanInfo> = {
  spindle: { clade: 'Spindle-bodied swimmers', kind: 'bony', lineage: 'perch', roots: ['Drom', 'Fusic', 'Rheon', 'Thalass', 'Cymat', 'Lampr', 'Neopter', 'Halieut'], nouns: ['runner', 'fusilier', 'shiner', 'dart', 'chub', 'bream', 'drummer', 'scad'], what: 'A fusiform spindle: the all-round compromise between drag, thrust and agility.' },
  disc: { clade: 'Deep-bodied disc fishes', kind: 'bony', lineage: 'reefDeep', roots: ['Platy', 'Selen', 'Aspid', 'Cyclop', 'Discic', 'Scutic', 'Ephipp'], nouns: ['discfish', 'moonfish', 'platefish', 'shieldfish', 'spadefish', 'coinfish', 'batfish'], what: 'A tall, plate-thin body: a hydrodynamic disc that pivots on the spot and is too deep for most mouths to swallow.' },
  arrow: { clade: 'Arrow-bodied lungers', kind: 'bony', lineage: 'pike', roots: ['Belon', 'Acont', 'Sagitt', 'Oxyrhin', 'Leptos', 'Jacul', 'Styl'], nouns: ['lancefish', 'dartfish', 'needlefish', 'javelin', 'arrowfish', 'pikelet', 'halfbeak'], what: 'A rigid arrow with the fins massed at the rear: built for one explosive, straight-line lunge.' },
  eel: { clade: 'Serpentine fishes', kind: 'eel', lineage: 'eel', roots: ['Ophid', 'Herpet', 'Nemat', 'Angu', 'Dolich', 'Sphag'], nouns: ['eel', 'snakefish', 'wormfish', 'rope-eel', 'worm-eel'], what: 'A limbless, serpentine body that swims with waves along its whole length and reverses into any hole.' },
  ribbon: { clade: 'Ribbon & blade fishes', kind: 'eel', lineage: 'oarfish', roots: ['Taeni', 'Xiphid', 'Lepid', 'Trachyp', 'Vexill', 'Gymn'], nouns: ['ribbonfish', 'bladefish', 'knifefish', 'whiptail', 'bandfish', 'cutlass'], what: 'A blade-thin ribbon tapering to a point, propelled by ripples of one long fin while the body stays straight.' },
  bottom: { clade: 'Bottom-hugging fishes', kind: 'bony', lineage: 'goby', roots: ['Cottid', 'Lithob', 'Petrosc', 'Chasmod', 'Bathyb', 'Platyceph', 'Limic'], nouns: ['sculpin', 'goby', 'bullhead', 'flathead', 'loach', 'gudgeon', 'stonelurker', 'mudsitter'], what: 'A flattened belly, broad head and fan pectorals: the body rests on the bottom and props itself on its fins.' },
  globe: { clade: 'Globe & box fishes', kind: 'bony', lineage: 'tetraodont', roots: ['Sphaer', 'Orbic', 'Globic', 'Ostrac', 'Cystid', 'Bullat'], nouns: ['puffer', 'boxfish', 'globefish', 'lumpfish', 'orbfish', 'burrfish'], what: 'A rigid, rounded hull sculled by small fins — slow, but precise, armoured and hard to swallow.' },
  maw: { clade: 'Great-jawed deep hunters', kind: 'bony', lineage: 'deepPredator', roots: ['Megastom', 'Lamprod', 'Chasmat', 'Odont', 'Thaumat', 'Saccol', 'Phot'], nouns: ['gulper', 'fangfish', 'swallower', 'snaggletooth', 'devilfish', 'trapjaw'], what: 'A head that is mostly jaw on a body that is mostly stomach: built to take any meal, however rare or large.' },
  hatchet: { clade: 'Keel-bellied fishes', kind: 'bony', lineage: 'lantern', roots: ['Pelec', 'Sterno', 'Carin', 'Argyr', 'Gastr'], nouns: ['hatchetfish', 'keelfish', 'axefish', 'silverblade'], what: 'A deep, knife-edged belly keel under a straight back: no silhouette from below, and room for huge fin muscles.' },
  tadpole: { clade: 'Tadpole-bodied fishes', kind: 'bony', lineage: 'deepBenthic', roots: ['Lipar', 'Gyrin', 'Macrur', 'Careproct', 'Coryph', 'Psychr'], nouns: ['snailfish', 'tadpolefish', 'rattail', 'jellynose', 'grenadier'], what: 'A heavy head trailing a tapering whip of a tail: cheap to build and hovers on the spot above the ooze.' },
  shark: { clade: 'Shark-form cartilaginous fishes', kind: 'shark', lineage: 'sharkPelagic', roots: ['Squal', 'Gale', 'Carchar', 'Scyli', 'Notor', 'Lamn'], nouns: ['shark', 'dogfish', 'houndshark', 'catshark'], what: 'A cartilaginous torpedo with rigid foil fins and a lifting tail.' },
  ray: { clade: 'Winged cartilaginous fishes', kind: 'batoid', lineage: 'stingray', roots: ['Batid', 'Raj', 'Platyrh', 'Myliob', 'Dasy', 'Uro'], nouns: ['ray', 'skate', 'fanray', 'whipray'], what: 'Pectoral fins fused to the head as wings: the whole body is a flying disc.' },
  flat: { clade: 'Side-lying flatfishes', kind: 'bony', lineage: 'flatfish', roots: ['Pleur', 'Psett', 'Both', 'Sole', 'Scophth', 'Cynogl'], nouns: ['flounder', 'sole', 'dab', 'turbot', 'tonguefish'], what: 'A fish that lies on one side, both eyes migrated to the upper face.' },
};

// ── outline synthesis ───────────────────────────────────────────────────────
interface Shape {
  D: number; df: number; pD: number; pV: number; eD: number; eV: number; tD: number; tV: number; P: number; pedY: number; sP: number;
  /** integrated forceps / tube snout: length, half depth */
  sn?: number; snR?: number;
  /** extra gaussian relief: [s, height, width, +1 dorsal | -1 ventral] */
  humps?: [number, number, number, number][];
}
function outline(g: Shape) {
  const Dd = g.D * g.df, Dv = g.D * (1 - g.df);
  const Pd = Math.max(0.0025, g.P / 2 + g.pedY), Pv = Math.max(0.0025, g.P / 2 - g.pedY);
  const sn = g.sn ?? 0, snR = g.snR ?? 0;
  const side = (H: number, p: number, e: number, t: number, Pp: number, sgn: number) => STATIONS.map((s) => {
    let y: number;
    if (s <= p) {
      const x0 = sn * 0.8;
      const x = clamp((s - x0) / Math.max(1e-4, p - x0));
      const rise = Math.pow(Math.sin((x * Math.PI) / 2), e);
      if (sn > 0) {
        const tube = snR * Math.min(1, 0.62 + 0.38 * (s / sn)) * Math.min(1, Math.sqrt(s / 0.012));
        y = tube + Math.max(0, H - snR) * rise;
      } else y = H * rise;
    } else {
      // posterior taper: (1 - x^a)^b keeps the trunk full and runs into a SHORT wrist (a cosine fall pinches
      // the body into a long stick). t is the taper gene: 0.4 = full to the tail root … 1.9 = whip.
      const x = clamp((s - p) / Math.max(1e-4, g.sP - p));
      const a = lerp(2.7, 0.8, clamp((t - 0.4) / 1.5));
      y = Pp + (H - Pp) * Math.pow(Math.max(0, 1 - Math.pow(x, a)), 1.22);
    }
    for (const [hs, hh, hw, sd] of g.humps ?? []) if (sd === sgn) y += hh * Math.exp(-(((s - hs) / hw) ** 2));
    return Math.max(0.0012, y);
  });
  return { d: side(Dd, g.pD, g.eD, g.tD, Pd, 1), v: side(Dv, g.pV, g.eV, g.tV, Pv, -1) };
}

// ── jaws from diet ──────────────────────────────────────────────────────────
interface Diet { g: [number, number]; a: [number, number]; o: [number, number]; teeth: TeethKind[]; pro: number; lip: number; gul: number; pos?: 'inf' | 'sup' }
const DIET: Record<Niche, Diet> = {
  apex: { g: [0.1, 0.14], a: [12, 24], o: [34, 40], teeth: ['fang', 'cone', 'tri'], pro: 0.2, lip: 0.24, gul: 0.3 },
  pursuit: { g: [0.085, 0.12], a: [14, 28], o: [32, 36], teeth: ['cone', 'fang', 'needle', 'fine'], pro: 0.25, lip: 0.26, gul: 0.28 },
  ambush: { g: [0.11, 0.16], a: [22, 42], o: [38, 46], teeth: ['fine', 'cone', 'fang'], pro: 0.35, lip: 0.34, gul: 0.55 },
  lure: { g: [0.15, 0.2], a: [34, 58], o: [56, 74], teeth: ['fang'], pro: 0.1, lip: 0.18, gul: 0.5, pos: 'sup' },
  planktivore: { g: [0.045, 0.07], a: [26, 40], o: [30, 36], teeth: ['none', 'fine'], pro: 0.65, lip: 0.24, gul: 0.3 },
  filter: { g: [0.1, 0.16], a: [5, 14], o: [38, 44], teeth: ['none'], pro: 0.1, lip: 0.2, gul: 0.85 },
  grazer: { g: [0.025, 0.04], a: [5, 18], o: [26, 30], teeth: ['fine'], pro: 0.35, lip: 0.55, gul: 0.2 },
  picker: { g: [0.02, 0.034], a: [6, 24], o: [26, 30], teeth: ['fine'], pro: 0.6, lip: 0.45, gul: 0.25 },
  benthivore: { g: [0.04, 0.07], a: [0, 10], o: [30, 34], teeth: ['none', 'fine'], pro: 0.72, lip: 0.68, gul: 0.4, pos: 'inf' },
  crusher: { g: [0.03, 0.05], a: [0, 10], o: [26, 30], teeth: ['cone', 'fine'], pro: 0.15, lip: 0.55, gul: 0.2 },
  scavenger: { g: [0.06, 0.1], a: [8, 20], o: [30, 34], teeth: ['fine', 'cone'], pro: 0.25, lip: 0.32, gul: 0.3 },
  cryptic: { g: [0.02, 0.032], a: [18, 36], o: [30, 38], teeth: ['none'], pro: 0.7, lip: 0.3, gul: 0.5 },
  crevice: { g: [0.07, 0.11], a: [8, 14], o: [24, 30], teeth: ['fang', 'fine', 'cone'], pro: 0.1, lip: 0.2, gul: 0.2 },
  parasite: { g: [0.05, 0.08], a: [8, 16], o: [30, 34], teeth: ['fine'], pro: 0.2, lip: 0.4, gul: 0.3 },
};
const DIET_TXT: Record<Niche, string> = {
  apex: 'Long terminal jaws with gripping teeth for seizing large, fast prey.',
  pursuit: 'A sharp-toothed snapping jaw for fleeing fishes.',
  ambush: 'An oversized, upturned mouth that expands explosively and sucks prey in within milliseconds.',
  lure: 'A cavernous, upturned gape of glassy fangs: meals are rare, so whatever approaches is swallowed whole.',
  planktivore: 'A small, oblique, highly protrusible mouth that pipettes single copepods from the water.',
  filter: 'A broad, toothless gape that sieves plankton by the cubic metre.',
  grazer: 'A small scraping mouth for cropping algal turf.',
  picker: 'A tiny, precise, protrusible mouth for tweezering invertebrates out of cracks.',
  benthivore: 'A downturned, fleshy, protrusible mouth that vacuums the substrate.',
  crusher: 'Thick lips over stout teeth, powered by massive jaw muscles, for cracking shells.',
  scavenger: 'A generalist mouth for tearing carrion.',
  cryptic: 'A pipette mouth: a sudden flick of the head sucks in passing shrimp.',
  crevice: 'A long, gripping jaw for seizing prey inside narrow holes.',
  parasite: 'A rasping mouth for clinging to larger hosts.',
};
function jaws(niche: Niche, HL: number, r: Rnd, scale = 1): MouthSpec {
  const T = DIET[niche];
  const teeth = pick(r, T.teeth);
  const fang = teeth === 'fang';
  const gape = Math.min(range(r, T.g[0], T.g[1]) * clamp(HL / 0.27, 0.55, 1.5) * scale, HL * 0.8);
  const angle = range(r, T.a[0], T.a[1]);
  const m: MouthSpec = {
    s: 0, y: range(r, -0.22, 0.06), gape: r4(gape), angle: r4(angle), curve: 0, open: Math.round(range(r, T.o[0], T.o[1])), jut: 0,
    lip: r4(T.lip * range(r, 0.8, 1.2)), protrude: r4(T.pro * range(r, 0.7, 1.15)), gular: r4(T.gul * range(r, 0.8, 1.15)), teeth,
    tn: teeth === 'none' ? 0 : fang ? irange(r, 10, 16) : teeth === 'needle' ? irange(r, 16, 24) : irange(r, 9, 15),
    ts: r4(fang ? (niche === 'lure' ? range(r, 0.016, 0.03) : range(r, 0.008, 0.014)) : teeth === 'cone' ? range(r, 0.005, 0.009) : teeth === 'needle' ? range(r, 0.006, 0.01) : teeth === 'tri' ? range(r, 0.007, 0.01) : range(r, 0.003, 0.006)),
    kind: 'jaw',
  };
  if (T.pos === 'inf') { m.s = r4(range(r, 0.012, 0.03)); m.y = r4(range(r, -0.6, -0.34)); m.sup = false; }
  else if (T.pos === 'sup' || (niche === 'ambush' && angle >= 32)) { m.sup = true; m.jut = r4(range(r, 0.004, 0.012)); m.y = r4(range(r, -0.05, 0.2)); }
  else if (niche === 'apex' || niche === 'pursuit') m.jut = r4(range(r, 0, 0.01));
  return m;
}

const softShape = (speed: number, still: boolean, r: Rnd): FinShape =>
  speed > 0.7 ? pick(r, ['falcate', 'tri', 'falcate', 'tri'] as FinShape[])
    : speed > 0.42 ? pick(r, ['tri', 'round', 'even', 'rect', 'falcate'] as FinShape[])
      : pick(r, (still ? ['round', 'even', 'veil', 'rect', 'veil', 'lobe'] : ['round', 'even', 'rect', 'round', 'lobe']) as FinShape[]);

/** the whole generator: habitat + random stream + wildness (0.1 conservative … 1 anything coherent) → a new fish */
export function genesis(H: Habitat, r: Rnd, wild: number, force?: { plan?: Plan; niche?: Niche; avoid?: Plan[] }): Novo {
  const notes: Note[] = [];
  // 1 ── construction and diet, both drawn from what this environment selects for
  const pw: Partial<Record<Plan, number>> = { ...PLANS[H.id] };
  // wildness lets constructions that are merely possible here appear too
  for (const p of Object.keys(AFF) as Plan[]) if (!(p in pw) && wild > 0.75 && !['hatchet', 'maw', 'tadpole', 'flat', 'ray'].includes(p)) pw[p] = 0.12 * wild;
  // a visitor who has just seen one construction is shown another: recently generated plans are strongly down-weighted
  (force?.avoid ?? []).forEach((p, i) => { if (pw[p]) pw[p] = pw[p]! * (i === 0 ? 0.06 : 0.35); });
  const plan: Plan = force?.plan ?? wpick(r, pw, 'spindle');
  const nw: Partial<Record<Niche, number>> = {};
  for (const [n, a] of Object.entries(AFF[plan]) as [Niche, number][]) nw[n] = a * ((H.niches[n] ?? 0.04) + 0.05);
  let niche: Niche = force?.niche ?? wpick(r, nw, 'picker');
  if (niche === 'parasite') niche = 'scavenger';
  if (niche === 'lure' && H.light > 0.3 && plan !== 'bottom') niche = 'ambush';
  const I = INFO[plan];
  const speed = clamp(SPEED[niche] + (H.flow - 0.4) * 0.35 + (PLAN_SPEED[plan] ?? 0));
  const still = H.flow < 0.3;
  const deep = H.light < 0.2 && H.id !== 'cave';
  const fresh = H.realm === 'Freshwater' || H.realm === 'Subterranean';
  const hide = niche === 'ambush' || niche === 'cryptic' || niche === 'lure';
  // 2 ── body size
  const [z0, z1] = H.size;
  const big = niche === 'apex' || niche === 'filter' ? 0.45 : niche === 'picker' || niche === 'planktivore' || niche === 'cryptic' ? -0.25 : niche === 'grazer' ? -0.1 : 0.05;
  let lenM = Math.exp(lerp(Math.log(z0), Math.log(z1 * (niche === 'filter' ? 2.2 : 1)), clamp(r() * 0.75 + 0.12 + big)));
  if (plan === 'shark' || plan === 'ray') lenM = Math.max(lenM * 1.6, 0.35);
  if (plan === 'hatchet') lenM = Math.min(lenM, 0.12);
  if (plan === 'eel' || plan === 'ribbon') lenM *= 1.5;
  lenM = r4(clamp(lenM, 0.015, 14));
  // 3 ── eyes: allometry × light
  const light = H.light * (1 - 0.5 * H.turb);
  let eyeF = range(r, 0.92, 1.1), eyeWhy = '';
  let shine: number | undefined;
  if (H.id === 'cave') { eyeF = chance(r, 0.65) ? 0 : 0.4; eyeWhy = eyeF ? 'Vestigial, half-buried eyes: a recent cave colonist still losing its vision.' : 'In permanent darkness eyes are costly to build — they regressed under the skin; lateral line and taste took over.'; }
  else if (light < 0.03) { eyeF = hide || niche === 'apex' ? range(r, 0.75, 1) : range(r, 0.45, 0.7); eyeWhy = 'Below the reach of sunlight vision is nearly useless: small eyes, and a body run by smell and the lateral line.'; }
  else if (light < 0.2) { eyeF = range(r, 1.45, 1.9); eyeWhy = 'Huge eyes gather the last blue photons filtering down from the surface and spot glowing prey.'; }
  else if (light < 0.35) { eyeF = range(r, 1.15, 1.35); eyeWhy = 'Enlarged eyes for dim, tea-coloured or turbid water.'; }
  else if (H.turb > 0.6) { eyeF = range(r, 0.7, 0.88); eyeWhy = 'Small eyes: in murky water touch and taste matter more than sight.'; }
  if (eyeF > 0 && (light < 0.3 || H.turb > 0.55)) shine = r4(range(r, 0.3, 0.6));
  const eyeRel = clamp(0.17 * Math.pow(lenM, -0.22), 0.07, 0.4) * eyeF; // eye diameter / head length

  let sp: Species;
  const id0 = `novo-${plan}`;
  // ═══ cartilaginous wing (ray) ═════════════════════════════════════════════
  if (plan === 'ray') {
    const filter = niche === 'filter';
    const span = filter ? range(r, 0.5, 0.64) : range(r, 0.3, 0.5);
    const sting = !filter && chance(r, 0.6);
    sp = make(A.ray, {
      id: id0, name: '', sci: '', group: 'Rays & skates', note: '', lenM,
      body: { D: r4(range(r, 0.06, 0.1)), disc: { span: r4(span), end: r4(range(r, 0.42, 0.6)), pW: r4(filter ? range(r, 0.3, 0.4) : range(r, 0.2, 0.36)), fr: r4(filter ? range(r, 1.2, 1.7) : range(r, 0.7, 1.3)), bk: r4(filter ? range(r, 1.3, 1.9) : range(r, 0.8, 1.5)), tailW: r4(range(r, 0.008, 0.02)) }, P: r4(range(r, 0.008, 0.018)) },
      eye: { s: r4(range(r, 0.085, 0.13)), y: 0.95, d: r4(clamp(range(r, 0.016, 0.026) * Math.max(0.5, eyeF), 0.008, 0.03)), iris: '#3b3a2a' },
      ...(sting ? { spikes: [{ s: r4(range(r, 0.58, 0.68)), y: 1, len: r4(range(r, 0.04, 0.07)), dir: [-1, 0.2, 0], r: 0.12, mirror: false }] } : {}),
    } as SP);
    notes.push({ icon: '◈', title: filter ? 'Soaring wings' : 'Flying disc', text: filter ? 'Long, pointed, back-swept wings for tireless open-water flight.' : `A ${span > 0.42 ? 'broad' : 'compact'} disc that ripples its margins to glide over the bottom and bury itself.` });
    if (sting) notes.push({ icon: '†', title: 'Tail sting', text: 'A serrated venomous spine on the whip tail — the only defence a buried ray needs.' });
  }
  // ═══ side-lying flatfish ══════════════════════════════════════════════════
  else if (plan === 'flat') {
    const D = range(r, 0.34, 0.64), h = clamp(0.035 + D * 0.07, 0.04, 0.085) * range(r, 0.85, 1.15);
    const tongue = chance(r, 0.22);
    const ct = tongue ? 'pointed' : pick(r, ['rounded', 'rounded', 'truncate', 'emarginate'] as CaudalType[]);
    const d0 = range(r, 0.05, 0.12);
    sp = make(A.flat, {
      id: id0, name: '', sci: '', group: 'Flatfishes', note: '', lenM, plan: chance(r, 0.5) ? 'flatR' : 'flatL', HL: r4(range(r, 0.19, 0.27)),
      body: { D: r4(D), pD: r4(range(r, 0.34, 0.48)), pV: r4(range(r, 0.38, 0.5)), P: r4(tongue ? range(r, 0.035, 0.05) : range(r, 0.07, 0.11)), bD: r4(range(r, 0.4, 0.72)), bV: r4(range(r, 0.4, 0.72)), tD: r4(range(r, 1.05, 1.4)), tV: r4(range(r, 1.05, 1.4)) },
      mouth: { gape: r4(niche === 'ambush' ? range(r, 0.05, 0.085) : range(r, 0.028, 0.042)), angle: r4(range(r, 24, 36)), teeth: niche === 'ambush' ? 'cone' : 'fine' },
      eye: { s: r4(range(r, 0.075, 0.11)), y: r4(range(r, 0.58, 0.67)), d: r4(clamp(range(r, 0.034, 0.05) * Math.max(0.6, eyeF), 0.02, 0.06)), iris: '#4a5a5a' },
      fins: {
        dorsal: [M(r4(d0), tongue ? 0.985 : 0.93, r4(h), 'even')], anal: [M(r4(range(r, 0.2, 0.28)), tongue ? 0.985 : 0.93, r4(h), 'even')],
        caudal: tongue ? { type: 'pointed', span: 0.06, len: 0.07 } : { ...caudalGeom(ct, D * 0.6, 0.09, r) },
      },
    } as SP);
    notes.push({ icon: '◖', title: tongue ? 'Tongue-shaped flatfish' : D > 0.5 ? 'Round flatfish' : 'Oval flatfish', text: `${I.what} ${tongue ? 'Dorsal, tail and anal fins run together around a pointed tail.' : 'A fringe of fin rays surrounds the whole disc.'}` });
  }
  // ═══ everything with an ordinary upright body ═════════════════════════════
  else {
    const sharky = plan === 'shark';
    const benthicShark = sharky && ['benthivore', 'ambush', 'scavenger', 'crusher'].includes(niche) && H.substrate !== 'open';
    // 4 ── shape genes
    const g: Shape = { D: 0.25, df: 0.5, pD: 0.38, pV: 0.42, eD: 0.7, eV: 0.7, tD: 1, tV: 1, P: 0.09, pedY: 0, sP: 0.88 };
    let W = 0.55, Wh = 1, Wt = 0.6, sq = 2.2, HL = 0.26, bellyFlat = 0, keelV = 0, snoutFlat = 0, keel = 0;
    let whip = false; // the body runs out into a point instead of a peduncle
    switch (plan) {
      case 'spindle':
        g.D = lerp(range(r, 0.2, 0.38), range(r, 0.15, 0.25), speed); g.df = range(r, 0.45, 0.58); g.pD = range(r, 0.28, 0.46); g.pV = g.pD + range(r, -0.04, 0.12);
        g.eD = range(r, 0.52, 1.05); g.eV = range(r, 0.55, 1); g.tD = range(r, 0.55, 1); g.tV = range(r, 0.55, 1);
        g.P = g.D * lerp(range(r, 0.32, 0.46), range(r, 0.14, 0.21), speed); g.sP = range(r, 0.89, 0.95);
        W = range(r, 0.4, 0.66) + speed * 0.14; HL = range(r, 0.2, 0.31); if (speed > 0.8) keel = range(r, 0.012, 0.024);
        break;
      case 'disc':
        g.D = range(r, 0.42, 0.88); g.df = range(r, 0.44, 0.57); g.pD = range(r, 0.36, 0.54); g.pV = range(r, 0.36, 0.56);
        g.eD = range(r, 0.62, 1.45); g.eV = range(r, 0.6, 1); g.tD = range(r, 0.4, 0.8); g.tV = range(r, 0.4, 0.8);
        g.P = clamp(g.D * range(r, 0.17, 0.25), 0.085, 0.17); g.sP = range(r, 0.88, 0.93); W = range(r, 0.19, 0.36); HL = range(r, 0.26, 0.36);
        break;
      case 'arrow':
        g.D = range(r, 0.065, 0.15); g.pD = range(r, 0.35, 0.62); g.pV = g.pD + range(r, -0.08, 0.08); g.eD = range(r, 0.9, 1.4); g.eV = range(r, 0.85, 1.3);
        g.tD = range(r, 0.5, 0.9); g.tV = range(r, 0.5, 0.9); g.P = g.D * range(r, 0.4, 0.62); g.sP = range(r, 0.9, 0.95);
        W = range(r, 0.6, 0.95); HL = range(r, 0.22, 0.36); snoutFlat = chance(r, 0.5) ? range(r, 0.2, 0.5) : 0; Wh = range(r, 1, 1.25);
        break;
      case 'eel':
        g.D = range(r, 0.03, 0.078); g.pD = range(r, 0.18, 0.4); g.pV = g.pD + 0.03; g.eD = range(r, 0.6, 0.95); g.eV = range(r, 0.6, 0.9);
        g.tD = range(r, 0.45, 0.8); g.tV = range(r, 0.45, 0.8); g.P = range(r, 0.006, 0.018); g.sP = 1; whip = true;
        W = range(r, 0.72, 1); Wt = 0.35; HL = range(r, 0.08, 0.15);
        break;
      case 'ribbon':
        g.D = range(r, 0.08, 0.18); g.pD = range(r, 0.1, 0.26); g.pV = g.pD + range(r, 0, 0.1); g.eD = range(r, 0.55, 0.9); g.eV = range(r, 0.55, 0.9);
        g.tD = range(r, 0.9, 1.6); g.tV = range(r, 0.9, 1.6); g.P = range(r, 0.006, 0.02); g.sP = 1; whip = true;
        W = range(r, 0.2, 0.4); Wt = 0.4; HL = range(r, 0.1, 0.18);
        break;
      case 'bottom':
        g.D = range(r, 0.13, 0.25); g.df = range(r, 0.52, 0.64); g.pD = range(r, 0.18, 0.34); g.pV = range(r, 0.24, 0.4); g.eD = range(r, 0.45, 0.72); g.eV = range(r, 0.5, 0.8);
        g.tD = range(r, 0.6, 1.05); g.tV = range(r, 0.6, 1.05); g.P = g.D * range(r, 0.34, 0.52); g.sP = range(r, 0.89, 0.95);
        W = range(r, 0.8, 1.4); Wh = range(r, 1.05, 1.4); bellyFlat = range(r, 0.5, 0.9); HL = range(r, 0.26, 0.37);
        break;
      case 'globe':
        g.D = range(r, 0.36, 0.62); g.pD = range(r, 0.34, 0.48); g.pV = range(r, 0.36, 0.5); g.eD = range(r, 0.45, 0.62); g.eV = range(r, 0.45, 0.62);
        g.tD = range(r, 0.78, 1.2); g.tV = range(r, 0.78, 1.2); g.P = range(r, 0.075, 0.115); g.sP = range(r, 0.87, 0.93);
        W = range(r, 0.68, 1.05); sq = chance(r, 0.4) ? range(r, 3.2, 4.4) : range(r, 2.1, 2.6); HL = range(r, 0.3, 0.4); if (sq > 3) bellyFlat = 0.5;
        break;
      case 'maw':
        g.D = range(r, 0.2, 0.37); g.pD = range(r, 0.16, 0.3); g.pV = range(r, 0.2, 0.34); g.eD = range(r, 0.45, 0.72);