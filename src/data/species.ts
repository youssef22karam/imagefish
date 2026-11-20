import { SPECIES_1A } from './species1a';
import { SPECIES_1B } from './species1b';
import { SPECIES_2A } from './species2a';
import { SPECIES_2B } from './species2b';
import { SPECIES_3A } from './species3a';
import { SPECIES_3B } from './species3b';
import type { Species } from '../engine/types';
import { applyOutline } from './profiles';
import { applyPalette } from './palkit';
import { PAL1 } from './palettes1';
import { PAL2 } from './palettes2';
import { PAL3 } from './palettes3';

/** natural colouration of every species, read off its reference photograph */
export const PALETTES = { ...PAL1, ...PAL2, ...PAL3 };

export const SPECIES: Species[] = [...SPECIES_1A, ...SPECIES_1B, ...SPECIES_2A, ...SPECIES_2B, ...SPECIES_3A, ...SPECIES_3B]
  // every species receives its measured dorsal + ventral silhouette (data/outlines*.ts)
  .map(applyOutline)
  // …and its natural colours & patterns, head to tail and on every fin (data/palettes*.ts)
  .map((s) => applyPalette(s, PALETTES))
  .sort((a, b) => a.name.localeCompare(b.name));
export const GROUPS = Array.from(new Set(SPECIES.map((s) => s.group))).sort();
