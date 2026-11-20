// ─────────────────────────────────────────────────────────────────────────────
//  Cylindrical UV Skin Albedo Unwrapper & Procedural Chromatophore Extractor
//  Unwraps 2D specimen flank pigment onto (s, h) cylindrical coordinates,
//  inpaints the 2D eye globe so the 3D socketed eye sits cleanly, removes harsh
//  baked glare, and extracts structured procedural ColorSpec + Layer[] genes.
// ─────────────────────────────────────────────────────────────────────────────

import { registerPhotoSkin } from '../engine/skin';
import type { ColorSpec, Layer } from '../engine/types';
import type { AnatomyResult } from './anatomy';
import { rgbToHex, rgbToLab } from './segment';

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

export interface ExtractedPigment {
  color: ColorSpec;
  motifs: string[];
  dominantPalette: string[];
}

export function extractSkinAndPigment(anat: AnatomyResult): ExtractedPigment {
  const { seg, mapping, bauplan } = anat;
  const { width: w, height: h, mask } = seg;

  // 1. Copy RGBA and radially inpaint the 2D eye disc using surrounding cranial skin
  const cleanRgba = new Uint8ClampedArray(seg.rgba);
  {
    const ex = mapping.eyePx.x;
    const ey = mapping.eyePx.y;
    const er = Math.max(4, mapping.eyePx.r * 1.48);
    // Collect ring of valid head skin pixels just outside `er`
    const ringColors: [number, number, number][] = [];
    const A_STEPS = 24;
    for (let a = 0; a < A_STEPS; a++) {
      const ang = (a * Math.PI * 2) / A_STEPS;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      let found: [number, number, number] | null = null;
      for (const mult of [1.22, 1.45, 1.75]) {
        const sx = clamp(Math.round(ex + ca * er * mult), 0, w - 1);
        const sy = clamp(Math.round(ey + sa * er * mult), 0, h - 1);
        const idx = sy * w + sx;
        if (mask[idx]) {
          found = [seg.rgba[idx * 4], seg.rgba[idx * 4 + 1], seg.rgba[idx * 4 + 2]];
          break;
        }
      }
      ringColors.push(found ?? [120, 120, 120]);
    }

    const iy0 = clamp(Math.floor(ey - er), 0, h - 1);
    const iy1 = clamp(Math.ceil(ey + er), 0, h - 1);
    const ix0 = clamp(Math.floor(ex - er), 0, w - 1);
    const ix1 = clamp(Math.ceil(ex + er), 0, w - 1);

    for (let y = iy0; y <= iy1; y++) {
      for (let x = ix0; x <= ix1; x++) {
        const dx = x - ex, dy = y - ey;
        const dist = Math.hypot(dx, dy);
        if (dist > er) continue;
        const idx = y * w + x;
        if (!mask[idx]) continue;
        const ang = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
        const af = (ang / (Math.PI * 2)) * A_STEPS;
        const a0 = Math.floor(af) % A_STEPS;
        const a1 = (a0 + 1) % A_STEPS;
        const t = af - Math.floor(af);
        const opp = (a0 + A_STEPS / 2) % A_STEPS;
        // Blend angular boundary pixel with opposite side toward center for smooth skin fill
        const cNear = [
          lerp(ringColors[a0][0], ringColors[a1][0], t),
          lerp(ringColors[a0][1], ringColors[a1][1], t),
          lerp(ringColors[a0][2], ringColors[a1][2], t),
        ];
        const centerMix = (1 - dist / er) * 0.35;
        const r = lerp(cNear[0], ringColors[opp][0], centerMix);
        const g = lerp(cNear[1], ringColors[opp][1], centerMix);
        const b = lerp(cNear[2], ringColors[opp][2], centerMix);
        const feather = clamp((er - dist) / (er * 0.25), 0, 1);
        const k = idx * 4;
        cleanRgba[k] = Math.round(lerp(cleanRgba[k], r, feather));
        cleanRgba[k + 1] = Math.round(lerp(cleanRgba[k + 1], g, feather));
        cleanRgba[k + 2] = Math.round(lerp(cleanRgba[k + 2], b, feather));
      }
    }
  }

  // Helper to sample valid foreground RGB near (fx, fy), falling back toward (cx, cy) if needed
  const sampleValidRgb = (fx: number, fy: number, cx: number, cy: number): [number, number, number] => {
    for (let step = 0; step <= 8; step++) {
      const t = step / 8;
      const sx = clamp(Math.round(lerp(fx, cx, t)), 0, w - 1);
      const sy = clamp(Math.round(lerp(fy, cy, t)), 0, h - 1);
      const idx = sy * w + sx;
      if (mask[idx]) {
        const k = idx * 4;
        return [cleanRgba[k], cleanRgba[k + 1], cleanRgba[k + 2]];
      }
    }
    // Spiral search within 6px
    const ix = clamp(Math.round(cx), 0, w - 1);
    const iy = clamp(Math.round(cy), 0, h - 1);
    for (let rad = 1; rad <= 8; rad++) {
      for (let dy = -rad; dy <= rad; dy += rad) {
        for (let dx = -rad; dx <= rad; dx += rad) {
          const nx = clamp(ix + dx, 0, w - 1), ny = clamp(iy + dy, 0, h - 1);
          const ni = ny * w + nx;
          if (mask[ni]) {
            return [cleanRgba[ni * 4], cleanRgba[ni * 4 + 1], cleanRgba[ni * 4 + 2]];
          }
        }
      }
    }
    return [110, 122, 134];
  };

  // 2. Cylindrically unwrap trunk skin onto (UW x UH) canvas (`s ∈ [0,1]`, `h ∈ [0,1]`)
  const UW = 896;
  const UH = 320;
  const uCanvas = document.createElement('canvas');
  uCanvas.width = UW;
  uCanvas.height = UH;
  const uCtx = uCanvas.getContext('2d')!;
  const imgData = uCtx.createImageData(UW, UH);
  const dst = imgData.data;

  const M = mapping.stations;

  for (let u = 0; u < UW; u++) {
    const s = u / (UW - 1);
    const stF = s * (M - 1);
    const i0 = Math.min(M - 2, Math.floor(stF));
    const frac = stF - i0;

    if (mapping.isEquine && mapping.equineSpine) {
      const sp0 = mapping.equineSpine[i0];
      const sp1 = mapping.equineSpine[i0 + 1];
      const cx = lerp(sp0.x, sp1.x, frac);
      const cy = lerp(sp0.y, sp1.y, frac);
      const nx = lerp(sp0.nx, sp1.nx, frac);
      const ny = lerp(sp0.ny, sp1.ny, frac);
      const rD = lerp(sp0.rD, sp1.rD, frac) * 0.9;
      const rV = lerp(sp0.rV, sp1.rV, frac) * 0.9;

      for (let v = 0; v < UH; v++) {
        const hv = v / (UH - 1); // 0 dorsal .. 1 ventral
        const cosP = Math.cos(Math.PI * hv);
        const linP = 1 - 2 * hv;
        const proj = lerp(cosP, linP, 0.25);
        const rad = proj >= 0 ? proj * rD : proj * rV;
        const [r, g, b] = sampleValidRgb(cx + nx * rad, cy + ny * rad, cx, cy);
        const k = (v * UW + u) * 4;
        dst[k] = r;
        dst[k + 1] = g;
        dst[k + 2] = b;
        dst[k + 3] = 255;
      }
    } else {
      const xPx = mapping.xSnout + s * mapping.SLpx;
      const topY = lerp(mapping.trunkTopPx[i0], mapping.trunkTopPx[i0 + 1], frac);
      const midY = lerp(mapping.trunkMidPx[i0], mapping.trunkMidPx[i0 + 1], frac);
      const botY = lerp(mapping.trunkBotPx[i0], mapping.trunkBotPx[i0 + 1], frac);
      const topR = Math.max(1.5, (midY - topY) * 0.93);
      const botR = Math.max(1.5, (botY - midY) * 0.93);

      for (let v = 0; v < UH; v++) {
        const hv = v / (UH - 1); // 0 dorsal midline .. 0.5 lateral .. 1 ventral midline
        const cosP = Math.cos(Math.PI * hv);
        const linP = 1 - 2 * hv;
        const proj = lerp(cosP, linP, 0.24);
        const yPx = proj >= 0 ? midY - proj * topR : midY + (-proj) * botR;
        const [r, g, b] = sampleValidRgb(xPx, yPx, xPx, midY);

        // Gentle specular glare compression (>242) so 3D water clearcoat supplies highlights naturally
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const comp = lum > 236 ? 236 / lum : 1;
        const k = (v * UW + u) * 4;
        dst[k] = Math.round(r * comp);
        dst[k + 1] = Math.round(g * comp);
        dst[k + 2] = Math.round(b * comp);
        dst[k + 3] = 255;
      }
    }
  }

  // Seamless dorsal (v=0) and ventral (v=UH-1) midline smoothing so left/right flank mirror has zero seam
  for (let u = 0; u < UW; u++) {
    for (let edge = 0; edge < 6; edge++) {
      const t = edge / 6;
      // Top seam
      const kT = (edge * UW + u) * 4;
      const kTRef = (6 * UW + u) * 4;
      dst[kT] = Math.round(lerp(dst[kTRef], dst[kT], t));
      dst[kT + 1] = Math.round(lerp(dst[kTRef + 1], dst[kT + 1], t));
      dst[kT + 2] = Math.round(lerp(dst[kTRef + 2], dst[kT + 2], t));
      // Bottom seam
      const vB = UH - 1 - edge;
      const kB = (vB * UW + u) * 4;
      const kBRef = ((UH - 7) * UW + u) * 4;
      dst[kB] = Math.round(lerp(dst[kBRef], dst[kB], t));
      dst[kB + 1] = Math.round(lerp(dst[kBRef + 1], dst[kB + 1], t));
      dst[kB + 2] = Math.round(lerp(dst[kBRef + 2], dst[kB + 2], t));
    }
  }

  uCtx.putImageData(imgData, 0, 0);
  const photoSkin = uCanvas.toDataURL('image/webp', 0.86);
  registerPhotoSkin(photoSkin, uCanvas);

  // 3. Extract Countershading Colors (`top`, `side`, `belly`) & Optical Material Parameters
  const bandColor = (vStartFrac: number, vEndFrac: number) => {
    const v0 = Math.floor(vStartFrac * UH);
    const v1 = Math.max(v0 + 1, Math.floor(vEndFrac * UH));
    const u0 = Math.floor(UW * 0.18), u1 = Math.floor(UW * 0.84);
    let rS = 0, gS = 0, bS = 0, n = 0;
    for (let v = v0; v < v1; v += 2) {
      for (let u = u0; u < u1; u += 4) {
        const k = (v * UW + u) * 4;
        rS += dst[k]; gS += dst[k + 1]; bS += dst[k + 2]; n++;
      }
    }
    if (n === 0) return { r: 100, g: 112, b: 124, hex: '#64707c', L: 48, chroma: 10 };
    const r = rS / n, g = gS / n, b = bS / n;
    const [L, ca, cb] = rgbToLab(r, g, b);
    return { r, g, b, hex: rgbToHex(r, g, b), L, chroma: Math.hypot(ca, cb) };
  };

  const topBand = bandColor(0.04, 0.24);
  const sideBand = bandColor(0.36, 0.62);
  const bellyBand = bandColor(0.76, 0.95);

  // 4. Extract Structured Procedural `Layer[]` (Bars, Photophores, Spots, Mottling)
  const layers: Layer[] = [];
  const motifs: string[] = [];

  if (bellyBand.L - topBand.L > 14) motifs.push('countershaded');

  // A. Detect vertical zebra / tiger bars along mid-flank (`u ∈ [0.10..0.92]`)
  {
    const BINS = 96;
    const colL = new Float32Array(BINS);
    const colR = new Float32Array(BINS);
    const colG = new Float32Array(BINS);
    const colB = new Float32Array(BINS);
    for (let i = 0; i < BINS; i++) {
      const u = Math.floor(((0.08 + 0.86 * (i / (BINS - 1))) * (UW - 1)));
      let lS = 0, rS = 0, gS = 0, bS = 0, n = 0;
      for (let v = Math.floor(UH * 0.22); v <= Math.floor(UH * 0.68); v += 4) {
        const k = (v * UW + u) * 4;
        const [L] = rgbToLab(dst[k], dst[k + 1], dst[k + 2]);
        lS += L; rS += dst[k]; gS += dst[k + 1]; bS += dst[k + 2]; n++;
      }
      colL[i] = lS / Math.max(1, n);
      colR[i] = rS / Math.max(1, n);
      colG[i] = gS / Math.max(1, n);
      colB[i] = bS / Math.max(1, n);
    }

    // Smooth baseline and find dark/contrasting vertical bar troughs
    const baseL = new Float32Array(BINS);
    for (let i = 0; i < BINS; i++) {
      let s = 0, c = 0;
      for (let k = -7; k <= 7; k++) {
        const j = clamp(i + k, 0, BINS - 1);
        s += colL[j]; c++;
      }
      baseL[i] = s / c;
    }

    const barPositions: number[] = [];
    let barR = 0, barG = 0, barB = 0;
    for (let i = 2; i < BINS - 2; i++) {
      const delta = baseL[i] - colL[i];
      if (delta > 7.5 && colL[i] <= colL[i - 1] && colL[i] <= colL[i + 1]) {
        const sPos = r4(0.08 + 0.86 * (i / (BINS - 1)));
        if (barPositions.length === 0 || sPos - barPositions[barPositions.length - 1] > 0.038) {
          barPositions.push(sPos);
          barR += colR[i]; barG += colG[i]; barB += colB[i];
        }
      }
    }

    if (barPositions.length >= 4) {
      const bHex = rgbToHex(barR / barPositions.length, barG / barPositions.length, barB / barPositions.length);
      layers.push({
        k: 'bars',
        at: barPositions,
        w: r4(clamp(0.45 / barPositions.length, 0.018, 0.048)),
        c: bHex,
        h0: 0.04,
        h1: bellyBand.L - topBand.L > 18 ? 0.72 : 0.94,
        wob: 0.01,
        a: 0.32, // subtle procedural reinforcement on top of unwrapped photoSkin (and 100% inherited in hybrids!)
        soft: 0.008,
      });
      motifs.push(`${barPositions.length} vertical bars`);
    }
  }

  // B. Detect bioluminescent glowing photophores OR bright rosette spots
  {
    let glowCount = 0, glowR = 0, glowG = 0, glowB = 0, glowH = 0;
    let lightSpotCount = 0, lsR = 0, lsG = 0, lsB = 0;
    let darkSpotCount = 0, dsR = 0, dsG = 0, dsB = 0;

    for (let v = Math.floor(UH * 0.14); v < Math.floor(UH * 0.86); v += 6) {
      for (let u = Math.floor(UW * 0.12); u < Math.floor(UW * 0.92); u += 6) {
        const k = (v * UW + u) * 4;
        const r = dst[k], g = dst[k + 1], b = dst[k + 2];
        const [L, ca, cb] = rgbToLab(r, g, b);
        const chr = Math.hypot(ca, cb);
        // Compare to 18px neighborhood mean
        const uN = clamp(u + 16, 0, UW - 1), vN = clamp(v + 12, 0, UH - 1);
        const kN = (vN * UW + uN) * 4;
        const [LN] = rgbToLab(dst[kN], dst[kN + 1], dst[kN + 2]);

        if (sideBand.L < 38 && L - LN > 18 && chr > 32 && (cb < -16 || ca > 20 || g > 180)) {
          glowCount++;
          glowR += r; glowG += g; glowB += b;
          glowH += v / UH;
        } else if (L - LN > 22 && L > 68) {
          lightSpotCount++;
          lsR += r; lsG += g; lsB += b;
        } else if (LN - L > 20 && L < 35) {
          darkSpotCount++;
          dsR += r; dsG += g; dsB += b;
        }
      }
    }

    if (glowCount >= 6) {
      const gHex = rgbToHex(glowR / glowCount, glowG / glowCount, glowB / glowCount);
      const meanH = clamp(glowH / glowCount, 0.28, 0.72);
      layers.push(
        { k: 'row', h: r4(meanH * 0.75), n: 22, r: 0.0045, c: gHex, s0: 0.16, s1: 0.94, glow: true, a: 0.55 },
        { k: 'row', h: r4(Math.min(0.84, meanH * 1.25)), n: 18, r: 0.004, c: gHex, s0: 0.22, s1: 0.88, glow: true, a: 0.5 },
      );
      motifs.push('bioluminescent photophores');
    } else if (lightSpotCount >= 14) {
      const sHex = rgbToHex(lsR / lightSpotCount, lsG / lightSpotCount, lsB / lightSpotCount);
      layers.push({
        k: 'spots',
        n: Math.min(140, lightSpotCount * 2),
        r: 0.0085,
        c: sHex,
        ring: darkSpotCount > 8 ? rgbToHex(dsR / darkSpotCount, dsG / darkSpotCount, dsB / darkSpotCount) : undefined,
        rw: darkSpotCount > 8 ? 0.35 : undefined,
        h0: 0.08,
        h1: 0.92,
        s0: 0.06,
        s1: 0.96,
        a: 0.28,
      });
      motifs.push(darkSpotCount > 8 ? 'ringed rosette ocelli' : 'pale spots');
    } else if (darkSpotCount >= 14) {
      const dHex = rgbToHex(dsR / darkSpotCount, dsG / darkSpotCount, dsB / darkSpotCount);
      layers.push({
        k: 'spots',
        n: Math.min(120, darkSpotCount * 2),
        r: 0.008,
        c: dHex,
        h0: 0.08,
        h1: 0.85,
        s0: 0.1,
        s1: 0.95,
        a: 0.26,
      });
      motifs.push('dark maculations');
    }
  }

  // Optical properties: silver pelagics vs iridescent abyssal vs matte reef/shark
  const isSilver = sideBand.L > 62 && sideBand.chroma < 14;
  const iri = bauplan === 'alien' ? 0.52 : isSilver ? 0.58 : sideBand.chroma > 28 ? 0.22 : 0.14;
  const metal = isSilver ? 0.48 : bauplan === 'alien' ? 0.32 : 0.08;
  const rough = bauplan === 'shark' ? 0.54 : bauplan === 'seahorse' ? 0.64 : isSilver ? 0.28 : 0.42;

  const color: ColorSpec = {
    top: topBand.hex,
    side: sideBand.hex,
    belly: bellyBand.hex,
    cs: [0.28, 0.68],
    layers: layers.length > 0 ? layers : undefined,
    iri: r4(iri),
    metal: r4(metal),
    rough: r4(rough),
    sheen: 0.25,
    photoSkin,
    photoBlend: 0.86,
  };

  return {
    color,
    motifs: motifs.length > 0 ? motifs : ['custom 2D livery'],
    dominantPalette: [topBand.hex, sideBand.hex, bellyBand.hex],
  };
}
