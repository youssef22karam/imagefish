// ─────────────────────────────────────────────────────────────────────────────
//  DERMAL KITS · which de-novo fishes grow skin outgrowths, and which ones.
//  Real fishes grow cirri, flaps, papillae, tubercles and prickles for a reason; each kit below is one of those
//  reasons, gated by construction, diet and water, and parameterised continuously so no two specimens match:
//   · rock mimicry      – stonefishes, scorpionfishes: papillae + ragged flaps + fringed lips + brow cirri
//   · weed mimicry      – sargassum fish, leafy scorpionfish: limp leafy flaps and antler cirri all over
//   · brow tentacles    – blennies, sculpins: a branched tentacle pair above the eyes (+ nape filaments)
//   · puffer prickles   – pufferfishes: fine spinules lying back over the belly and flanks
//   · ring armour       – seahorses, pipefishes: tubercle ridges on bony rings, often with cirri
//   · lumpfish knobs    – lumpsuckers: rows of large blunt tubercles in cold rocky water
//   · abyssal filaments – deep anglerfishes: fine sensory skin filaments on soft, loose skin
//   · dermal lobes      – wobbegong-like benthic sharks: a fringe of branched lobes around the mouth
// ─────────────────────────────────────────────────────────────────────────────
import type { Species, TagField } from '../engine/types';
import type { Habitat } from './habitats';
import type { Plan } from './genesis';
import type { Niche } from './lineages';
import type { Note } from './adapt';
import { chance, clamp, irange, r4, range, type Rnd } from './util';

const hex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return [128, 128, 128];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const shade = (c: string, k: number, toward = 255) => '#' + hex(c).map((x) => Math.round(clamp(x + (toward - x) * k, 0, 255)).toString(16).padStart(2, '0')).join('');

export const KIT_NAMES = ['rock mimicry', 'weed mimicry', 'brow tentacles', 'puffer prickles', 'ring armour', 'lumpfish knobs', 'abyssal filaments', 'dermal lobes'] as const;

export function growDermis(sp0: Species, plan: Plan, niche: Niche, H: Habitat, r: Rnd, novelty: number, notes: Note[]): Species {
  const wild = clamp((novelty - 0.25) / 0.75, 0, 1);
  const id = H.id;
  const shallowRock = ['reef', 'kelp', 'rocky', 'seagrass', 'estuary', 'sandflat', 'polar'].includes(id);
  const weedy = ['kelp', 'seagrass', 'estuary', 'reef', 'swamp'].includes(id);
  const deep = ['twilight', 'abyss', 'hadal'].includes(id);
  const benthic = plan === 'bottom' || plan === 'flat' || plan === 'maw' || plan === 'globe';
  const ambush = niche === 'ambush' || niche === 'cryptic' || niche === 'lure';
  const top = sp0.color.top, side = sp0.color.side;
  const tags: TagField[] = [];
  const say = (icon: string, title: string, text: string) => notes.push({ icon, title, text });
  let kits = 0;
  const sp: Species = { ...sp0, skin: { ...sp0.skin } };

  // rock mimicry
  if (kits < 2 && shallowRock && ambush && (benthic || plan === 'spindle') && plan !== 'flat' && chance(r, 0.45 + 0.3 * wild)) {
    tags.push({ kind: 'wart', n: irange(r, 90, 240), len: r4(range(r, 0.008, 0.013)), site: 'body', clump: r4(range(r, 0.35, 0.7)), jitter: 0.55, fringe: r4(range(r, 0.3, 0.6)) });
    tags.push({ kind: 'flap', n: irange(r, 12, 44), len: r4(range(r, 0.02, 0.04)), site: 'body', fringe: r4(range(r, 0.5, 0.85)), clump: r4(range(r, 0.4, 0.7)), band: shade(top, 0.45, 0), jitter: 0.5 });
    if (chance(r, 0.65)) tags.push({ kind: 'flap', n: irange(r, 8, 16), len: r4(range(r, 0.016, 0.028)), site: 'jaw', fringe: 0.8, flat: 0.7 });
    if (chance(r, 0.55)) tags.push({ kind: 'cirrus', n: irange(r, 2, 6), len: r4(range(r, 0.025, 0.045)), site: 'brow', branch: r4(range(r, 0.3, 0.8)) });
    sp.skin = { ...sp.skin, kind: 'warty', scales: 0, bump: Math.max(sp.skin.bump, 1.2) };
    say('⛰', 'Living rock', 'The skin is drawn out into papillae, ragged flaps and fringed lips: an ambusher that is indistinguishable from encrusted stone until it strikes.');
    kits++;
  }
  // weed mimicry
  if (kits < 2 && weedy && plan !== 'shark' && plan !== 'ray' && !(plan === 'spindle' && niche === 'pursuit') && chance(r, 0.07 + 0.2 * wild + (ambush ? 0.12 : 0))) {
    const c = shade(side, 0.3);
    tags.push({ kind: 'flap', n: irange(r, 18, 56), len: r4(range(r, 0.03, 0.06)), site: 'body', fringe: 0.85, sway: 0.75, clump: 0.3, c, jitter: 0.55 });
    tags.push({ kind: 'cirrus', n: irange(r, 12, 34), len: r4(range(r, 0.025, 0.05)), site: 'body', branch: r4(range(r, 0.55, 0.95)), c, jitter: 0.5 });
    say('❦', 'Weed mimic', 'Limp, leafy skin flaps and antler-like cirri sway with the current, so the fish reads as a drifting clump of weed.');
    kits++;
  }
  // brow tentacles
  if (kits < 2 && ['rocky', 'reef', 'kelp', 'stream', 'estuary', 'polar', 'lake'].includes(id) && (plan === 'bottom' || plan === 'eel' || plan === 'spindle') && sp.eye.d > 0 && !tags.some((t) => t.site === 'brow') && chance(r, 0.22 + 0.2 * wild + (plan === 'bottom' ? 0.15 : 0))) {
    const branched = chance(r, 0.7);
    tags.push({ kind: branched ? 'cirrus' : 'flap', n: 2, len: r4(range(r, 0.04, 0.085)), site: 'brow', sym: true, branch: branched ? r4(range(r, 0.35, 0.95)) : 0, flat: branched ? undefined : 0.55, lean: r4(range(r, -6, 12)), curl: 0.08, fringe: 0.4, c: shade(side, 0.25) });
    if (chance(r, 0.4)) tags.push({ kind: 'filament', n: irange(r, 2, 6), len: r4(range(r, 0.015, 0.025)), site: 'nape' });
    say('ψ', 'Brow tentacles', `A ${branched ? 'branched' : 'leaf-like'} skin tentacle stands above each eye, breaking up the outline of the head as the fish watches from its crevice.`);
    kits++;
  }
  // puffer prickles
  if (kits < 2 && plan === 'globe' && !sp.spines && ['crusher', 'picker', 'grazer', 'planktivore'].includes(niche) && chance(r, 0.4 + 0.2 * wild)) {
    const belly = chance(r, 0.55);
    tags.push({ kind: 'prickle', n: irange(r, 60, 170), len: r4(range(r, 0.013, 0.026)), site: belly ? 'belly' : 'body', lean: r4(range(r, 60, 70)), jitter: 0.35, c: shade(sp.color.belly, 0.4) });
    say('✳', 'Dermal prickles', `Fine spinules lie back along the ${belly ? 'belly' : 'whole body'}; when the fish gulps water and inflates, they stand erect.`);
    kits++;
  }
  // ring armour (seahorse / pipefish)
  if (kits < 2 && (plan === 'arrow' || plan === 'eel') && ['seagrass', 'reef', 'kelp', 'estuary'].includes(id) && chance(r, 0.22 + 0.2 * wild)) {
    tags.push({ kind: 'tubercle', n: irange(r, 14, 26), len: r4(range(r, 0.008, 0.013)), rows: [0.16, 0.5, 0.84], s0: 0.2, s1: 0.97, r: 0.7, jitter: 0.2 });
    if (chance(r, 0.55)) tags.push({ kind: 'cirrus', n: irange(r, 8, 22), len: r4(range(r, 0.02, 0.035)), site: 'body', branch: r4(range(r, 0.5, 0.9)), clump: 0.3, c: shade(side, 0.35) });
    sp.skin = { ...sp.skin, kind: 'bony', scales: 0 };
    say('⌗', 'Ring armour', 'The body is encased in bony rings whose ridges carry rows of tubercles — the armour of seahorses and pipefishes.');
    kits++;
  }
  // lumpfish knobs
  if (kits < 2 && ['polar', 'rocky', 'kelp'].includes(id) && (plan === 'globe' || plan === 'bottom' || plan === 'spindle') && chance(r, 0.14 + 0.16 * wild)) {
    tags.push({ kind: 'tubercle', n: irange(r, 7, 13), len: r4(range(r, 0.018, 0.03)), rows: [0.06, 0.4, 0.74], s0: 0.12, s1: 0.85, r: 0.75, jitter: 0.3 });
    tags.push({ kind: 'wart', n: irange(r, 30, 80), len: r4(range(r, 0.006, 0.01)), site: 'body', clump: 0.3 });
    say('◉', 'Tubercle rows', 'Rows of large, blunt bony tubercles run along the back and flanks, as on a lumpsucker clinging to cold rock.');
    kits++;
  }
  // abyssal filaments
  if (kits < 2 && deep && (plan === 'maw' || plan === 'globe' || plan === 'tadpole') && chance(r, 0.3 + 0.2 * wild)) {
    tags.push({ kind: 'filament', n: irange(r, 14, 46), len: r4(range(r, 0.02, 0.045)), site: 'body', curl: 0.45, jitter: 0.5 });
    if (chance(r, 0.4)) tags.push({ kind: 'wart', n: irange(r, 20, 60), len: r4(range(r, 0.005, 0.009)), site: 'body' });
    say('⁂', 'Sensory filaments', 'Fine skin filaments, each a lateral-line organ on a stalk, feel the faintest water movement in the dark.');
    kits++;
  }
  // dermal lobes of benthic sharks
  if (kits < 2 && plan === 'shark' && ['reef', 'sandflat', 'kelp', 'rocky'].includes(id) && (niche === 'ambush' || niche === 'benthivore') && chance(r, 0.3 + 0.2 * wild)) {
    tags.push({ kind: 'cirrus', n: irange(r, 10, 18), len: r4(range(r, 0.02, 0.035)), site: 'jaw', branch: r4(range(r, 0.4, 0.9)), flat: 0.5, fringe: 0.6 });
    say('≋', 'Dermal lobes', 'A beard of branched skin lobes fringes the mouth and breaks up the outline of the head — a carpet shark lying in wait.');
    kits++;
  }
  if (tags.length) sp.tags = [...(sp.tags ?? []), ...tags];
  return sp;
}
