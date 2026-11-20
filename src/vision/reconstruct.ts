// ─────────────────────────────────────────────────────────────────────────────
//  2D Image → Hyper-Realistic 3D Procedural Fish Reconstruction Orchestrator
//  Turns any uploaded 2D fish photograph or illustration into a fully living,
//  swimming, breathing 3D Species + GenFish genome with diagnostic overlays.
// ─────────────────────────────────────────────────────────────────────────────

import { BodyModel } from '../engine/model';
import { ensurePhotoSkinLoaded } from '../engine/skin';
import type { Species } from '../engine/types';
import { repair, type GenFish } from '../gen/generate';
import type { HabitatId } from '../gen/habitats';
import type { LineageId, Niche } from '../gen/lineages';
import {
  analyzeFishAnatomy,
  type AnalyzeOptions,
  type DetectedBauplan,
  type OverlayPolygon,
} from './anatomy';
import { extractSkinAndPigment } from './pigmentUnwrap';
import { segmentFishImage, type SegmentOptions } from './segment';

export interface ReconstructOptions extends SegmentOptions, AnalyzeOptions {
  customName?: string;
  customSci?: string;
  habitat?: HabitatId;
  promptUsed?: string;
}

export interface VisionDiagnostics {
  width: number;
  height: number;
  bauplan: DetectedBauplan;
  flipped: boolean;
  usedAlpha: boolean;
  bgHex: string;
  foregroundRatio: number;
  cutoutDataUrl: string; // segmented foreground fish on transparent background
  sourcePreviewUrl: string; // compact preview of uploaded image (oriented with head left)
  unwrappedSkinUrl: string; // cylindrically unwrapped flank albedo
  dominantPalette: string[];
  motifs: string[];
  overlays: OverlayPolygon[];
  landmarks: { name: string; x: number; y: number; color: string }[];
  metrics: {
    aspectRatio: number;
    bodyDepthSL: number;
    peduncleSL: number;
    headLengthSL: number;
    eyeDiameterSL: number;
    dorsalCount: number;
    tagCount: number;
    confidence: number;
  };
}

export interface ReconstructedSpecimen {
  species: Species;
  genFish: GenFish;
  diagnostics: VisionDiagnostics;
}

const BAUPLAN_META: Record<
  DetectedBauplan,
  { group: string; lineage: LineageId; niche: Niche; habitat: HabitatId; genus: string; commonSuffix: string }
> = {
  teleost: { group: 'Reconstructed Teleosts', lineage: 'perch', niche: 'pursuit', habitat: 'reef', genus: 'Morphichthys', commonSuffix: ' Finfish' },
  shark: { group: 'Sharks', lineage: 'sharkPelagic', niche: 'apex', habitat: 'pelagic', genus: 'Carcharomorphus', commonSuffix: ' Shark' },
  lionfish: { group: 'Scorpionfishes', lineage: 'scorpion', niche: 'ambush', habitat: 'reef', genus: 'Pteromorphus', commonSuffix: ' Lionfish' },
  eel: { group: 'Eels', lineage: 'moray', niche: 'crevice', habitat: 'reef', genus: 'Gymnomorphus', commonSuffix: ' Moray' },
  seahorse: { group: 'Seahorses & pipefishes', lineage: 'syngnathid', niche: 'picker', habitat: 'kelp', genus: 'Hippomorphus', commonSuffix: ' Seahorse' },
  angler: { group: 'Deep sea', lineage: 'angler', niche: 'lure', habitat: 'abyss', genus: 'Melanomorphus', commonSuffix: ' Angler' },
  ray: { group: 'Rays & skates', lineage: 'manta', niche: 'filter', habitat: 'sandflat', genus: 'Mobulomorphus', commonSuffix: ' Ray' },
  flatfish: { group: 'Flatfishes', lineage: 'flatfish', niche: 'benthivore', habitat: 'sandflat', genus: 'Bothomorphus', commonSuffix: ' Flounder' },
  boxfish: { group: 'Puffers & boxfishes', lineage: 'tetraodont', niche: 'grazer', habitat: 'reef', genus: 'Ostraciomorphus', commonSuffix: ' Boxfish' },
  alien: { group: 'Xenobiological Abyss', lineage: 'deepPredator', niche: 'lure', habitat: 'abyss', genus: 'Xenichthys', commonSuffix: ' Leviathan' },
};

function colorAdjective(hex: string): { common: string; latin: string } {
  const r = parseInt(hex.slice(1, 3), 16) || 100;
  const g = parseInt(hex.slice(3, 5), 16) || 100;
  const b = parseInt(hex.slice(5, 7), 16) || 100;
  if (r > 165 && g < 95 && b < 95) return { common: 'Crimson', latin: 'ruber' };
  if (r > 180 && g > 110 && b < 85) return { common: 'Amber', latin: 'aurantius' };
  if (r > 185 && g > 165 && b < 100) return { common: 'Golden', latin: 'chryseus' };
  if (b > 155 && r < 95) return { common: 'Cobalt', latin: 'cyaneus' };
  if (g > 150 && b > 140 && r < 95) return { common: 'lagoon', latin: 'viridis' };
  if (r < 55 && g < 65 && b > 85) return { common: 'Midnight', latin: 'nocturnus' };
  if (r < 60 && g < 60 && b < 65) return { common: 'Obsidian', latin: 'ater' };
  if (r > 175 && g > 180 && b > 185) return { common: 'Silver', latin: 'argenteus' };
  return { common: 'Imperial', latin: 'regalis' };
}

function renderOrientedCutoutDataUrl(
  rgba: Uint8ClampedArray,
  mask: Uint8Array,
  w: number,
  h: number,
): { cutoutUrl: string; orientedPreviewUrl: string } {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    img.data[k] = rgba[k];
    img.data[k + 1] = rgba[k + 1];
    img.data[k + 2] = rgba[k + 2];
    img.data[k + 3] = mask[i] ? 255 : 0;
  }
  ctx.putImageData(img, 0, 0);

  // Downscale to crisp 480px max for smooth UI overlay rendering
  const sc = Math.min(1, 480 / Math.max(w, h));
  const dw = Math.max(64, Math.round(w * sc));
  const dh = Math.max(64, Math.round(h * sc));
  const out = document.createElement('canvas');
  out.width = dw;
  out.height = dh;
  const octx = out.getContext('2d')!;
  octx.drawImage(cv, 0, 0, dw, dh);
  const cutoutUrl = out.toDataURL('image/png');

  return { cutoutUrl, orientedPreviewUrl: cutoutUrl };
}

export async function reconstructFishFromImage(
  source: string | File | Blob,
  opts: ReconstructOptions = {},
): Promise<ReconstructedSpecimen> {
  // 1. Foreground matting + Euclidean Distance Transform
  const rawSeg = await segmentFishImage(source, {
    maxDim: opts.maxDim ?? 720,
    sensitivity: opts.sensitivity ?? 0,
  });

  // 2. Ichthyological bauplan, silhouette, fin, head organ, scale & dermal tag solver
  const anat = analyzeFishAnatomy(rawSeg, {
    flipHorizontal: opts.flipHorizontal ?? 'auto',
    forceBauplan: opts.forceBauplan ?? 'auto',
  });

  // 3. Cylindrical UV skin albedo unwrapping + procedural chromatophore genome extraction
  const pig = extractSkinAndPigment(anat);

  const meta = BAUPLAN_META[anat.bauplan];
  const adj = colorAdjective(pig.color.side);
  const adjCap = adj.common[0].toUpperCase() + adj.common.slice(1);
  const id = `upload-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e5).toString(36)}`;
  const commonName = opts.customName?.trim() || `${adjCap}${meta.commonSuffix}`;
  const sciName = opts.customSci?.trim() || `${meta.genus} ${adj.latin}`;
  const habitat: HabitatId = opts.habitat ?? meta.habitat;

  const rawSpecies: Species = {
    id,
    name: commonName,
    sci: sciName,
    group: meta.group,
    lenM: anat.lenM,
    plan: anat.plan,
    HL: anat.HL,
    body: anat.body,
    mouth: anat.mouth,
    eye: anat.eye,
    gill: anat.gill,
    fins: anat.fins,
    color: pig.color,
    skin: anat.skin,
    swim: anat.swim,
    rostrum: anat.rostrum,
    barbels: anat.barbels,
    tags: anat.tags,
    spikes: anat.spikes,
    fronds: anat.fronds,
    traits: { gill: anat.gill.kind },
    note: `2D → 3D procedural synthesis (${anat.bauplan} bauplan): body depth ${(anat.metrics.bodyDepthSL * 100).toFixed(1)}% SL, peduncle ${(anat.metrics.peduncleSL * 100).toFixed(1)}% SL, ${anat.metrics.dorsalCount} dorsal fin(s), ${anat.fins.caudal.type} caudal, ${anat.skin.kind} skin, ${pig.motifs.join(', ')}.`,
  };

  // Validate & repair anatomical clearances (preserving equine bend & custom profiles)
  const species = anat.bauplan === 'seahorse' ? rawSpecies : repair(rawSpecies);
  // Restore customProfile / customTrail / photoSkin after clone inside repair()
  if (rawSpecies.color.photoSkin) {
    species.color.photoSkin = rawSpecies.color.photoSkin;
    species.color.photoBlend = rawSpecies.color.photoBlend;
  }
  if (rawSpecies.fins.dorsal && species.fins.dorsal) {
    species.fins.dorsal.forEach((f, idx) => {
      if (rawSpecies.fins.dorsal?.[idx]?.customProfile) {
        f.customProfile = rawSpecies.fins.dorsal[idx].customProfile;
      }
    });
  }
  if (rawSpecies.fins.anal && species.fins.anal) {
    species.fins.anal.forEach((f, idx) => {
      if (rawSpecies.fins.anal?.[idx]?.customProfile) {
        f.customProfile = rawSpecies.fins.anal[idx].customProfile;
      }
    });
  }
  if (rawSpecies.fins.caudal.customTrail) {
    species.fins.caudal.customTrail = rawSpecies.fins.caudal.customTrail;
  }

  // Verify BodyModel builds cleanly without NaN
  const testModel = new BodyModel(species, 1);
  for (let i = 1; i <= 20; i++) {
    const s = i / 20;
    if (!Number.isFinite(testModel.top(s) + testModel.bot(s) + testModel.hw(s))) {
      throw new Error('Reconstructed outline produced non-finite coordinates');
    }
  }

  await ensurePhotoSkinLoaded(species);

  const { cutoutUrl } = renderOrientedCutoutDataUrl(
    anat.seg.rgba,
    anat.seg.mask,
    anat.seg.width,
    anat.seg.height,
  );

  const genFish: GenFish = {
    key: `${id}-1`,
    species,
    seed: 1,
    habitat,
    novelty: anat.bauplan === 'alien' ? 0.92 : 0.45,
    niche: meta.niche,
    lineage: meta.lineage,
    anchor: id,
    parents: [],
    real: false,
    strategy: 'inherited',
    motifs: pig.motifs,
    notes: [
      ...anat.notes,
      {
        icon: '◐',
        title: 'Cylindrical Skin & Livery Synthesis',
        text: `Unwrapped 2D flank pigment (${pig.dominantPalette.join(' → ')}) blended seamlessly with procedural ${species.skin.kind} micro-relief and ${pig.motifs.join(', ')}.`,
      },
    ],
    common: commonName,
    latin: sciName,
    description: species.note,
    epithetWhy: `Synthesized directly from uploaded 2D plate (${Math.round(anat.metrics.confidence * 100)}% morphometric lock).`,
    genome: [
      { k: 'Morphometric lock', v: anat.metrics.confidence, lo: 'approx', hi: 'exact' },
      { k: 'Body depth', v: Math.min(1, species.body.D / 0.65), lo: 'eel', hi: 'disc' },
      { k: 'Eye size', v: Math.min(1, species.eye.d / Math.max(0.05, species.HL) / 0.45), lo: 'small', hi: 'huge' },
      { k: 'Gape', v: Math.min(1, species.mouth.gape / 0.18), lo: 'pipette', hi: 'gulper' },
      { k: 'Dermal complexity', v: Math.min(1, anat.metrics.tagCount / 36), lo: 'smooth', hi: 'ornate' },
      { k: 'Skin UV fidelity', v: species.color.photoBlend ?? 0.86, lo: 'synth', hi: 'direct' },
    ],
    origin: 'uploaded',
    clade: meta.group,
    uploadedSourceUrl: rawSeg.previewDataUrl,
  };

  return {
    species,
    genFish,
    diagnostics: {
      width: anat.seg.width,
      height: anat.seg.height,
      bauplan: anat.bauplan,
      flipped: anat.flipped,
      usedAlpha: anat.seg.usedAlpha,
      bgHex: anat.seg.bgHex,
      foregroundRatio: anat.seg.foregroundRatio,
      cutoutDataUrl: cutoutUrl,
      sourcePreviewUrl: rawSeg.previewDataUrl,
      unwrappedSkinUrl: pig.color.photoSkin ?? '',
      dominantPalette: pig.dominantPalette,
      motifs: pig.motifs,
      overlays: anat.overlays,
      landmarks: anat.landmarks,
      metrics: anat.metrics,
    },
  };
}

/** Rebuild GenFish when the user live-edits Species anatomy sliders in the Studio */
export function updateReconstructedGenFish(base: GenFish, nextSpecies: Species): GenFish {
  return {
    ...base,
    key: `${nextSpecies.id}-${Date.now().toString(36)}`,
    species: nextSpecies,
    common: nextSpecies.name,
    latin: nextSpecies.sci,
    description: nextSpecies.note,
    genome: [
      base.genome[0] ?? { k: 'Morphometric lock', v: 0.94, lo: 'approx', hi: 'exact' },
      { k: 'Body depth', v: Math.min(1, nextSpecies.body.D / 0.65), lo: 'eel', hi: 'disc' },
      { k: 'Eye size', v: Math.min(1, nextSpecies.eye.d / Math.max(0.05, nextSpecies.HL) / 0.45), lo: 'small', hi: 'huge' },
      { k: 'Gape', v: Math.min(1, nextSpecies.mouth.gape / 0.18), lo: 'pipette', hi: 'gulper' },
      {
        k: 'Dermal complexity',
        v: Math.min(1, ((nextSpecies.tags?.reduce((a, t) => a + t.n, 0) ?? 0) + (nextSpecies.barbels?.length ?? 0)) / 36),
        lo: 'smooth',
        hi: 'ornate',
      },
      { k: 'Skin UV fidelity', v: nextSpecies.color.photoBlend ?? 0.86, lo: 'synth', hi: 'direct' },
    ],
  };
}
