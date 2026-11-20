// ─────────────────────────────────────────────────────────────────────────────
//  Global Master Prompt System & Sample 2D Reference Plates
//  Engineered specifically for 1:1 orthographic lateral morphometric capture,
//  unfolded fin membranes, dermal skin tags, scales, and zero-spill isolation.
// ─────────────────────────────────────────────────────────────────────────────

export const FISH_SLOT_PLACEHOLDER = '[WRITE THE EXACT FISH OR NEVER-SEEN-BEFORE CREATURE YOU WANT HERE]';

export const GLOBAL_MASTER_PROMPT_TEMPLATE = `Hyper-realistic ichthyological scientific lateral profile photograph of a single ${FISH_SLOT_PLACEHOLDER}, strict 90-degree orthographic side view facing left, full uncropped body from snout tip to caudal tail tip centered with 12% margin on all sides, all dorsal, anal, pelvic, pectoral, and caudal fins naturally unfolded and clearly separated, crisp anatomical detail of scales or skin texture, dermal skin tags/appendages if present, gill operculum or slits, lateral line, mouth cleft, and glossy eye iris, even diffused scientific studio lighting with zero harsh specular glare and zero cast shadow, isolated on a completely flat uniform solid cool-light-grey studio background (#E4EBF0), no water bubbles, no seabed, no rocks, no text, no watermarks, 8k photorealistic macro biological plate.`;

export function buildGlobalFishPrompt(fishDescription: string): string {
  const clean = fishDescription.trim() || FISH_SLOT_PLACEHOLDER;
  return GLOBAL_MASTER_PROMPT_TEMPLATE.replace(FISH_SLOT_PLACEHOLDER, clean);
}

export interface PromptIdeaPreset {
  id: string;
  label: string;
  category: string;
  fishText: string;
}

export const PROMPT_IDEA_PRESETS: PromptIdeaPreset[] = [
  {
    id: 'alien-void-leviathan',
    label: 'Abyssal Alien Leviathan',
    category: 'Alien / Xenobiology',
    fishText:
      'never-seen-before alien bioluminescent abyssal predator fish with a sleek midnight-indigo iridescent armored body, glowing electric-cyan lateral photophore rows and violet plasma reticulated flank markings, an arched bioluminescent cyan dorsal head lure bulb, translucent crystalline fang teeth in a fierce jaw, tall scalloped sail dorsal fin with glowing magenta spine tips, filamentous chin barbels, and a deeply forked tri-lobed caudal tail',
  },
  {
    id: 'crimson-lionfish',
    label: 'Imperial Venomous Lionfish',
    category: 'Reef Scorpionfish',
    fishText:
      'ornate Red Lionfish (Pterois volitans) with alternating deep crimson-maroon and ivory-cream vertical zebra bars, 13 long venomous feather-like spiny dorsal rays with deeply incised membranes, banded fleshy supraorbital brow tentacles and ragged jaw skin flaps, translucent black-spotted rear dorsal, anal, and rounded caudal fins, and huge swept feather-fan pectoral fins',
  },
  {
    id: 'crowned-seahorse',
    label: 'Thorny Leafy Seahorse',
    category: 'Equine / Syngnathid',
    fishText:
      'upright thorny crowned seahorse with golden-amber and burnt-coral segmented bony armor rings, a long tubular pipette snout facing left, sculpted spiny coronet crown, delicate branched coral-like dermal cirri along the neck and dorsal ridges, translucent fluttering dorsal fin on the mid-back, and a tightly curled prehensile tail',
  },
  {
    id: 'tiger-shark',
    label: 'Pelagic Tiger Shark',
    category: 'Selachian / Shark',
    fishText:
      'sleek pelagic Tiger Shark with steel-slate blue-grey dorsal skin, bold dark charcoal vertical tiger bars and spots along the upper flank fading into a pearlescent white countershaded belly, pointed conical snout overhanging a ventral crescent shark mouth, five sharp naked gill slits, tall hydrofoil first dorsal fin and small second dorsal fin, swept pectoral wing, and asymmetric heterocercal shark caudal tail',
  },
  {
    id: 'dragon-moray',
    label: 'Hawaiian Dragon Moray Eel',
    category: 'Anguilliform / Eel',
    fishText:
      'Hawaiian Dragon Moray Eel (Enchelycore pardalis) in an elongated horizontal serpentine profile with fiery orange-terracotta leathery skin covered in snow-white rosette spots ringed in dark espresso brown, curved jaws showing translucent glass-like fangs, tubular nostril horns on the snout tip, bright yellow-ringed eye, and a continuous ribbon dorsal fin tapering to a pointed tail',
  },
  {
    id: 'nebula-seadragon',
    label: 'Solaris Kelp Seadragon',
    category: 'Never-Seen-Before',
    fishText:
      'never-seen-before royal violet and emerald-gold leafy seadragon hybrid with an arched armored body, elongated tubular flute snout, glowing amber eye, elaborate branching kelp-leaf dermal appendages sprouting from brow, neck, belly, and tail ridges, fine turquoise iridescent spots, and translucent gossamer dorsal fin',
  },
  {
    id: 'stonefish-chimera',
    label: 'Volcanic Warty Stonefish',
    category: 'Cryptic Dermis',
    fishText:
      'prehistoric volcanic reef stonefish covered in bumpy obsidian and magma-orange dermal warts, ragged leafy camouflage skin flaps and branched brow cirri, upturned ambush mouth with fringed jaw lappets, dorsal turret eyes, heavy venomous dorsal spines, and broad fleshy mottled pectoral fins',
  },
  {
    id: 'crystal-oarfish',
    label: 'Celestial Ribbon Oarfish',
    category: 'Pelagic Mythic',
    fishText:
      'mythic deep-ocean ribbon oarfish with mirror-like liquid-silver guanine skin,diagonal cobalt streaks, a dramatic tall crimson-scarlet crown crest of elongated anterior dorsal rays above the head, continuous ruby-red dorsal fin running the entire length of the slender body, large moon-silver eye, and long trailing pelvic oar filaments',
  },
];

export interface SamplePlate {
  id: string;
  name: string;
  sci: string;
  badge: string;
  url: string;
  habitat: 'reef' | 'abyss' | 'kelp' | 'pelagic';
  promptSubject: string;
}

export const BUILTIN_SAMPLE_PLATES: SamplePlate[] = [
  {
    id: 'sample-lionfish',
    name: 'Imperial Red Lionfish',
    sci: 'Pterois volitans',
    badge: 'Spines + Brow Flaps',
    url: '/samples/imperial-lionfish.png',
    habitat: 'reef',
    promptSubject: PROMPT_IDEA_PRESETS[1].fishText,
  },
  {
    id: 'sample-alien',
    name: 'Xeno Abyssal Leviathan',
    sci: 'Xenichthys voidensis',
    badge: 'Alien + Lure + Fangs',
    url: '/samples/xeno-abyssal-leviathan.png',
    habitat: 'abyss',
    promptSubject: PROMPT_IDEA_PRESETS[0].fishText,
  },
  {
    id: 'sample-seahorse',
    name: 'Crowned Thorny Seahorse',
    sci: 'Hippocampus coronatus',
    badge: 'Upright Coil + Cirri',
    url: '/samples/crowned-leafy-seahorse.png',
    habitat: 'kelp',
    promptSubject: PROMPT_IDEA_PRESETS[2].fishText,
  },
  {
    id: 'sample-shark',
    name: 'Pelagic Tiger Shark',
    sci: 'Galeocerdo cuvier',
    badge: 'Gill Slits + Heterocercal',
    url: '/samples/tiger-reef-shark.png',
    habitat: 'pelagic',
    promptSubject: PROMPT_IDEA_PRESETS[3].fishText,
  },
  {
    id: 'sample-moray',
    name: 'Dragon Moray Eel',
    sci: 'Enchelycore pardalis',
    badge: 'Serpentine + Rosettes',
    url: '/samples/dragon-moray-eel.png',
    habitat: 'reef',
    promptSubject: PROMPT_IDEA_PRESETS[4].fishText,
  },
];
