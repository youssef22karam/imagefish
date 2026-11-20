//  Phylogeny: every measured species is an anchor genome of a lineage.
//  A lineage carries what evolution cannot easily change (body plan, jaw
//  construction, caudal skeleton) and what it can (flex flags).
// ─────────────────────────────────────────────────────────────────────────────
import type { CaudalType } from '../engine/types';
import type { HabitatId } from './habitats';
export type Niche =
  | 'apex' | 'pursuit' | 'ambush' | 'lure' | 'planktivore' | 'filter' | 'grazer' | 'picker'
  | 'benthivore' | 'crusher' | 'scavenger' | 'cryptic' | 'crevice' | 'parasite';
export const NICHE_INFO: Record<Niche, { name: string; verb: string }> = {
  apex: { name: 'Apex predator', verb: 'runs down large prey in open water' },
  pursuit: { name: 'Pursuit predator', verb: 'chases small fishes and squid in bursts of speed' },
  ambush: { name: 'Ambush predator', verb: 'waits motionless, then engulfs prey in a split-second strike' },
  lure: { name: 'Lure hunter', verb: 'dangles living light to draw prey to its jaws' },
  planktivore: { name: 'Planktivore', verb: 'picks drifting plankton from the water column' },
  filter: { name: 'Filter feeder', verb: 'sieves enormous volumes of water for plankton' },
  grazer: { name: 'Grazer', verb: 'scrapes algae and turf from hard surfaces' },
  picker: { name: 'Micro-predator', verb: 'plucks tiny invertebrates with precision' },
  benthivore: { name: 'Bottom feeder', verb: 'sifts the substrate for worms, crustaceans and molluscs' },
  crusher: { name: 'Shell crusher', verb: 'cracks molluscs, urchins and crabs with powerful jaws' },
  scavenger: { name: 'Scavenger', verb: 'patrols for carrion and whatever sinks from above' },
  cryptic: { name: 'Cryptic sniper', verb: 'hides in plain sight and sucks in passing shrimp' },
  crevice: { name: 'Crevice hunter', verb: 'threads through reef holes to corner hidden prey' },
  parasite: { name: 'Parasite', verb: 'latches onto larger fishes to rasp flesh and blood' },
};
export type LineageId =
  | 'sharkPelagic' | 'sharkBenthic' | 'whaleShark' | 'stingray' | 'manta' | 'sawfish' | 'tuna' | 'billfish' | 'jack'
  | 'herring' | 'salmonid' | 'cyprinid' | 'characin' | 'cichlid' | 'perch' | 'reefDeep' | 'tetraodont' | 'wrasse'
  | 'scorpion' | 'goby' | 'eel' | 'moray' | 'catfish' | 'flatfish' | 'syngnathid' | 'deepPredator' | 'angler'
  | 'lantern' | 'gulper' | 'deepBenthic' | 'oarfish' | 'pike' | 'cod' | 'gar' | 'sturgeon' | 'bonytongue'
  | 'lobefin' | 'jawless' | 'labyrinth' | 'molid' | 'chimaera' | 'flyingfish';
export type Kind = 'bony' | 'shark' | 'batoid' | 'eel' | 'odd';
export interface Lineage {
  name: string;
  niches: Niche[];
  roots: string[]; // genus roots
  nouns: string[]; // common-name nouns
  kind: Kind;
  mouth: boolean; // jaws may be re-shaped by diet
  body: boolean; // silhouette may be re-proportioned
  caudal: CaudalType[] | null; // tail types natural selection may choose among (null = fixed)
  finMods: boolean; // fins may be re-shaped (sails, threads, falcate pectorals)
}
const L = (name: string, niches: Niche[], roots: string[], nouns: string[], kind: Kind, mouth: boolean, body: boolean, caudal: CaudalType[] | null, finMods = mouth): Lineage =>
  ({ name, niches, roots, nouns, kind, mouth, body, caudal, finMods });
export const LINEAGES: Record<LineageId, Lineage> = {
  sharkPelagic: L('Requiem & mackerel sharks', ['apex', 'pursuit', 'scavenger'], ['Carcharh', 'Lamn', 'Isur', 'Galeocerd', 'Prionac', 'Negapr', 'Carcharod'], ['shark'], 'shark', false, true, ['hetero', 'lunate'], false),
  sharkBenthic: L('Carpet & sleeper sharks', ['benthivore', 'ambush', 'scavenger'], ['Ginglym', 'Somnios', 'Squat', 'Hemiscyll', 'Orectol', 'Scyli'], ['shark', 'catshark', 'wobbegong'], 'shark', false, true, null, false),
  whaleShark: L('Whale sharks', ['filter'], ['Rhincod', 'Megach', 'Cetorh'], ['shark'], 'shark', false, true, null, false),
  stingray: L('Stingrays & skates', ['benthivore', 'crusher', 'ambush'], ['Dasyat', 'Raj', 'Potamotryg', 'Urolop', 'Himant', 'Taeniur'], ['stingray', 'skate', 'ray'], 'batoid', false, false, null, false),
  manta: L('Devil rays', ['filter'], ['Mobul', 'Mant', 'Aetob'], ['manta', 'devil ray'], 'batoid', false, false, null, false),
  sawfish: L('Sawfishes', ['benthivore', 'pursuit'], ['Prist', 'Anoxyprist', 'Rhynchob'], ['sawfish'], 'batoid', false, false, null, false),
  tuna: L('Tunas & mackerels', ['apex', 'pursuit', 'planktivore'], ['Thunn', 'Scomb', 'Katsuw', 'Euthynn', 'Sard', 'Acanthocyb'], ['tuna', 'bonito', 'mackerel', 'albacore'], 'bony', true, true, ['lunate', 'forked']),
  billfish: L('Billfishes', ['apex', 'pursuit'], ['Makair', 'Istioph', 'Xiph', 'Tetrapt', 'Kajik'], ['marlin', 'spearfish', 'sailfish'], 'bony', false, false, null, false),
  jack: L('Jacks & dolphinfishes', ['apex', 'pursuit', 'scavenger', 'planktivore'], ['Caranx', 'Seriol', 'Coryphaen', 'Trachin', 'Echene', 'Elagat'], ['jack', 'trevally', 'amberjack', 'pompano', 'runner'], 'bony', true, true, ['forked', 'lunate']),
  herring: L('Herrings & tarpons', ['planktivore', 'pursuit', 'benthivore'], ['Clupe', 'Sardin', 'Alos', 'Megalop', 'Albul', 'Engraul', 'Spratt'], ['herring', 'sprat', 'shad', 'sardine', 'tarpon', 'anchovy'], 'bony', true, true, ['forked']),
  salmonid: L('Salmon, trout & chars', ['pursuit', 'planktivore', 'picker'], ['Salm', 'Oncorhynch', 'Salvelin', 'Thymall', 'Hucho', 'Coregon'], ['trout', 'salmon', 'char', 'grayling'], 'bony', true, true, ['emarginate', 'truncate', 'forked']),
  cyprinid: L('Carps & minnows', ['benthivore', 'picker', 'grazer', 'planktivore', 'pursuit'], ['Cyprin', 'Barb', 'Rasbor', 'Danio', 'Labe', 'Gob', 'Leucisc', 'Garr'], ['carp', 'barb', 'minnow', 'dace', 'rasbora', 'danio'], 'bony', true, true, ['forked', 'emarginate', 'truncate']),
  characin: L('Characins & tetras', ['picker', 'pursuit', 'scavenger', 'grazer', 'planktivore'], ['Characid', 'Hyphessobryc', 'Pygocentr', 'Astyan', 'Brycon', 'Hydroly', 'Paracheirod'], ['tetra', 'piranha', 'pacu', 'characin', 'pencilfish'], 'bony', true, true, ['forked', 'emarginate']),
  cichlid: L('Cichlids', ['picker', 'grazer', 'ambush', 'benthivore', 'crusher', 'pursuit'], ['Cichl', 'Symphysod', 'Pterophyll', 'Astronot', 'Oreochrom', 'Tropheus', 'Apistogram', 'Crenicichl'], ['cichlid', 'discus', 'angelfish', 'oscar', 'acara', 'pike-cichlid'], 'bony', true, true, ['rounded', 'truncate', 'emarginate', 'lyre']),
  perch: L('Perches, basses & groupers', ['picker', 'ambush', 'pursuit', 'benthivore', 'planktivore'], ['Perc', 'Microptér', 'Lepom', 'Sander', 'Epineph', 'Serran', 'Lutjan', 'Centropom', 'Notothen'], ['perch', 'bass', 'grouper', 'snapper', 'sunfish', 'snook', 'icefish'], 'bony', true, true, ['emarginate', 'truncate', 'rounded', 'forked']),
  reefDeep: L('Butterfly, angel & damselfishes', ['picker', 'grazer', 'planktivore'], ['Chaetod', 'Pomacanth', 'Acanthur', 'Abudefd', 'Amphipr', 'Zancl', 'Heniochr', 'Chrom'], ['butterflyfish', 'angelfish', 'tang', 'damselfish', 'surgeonfish', 'bannerfish'], 'bony', true, true, ['truncate', 'rounded', 'lunate', 'forked', 'lyre', 'emarginate']),
  tetraodont: L('Puffers, triggers & boxfishes', ['crusher', 'picker'], ['Tetraod', 'Balist', 'Lactor', 'Diod', 'Arothr', 'Ostraci', 'Canthig'], ['pufferfish', 'triggerfish', 'cowfish', 'boxfish', 'porcupinefish'], 'bony', false, true, ['rounded', 'truncate'], true),
  wrasse: L('Wrasses & parrotfishes', ['picker', 'grazer', 'crusher', 'planktivore'], ['Labr', 'Scar', 'Cheilin', 'Halichoer', 'Thalass', 'Corid', 'Bodian'], ['wrasse', 'parrotfish', 'hogfish', 'razorfish', 'sheephead'], 'bony', true, true, ['truncate', 'rounded', 'lunate', 'emarginate', 'lyre']),
  scorpion: L('Scorpionfishes & sculpins', ['ambush', 'benthivore'], ['Scorpaen', 'Pteroi', 'Synance', 'Sebast', 'Cott', 'Inimic', 'Dendrochir'], ['scorpionfish', 'lionfish', 'stonefish', 'rockfish', 'sculpin', 'firefish'], 'bony', true, true, ['rounded', 'truncate']),
  goby: L('Gobies & blennies', ['benthivore', 'picker', 'crusher', 'ambush'], ['Gobi', 'Blenni', 'Periophthalm', 'Anarhich', 'Salari', 'Zoarc', 'Eleotr'], ['goby', 'blenny', 'mudskipper', 'wolffish', 'eelpout', 'sleeper'], 'bony', true, true, ['rounded', 'truncate']),
  eel: L('True eels', ['crevice', 'ambush', 'benthivore', 'scavenger'], ['Anguill', 'Conger', 'Electroph', 'Ophichth', 'Synbranch', 'Nemichth'], ['eel', 'conger', 'knifefish', 'snake-eel'], 'eel', true, true, null),
  moray: L('Moray eels', ['crevice', 'ambush'], ['Gymnoth', 'Muraen', 'Echidn', 'Enchelycor', 'Rhinomur'], ['moray'], 'eel', true, true, null),
  catfish: L('Catfishes', ['benthivore', 'scavenger', 'ambush', 'grazer'], ['Ictalur', 'Silur', 'Pimelod', 'Corydor', 'Hypostom', 'Clari', 'Trichomycter', 'Pangas'], ['catfish', 'bullhead', 'pleco', 'shovelnose'], 'bony', true, true, ['forked', 'rounded', 'truncate', 'emarginate']),
  flatfish: L('Flatfishes', ['benthivore', 'ambush'], ['Pleuronect', 'Hippogloss', 'Bothus', 'Sole', 'Paralichth', 'Psett'], ['flounder', 'halibut', 'sole', 'plaice', 'turbot', 'dab'], 'bony', true, false, ['rounded', 'truncate', 'emarginate']),
  syngnathid: L('Seahorses & pipefishes', ['cryptic'], ['Hippocamp', 'Syngnath', 'Phycodur', 'Phyllopter', 'Doryrhamph', 'Solenost'], ['seahorse', 'pipefish', 'seadragon', 'pipehorse'], 'odd', false, false, null, false),
  deepPredator: L('Dragonfishes & viperfishes', ['lure', 'ambush', 'pursuit'], ['Chauliod', 'Idiac', 'Malacoste', 'Stomi', 'Bathophil', 'Astronest'], ['dragonfish', 'viperfish', 'loosejaw', 'snaggletooth'], 'bony', true, true, ['forked', 'emarginate']),
  angler: L('Anglerfishes & frogfishes', ['lure', 'ambush'], ['Melanocet', 'Antennar', 'Lophi', 'Oneirod', 'Linophryn', 'Himantolophi', 'Ceratias'], ['anglerfish', 'frogfish', 'seadevil', 'monkfish', 'dreamer'], 'odd', true, true, null, false),
  lantern: L('Lanternfishes', ['planktivore'], ['Myctoph', 'Diaph', 'Lampanyct', 'Symbolophor', 'Argyropelec'], ['lanternfish', 'hatchetfish', 'lightfish'], 'bony', true, true, ['forked']),
  gulper: L('Gulper eels', ['filter', 'lure'], ['Eurypharyn', 'Saccophar', 'Monognath'], ['gulper', 'swallower', 'pelican-eel'], 'eel', false, true, null, false),
  deepBenthic: L('Snailfishes & grenadiers', ['benthivore', 'scavenger'], ['Pseudolipar', 'Coryphaenoid', 'Macrour', 'Careproct', 'Bathypter', 'Lipar'], ['snailfish', 'grenadier', 'rattail', 'tripodfish'], 'bony', true, true, null),
  oarfish: L('Oarfishes & ribbonfishes', ['planktivore'], ['Regalec', 'Trachipter', 'Agrostich', 'Lophot'], ['oarfish', 'ribbonfish', 'dealfish'], 'eel', false, true, null, false),
  pike: L('Pikes & barracudas', ['ambush', 'pursuit'], ['Esox', 'Sphyraen', 'Boulengerell', 'Ctenoluc'], ['pike', 'barracuda', 'pickerel', 'muskellunge'], 'bony', true, true, ['forked', 'emarginate']),
  cod: L('Cods & cusk-eels', ['benthivore', 'pursuit', 'scavenger'], ['Gad', 'Merlucc', 'Lota', 'Brosm', 'Ophidi', 'Lucifug', 'Molv'], ['cod', 'hake', 'burbot', 'cusk', 'brotula', 'ling'], 'bony', true, true, ['truncate', 'emarginate', 'rounded']),
  gar: L('Gars & bowfins', ['ambush', 'pursuit'], ['Lepisoste', 'Atractoste', 'Ami', 'Cyclur'], ['gar', 'bowfin'], 'bony', true, true, null),
  sturgeon: L('Sturgeons & paddlefishes', ['benthivore', 'filter'], ['Acipens', 'Hus', 'Polyod', 'Scaphirhynch', 'Pseph'], ['sturgeon', 'paddlefish', 'sterlet'], 'shark', false, true, null, false),
  bonytongue: L('Bony-tongues', ['ambush', 'pursuit'], ['Arapaim', 'Osteogloss', 'Scleropag', 'Heterot', 'Notopter'], ['arowana', 'arapaima', 'knifefish'], 'bony', true, true, null),
  lobefin: L('Lungfishes & coelacanths', ['ambush', 'benthivore'], ['Neocerat', 'Latimer', 'Protopter', 'Lepidosir', 'Macropom'], ['lungfish', 'coelacanth'], 'odd', false, true, null, false),
  jawless: L('Lampreys & hagfishes', ['scavenger', 'parasite'], ['Petromyz', 'Eptatret', 'Myxin', 'Lamper', 'Geotri'], ['lamprey', 'hagfish'], 'eel', false, true, null, false),
  labyrinth: L('Bettas, gouramis & livebearers', ['picker', 'planktivore'], ['Bett', 'Trichopod', 'Poecil', 'Macropod', 'Colis', 'Xiphoph', 'Aplochei'], ['betta', 'gourami', 'guppy', 'paradisefish', 'killifish', 'molly'], 'bony', true, true, ['rounded', 'halfmoon', 'lyre', 'delta', 'forked', 'truncate']),
  molid: L('Molas', ['planktivore'], ['Mol', 'Mast', 'Ranzan'], ['sunfish', 'mola'], 'odd', false, true, null, false),
  chimaera: L('Chimaeras', ['crusher', 'benthivore'], ['Hydrolag', 'Chimaer', 'Callorhynch', 'Rhinochim'], ['ratfish', 'chimaera', 'ghost shark'], 'odd', false, true, null, false),
  flyingfish: L('Flyingfishes', ['planktivore'], ['Exocoet', 'Cypsel', 'Hirundichth', 'Prognich'], ['flyingfish'], 'bony', false, true, null, false),
};
/** anchor genome → [lineage, native habitats, native niche] */
type AnchorRow = [LineageId, string, Niche];
const ROWS: Record<string, AnchorRow> = {
  'alligator-gar': ['gar', 'river swamp estuary', 'ambush'],
  'american-paddlefish': ['sturgeon', 'river lake', 'filter'],
  arapaima: ['bonytongue', 'amazon swamp', 'ambush'],
  'atlantic-bluefin-tuna': ['tuna', 'pelagic', 'apex'],
  'atlantic-cod': ['cod', 'rocky sandflat polar kelp', 'benthivore'],
  'atlantic-halibut': ['flatfish', 'sandflat polar', 'ambush'],
  'atlantic-herring': ['herring', 'pelagic polar', 'planktivore'],
  'atlantic-mackerel': ['tuna', 'pelagic', 'pursuit'],
  'atlantic-mudskipper': ['goby', 'estuary', 'benthivore'],
  'atlantic-salmon': ['salmonid', 'stream river pelagic', 'pursuit'],
  'atlantic-tarpon': ['herring', 'estuary seagrass', 'pursuit'],
  'atlantic-wolffish': ['goby', 'rocky polar', 'crusher'],
  'australian-lungfish': ['lobefin', 'river swamp', 'benthivore'],
  'bay-pipefish': ['syngnathid', 'seagrass estuary', 'cryptic'],
  'beluga-sturgeon': ['sturgeon', 'river estuary', 'benthivore'],
  'black-dragonfish': ['deepPredator', 'twilight abyss', 'lure'],
  'blue-lanternfish': ['lantern', 'twilight', 'planktivore'],
  'blue-marlin': ['billfish', 'pelagic', 'apex'],
  'blue-shark': ['sharkPelagic', 'pelagic', 'apex'],
  'blue-tang': ['reefDeep', 'reef', 'grazer'],
  'bluebarred-parrotfish': ['wrasse', 'reef seagrass', 'grazer'],
  bluegill: ['perch', 'lake swamp', 'picker'],
  'bluestreak-cleaner-wrasse': ['wrasse', 'reef', 'picker'],
  bonefish: ['herring', 'seagrass sandflat', 'benthivore'],
  bowfin: ['gar', 'swamp lake', 'ambush'],
  'brown-trout': ['salmonid', 'stream lake', 'pursuit'],
  'channel-catfish': ['catfish', 'river lake', 'benthivore'],
  'clown-triggerfish': ['tetraodont', 'reef', 'crusher'],
  'common-carp': ['cyprinid', 'river lake swamp', 'benthivore'],
  'copperband-butterflyfish': ['reefDeep', 'reef', 'picker'],
  discus: ['cichlid', 'amazon', 'picker'],
  'electric-eel': ['eel', 'amazon swamp', 'ambush'],
  'emperor-angelfish': ['reefDeep', 'reef', 'picker'],
  'european-eel': ['eel', 'river estuary lake', 'crevice'],
  'european-plaice': ['flatfish', 'sandflat', 'benthivore'],
  'freshwater-angelfish': ['cichlid', 'amazon', 'picker'],
  'giant-moray': ['moray', 'reef', 'crevice'],
  'giant-oarfish': ['oarfish', 'twilight pelagic', 'planktivore'],
  'giant-trevally': ['jack', 'reef pelagic', 'apex'],
  goldfish: ['cyprinid', 'lake swamp', 'benthivore'],
  'great-barracuda': ['pike', 'reef pelagic seagrass', 'pursuit'],
  'great-white-shark': ['sharkPelagic', 'pelagic kelp rocky', 'apex'],
  'green-moray': ['moray', 'reef rocky seagrass', 'crevice'],
  'greenland-shark': ['sharkBenthic', 'polar abyss', 'scavenger'],
  guppy: ['labyrinth', 'stream swamp', 'picker'],
  'humpback-anglerfish': ['angler', 'abyss', 'lure'],
  'humphead-wrasse': ['wrasse', 'reef', 'crusher'],
  sailfish: ['billfish', 'pelagic', 'apex'],
  'koi-carp': ['cyprinid', 'lake swamp', 'benthivore'],
  'largemouth-bass': ['perch', 'lake swamp river', 'ambush'],
  'leafy-seadragon': ['syngnathid', 'kelp seagrass', 'cryptic'],
  'lined-seahorse': ['syngnathid', 'seagrass reef estuary', 'cryptic'],
  'live-sharksucker': ['jack', 'reef pelagic', 'scavenger'],
  'longhorn-cowfish': ['tetraodont', 'reef seagrass', 'picker'],
  'mahi-mahi': ['jack', 'pelagic', 'pursuit'],
  'mariana-snailfish': ['deepBenthic', 'hadal', 'benthivore'],
  'mexican-tetra-cave-form': ['characin', 'cave', 'scavenger'],
  'nassau-grouper': ['perch', 'reef', 'ambush'],
  'neon-tetra': ['characin', 'amazon', 'picker'],
  'nile-tilapia': ['cichlid', 'river lake swamp', 'grazer'],
  'northern-pike': ['pike', 'lake river swamp', 'ambush'],
  'nurse-shark': ['sharkBenthic', 'reef sandflat', 'benthivore'],
  'ocean-sunfish': ['molid', 'pelagic', 'planktivore'],
  'ocellaris-clownfish': ['reefDeep', 'reef', 'planktivore'],
  oscar: ['cichlid', 'amazon', 'ambush'],
  'pacific-angelshark': ['sharkBenthic', 'sandflat', 'ambush'],
  'pacific-hagfish': ['jawless', 'abyss sandflat', 'scavenger'],
  'pacific-herring': ['herring', 'pelagic kelp', 'planktivore'],
  'pacific-sardine': ['herring', 'pelagic', 'planktivore'],
  'peacock-flounder': ['flatfish', 'reef sandflat seagrass', 'ambush'],
  'pearl-gourami': ['labyrinth', 'swamp', 'picker'],
  'pelican-eel': ['gulper', 'abyss', 'filter'],
  porcupinefish: ['tetraodont', 'reef', 'crusher'],
  'rainbow-trout': ['salmonid', 'stream lake river', 'pursuit'],
  'red-lionfish': ['scorpion', 'reef', 'ambush'],
  'red-bellied-piranha': ['characin', 'amazon river', 'pursuit'],
  'reef-manta-ray': ['manta', 'reef pelagic', 'filter'],
  'reef-stonefish': ['scorpion', 'reef', 'ambush'],
  'round-goby': ['goby', 'lake river rocky', 'benthivore'],
  'roundnose-grenadier': ['deepBenthic', 'abyss twilight', 'scavenger'],
  'scalloped-hammerhead': ['sharkPelagic', 'pelagic reef', 'apex'],
  'sea-lamprey': ['jawless', 'river pelagic', 'parasite'],
  'sergeant-major': ['reefDeep', 'reef rocky', 'planktivore'],
  'shortfin-mako': ['sharkPelagic', 'pelagic', 'apex'],
  'siamese-fighting-fish': ['labyrinth', 'swamp', 'picker'],
  'silver-arowana': ['bonytongue', 'amazon swamp', 'ambush'],
  'skipjack-tuna': ['tuna', 'pelagic', 'pursuit'],
  'sloane-s-viperfish': ['deepPredator', 'twilight abyss', 'lure'],
  'smalltooth-sawfish': ['sawfish', 'estuary sandflat seagrass', 'benthivore'],
  'sockeye-salmon': ['salmonid', 'lake stream pelagic', 'planktivore'],
  'southern-stingray': ['stingray', 'sandflat seagrass reef', 'benthivore'],
  'spotted-ratfish': ['chimaera', 'rocky twilight', 'crusher'],
  swordfish: ['billfish', 'pelagic twilight', 'apex'],
  'thornback-skate': ['stingray', 'sandflat', 'benthivore'],
  'tiger-shark': ['sharkPelagic', 'reef pelagic seagrass', 'apex'],
  'tompot-blenny': ['goby', 'rocky kelp', 'picker'],
  'tropical-two-wing-flyingfish': ['flyingfish', 'pelagic', 'planktivore'],
  walleye: ['perch', 'lake river', 'pursuit'],
  'warty-frogfish': ['angler', 'reef', 'ambush'],
  'weedy-seadragon': ['syngnathid', 'kelp rocky', 'cryptic'],
  'wels-catfish': ['catfish', 'river lake', 'ambush'],
  'west-indian-ocean-coelacanth': ['lobefin', 'twilight rocky', 'ambush'],
  'whale-shark': ['whaleShark', 'pelagic reef', 'filter'],
  'yellow-perch': ['perch', 'lake', 'picker'],
  'yellowfin-tuna': ['tuna', 'pelagic', 'apex'],
  zebrafish: ['cyprinid', 'stream river', 'picker'],
};
export interface Anchor { id: string; lineage: LineageId; habitats: HabitatId[]; niche: Niche }
export const ANCHORS: Record<string, Anchor> = Object.fromEntries(
  Object.entries(ROWS).map(([id, [lineage, h, niche]]) => [id, { id, lineage, habitats: h.split(' ') as HabitatId[], niche }]),
);
export const anchorsOf = (l: LineageId) => Object.values(ANCHORS).filter((a) => a.lineage === l);
