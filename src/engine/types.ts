// ─────────────────────────────────────────────────────────────────────────────
//  Morphometric species description.
//  All linear measures are fractions of the LOFT LENGTH (snout tip → caudal
//  base, i.e. standard length "SL" for normal fishes). Positions `s` run from
//  0 (snout tip) to 1 (caudal fin base / hypural plate).
// ─────────────────────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

export interface DiscSpec {
  span: number; // half wing span (SL)
  end: number; // where the disc ends along s
  pW: number; // position of widest point
  fr: number; // front edge exponent (<1 convex, >1 concave/pointed)
  bk: number; // back edge exponent
  head?: number; // half width of head at s=0..0.06 (manta cephalic area)
  tailW: number; // half width of the tail behind the disc
}

/**
 * Explicit lateral outline. Flat [s, y, s, y, …] pairs, s ascending from just behind the snout tip to 1 (caudal base).
 * `d` = dorsal height above the snout axis, `v` = ventral depth below it (both positive, SL units).
 * When present it replaces the analytic front/back formula, bumps, nape and the bolted-on forceps snout.
 */
export interface ProfileSpec {
  d: number[];
  v: number[];
  n?: number; // snout exponent: 0.45 bluff forehead · 0.62 rounded snout (default) · 0.85–1 pointed wedge
  D?: number; // max depth (SL) the outline was normalised to (lets a jittered individual rescale it)
}

export interface BodySpec {
  D: number; // max body depth / SL
  df: number; // fraction of depth above snout axis
  pD: number; // position of max dorsal height
  pV: number; // position of max ventral height
  P: number; // caudal peduncle depth / SL
  pedY: number; // vertical offset of peduncle centre (SL)
  bD: number; // dorsal head bluntness 0 (pointed) … 1 (very blunt)
  bV: number; // ventral head bluntness
  tD: number; // dorsal posterior taper exponent (>1 = stays full longer)
  tV: number;
  W: number; // half-width / half-depth
  Wh: number; // head width multiplier (catfish, pike…)
  Wt: number; // tail width multiplier
  sq: number; // superellipse exponent of cross-section (2 = ellipse, 4 = box)
  keel?: number; // lateral caudal peduncle keel half-width (SL)
  bellyFlat?: number; // 0..1 ventral flattening (benthic fishes, catfishes, sharks)
  keelVentral?: number; // 0..1 sharp ventral keel (herrings, piranha, arowana)
  snoutFlat?: number; // 0..1 dorsoventral flattening of preorbital snout (gars, pikes)
  crest?: number; // 0..1 dorsal/ventral pterygiophore ridge compression
  nape?: number; // subtle snout-to-nape inflection
  bumps?: [number, number, number, number][]; // [s, height(SL), width, +1 dorsal / -1 ventral]
  wbumps?: [number, number, number][]; // width bumps [s, extraHalfWidth(SL), width] (hammerhead)
  disc?: DiscSpec;
  bend?: [number, number][]; // [s, pitch degrees] (+ bends ventrally)
  prof?: ProfileSpec; // measured dorsal + ventral silhouette (overrides the analytic outline)
  snout?: SnoutSpec; // integrated forceps / pipette snout that is part of the head: s = 0 is the snout tip
}
export interface SnoutSpec {
  len: number; // length of the snout (SL) before the forehead rises
  r: number; // half depth of the snout at its base (SL)
  tip?: number; // half depth at the tip / r (default 0.68)
  comp?: number; // lateral half-width / half-depth ratio along the snout (default 0.78)
  flare?: number; // concave forehead fillet factor (default 1)
}

export type TeethKind = 'none' | 'fine' | 'cone' | 'fang' | 'tri' | 'shark' | 'beak' | 'needle';

export interface MouthSpec {
  s: number; // tip of the jaws (s)
  y: number; // tip height, normalised to local section (-1 ventral … 1 dorsal)
  gape: number; // snout-tip → rictus distance (SL) (upper-jaw length)
  angle: number; // cleft angle in degrees (+ = rictus lower than tip)
  curve: number; // dorsal arch (+) or ventral bow (-) of the cleft
  open: number; // natural max gape opening (deg)
  jut: number; // lower jaw protrusion beyond upper (SL)
  lip: number; // fleshy lip thickness factor 0..1
  protrude?: number; // 0..1 premaxillary / upper-jaw plastic protrusion when opening
  gular?: number; // 0..1 hyoid throat depression & cheek expansion when opening
  teeth: TeethKind;
  tn: number; // teeth per jaw side
  ts: number; // tooth length (SL)
  kind?: 'jaw' | 'tube' | 'disc' | 'none';
  throat?: number;
  beak?: string; // colour of fused dental plates (parrotfishes, puffers)
  sup?: boolean; // force / forbid the superior (upturned) jaw construction
}

export interface EyeSpec {
  s: number;
  y: number; // normalised height (-1..1)
  d: number; // diameter (SL); 0 = blind
  iris: string;
  iris2?: string; // inner (pupillary) iris ring colour
  ring?: string; // pigmented globe / orbit rim tint
  bulge?: number; // 0..1 how far the eyeball protrudes: 0.1 flush (tunas) … 0.5 goby … 1 periscope turret (mudskipper)
  pupil?: PupilKind; // pupil outline (derived from the taxon when omitted)
  shine?: number; // 0..1 tapetum lucidum eyeshine
  adipose?: number; // 0..1 adipose eyelid (herrings, mackerels, bonefish)
  close?: number; // turret stance: 1 = generic clearance · 0.3 = globes nearly touching on the skull roof (mudskippers)
  stalk?: number; // 0..1 extra elevation of a turret eye on its own fleshy pedestal above the skull
}
/** round · pear (rostral aphakic space of pursuit predators) · vertical slit (sharks) · horizontal oval · crescent with operculum pupillare (rays, flatfishes) */
export type PupilKind = 'round' | 'pear' | 'slitV' | 'slitH' | 'crescent';
/** opercle: broad crescent opening behind a bony gill cover · restricted: short slit in front of the pectoral base ·
 *  pore: tiny round opening (morays, seahorses, anglerfishes) · slits: naked gill slits (sharks) */
export interface GillSpec { kind?: 'opercle' | 'restricted' | 'pore' | 'slits' | 'none' }

export type FinPattern = 'none' | 'spots' | 'leopard' | 'bands' | 'reticulate' | 'rayspots';

export type FinShape =
  | 'tri' | 'falcate' | 'round' | 'even' | 'spiny' | 'sail' | 'adipose' | 'shark'
  | 'lobe' | 'flag' | 'veil' | 'fan' | 'rect' | 'low' | 'leaf' | 'pennant'
  | 'squami' | 'marlin' | 'thread'
  // display & locomotor outlines: flying-fish wings, crowned and scalloped crests, scythe and streamer banners,
  // notched two-part dorsals, saddle-backed fins, rear-rising plumes and comb-like separated spines
  | 'wing' | 'crest' | 'scythe' | 'notch' | 'saddle' | 'plume' | 'streamer' | 'comb';

export interface FinOcellus {
  u: number; // 0..1 along fin base
  v: number; // 0..1 base to tip
  r: number; // radius in fin-v units
  col?: string; // core colour
  ring?: string; // outer halo colour
}

/** Pigment deposited on a fin membrane, in fin coordinates (u along the base, v root to tip). */
export interface FinMark {
  v0: number;
  v1: number;
  c: string;
  u0?: number;
  u1?: number;
}

export interface MedianFin {
  s0: number;
  s1: number;
  h: number; // max height (SL)
  shape: FinShape;
  sweep?: number; // degrees
  rays?: number;
  incise?: number; // membrane notch depth 0..1 (spiny fins)
  foil?: number; // 0..1 3D hydrofoil / fleshy thickness
  sheath?: number; // 0..1 scaly fleshy body-skin sheath rising onto the fin
  curve?: number; // distal backward ray curvature
  color?: string;
  tip?: string;
  alpha?: number;
  edge?: string;
  edgeWidth?: number; // fraction of fin length occupied by the marginal pigment
  marks?: FinMark[];
  spots?: number;
  mid?: string; // mid-fin colour stop
  pattern?: FinPattern;
  spotCol?: string;
  fray?: number; // 0..1 ragged, split ray tips (guppies, bettas)
  spines?: number; // explicit number of 3D spines (spiny fins)
  ocellus?: FinOcellus; // false-eye ocellus on the fin membrane
  customProfile?: [number, number][]; // measured [u, normalizedHeight] contour from 2D image
}

export interface PairedFin {
  s: number;
  y: number; // normalised attachment height
  base: number; // base length (SL)
  len: number; // fin length (SL)
  shape: FinShape;
  elev: number; // degrees: + points up, - points down
  splay: number; // degrees away from sagittal plane (0 = along flank, 80 = horizontal wing)
  sweep?: number; // optional extra backward sweep (deg)
  foil?: number; // 0..1 3D hydrofoil / fleshy lobe thickness
  rays?: number;
  color?: string;
  tip?: string;
  alpha?: number;
  incise?: number;
  edge?: string;
  edgeWidth?: number;
  marks?: FinMark[];
  mid?: string;
  pattern?: FinPattern;
  spotCol?: string;
  spots?: number;
  row?: number; // rowing amplitude multiplier
  spine?: boolean; // leading spine (perciform pelvic)
}

export type CaudalType =
  | 'forked' | 'lunate' | 'truncate' | 'emarginate' | 'rounded' | 'pointed'
  | 'hetero' | 'diphy' | 'none' | 'halfmoon' | 'lyre' | 'delta'
  // swallowtail · swordtail · hypocercal (flying fishes) · spade · double-tail · crowntail · whip filament ·
  // clavus (ocean sunfish pseudo-tail) · veiltail · double-emarginate · trilobed (coelacanth)
  | 'swallow' | 'sword' | 'hypo' | 'spade' | 'double' | 'crown' | 'whip' | 'clavus' | 'veil' | 'doubleEm' | 'trilobe';

export interface CaudalSpec {
  type: CaudalType;
  span: number; // total height (SL)
  up?: number; // fraction of span above axis
  len?: number; // lobe length (SL)
  fork?: number; // centre length relative to lobe length
  lenUp?: number;
  lenDn?: number;
  foil?: number;
  color?: string;
  tip?: string;
  alpha?: number;
  rays?: number;
  edge?: string;
  edgeWidth?: number;
  marks?: FinMark[];
  mid?: string;
  pattern?: FinPattern;
  spotCol?: string;
  spots?: number;
  fray?: number;
  customTrail?: [number, number][]; // measured [uu(0=dorsal..1=ventral), xExtensionFactor] caudal margin
}

export interface FinSet {
  dorsal?: MedianFin[];
  anal?: MedianFin[];
  finlets?: { s0: number; s1: number; n: number; h: number; color?: string };
  caudal: CaudalSpec;
  pec?: PairedFin;
  pel?: PairedFin;
  gono?: { s: number; len: number; color?: string }; // male poeciliid gonopodium
  color: string;
  tip?: string;
  alpha: number;
}

export interface Barbel {
  s: number;
  y: number;
  len: number;
  dir: Vec3; // local (forward(+)/up/out)
  droop: number;
  r: number;
  bulb?: string; // glowing bulb colour (lures)
  pairs?: boolean; // mirrored
}

/** Dermal outgrowths – the living skin itself drawn out into appendages:
 *  cirrus   · branched, antler-like skin tentacle (scorpionfishes, frogfishes, seahorses, blennies)
 *  flap     · leafy, flattened lappet with a ragged margin (stonefishes, sargassum fish, wobbegongs)
 *  filament · single fine thread (anglerfish skin filaments, lionfish brow tentacles)
 *  wart     · low papilla dome (stonefishes, frogfishes, toadfishes)
 *  tubercle · blunt bony knob, often in ridges and rings (seahorses, lumpfishes, the seahorse coronet)
 *  prickle  · dermal spinule lying back along the skin (pufferfishes, porcupinefishes, filefishes) */
export type TagKind = 'cirrus' | 'flap' | 'filament' | 'wart' | 'tubercle' | 'prickle';
/** anatomical placement presets, resolved against the actual head (eye, mouth seam, opercle) */
export type TagSite = 'brow' | 'jaw' | 'head' | 'nape' | 'ridge' | 'flank' | 'belly' | 'body' | 'tail' | 'lateral';
export interface TagField {
  kind: TagKind;
  n: number; // number of outgrowths over both flanks (rows: per row and flank)
  len: number; // mean length / height (SL)
  site?: TagSite;
  s0?: number; s1?: number; h0?: number; h1?: number; // explicit region (h: 0 dorsal midline · 0.5 flank · 1 ventral midline)
  rows?: number[]; // regular ridge rows at these h (tubercles of seahorses and lumpfishes)
  r?: number; // base radius as a fraction of len (per-kind default)
  branch?: number; // 0..1 antler branching of cirri
  lean?: number; // degrees from the skin normal toward the tail
  curl?: number; // backward curvature of the shaft (fraction of len)
  flat?: number; // 0..1 blade flattening
  fringe?: number; // 0..1 ragged, scalloped margin
  clump?: number; // 0..1 clustering into patches
  jitter?: number; // 0..1 size variation
  sway?: number; // 0 rigid … 1 limp in the water
  c?: string; // tip colour (the root always carries the skin's own pigment)
  band?: string; // ring-band colour along the shaft
  sym?: boolean; // mirror the arrangement exactly on both flanks
  seed?: number;
}

export interface Spike {
  s: number;
  y: number;
  len: number;
  dir: Vec3;
  r?: number;
  mirror?: boolean;
  horn?: number; // 0..1 carapace horn: broad flared root continuous with the armour, gently curved (cowfishes)
}

/** Pigment layers, authored in skin space: s = snout tip → caudal base, h = 0 dorsal midline · 0.5 lateral midline · 1 ventral midline.
 *  Every layer may carry `a` (opacity) and `soft` (edge feather, SL). Shapes are organic: outlines are noise-displaced and the
 *  shader warps the whole pigment field again per pixel, so nothing is drawn with ruler-straight or compass-round edges. */
export type Layer =
  | { k: 'bars'; at: number[]; w: number; c: string; h0?: number; h1?: number; edge?: string; ew?: number; wob?: number; wf?: number; slant?: number; rough?: number; taper?: number; brk?: number; a?: number; soft?: number }
  /** Each cross-section independently controls the leading and trailing edge of an anatomical band.
   *  stops are [h, anterior station, posterior station], ordered dorsal to ventral. */
  | { k: 'band'; stops: [number, number, number][]; c: string; edge?: string; ew?: number; soft?: number; rough?: number; a?: number; shade?: string }
  | { k: 'stripe'; h: number; w: number; c: string; s0?: number; s1?: number; taper?: number; wob?: number; glow?: boolean; rough?: number; brk?: number; a?: number; soft?: number }
  | { k: 'spots'; n: number; r: number; c: string; h0?: number; h1?: number; s0?: number; s1?: number; rv?: number; ring?: string; rw?: number; hole?: boolean; seed?: number; irr?: number; el?: number; ang?: number; bias?: number; even?: number; a?: number; soft?: number }
  /** Offset rows of independently irregular dots. Whale sharks have a constellation, not random white polka-dots. */
  | { k: 'lattice'; cols: number; rows: number; r: number; c: string; s0: number; s1: number; h0: number; h1: number; jitter?: number; skip?: number; seed?: number; a?: number; soft?: number }
  | { k: 'blotch'; n: number; r: number; c: string; h0?: number; h1?: number; s0?: number; s1?: number; seed?: number; a?: number; soft?: number }
  | { k: 'waves'; n: number; c: string; w: number; amp: number; freq: number; h0?: number; h1?: number; s0?: number; s1?: number; slant?: number; vertical?: boolean; rough?: number; a?: number; soft?: number }
  /** Continuous, curved chromatophore streamlines; wraps naturally around the eye on the head. */
  | { k: 'flow'; n: number; c: string; w: number; amp: number; freq: number; s0: number; s1: number; h0: number; h1: number; slant?: number; seed?: number; a?: number; soft?: number }
  | { k: 'reticulate'; c: string; n: number; w?: number; h0?: number; h1?: number; s0?: number; s1?: number; seed?: number; a?: number; soft?: number }
  | { k: 'scaleFill'; c: string; a?: number; r?: number; h0?: number; h1?: number; s0?: number }
  | { k: 'grad'; c: string; s0: number; s1: number; h0: number; h1: number; soft?: number; a?: number }
  | { k: 'gills'; at: number[]; c: string; h0?: number; h1?: number }
  | { k: 'scaleEdge'; c: string; a?: number }
  | { k: 'lateral'; c: string; h?: number; w?: number; a?: number }
  | { k: 'photo'; h: number; n: number; c: string; s0?: number; s1?: number; r?: number }
  /** fbm cloud pattern (camouflage mottling, marbling, blotched saddles): sc = feature size (SL), th = threshold → coverage */
  | { k: 'mottle'; c: string; sc: number; th?: number; soft?: number; a?: number; h0?: number; h1?: number; s0?: number; s1?: number; seed?: number; st?: [number, number] }
  /** labyrinth of worm-like lines (vermiculation) along the iso-contours of a warped fbm field */
  | { k: 'vermic'; c: string; sc: number; w?: number; a?: number; h0?: number; h1?: number; s0?: number; s1?: number; seed?: number; st?: [number, number] }
  /** smooth stroke through [s, h, s, h, …] of constant width w (SL) – head lines, eye stripes, opercular streaks */
  | { k: 'line'; p: number[]; w: number; c: string; a?: number; soft?: number; taper?: number }
  /** smooth filled region through [s, h, s, h, …] – masks, saddles, palettes, ear flaps */
  | { k: 'patch'; p: number[]; c: string; a?: number; soft?: number; rough?: number }
  /** evenly spaced dots along a row (scute rows, lateral spot rows, pores); glow = photophores */
  | { k: 'row'; h: number; n: number; r: number; c: string; s0?: number; s1?: number; a?: number; ring?: string; glow?: boolean; soft?: number }
  /** a bar through the eye (ds = offset from the eye station) */
  | { k: 'eyeband'; w: number; c: string; h0?: number; h1?: number; ds?: number; edge?: string; ew?: number; slant?: number; a?: number; soft?: number };

export interface ColorSpec {
  top: string;
  side: string;
  belly: string;
  cs?: [number, number]; // h positions of top→side and side→belly transitions
  layers?: Layer[];
  iri?: number; // iridescence (silvery fishes)
  metal?: number;
  rough?: number;
  sheen?: number;
  trans?: number; // translucency (cave tetra, snailfish)
  blind?: string; // flatfishes: colour of the blind (down-facing) side
  photoSkin?: string; // cylindrically unwrapped & de-lit flank albedo data URL from 2D image
  photoBlend?: number; // 0..1 blend weight of unwrapped 2D skin albedo with procedural layers
}

export interface SkinSpec {
  scales: number; // lateral-line scale count (0 = scaleless)
  kind: 'cycloid' | 'ctenoid' | 'ganoid' | 'placoid' | 'smooth' | 'warty' | 'bony';
  bump: number;
}

export interface SwimSpec {
  mode: 'carangiform' | 'thunniform' | 'anguilliform' | 'subcarangiform' | 'ostraciiform' | 'rajiform' | 'labriform' | 'syngnathiform' | 'selachian' | 'still';
}

export interface Rostrum {
  kind: 'bill' | 'sword' | 'saw' | 'paddle' | 'tube';
  len: number; // SL
  r: number; // base radius (SL)
  flat?: number; // vertical squash 0..1
  color?: string;
}

export interface Species {
  id: string;
  name: string;
  sci: string;
  group: string;
  lenM: number; // typical adult length (m)
  plan: 'fish' | 'ray' | 'flatR' | 'flatL';
  body: BodySpec;
  mouth: MouthSpec;
  eye: EyeSpec;
  fins: FinSet;
  color: ColorSpec;
  skin: SkinSpec;
  swim: SwimSpec;
  /** Mobulid cephalic lobes, inherited as anatomy rather than inferred from a display name. */
  cephalic?: { length: number; width: number; curl: number };
  barbels?: Barbel[];
  spikes?: Spike[];
  spines?: { n: number; len: number; c?: string };
  fronds?: { at: [number, number, number][]; c: string; style?: 'leaf' | 'paddle' }; // [s, y(norm), len]
  rostrum?: Rostrum;
  gill?: GillSpec;
  cirri?: boolean;
  tags?: TagField[]; // dermal outgrowths grown from the skin (engine/dermis.ts)
  /** explicit anatomical traits for de-novo genomes (the engine otherwise infers these from the clade name) */
  traits?: { gill?: 'opercle' | 'restricted' | 'pore' | 'slits' | 'none' };
  note: string; // what was read off the reference photograph
  HL: number; // head length (SL) – opercle position
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };
