// ─────────────────────────────────────────────────────────────────────────────
//  DISCOVERY · every click is an expedition.
//  One roll decides what the net brings up:
//   · a LIVING SPECIES – any of the measured atlas fishes, natives of the chosen water first, and now and then
//     a wanderer from anywhere on Earth (seahorses, sunfish, hammerheads, coelacanths … all can surface);
//   · a NATURAL HYBRID – real lineages of that water interbred, mutated and re-adapted (the continuous space
//     between the species that exist);
//   · a DE-NOVO SPECIES – grown from first principles with the full catalogue of tails, fins and heads.
//  Each find gets a rarity tier that drives the materialisation colour, the chime and the badge.
//  The seed alone reproduces the find (`?hab=…&seed=…&nov=…&d=1`).
// ─────────────────────────────────────────────────────────────────────────────
import { SPECIES } from '../data/species';
import { fromSpecies, generate, individual, type GenFish } from './generate';
import { HABITAT, type HabitatId } from './habitats';
import { ANCHORS, type LineageId } from './lineages';
import type { Plan } from './genesis';
import { TAIL_INFO, FIN_INFO } from './flourish';
import { makeRng, hashSeed } from './util';

export type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type FindKind = 'living' | 'hybrid' | 'novo';
export const TIERS: Record<Tier, { label: string; color: string }> = {
  common: { label: 'Common', color: '#8fe3d6' },
  uncommon: { label: 'Uncommon', color: '#7cd0ff' },
  rare: { label: 'Rare', color: '#6f9dff' },
  epic: { label: 'Epic', color: '#b78cff' },
  legendary: { label: 'Legendary', color: '#ffc75e' },
  mythic: { label: 'Mythic', color: '#ff74d4' },
};
export interface Discovery { fish: GenFish; kind: FindKind; tier: Tier; label: string; color: string; power: number }

/** living fossils, giants and the strangest silhouettes of the measured atlas */
const ICONIC = new Set([
  'west-indian-ocean-coelacanth', 'giant-oarfish', 'whale-shark', 'ocean-sunfish', 'leafy-seadragon', 'weedy-seadragon',
  'mariana-snailfish', 'pelican-eel', 'humpback-anglerfish', 'black-dragonfish', 'smalltooth-sawfish', 'scalloped-hammerhead',
  'reef-manta-ray', 'greenland-shark', 'beluga-sturgeon', 'sloane-s-viperfish', 'pacific-hagfish', 'sea-lamprey',
  'australian-lungfish', 'arapaima', 'american-paddlefish', 'lined-seahorse', 'spotted-ratfish', 'electric-eel',
]);
const NOTABLE = new Set([
  'swordfish', 'sailfish', 'blue-marlin', 'great-white-shark', 'tiger-shark', 'longhorn-cowfish', 'porcupinefish', 'warty-frogfish',
  'red-lionfish', 'reef-stonefish', 'tropical-two-wing-flyingfish', 'atlantic-mudskipper', 'peacock-flounder', 'pacific-angelshark',
  'blue-lanternfish', 'wels-catfish', 'alligator-gar', 'live-sharksucker', 'bay-pipefish', 'mexican-tetra-cave-form', 'discus',
  'copperband-butterflyfish', 'emperor-angelfish', 'humphead-wrasse', 'siamese-fighting-fish', 'atlantic-wolffish', 'shortfin-mako',
]);
const PLAN_RARITY: Partial<Record<Plan, number>> = {
  spindle: 0.08, disc: 0.16, arrow: 0.2, bottom: 0.16, eel: 0.26, shark: 0.3, ribbon: 0.4, globe: 0.36,
  hatchet: 0.44, maw: 0.5, tadpole: 0.44, ray: 0.42, flat: 0.42,
};
const tierOf = (x: number): Tier => (x < 0.36 ? 'common' : x < 0.52 ? 'uncommon' : x < 0.68 ? 'rare' : x < 0.84 ? 'epic' : x < 1.0 ? 'legendary' : 'mythic');
const power: Record<Tier, number> = { common: 0.25, uncommon: 0.4, rare: 0.55, epic: 0.72, legendary: 0.88, mythic: 1 };

/** rarity of any specimen (generated, atlas, offspring, migrant or hybrid) */
export function rate(f: GenFish, kind?: FindKind): Omit<Discovery, 'fish'> {
  const id = f.species.id.split('~')[0];
  if (f.real) {
    const tier: Tier = ICONIC.has(id) ? 'legendary' : NOTABLE.has(id) ? 'epic' : 'rare';
    return { kind: 'living', tier, label: `Living species · ${TIERS[tier].label}`, color: tier === 'legendary' ? TIERS.legendary.color : '#7dffb0', power: power[tier] };
  }
  const sp = f.species, fs = sp.fins;
  let x = (f.plan ? PLAN_RARITY[f.plan] ?? 0.2 : 0.22) + 0.3 * f.novelty;
  if (TAIL_INFO[fs.caudal.type]) x += 0.16;
  if ([...(fs.dorsal ?? []), ...(fs.anal ?? [])].some((d) => FIN_INFO[d.shape])) x += 0.1;
  if (fs.pec && (fs.pec.shape === 'wing' || fs.pec.shape === 'fan')) x += 0.14;
  if (fs.pel?.shape === 'thread') x += 0.06;
  if (sp.rostrum || sp.body.wbumps) x += 0.26;
  if (sp.barbels?.some((b) => b.bulb)) x += 0.12;
  if (sp.eye.d === 0) x += 0.1;
  if (sp.tags?.length) x += Math.min(0.16, 0.05 * sp.tags.length);
  if ((sp.color.trans ?? 0) > 0.3) x += 0.08;
  x += ((hashSeed('tier', sp.id) % 1000) / 1000 - 0.5) * 0.12;
  const k: FindKind = kind ?? (f.plan ? 'novo' : 'hybrid');
  const tier = tierOf(k === 'hybrid' ? x * 0.9 + 0.08 : x);
  const what = k === 'hybrid' ? 'Natural hybrid' : f.origin === 'mutated' ? 'Offspring' : f.origin === 'migrated' ? 'Colonist' : f.origin === 'crossed' ? 'Cross-bred' : 'New species';
  return { kind: k, tier, label: `${TIERS[tier].label} · ${what}`, color: TIERS[tier].color, power: power[tier] };
}

export function discover(hid: HabitatId, seed: number, novelty: number, plan?: Plan): Discovery {
  if (plan) { const fish = generate(hid, seed, { novelty: Math.max(0.08, novelty), plan }); return { fish, ...rate(fish, 'novo') }; }
  const r = makeRng(hashSeed('discover', hid, seed));
  const roll = r();
  const pLiving = Math.min(0.36, Math.max(0.07, 0.36 - 0.28 * novelty));
  const natives = SPECIES.filter((s) => ANCHORS[s.id]?.habitats.includes(hid));
  if (roll < pLiving || novelty < 0.08) {
    // a living species: natives first; one find in four is a wanderer from anywhere on Earth
    const world = natives.length === 0 || (novelty >= 0.08 && r() < 0.26);
    const pool = world ? SPECIES : natives;
    const s = pool[Math.floor(r() * pool.length) % pool.length];
    const home: HabitatId = ANCHORS[s.id]?.habitats.includes(hid) ? hid : (ANCHORS[s.id]?.habitats[0] as HabitatId | undefined) ?? hid;
    const base = fromSpecies(s);
    const fish: GenFish = {
      ...base, key: `${s.id}-${seed}`, seed, habitat: HABITAT[home] ? home : hid, species: individual(s, seed), origin: 'generated', novelty: 0,
      notes: [{ icon: '✓', title: 'Living species', text: `${s.name} (${s.sci}) exists today${home !== hid ? ` — a wanderer from the ${HABITAT[home]?.name ?? 'open sea'}` : ''}. Generated exactly as measured from its reference photograph, with natural individual variation.` }, ...base.notes.slice(1)],
    };
    return { fish, ...rate(fish, 'living') };
  }
  const lineages = [...new Set(natives.map((s) => ANCHORS[s.id].lineage))] as LineageId[];
  if (roll < pLiving + 0.15 && lineages.length) {
    const lineage = lineages[Math.floor(r() * lineages.length) % lineages.length];
    try {
      const fish = generate(hid, seed, { novelty: Math.min(0.95, 0.3 + 0.6 * novelty), lineage });
      return { fish, ...rate(fish, 'hybrid') };
    } catch { /* fall through to a de-novo construction */ }
  }
  const fish = generate(hid, seed, { novelty: Math.max(0.08, novelty) });
  return { fish, ...rate(fish, 'novo') };
}
