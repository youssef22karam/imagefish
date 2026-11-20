//  Biomes: the selective environment a fish is generated for.
//  Physical parameters drive convergent adaptation (light → eyes, flow → tail,
//  structure → body depth, turbidity → barbels, depth → photophores …), the
//  niche table drives feeding apparatus, the lineage table says which clades
//  live (natives, from the anchor table) or could colonise (colonizers) here.
// ─────────────────────────────────────────────────────────────────────────────
import type { LineageId, Niche } from './lineages';
export type HabitatId =
  | 'reef' | 'kelp' | 'seagrass' | 'pelagic' | 'twilight' | 'abyss' | 'hadal' | 'sandflat' | 'rocky'
  | 'polar' | 'estuary' | 'stream' | 'river' | 'amazon' | 'lake' | 'swamp' | 'cave';
export interface Ambience {
  bg: [string, string, string, string]; // backdrop gradient, surface → depth
  fog: string;
  fogD: number;
  exposure: number;
  envI: number; // image-based light
  hemi: [string, string, number];
  key: [string, number];
  fill: [string, number];
  rim: [string, number];
  under: [string, number];
  caustic: number; // sunlight caustics on the skin
  snow: [string, number, number]; // particle colour, opacity, size
  glow: number; // 0 = marine snow · 1 = bioluminescent plankton (additive)
  rays: number; // god-ray shafts from the surface
}
export interface Habitat {
  id: HabitatId;
  name: string;
  realm: 'Marine' | 'Freshwater' | 'Brackish' | 'Subterranean';
  glyph: string;
  blurb: string;
  depth: [number, number]; // m
  temp: number; // 0 polar … 1 tropical
  light: number; // 0 aphotic … 1 sunlit
  turb: number; // turbidity 0 clear … 1 opaque
  flow: number; // current / cruising demand
  struct: number; // structural complexity (coral, weed, roots)
  substrate: 'open' | 'sand' | 'rock' | 'coral' | 'weed' | 'mud' | 'ice' | 'leaf';
  niches: Partial<Record<Niche, number>>;
  colonizers: Partial<Record<LineageId, number>>;
  water: number; // hue of the water column (countershading tops)
  ground: string[]; // substrate colours for crypsis
  accents: string[]; // display colours this habitat favours
  vivid: number; // how saturated display colours get
  size: [number, number]; // adult length range (m)
  swatch: string; // UI card gradient
  amb: Ambience;
}
const A = (o: Partial<Ambience> & Pick<Ambience, 'bg' | 'fog'>): Ambience => ({
  fogD: 0.04, exposure: 0.95, envI: 0.72, hemi: ['#dceef5', '#18343c', 0.8], key: ['#fff7ea', 1.45], fill: ['#b6d6e6', 0.6],
  rim: ['#95c5e0', 0.8], under: ['#73a2ae', 0.32], caustic: 0.26, snow: ['#a8d8f0', 0.45, 0.016], glow: 0, rays: 0.4, ...o,
});
export const HABITATS: Habitat[] = [
  {
    id: 'reef', name: 'Coral Reef', realm: 'Marine', glyph: '🪸', blurb: 'Sunlit, crystal-clear tropical shallows packed with coral heads, caves and crevices.',
    depth: [1, 40], temp: 1, light: 1, turb: 0.05, flow: 0.35, struct: 1, substrate: 'coral',
    niches: { picker: 3, grazer: 2, planktivore: 2, ambush: 2, crusher: 1.5, crevice: 1, apex: 0.8, pursuit: 0.8, benthivore: 1, cryptic: 0.6, filter: 0.2 },
    colonizers: { goby: 0.9, cichlid: 0.35, herring: 0.3, labyrinth: 0.2, eel: 0.25, scorpion: 0.5, perch: 0.6 },
    water: 195, ground: ['#c8b48e', '#a88a6a', '#d86a5a', '#8a6a9a', '#c89a4a'], accents: ['#ffd21e', '#ff7a12', '#1e6bff', '#ff3d6e', '#7a3cff', '#18d6c8', '#f2f2ee', '#141414'], vivid: 1,
    size: [0.05, 1.2], swatch: 'linear-gradient(135deg,#2bd4e8,#1580c0 55%,#ff7a5a)',
    amb: A({ bg: ['#33c0de', '#1694c0', '#0b6390', '#05304a'], fog: '#1a86ae', fogD: 0.022, exposure: 1.0, envI: 0.86, hemi: ['#f2fbff', '#2a5a62', 0.95], key: ['#fff4dc', 1.7], fill: ['#bfe8f5', 0.7], rim: ['#a8e6ff', 0.95], under: ['#7fc4c8', 0.42], caustic: 0.45, snow: ['#e0f6ff', 0.32, 0.012], rays: 0.6 }),
  },
  {
    id: 'kelp', name: 'Kelp Forest', realm: 'Marine', glyph: '🌿', blurb: 'Cold, green-gold cathedrals of giant kelp over rocky temperate reefs.',
    depth: [3, 40], temp: 0.4, light: 0.75, turb: 0.25, flow: 0.4, struct: 0.85, substrate: 'weed',
    niches: { picker: 2, ambush: 2, benthivore: 1.5, planktivore: 1.5, cryptic: 1, grazer: 1, crusher: 1, apex: 0.5, pursuit: 0.6, crevice: 0.5 },
    colonizers: { wrasse: 0.9, scorpion: 1, perch: 0.7, reefDeep: 0.5, sharkBenthic: 0.5, stingray: 0.35, moray: 0.3, flatfish: 0.3, chimaera: 0.2, jack: 0.2, goby: 0.5 },
    water: 150, ground: ['#6a5a2a', '#8a7032', '#4a4a22', '#7a4a2a', '#5a6a32'], accents: ['#e8a020', '#c84a1a', '#3a8a4a', '#d8c060', '#2a6a8a'], vivid: 0.55,
    size: [0.1, 1.5], swatch: 'linear-gradient(135deg,#a8c860,#3a7a50 50%,#123a2e)',
    amb: A({ bg: ['#5a9a6e', '#2f6e58', '#183f36', '#08201c'], fog: '#26604c', fogD: 0.045, envI: 0.75, hemi: ['#e8f5d8', '#1d3a2c', 0.85], key: ['#fff2c8', 1.5], fill: ['#c6e2b8', 0.55], rim: ['#b8e0a8', 0.8], under: ['#5e8a6a', 0.3], caustic: 0.36, snow: ['#d6eec0', 0.45, 0.015], rays: 0.65 }),
  },
  {
    id: 'seagrass', name: 'Seagrass Lagoon', realm: 'Marine', glyph: '🌾', blurb: 'Warm, shallow meadows of swaying seagrass over white sand — a nursery of camouflage.',
    depth: [0.5, 12], temp: 0.85, light: 0.95, turb: 0.15, flow: 0.25, struct: 0.6, substrate: 'weed',
    niches: { grazer: 2, picker: 2, cryptic: 1.5, benthivore: 1.5, ambush: 1, pursuit: 1, planktivore: 1 },
    colonizers: { perch: 0.6, goby: 0.5, reefDeep: 0.3, scorpion: 0.3, cichlid: 0.15, jack: 0.3, wrasse: 0.4 },
    water: 172, ground: ['#d8cca0', '#8a9a4a', '#6a7a3a', '#b8a878'], accents: ['#8ad040', '#f0d040', '#3aa8a0', '#e87a3a'], vivid: 0.6,
    size: [0.05, 1], swatch: 'linear-gradient(135deg,#9ee8d0,#38a898 50%,#c8d070)',
    amb: A({ bg: ['#66cfc6', '#34a29c', '#1b6d68', '#0b3633'], fog: '#2c8e86', fogD: 0.03, envI: 0.85, hemi: ['#f4fff6', '#2a5a48', 0.95], key: ['#fff6dc', 1.65], fill: ['#c8f0e0', 0.65], rim: ['#b0f0e0', 0.85], caustic: 0.5, snow: ['#f0fff8', 0.3, 0.012], rays: 0.55 }),
  },
  {
    id: 'pelagic', name: 'Open Ocean', realm: 'Marine', glyph: '🌊', blurb: 'The endless blue: no floor, no shelter — only speed, schools and mirror-silver flanks.',
    depth: [0, 200], temp: 0.7, light: 0.9, turb: 0, flow: 1, struct: 0, substrate: 'open',
    niches: { planktivore: 3, pursuit: 2.5, apex: 2, filter: 0.5, scavenger: 0.3 },
    colonizers: { cod: 0.15, tetraodont: 0.25, perch: 0.15, herring: 0.5 },
    water: 212, ground: [], accents: ['#1e6bff', '#18d6c8', '#f0d020', '#8ad040'], vivid: 0.5,
    size: [0.15, 4], swatch: 'linear-gradient(135deg,#3aa8f0,#0a50a0 55%,#021838)',
    amb: A({ bg: ['#1e96d8', '#0d62a4', '#073c70', '#021026'], fog: '#0b4c8a', fogD: 0.028, exposure: 0.98, envI: 0.8, hemi: ['#eaf6ff', '#0a2a48', 0.9], key: ['#fff8ea', 1.6], fill: ['#a8d0f0', 0.6], rim: ['#8ac8ff', 1.0], under: ['#2a6aa0', 0.35], caustic: 0.32, snow: ['#c8ecff', 0.22, 0.01], rays: 0.75 }),
  },
  {
    id: 'twilight', name: 'Twilight Zone', realm: 'Marine', glyph: '🌘', blurb: '200–1000 m: the last blue glimmer from above. Big eyes, silver mirrors and living light.',
    depth: [200, 1000], temp: 0.35, light: 0.12, turb: 0, flow: 0.45, struct: 0, substrate: 'open',
    niches: { planktivore: 3, lure: 1.5, pursuit: 1.5, ambush: 1, scavenger: 1, apex: 0.5 },
    colonizers: { herring: 0.5, gulper: 0.4, angler: 0.4, cod: 0.6, sharkBenthic: 0.35, scorpion: 0.35, eel: 0.5, tuna: 0.2, jack: 0.15, flatfish: 0.1 },
    water: 222, ground: [], accents: ['#9fe4ff', '#5cf0c8', '#ff3b2f'], vivid: 0.3,
    size: [0.04, 1.5], swatch: 'linear-gradient(135deg,#2a4a8a,#0a1a40 55%,#02060f)',
    amb: A({ bg: ['#0f3462', '#092244', '#04132b', '#010610'], fog: '#06183a', fogD: 0.05, exposure: 1.0, envI: 0.38, hemi: ['#5a7ab0', '#050a14', 0.4], key: ['#a8c4ff', 0.75], fill: ['#3a5a9a', 0.4], rim: ['#4a8aff', 1.1], under: ['#102040', 0.12], caustic: 0, snow: ['#7fc8ff', 0.6, 0.014], glow: 0.6, rays: 0.08 }),
  },
  {
    id: 'abyss', name: 'Midnight Abyss', realm: 'Marine', glyph: '🦑', blurb: '1000–6000 m of eternal night, crushing cold and scarce food. Lures, fangs and gulping jaws.',
    depth: [1000, 6000], temp: 0.05, light: 0.01, turb: 0, flow: 0.15, struct: 0.1, substrate: 'open',
    niches: { lure: 2.5, scavenger: 2, ambush: 1.5, filter: 0.9, benthivore: 1.5, planktivore: 0.8 },
    colonizers: { lantern: 0.6, eel: 0.6, cod: 0.5, oarfish: 0.15, sharkBenthic: 0.3, deepBenthic: 0.6, chimaera: 0.4, stingray: 0.2, scorpion: 0.2, deepPredator: 0.6 },
    water: 225, ground: ['#2a2420', '#3a3430'], accents: ['#6ad6ff', '#5cf0c8', '#ff3b2f', '#b07aff'], vivid: 0.2,
    size: [0.05, 1], swatch: 'linear-gradient(135deg,#0a1830,#020812 60%,#000)',
    amb: A({ bg: ['#06132a', '#030b18', '#01050c', '#000000'], fog: '#010814', fogD: 0.06, exposure: 1.1, envI: 0.22, hemi: ['#3a5070', '#000000', 0.25], key: ['#e8f0ff', 0.95], fill: ['#2a4060', 0.22], rim: ['#3a7aff', 1.2], under: ['#000000', 0], caustic: 0, snow: ['#6ad6ff', 0.75, 0.016], glow: 1, rays: 0 }),
  },
  {
    id: 'hadal', name: 'Hadal Trench', realm: 'Marine', glyph: '🕳️', blurb: '6000–11000 m in the ocean’s deepest trenches: gelatinous, pale, translucent survivors.',
    depth: [6000, 10900], temp: 0.05, light: 0, turb: 0.15, flow: 0.05, struct: 0.2, substrate: 'mud',
    niches: { benthivore: 3, scavenger: 2, ambush: 0.5 },
    colonizers: { deepBenthic: 2, eel: 0.6, cod: 0.4, jawless: 0.3, gulper: 0.2 },
    water: 220, ground: ['#5a5048', '#3a342e'], accents: ['#f0c8c0'], vivid: 0.1,
    size: [0.08, 0.35], swatch: 'linear-gradient(135deg,#2a2e36,#0a0c10 60%,#000)',
    amb: A({ bg: ['#10161e', '#080b10', '#030406', '#000000'], fog: '#04060a', fogD: 0.06, exposure: 1.08, envI: 0.25, hemi: ['#4a5260', '#000000', 0.3], key: ['#f0f4ff', 1.05], fill: ['#30384a', 0.25], rim: ['#7a8aa0', 0.7], under: ['#000000', 0], caustic: 0, snow: ['#c8d4e0', 0.6, 0.013], glow: 0.15, rays: 0 }),
  },
  {
    id: 'sandflat', name: 'Sandy Shelf', realm: 'Marine', glyph: '🏖️', blurb: 'Open sand and gravel plains: nowhere to hide except by becoming the seafloor itself.',
    depth: [5, 150], temp: 0.55, light: 0.65, turb: 0.2, flow: 0.3, struct: 0.1, substrate: 'sand',
    niches: { benthivore: 3, ambush: 2.5, crusher: 1, cryptic: 0.6, picker: 0.6, planktivore: 0.5 },
    colonizers: { goby: 0.7, scorpion: 0.5, perch: 0.3, eel: 0.4, syngnathid: 0.15, chimaera: 0.2, tetraodont: 0.2, wrasse: 0.3, herring: 0.2 },
    water: 195, ground: ['#d0bc90', '#b09a70', '#8e7c58', '#c8b080', '#a89068'], accents: ['#3aa0e0', '#e88a3a', '#f0e0b0'], vivid: 0.4,
    size: [0.08, 2], swatch: 'linear-gradient(135deg,#7ad0e0,#3a90b0 50%,#d8c090)',
    amb: A({ bg: ['#70c4da', '#3c94b2', '#266076', '#4a4232'], fog: '#3a8aa6', fogD: 0.03, envI: 0.8, hemi: ['#f4fbff', '#5a5040', 0.9], key: ['#fff6e0', 1.6], fill: ['#c8e4ec', 0.6], rim: ['#b0e0f0', 0.8], under: ['#a89070', 0.42], caustic: 0.52, snow: ['#f0f0e0', 0.35, 0.013], rays: 0.45 }),
  },
  {
    id: 'rocky', name: 'Rocky Shore', realm: 'Marine', glyph: '🪨', blurb: 'Surge-swept boulders, tide pools and encrusted ledges of the temperate coast.',
    depth: [0, 60], temp: 0.4, light: 0.7, turb: 0.25, flow: 0.55, struct: 0.8, substrate: 'rock',
    niches: { benthivore: 2, ambush: 2, crusher: 1.5, picker: 1.5, crevice: 1, cryptic: 0.6, grazer: 0.6, planktivore: 0.8 },
    colonizers: { scorpion: 1, wrasse: 0.6, perch: 0.4, sharkBenthic: 0.3, flatfish: 0.2, tetraodont: 0.15, angler: 0.25, syngnathid: 0.2, eel: 0.3 },
    water: 190, ground: ['#6e5a4a', '#8a6a5a', '#5a4a40', '#9a4a3a', '#6a6a5a', '#7a5a6a'], accents: ['#e86a3a', '#d84a6a', '#e8c040', '#3a8ab0'], vivid: 0.5,
    size: [0.06, 1.2], swatch: 'linear-gradient(135deg,#6ab0c0,#2f6e7e 50%,#5a4a40)',
    amb: A({ bg: ['#5cabbd', '#30788a', '#1b4a58', '#151d1d'], fog: '#2a6e7e', fogD: 0.04, envI: 0.76, hemi: ['#eef8fb', '#2a3430', 0.85], key: ['#fff2dc', 1.5], fill: ['#bcdce4', 0.55], rim: ['#a0d4e4', 0.8], caustic: 0.45, snow: ['#e8f4f0', 0.4, 0.014], rays: 0.42 }),
  },
  {
    id: 'polar', name: 'Polar Sea', realm: 'Marine', glyph: '🧊', blurb: 'Below the sea ice at −1.9 °C: antifreeze blood, slow lives, pale and ghostly forms.',
    depth: [0, 800], temp: 0, light: 0.4, turb: 0.1, flow: 0.35, struct: 0.3, substrate: 'ice',
    niches: { benthivore: 2, planktivore: 2, ambush: 1.5, scavenger: 1, pursuit: 1, crusher: 0.6 },
    colonizers: { perch: 0.6, goby: 0.4, scorpion: 0.5, deepBenthic: 0.5, salmonid: 0.5, flatfish: 0.4, stingray: 0.2, chimaera: 0.2, eel: 0.2, lantern: 0.2 },
    water: 200, ground: ['#7a7a70', '#5a5a52', '#8a8478'], accents: ['#e0f0ff', '#d86a5a'], vivid: 0.15,
    size: [0.1, 2], swatch: 'linear-gradient(135deg,#e8f6ff,#7ab0cc 50%,#12304a)',
    amb: A({ bg: ['#bfe0ee', '#70abc6', '#2c5c7a', '#0a1a2a'], fog: '#5a8aa6', fogD: 0.04, exposure: 0.95, envI: 0.8, hemi: ['#f4fbff', '#2a3a48', 0.9], key: ['#eaf6ff', 1.25], fill: ['#c8e0f0', 0.6], rim: ['#d8f0ff', 0.9], under: ['#4a6a80', 0.3], caustic: 0.12, snow: ['#ffffff', 0.55, 0.014], rays: 0.38 }),
  },
  {
    id: 'estuary', name: 'Mangrove Estuary', realm: 'Brackish', glyph: '🌳', blurb: 'Tidal, tea-brown brackish water among mangrove roots — murky, rich and ever-changing.',
    depth: [0, 15], temp: 0.85, light: 0.5, turb: 0.7, flow: 0.45, struct: 0.7, substrate: 'mud',
    niches: { benthivore: 2.5, ambush: 1.5, pursuit: 1.5, planktivore: 1.5, scavenger: 1, filter: 0.4 },
    colonizers: { perch: 0.6, herring: 0.6, goby: 0.5, catfish: 0.6, cichlid: 0.3, flatfish: 0.4, pike: 0.3, sharkPelagic: 0.2, stingray: 0.3, cyprinid: 0.15, salmonid: 0.15, jawless: 0.15 },
    water: 70, ground: ['#5a5040', '#4a4436', '#6a5a40', '#3a3a2a'], accents: ['#c8a040', '#a8b8b0', '#d86a3a'], vivid: 0.3,
    size: [0.06, 2.5], swatch: 'linear-gradient(135deg,#a8b080,#5a6a48 50%,#2a2a1a)',
    amb: A({ bg: ['#8e9c6c', '#5c6c4a', '#39432f', '#161a12'], fog: '#5a6446', fogD: 0.085, exposure: 1.0, envI: 0.7, hemi: ['#f4f0d8', '#2a2a1a', 0.85], key: ['#fff0d0', 1.35], fill: ['#d0d0b0', 0.5], rim: ['#d8d8a8', 0.7], under: ['#5a5a3a', 0.3], caustic: 0.14, snow: ['#d8d0a8', 0.6, 0.02], rays: 0.25 }),
  },
  {
    id: 'stream', name: 'Mountain Stream', realm: 'Freshwater', glyph: '🏔️', blurb: 'Cold, clear, oxygen-rich riffles racing over pebbles — streamlined bodies or bottom-huggers.',
    depth: [0.2, 5], temp: 0.3, light: 0.95, turb: 0.05, flow: 0.9, struct: 0.4, substrate: 'rock',
    niches: { picker: 2.5, pursuit: 2, benthivore: 2, grazer: 1, ambush: 0.8, planktivore: 0.6 },
    colonizers: { cyprinid: 1, perch: 0.7, catfish: 0.45, goby: 0.4, characin: 0.4, scorpion: 0.4, eel: 0.3, jawless: 0.25, cichlid: 0.2, labyrinth: 0.15 },
    water: 160, ground: ['#7a7060', '#5a5448', '#9a8a6a', '#6a6a5a'], accents: ['#e86a2a', '#3a7ad0', '#e8c040', '#d84a4a'], vivid: 0.5,
    size: [0.03, 0.8], swatch: 'linear-gradient(135deg,#c0f0e8,#5aa090 50%,#5a5040)',
    amb: A({ bg: ['#a2d6c6', '#5ea494', '#306c5e', '#2a2a1c'], fog: '#4a8a78', fogD: 0.035, exposure: 0.98, envI: 0.85, hemi: ['#f8fff8', '#3a3a2a', 0.95], key: ['#fff8e0', 1.65], fill: ['#d0f0e0', 0.6], rim: ['#c0f0e0', 0.85], under: ['#7a7a5a', 0.35], caustic: 0.58, snow: ['#f0fff0', 0.28, 0.011], rays: 0.5 }),
  },
  {
    id: 'river', name: 'Lowland River', realm: 'Freshwater', glyph: '🏞️', blurb: 'Broad, warm, silt-laden rivers: whiskered bottom-feeders and lurking giants.',
    depth: [1, 30], temp: 0.6, light: 0.45, turb: 0.65, flow: 0.55, struct: 0.4, substrate: 'mud',
    niches: { benthivore: 3, ambush: 2, pursuit: 1.5, scavenger: 1, grazer: 1, filter: 0.5, planktivore: 1 },
    colonizers: { cyprinid: 0.6, characin: 0.4, cichlid: 0.4, herring: 0.3, bonytongue: 0.3, stingray: 0.3, sharkPelagic: 0.12, eel: 0.3, catfish: 0.6 },
    water: 75, ground: ['#6a5a3a', '#5a4e34', '#7a6a48', '#4a4030'], accents: ['#c8a040', '#d86a3a', '#b8c0b0'], vivid: 0.35,
    size: [0.05, 3], swatch: 'linear-gradient(135deg,#a0a070,#5a6a3e 50%,#1a1a0c)',
    amb: A({ bg: ['#818f5e', '#59683f', '#36421f', '#141a0c'], fog: '#4e5c34', fogD: 0.08, exposure: 1.0, envI: 0.66, hemi: ['#f4f0d0', '#2a2a14', 0.85], key: ['#fff0c8', 1.4], fill: ['#d0d0a0', 0.5], rim: ['#d8d8a0', 0.7], under: ['#5a5a30', 0.3], caustic: 0.2, snow: ['#d8d0a0', 0.6, 0.019], rays: 0.3 }),
  },
  {
    id: 'amazon', name: 'Blackwater Amazon', realm: 'Freshwater', glyph: '🐊', blurb: 'Tannin-stained, tea-coloured jungle rivers and flooded forest: neon flashes in amber gloom.',
    depth: [0.5, 20], temp: 1, light: 0.4, turb: 0.35, flow: 0.35, struct: 0.8, substrate: 'leaf',
    niches: { picker: 2.5, pursuit: 1.5, benthivore: 2, ambush: 1.5, grazer: 1, scavenger: 0.8 },
    colonizers: { catfish: 1.2, characin: 1, cichlid: 0.8, stingray: 0.55, eel: 0.3, labyrinth: 0.3, lobefin: 0.3, herring: 0.2, gar: 0.1, bonytongue: 0.3, flatfish: 0.1, tetraodont: 0.2 },
    water: 32, ground: ['#6a4a2a', '#8a6038', '#4a3220', '#7a5a3a'], accents: ['#2fd6ff', '#e01e2e', '#ff8a1e', '#f0d040', '#3a6aff'], vivid: 0.8,
    size: [0.02, 3], swatch: 'linear-gradient(135deg,#d08a3a,#6a3a16 50%,#120804)',
    amb: A({ bg: ['#a8662e', '#6e3c17', '#3c1f0a', '#120804'], fog: '#4a2810', fogD: 0.065, exposure: 1.0, envI: 0.66, hemi: ['#ffe0b0', '#2a1408', 0.8], key: ['#ffd8a0', 1.4], fill: ['#d8a070', 0.45], rim: ['#ffb070', 0.75], under: ['#5a3010', 0.25], caustic: 0.26, snow: ['#e8b880', 0.42, 0.014], rays: 0.48 }),
  },
  {
    id: 'lake', name: 'Great Lake', realm: 'Freshwater', glyph: '🛶', blurb: 'Deep, cool and open freshwater with weedy margins — schools offshore, ambushers inshore.',
    depth: [1, 200], temp: 0.45, light: 0.7, turb: 0.25, flow: 0.3, struct: 0.45, substrate: 'weed',
    niches: { planktivore: 2, picker: 2, pursuit: 1.5, ambush: 1.5, benthivore: 2, grazer: 0.8 },
    colonizers: { cichlid: 0.6, salmonid: 0.4, herring: 0.3, cyprinid: 0.5, sturgeon: 0.2, gar: 0.2, scorpion: 0.2 },
    water: 168, ground: ['#5a5a3a', '#6a6a48', '#4a4a32', '#7a7050'], accents: ['#e8a020', '#3a8a4a', '#d86a3a', '#3a7ad0'], vivid: 0.45,
    size: [0.05, 2], swatch: 'linear-gradient(135deg,#8ad0c8,#3a7a76 50%,#0a1c1e)',
    amb: A({ bg: ['#6eaca4', '#3c7c78', '#204b4d', '#0a1c1e'], fog: '#2a6a68', fogD: 0.05, envI: 0.75, hemi: ['#eefaf6', '#1e2e2c', 0.85], key: ['#fff4dc', 1.5], fill: ['#c0e0dc', 0.55], rim: ['#b0e0d8', 0.8], caustic: 0.3, snow: ['#e0f4ec', 0.4, 0.014], rays: 0.5 }),
  },
  {
    id: 'swamp', name: 'Jungle Swamp', realm: 'Freshwater', glyph: '🐸', blurb: 'Warm, stagnant, oxygen-poor pools under duckweed: air-breathers, sail fins and jewel tones.',
    depth: [0.1, 4], temp: 0.95, light: 0.45, turb: 0.6, flow: 0.05, struct: 0.9, substrate: 'leaf',
    niches: { picker: 2.5, ambush: 2, benthivore: 2, grazer: 1, scavenger: 0.5 },
    colonizers: { catfish: 0.7, labyrinth: 0.8, cyprinid: 0.4, characin: 0.3, cichlid: 0.3, eel: 0.4, lobefin: 0.4, goby: 0.2, bonytongue: 0.3 },
    water: 60, ground: ['#4a3a20', '#5a4a2a', '#3a3018', '#6a5a30'], accents: ['#3a6aff', '#e0204a', '#20c8a0', '#f0a020', '#a040e0'], vivid: 0.75,
    size: [0.02, 1.5], swatch: 'linear-gradient(135deg,#9aa850,#465222 50%,#0e1206)',
    amb: A({ bg: ['#717f3e', '#485424', '#293114', '#0e1206'], fog: '#3e4a1e', fogD: 0.095, exposure: 1.02, envI: 0.62, hemi: ['#f8f0c0', '#1a1a08', 0.8], key: ['#fff0b8', 1.3], fill: ['#d0d090', 0.45], rim: ['#d8e098', 0.7], under: ['#4a4a1a', 0.25], caustic: 0.18, snow: ['#c8d088', 0.55, 0.018], rays: 0.36 }),
  },
  {
    id: 'cave', name: 'Flooded Cave', realm: 'Subterranean', glyph: '🦇', blurb: 'Lightless limestone aquifers: no sun, no colour, no eyes — only touch, taste and patience.',
    depth: [2, 120], temp: 0.55, light: 0, turb: 0.05, flow: 0.15, struct: 0.6, substrate: 'rock',
    niches: { scavenger: 2.5, benthivore: 2, picker: 1, ambush: 0.4 },
    colonizers: { characin: 1.5, catfish: 1, cyprinid: 0.8, cod: 0.5, eel: 0.5, goby: 0.4, labyrinth: 0.2, scorpion: 0.2 },
    water: 210, ground: ['#d8c8c0', '#e8d8d0'], accents: ['#f0c8c0'], vivid: 0,
    size: [0.03, 0.25], swatch: 'linear-gradient(135deg,#3a3e44,#101214 60%,#000)',
    amb: A({ bg: ['#0c0e12', '#07090b', '#030405', '#000000'], fog: '#020304', fogD: 0.055, exposure: 1.05, envI: 0.16, hemi: ['#40464e', '#000000', 0.25], key: ['#fff2dc', 1.4], fill: ['#202830', 0.18], rim: ['#506070', 0.5], under: ['#000000', 0], caustic: 0, snow: ['#b0b8c0', 0.32, 0.01], glow: 0, rays: 0 }),
  },
];
export const HABITAT: Record<HabitatId, Habitat> = Object.fromEntries(HABITATS.map((h) => [h.id, h])) as Record<HabitatId, Habitat>;
