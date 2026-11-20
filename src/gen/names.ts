//  Taxonomy & field-guide prose for generated specimens.
// ─────────────────────────────────────────────────────────────────────────────
import type { Species } from '../engine/types';
import type { Habitat, HabitatId } from './habitats';
import { NICHE_INFO, type Lineage, type Niche } from './lineages';
import type { Note } from './adapt';
import { STRATEGY_INFO, type Strategy } from './pigment';
import { chance, colorWord, pick, type Rnd } from './util';
const PREFIX: Record<HabitatId, string[]> = {
  reef: ['Coralli', 'Chromo', 'Poecilo', 'Recifo'], kelp: ['Phyco', 'Laminari', 'Thalasso'], seagrass: ['Zostero', 'Phyllo', 'Posidoni'],
  pelagic: ['Pelago', 'Thalasso', 'Oceani'], twilight: ['Mesopelago', 'Nycto', 'Crepusculi'], abyss: ['Bathy', 'Abysso', 'Scoto'],
  hadal: ['Hado', 'Bathy', 'Abysso'], sandflat: ['Psammo', 'Ammo', 'Arenari'], rocky: ['Petro', 'Litho', 'Scopuli'],
  polar: ['Cryo', 'Glacio', 'Pago'], estuary: ['Rhizo', 'Mangro', 'Halo'], stream: ['Rheo', 'Torrenti', 'Oreo'],
  river: ['Potamo', 'Fluvio', 'Ilyo'], amazon: ['Amazono', 'Melano', 'Hyleo'], lake: ['Limno', 'Lacustro', 'Pelo'],
  swamp: ['Telmato', 'Helo', 'Paludi'], cave: ['Typhlo', 'Speleo', 'Troglo'],
};
const QUAL: Record<HabitatId, string[]> = {
  reef: ['Reef', 'Coral'], kelp: ['Kelp'], seagrass: ['Lagoon', 'Seagrass'], pelagic: ['Oceanic', 'Bluewater'], twilight: ['Twilight', 'Mesopelagic'],
  abyss: ['Abyssal', 'Midnight'], hadal: ['Trench', 'Hadal'], sandflat: ['Sand', 'Shoal'], rocky: ['Rock', 'Tidepool'], polar: ['Ice', 'Antarctic', 'Arctic'],
  estuary: ['Mangrove', 'Estuarine'], stream: ['Torrent', 'Brook'], river: ['River', 'Mud'], amazon: ['Amazon', 'Blackwater'], lake: ['Lake'],
  swamp: ['Swamp', 'Marsh'], cave: ['Cave', 'Grotto'],
};
const HAB_EPI: Record<HabitatId, string[]> = {
  reef: ['coralliophilus', 'recifalis'], kelp: ['phycophilus', 'laminarius'], seagrass: ['zosterae', 'herbarius'], pelagic: ['pelagicus', 'oceanicus'],
  twilight: ['crepuscularis', 'mesopelagicus'], abyss: ['abyssalis', 'profundus'], hadal: ['hadalis', 'profundissimus'], sandflat: ['arenarius', 'psammophilus'],
  rocky: ['saxatilis', 'litoralis'], polar: ['glacialis', 'antarcticus', 'borealis'], estuary: ['estuarinus', 'rhizophorae'], stream: ['rivularis', 'torrenticola'],
  river: ['fluviatilis', 'potamius'], amazon: ['amazonicus', 'nigrofluvialis'], lake: ['lacustris', 'limneticus'], swamp: ['palustris', 'stagnalis'], cave: ['cavernicola', 'subterraneus'],
};
const ENDS = ['us', 'ichthys', 'odon', 'ops', 'ias', 'ella', 'oides', 'iscus', 'ognathus', 'osoma', 'urus', 'ichthys', 'us'];
function cleanJoin(pre: string, root: string, end: string) {
  let r = root.toLowerCase();
  if (pre && /[aeiou]$/.test(pre) && /^[aeiou]/.test(r)) r = r.slice(1);
  let w = pre + r;
  if (/[aeiou]$/.test(w) && /^[aeiou]/.test(end)) w = w.slice(0, -1);
  w = (w + end).replace(/(.)\1\1/g, '$1$1');
  return w[0].toUpperCase() + w.slice(1);
}
export interface Naming { common: string; latin: string; description: string; epithetWhy: string }
export function nameFish(sp: Species, H: Habitat, L: Lineage, niche: Niche, strategy: Strategy | 'inherited', motifs: string[], notes: Note[], anchorId: string, novelty: number, r: Rnd): Naming {
  // ── salient features, most striking first ─────────────────────────────────
  const blind = sp.eye.d === 0;
  const lure = !!sp.barbels?.some((b) => b.bulb);
  const bigEye = sp.eye.d / Math.max(0.05, sp.HL) > 0.32;
  const barbels = !!sp.barbels?.length && !lure;
  const sail = sp.fins.dorsal?.some((d) => d.shape === 'sail' || d.shape === 'pennant');
  const threads = sp.fins.pel?.shape === 'thread';
  const photo = motifs.some((m) => /photophore|luminous|light organ/.test(m));
  const ghost = strategy === 'ghost' || (sp.color.trans ?? 0) > 0.3;
  const pat = motifs.join(' ');
  const patWord = /band/.test(pat) ? ['Banded', 'fasciatus'] : /bar|saddle/.test(pat) ? ['Barred', 'fasciatus'] : /line|stripe/.test(pat) ? ['Lined', 'lineatus'] : /ocell|eyespot/.test(pat) ? ['Ocellated', 'ocellatus'] : /spot|speck|fleck/.test(pat) ? ['Spotted', 'maculatus'] : /vermic|labyrinth/.test(pat) ? ['Vermiculated', 'vermiculatus'] : /mottl|blotch/.test(pat) ? ['Marbled', 'marmoratus'] : /mask/.test(pat) ? ['Masked', 'personatus'] : /neon/.test(pat) ? ['Neon', 'fulgidus'] : null;
  const mainCol = sp.color.layers?.find((l) => (l.k === 'grad' || l.k === 'band') && (l.a ?? 1) > 0.7)?.c ?? sp.color.side;
  const cw = colorWord(mainCol);
  const COL_EPI: Record<string, string> = {
    Ebony: 'niger', Pearl: 'margaritaceus', Silver: 'argenteus', Slate: 'schistaceus', Sooty: 'fuliginosus', Umber: 'umbrinus', Bronze: 'aeneus', Olive: 'olivaceus', Steel: 'chalybeus',
    Maroon: 'sanguineus', Rose: 'roseus', Crimson: 'ruber', Rusty: 'ferrugineus', Vermilion: 'miniatus', Sandy: 'arenaceus', Chestnut: 'castaneus', Tangerine: 'aurantiacus',
    Tawny: 'fulvus', Golden: 'aureus', Lemon: 'flavus', Chartreuse: 'chloris', Forest: 'viridis', Emerald: 'smaragdinus', Jade: 'prasinus', Turquoise: 'turcosus',
    Azure: 'azureus', Sapphire: 'sapphirinus', Cobalt: 'cyaneus', Indigo: 'indigo', Violet: 'violaceus', Magenta: 'purpureus',
  };
  const size = sp.lenM;
  const feats: [string, string, string][] = []; // [adjective, epithet, why]
  if (blind) feats.push(['Blind', pick(r, ['caecus', 'typhlops', 'anophthalmus']), 'for its lost eyes']);
  if (lure) feats.push([pick(r, ['Lantern', 'Lamp-bearing', 'Torch']), pick(r, ['lucifer', 'lampadarius', 'luminifer']), 'for its glowing lure']);
  if (ghost && !blind) feats.push([pick(r, ['Ghost', 'Glass', 'Phantom']), 'pellucidus', 'for its translucent body']);
  if (photo && !lure) feats.push([pick(r, ['Starry', 'Spangled', 'Lantern']), pick(r, ['stellatus', 'photophorus']), 'for its rows of light organs']);
  if (sail) feats.push([pick(r, ['Sailfin', 'Bannerfin', 'Highfin']), pick(r, ['velifer', 'altivelis']), 'for its towering dorsal fin']);
  if (threads) feats.push(['Threadfin', 'filamentosus', 'for its thread-like pelvic feelers']);
  if (bigEye && !blind) feats.push(['Bigeye', pick(r, ['macrophthalmus', 'megalops']), 'for its enormous eyes']);
  if (barbels) feats.push([pick(r, ['Whiskered', 'Bearded']), pick(r, ['barbatus', 'mystacinus']), 'for its sensory barbels']);
  if (sp.cirri) feats.push(['Fringed', 'cirrhosus', 'for the fringed cirri over its eyes']);
  if (sp.mouth.teeth === 'fang' && sp.mouth.ts > 0.014) feats.push(['Fangtooth', pick(r, ['dentex', 'ferox']), 'for its fangs']);
  if (patWord) feats.push([`${cw}-${patWord[0].toLowerCase()}`, patWord[1], `for its ${patWord[0].toLowerCase()} pattern`]);
  feats.push([cw, COL_EPI[cw] ?? 'pictus', `for its ${cw.toLowerCase()} colour`]);
  if (size > 2.5) feats.push(['Giant', 'gigas', 'for its great size']);
  if (size < 0.04) feats.push(['Pygmy', 'pygmaeus', 'for its tiny size']);
  const lead = feats[0];
  const second = feats.find((f) => f !== lead && !/colour/.test(f[2])) ?? feats[1] ?? lead;
  // ── genus ─────────────────────────────────────────────────────────────────
  const pre = chance(r, 0.25 + 0.5 * novelty) ? pick(r, PREFIX[H.id]) : '';
  const genus = cleanJoin(pre, pick(r, L.roots), pick(r, ENDS));
  const epi = chance(r, 0.22) ? pick(r, HAB_EPI[H.id]) : chance(r, 0.5) ? lead[1] : second[1];
  const latin = `${genus} ${epi}`;
  // ── common name ───────────────────────────────────────────────────────────
  const noun = L.nouns.find((n) => anchorId.includes(n.replace(/-/g, ''))) ?? L.nouns.find((n) => anchorId.includes(n)) ?? pick(r, L.nouns);
  const adj = lead[0];
  const qual = chance(r, 0.7) ? pick(r, QUAL[H.id]) + ' ' : '';
  const common = `${adj} ${qual}${noun.replace(/(^|[\s-])\w/g, (m) => m.toUpperCase())}`.replace(/\s+/g, ' ');
  // ── description ───────────────────────────────────────────────────────────
  const D = sp.body.D;
  const shape = sp.plan === 'ray' ? 'flattened, wide-winged' : sp.plan !== 'fish' ? 'flattened, asymmetrical' : D > 0.5 ? 'disc-shaped' : D > 0.34 ? 'deep-bodied' : D > 0.21 ? 'robust' : D > 0.12 ? 'slender' : 'elongate, eel-like';
  const sw = size < 0.05 ? 'tiny' : size < 0.15 ? 'small' : size < 0.5 ? 'medium-sized' : size < 1.5 ? 'large' : size < 4 ? 'very large' : 'giant';
  const lenTxt = size >= 1 ? `${size.toFixed(1)} m` : `${Math.round(size * 100)} cm`;
  const art = /^[aeiou]/i.test(sw) ? 'An' : 'A';
  const [d0, d1] = H.depth;
  const depthTxt = d1 >= 1000 ? `${d0.toLocaleString()}–${d1.toLocaleString()} m` : `${d0}–${d1} m`;
  const lines: string[] = [];
  lines.push(`${art} ${sw}, ${shape} ${noun.replace(/-/g, ' ')} of the ${H.name.toLowerCase()} (${depthTxt}), reaching about ${lenTxt}.`);
  lines.push(`A ${NICHE_INFO[niche].name.toLowerCase()}, it ${NICHE_INFO[niche].verb}.`);
  const key = notes.slice(0, 2).map((n) => n.text.replace(/\.$/, ''));
  if (key.length) lines.push(key.join('. ') + '.');
  if (strategy !== 'inherited') lines.push(`Its ${STRATEGY_INFO[strategy].name.toLowerCase()} livery — ${motifs.slice(0, 3).join(', ') || 'plain'} — works as ${STRATEGY_INFO[strategy].why}.`);
  return { common, latin, description: lines.join(' '), epithetWhy: `Named ${lead[2]}.` };
}
