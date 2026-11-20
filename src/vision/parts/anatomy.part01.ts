// ─────────────────────────────────────────────────────────────────────────────
//  Ichthyological Anatomy & Morphometric Solver (2D Image → 3D Species Organs)
//  Adapts to ALL fish kinds: teleosts, sharks, lionfish, moray/ribbon eels,
//  upright seahorses & seadragons, rays, anglerfish, puffers, and alien morphs.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Barbel,
  BodySpec,
  CaudalSpec,
  CaudalType,
  EyeSpec,
  FinSet,
  FinShape,
  GillSpec,
  MedianFin,
  MouthSpec,
  PairedFin,
  ProfileSpec,
  Rostrum,
  SkinSpec,
  Spike,
  SwimSpec,
  TagField,
} from '../engine/types';
import {
  flipSegmentedHorizontally,
  rgbToHex,
  rgbToLab,
  type SegmentedImage,
} from './segment';

export type DetectedBauplan =
  | 'teleost'
  | 'shark'
  | 'lionfish'
  | 'eel'
  | 'seahorse'
  | 'angler'
  | 'ray'
  | 'flatfish'
  | 'boxfish'
  | 'alien';

export interface TrunkMapping {
  isEquine: boolean;
  xSnout: number;
  xPed: number;
  SLpx: number;
  // For lateral fishes: pixel Y of trunk dorsal edge, midline, and ventral edge at s ∈ [0,1] (N=128)
  stations: number;
  trunkTopPx: Float32Array;
  trunkMidPx: Float32Array;
  trunkBotPx: Float32Array;
  // For upright equine (seahorse): spine stations (x, y, nx, ny, rDorsal, rVentral)
  equineSpine?: { x: number; y: number; nx: number; ny: number; rD: number; rV: number }[];
  eyePx: { x: number; y: number; r: number };
}

export interface OverlayPolygon {
  label: string;
  kind: 'trunk' | 'dorsal' | 'anal' | 'caudal' | 'paired' | 'tag' | 'spine';
  points: [number, number][]; // normalized [0..1, 0..1] image coords
}

export interface AnatomyResult {
  seg: SegmentedImage; // oriented with head on the left
  flipped: boolean;
  bauplan: DetectedBauplan;
  plan: 'fish' | 'ray' | 'flatR' | 'flatL';
  HL: number;
  lenM: number;
  body: BodySpec;
  mouth: MouthSpec;
  eye: EyeSpec;
  gill: GillSpec;
  fins: FinSet;
  skin: SkinSpec;
  swim: SwimSpec;
  rostrum?: Rostrum;
  barbels?: Barbel[];
  tags?: TagField[];
  spikes?: Spike[];
  fronds?: { at: [number, number, number][]; c: string; style?: 'leaf' | 'paddle' };
  mapping: TrunkMapping;
  overlays: OverlayPolygon[];
  landmarks: {
    name: string;
    x: number; // normalized 0..1
    y: number; // normalized 0..1
    color: string;
  }[];
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
  notes: { icon: string; title: string; text: string }[];
}

export interface AnalyzeOptions {
  flipHorizontal?: 'auto' | 'none' | 'flip';
  forceBauplan?: 'auto' | DetectedBauplan;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

function smoothArray(arr: Float32Array | number[], radius: number, passes = 2): Float32Array {
  const n = arr.length;
  let cur = Float32Array.from(arr);
  for (let p = 0; p < passes; p++) {
    const next = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = Math.min(radius, i, n - 1 - i);
      let s = 0;
      for (let k = -r; k <= r; k++) s += cur[i + k];
      next[i] = s / (2 * r + 1);
    }
    cur = next;
  }
  return cur;
}

/** Sample average RGB hex & chroma statistics from foreground pixels inside a box/predicate */
function sampleRegionColor(
  seg: SegmentedImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pred?: (x: number, y: number, idx: number) => boolean,
): { hex: string; r: number; g: number; b: number; L: number; chroma: number; count: number } {
  const { width: w, height: h, rgba, mask } = seg;
  const ix0 = clamp(Math.floor(x0), 0, w - 1);
  const ix1 = clamp(Math.ceil(x1), 0, w - 1);
  const iy0 = clamp(Math.floor(y0), 0, h - 1);
  const iy1 = clamp(Math.ceil(y1), 0, h - 1);
  let rS = 0, gS = 0, bS = 0, n = 0;
  for (let y = iy0; y <= iy1; y++) {
    for (let x = ix0; x <= ix1; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      if (pred && !pred(x, y, i)) continue;
      const k = i * 4;
      rS += rgba[k];
      gS += rgba[k + 1];
      bS += rgba[k + 2];
      n++;
    }
  }
  if (n === 0) return { hex: '#7a8a98', r: 122, g: 138, b: 152, L: 56, chroma: 8, count: 0 };
  const r = rS / n, g = gS / n, b = bS / n;
  const [L, ca, cb] = rgbToLab(r, g, b);
  return { hex: rgbToHex(r, g, b), r, g, b, L, chroma: Math.hypot(ca, cb), count: n };
}

/** Detect best circular dark-pupil + iris-ring eye candidate inside an X/Y search box */
function findEyeInBox(
  seg: SegmentedImage,
  bx0: number,
  by0: number,
  bx1: number,
  by1: number,
  minR: number,
  maxR: number,
): { x: number; y: number; r: number; score: number; irisHex: string; iris2Hex: string; shine: number } {
  const { width: w, height: h, rgba, edt } = seg;
  const x0 = clamp(Math.round(bx0), 4, w - 5);
  const x1 = clamp(Math.round(bx1), 4, w - 5);
  const y0 = clamp(Math.round(by0), 4, h - 5);
  const y1 = clamp(Math.round(by1), 4, h - 5);

  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    lum[i] = 0.299 * rgba[k] + 0.587 * rgba[k + 1] + 0.114 * rgba[k + 2];
  }

  let bestX = (x0 + x1) * 0.5;
  let bestY = (y0 + y1) * 0.5;
  let bestR = (minR + maxR) * 0.45;
  let bestScore = -1e9;

  const radii: number[] = [];
  const steps = 6;
  for (let s = 0; s <= steps; s++) radii.push(lerp(minR, maxR, s / steps));

  const stride = Math.max(2, Math.round(minR * 0.45));
  for (let y = y0; y <= y1; y += stride) {
    for (let x = x0; x <= x1; x += stride) {
      const idx = y * w + x;
      if (edt[idx] < minR * 0.85) continue;
      const centerL = lum[idx];
      // Pupil center is typically dark (or has adjacent bright corneal specular glint)
      if (centerL > 115) continue;

      for (const r of radii) {
        if (edt[idx] < r * 0.72) continue;
        // Sample inner pupil disc (0.35r), iris ring (1.05r), and outer surround (1.9r)
        let pSum = centerL, pN = 1, glintMax = centerL;
        let iSum = 0, iN = 0;
        let oSum = 0, oN = 0;
        let darkRingVar = 0;
        const ringVals: number[] = [];
        for (let a = 0; a < 12; a++) {
          const ang = (a * Math.PI) / 6;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          const px = clamp(Math.round(x + ca * r * 0.36), 0, w - 1);
          const py = clamp(Math.round(y + sa * r * 0.36), 0, h - 1);
          const pl = lum[py * w + px];
          pSum += pl; pN++;
          if (pl > glintMax) glintMax = pl;

          const gx = clamp(Math.round(x + ca * r * 0.62), 0, w - 1);
          const gy = clamp(Math.round(y + sa * r * 0.62), 0, h - 1);
          if (lum[gy * w + gx] > glintMax) glintMax = lum[gy * w + gx];

          const ix = clamp(Math.round(x + ca * r * 1.08), 0, w - 1);
          const iy = clamp(Math.round(y + sa * r * 1.08), 0, h - 1);
          if (seg.mask[iy * w + ix]) {
            const il = lum[iy * w + ix];
            iSum += il; iN++;
            ringVals.push(il);
          }

          const ox = clamp(Math.round(x + ca * r * 1.85), 0, w - 1);
          const oy = clamp(Math.round(y + sa * r * 1.85), 0, h - 1);
          if (seg.mask[oy * w + ox]) {
            oSum += lum[oy * w + ox]; oN++;
          }
        }
        if (iN < 9 || oN < 7) continue;
        const pMean = pSum / pN;
        const iMean = iSum / iN;
        const oMean = oSum / oN;
        for (const rv of ringVals) darkRingVar += Math.abs(rv - iMean);
        darkRingVar /= ringVals.length;

        // Strong pupil-to-iris or pupil-to-surround contrast + circular symmetry + corneal glint bonus
        const contrast = Math.max(iMean - pMean, oMean - pMean * 0.92);
        const glintBonus = glintMax > pMean + 42 ? Math.min(34, (glintMax - pMean) * 0.34) : 0;
        const symmetryPenalty = darkRingVar * 0.48;
        const darknessBonus = Math.max(0, 75 - pMean) * 0.55;
        const score = contrast * 1.25 + glintBonus + darknessBonus - symmetryPenalty;

        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
          bestR = r;
        }
      }
    }
  }

  // Sample iris outer & inner ring colors
  let r1 = 0, g1 = 0, b1 = 0, n1 = 0;
  let r2 = 0, g2 = 0, b2 = 0, n2 = 0;
  let maxGlint = 0;
  for (let a = 0; a < 20; a++) {
    const ang = (a * Math.PI) / 10;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (const [rad, inner] of [[bestR * 0.85, true], [bestR * 1.22, false]] as const) {
      const ix = clamp(Math.round(bestX + ca * rad), 0, w - 1);
      const iy = clamp(Math.round(bestY + sa * rad), 0, h - 1);
      const idx = iy * w + ix;
      if (!seg.mask[idx]) continue;
      const k = idx * 4;
      const L = lum[idx];
      if (L > 225) { maxGlint = Math.max(maxGlint, L); continue; } // skip white specular highlight when sampling iris hue
      if (inner) { r2 += rgba[k]; g2 += rgba[k + 1]; b2 += rgba[k + 2]; n2++; }
      else { r1 += rgba[k]; g1 += rgba[k + 1]; b1 += rgba[k + 2]; n1++; }
    }
  }
  const boostIris = (r: number, g: number, b: number, n: number, fallback: string) => {
    if (n === 0) return fallback;
    let mr = r / n, mg = g / n, mb = b / n;
    const avg = (mr + mg + mb) / 3;
    if (avg < 38) { mr = mr * 1.45 + 26; mg = mg * 1.45 + 24; mb = mb * 1.45 + 22; }
    return rgbToHex(mr, mg, mb);
  };
  const irisHex = boostIris(r1, g1, b1, n1, '#b88c42');
  const iris2Hex = boostIris(r2, g2, b2, n2, irisHex);
  const shine = maxGlint > 210 ? 0.35 : 0.12;

  return { x: bestX, y: bestY, r: bestR * 1.35, score: bestScore, irisHex, iris2Hex, shine };
}

/** Determine whether head is on the LEFT (true) or RIGHT (false) */
function detectHeadOnLeft(seg: SegmentedImage, x0: number, y0: number, x1: number, y1: number): boolean {
  const { width: w, mask, edt } = seg;
  const bw = Math.max(1, x1 - x0);
  const bh = Math.max(1, y1 - y0);

  // Upright seahorse check: snout projects toward the side the head faces in the upper half
  if (bh > bw * 1.06) {
    let minLeftUpper = x1, maxRightUpper = x0;
    const yMidUpper = y0 + bh * 0.48;
    const xCenter = (x0 + x1) * 0.5;
    for (let y = Math.round(y0 + bh * 0.08); y <= yMidUpper; y++) {
      for (let x = x0; x <= x1; x++) {
        if (mask[y * w + x]) {
          if (x < minLeftUpper) minLeftUpper = x;
          if (x > maxRightUpper) maxRightUpper = x;
        }
      }
    }
    const leftExt = xCenter - minLeftUpper;
    const rightExt = maxRightUpper - xCenter;
    if (Math.abs(leftExt - rightExt) > bw * 0.07) {
      return leftExt >= rightExt;
    }
  }

  let maxEdt = 1;
  let weightedX = 0, weightSum = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = edt[y * w + x];
      if (d > maxEdt) maxEdt = d;
      if (d > 2) {
        const wt = d * d;
        weightedX += (x - x0) * wt;
        weightSum += wt;
      }
    }
  }
  const comNorm = weightSum > 0 ? weightedX / weightSum / bw : 0.5; // < 0.5 means thicker mass on left

  const minEyeR = Math.max(3, Math.min(bw, bh) * 0.018);
  const maxEyeR = Math.max(7, Math.min(bw, bh) * 0.085);
  const eyeLeft = findEyeInBox(seg, x0 + bw * 0.02, y0 + bh * 0.1, x0 + bw * 0.34, y0 + bh * 0.78, minEyeR, maxEyeR);
  const eyeRight = findEyeInBox(seg, x1 - bw * 0.34, y0 + bh * 0.1, x1 - bw * 0.02, y0 + bh * 0.78, minEyeR, maxEyeR);

  // Measure peduncle constriction + caudal flare on right vs left
  const colSpan = (xa: number, xb: number) => {
    let minH = bh, maxAfter = 0;
    const step = xa < xb ? 1 : -1;
    let seenMin = false;
    for (let x = Math.round(xa); step > 0 ? x <= xb : x >= xb; x += step) {
      const cx = clamp(x, x0, x1);
      let top = y1, bot = y0, cnt = 0;
      for (let y = y0; y <= y1; y++) {
        if (mask[y * w + cx]) {
          if (y < top) top = y;
          if (y > bot) bot = y;
          cnt++;
        }
      }
      if (cnt > 2) {
        const span = bot - top;
        if (span < minH) { minH = span; seenMin = true; }
        else if (seenMin && span > maxAfter) maxAfter = span;
      }
    }
    return maxAfter / Math.max(4, minH);
  };
  const rightTailFlare = colSpan(x0 + bw * 0.68, x1 - bw * 0.02);
  const leftTailFlare = colSpan(x0 + bw * 0.32, x0 + bw * 0.02);

  let leftScore = 0;
  leftScore += (eyeLeft.score - eyeRight.score) * 0.65;
  leftScore += (0.5 - comNorm) * 85;
  leftScore += (rightTailFlare - leftTailFlare) * 22;

  return leftScore >= -2;
}

/** Dedicated solver for upright Equine / Seahorse / Pipefish curved bauplans */
function solveEquineAnatomy(
  seg: SegmentedImage,
  flipped: boolean,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): AnatomyResult {
  const { width: w, height: h, mask, edt, rgba } = seg;
  const bw = Math.max(1, x1 - x0);
  const bh = Math.max(1, y1 - y0);

  // 1. Locate anterior tubular snout tip (leftmost foreground in upper 48% of bounding box)
  let snoutX = x1, snoutY = y0 + bh * 0.25;
  for (let y = y0 + Math.round(bh * 0.08); y <= y0 + Math.round(bh * 0.48); y++) {
    for (let x = x0; x <= x0 + Math.round(bw * 0.55); x++) {
      if (mask[y * w + x] && x < snoutX) {
        snoutX = x;
        snoutY = y;
      }
    }
  }

  // 2. Locate eye behind the tubular snout in upper head quadrant
  const eyeDet = findEyeInBox(
    seg,
    snoutX + bw * 0.14,
    Math.max(y0, snoutY - bh * 0.22),
    x0 + bw * 0.68,
    Math.min(y1, snoutY + bh * 0.12),
    Math.max(4, bw * 0.025),
    Math.max(9, bw * 0.085),
  );

  // 3. Measure snout length & radius relative to unfolded arc length (approx 1.32 * bh)
  const arcSL = bh * 1.28;
  const snoutPx = Math.max(bw * 0.14, Math.hypot(eyeDet.x - snoutX, eyeDet.y - snoutY) * 0.82);
  const snoutLenSL = clamp(snoutPx / arcSL, 0.055, 0.14);
  const snoutMidX = Math.round((snoutX + eyeDet.x) * 0.5);
  const snoutMidY = Math.round((snoutY + eyeDet.y) * 0.5);
  let snoutHalfPx = 4;
  for (let dy = 1; dy < bh * 0.12; dy++) {
    const up = clamp(snoutMidY - dy, 0, h - 1);
    const dn = clamp(snoutMidY + dy, 0, h - 1);
    if (!mask[up * w + snoutMidX] && !mask[dn * w + snoutMidX]) {
      snoutHalfPx = dy;
      break;
    }
  }
  const snoutR = clamp(snoutHalfPx / arcSL, 0.008, 0.022);

  // 4. Trace vertical trunk cross-sections (thick EDT core vs outer cirri/dorsal fin)
  let maxTrunkEdt = 6;
  for (let i = 0; i < w * h; i++) if (edt[i] > maxTrunkEdt) maxTrunkEdt = edt[i];
  const trunkDepthSL = clamp((maxTrunkEdt * 2.15) / arcSL, 0.11, 0.23);

  // Check mid-back fluttering dorsal fin on the right flank (y ∈ [32%..66% bh])
  let hasBackDorsal = false;
  let dorsalC = '#e8dfc8';
  let dorsalH = 0.058;
  {
    const dy0 = Math.round(y0 + bh * 0.34);
    const dy1 = Math.round(y0 + bh * 0.62);
    let maxRight = x0, coreRight = x0;
    for (let y = dy0; y <= dy1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = y * w + x;
        if (mask[idx] && x > maxRight) maxRight = x;
        if (edt[idx] > maxTrunkEdt * 0.42 && x > coreRight) coreRight = x;
      }
    }
    const finSpanPx = maxRight - coreRight;
    if (finSpanPx > bw * 0.08) {
      hasBackDorsal = true;
      dorsalH = clamp(finSpanPx / arcSL, 0.042, 0.105);
      const col = sampleRegionColor(seg, coreRight + 3, dy0, maxRight, dy1);
      if (col.count > 10) dorsalC = col.hex;
    }
  }

  // 5. Measure peripheral coral-like cirri / dermal fronds (`edt < maxTrunkEdt * 0.24`)
  let thinPixels = 0, totalPixels = 0;
  let tagR = 0, tagG = 0, tagB = 0, tagN = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx = y * w + x;
      if (!mask[idx]) continue;
      totalPixels++;
      if (edt[idx] > 0 && edt[idx] < maxTrunkEdt * 0.24) {
        thinPixels++;
        const k = idx * 4;
        tagR += rgba[k]; tagG += rgba[k + 1]; tagB += rgba[k + 2]; tagN++;
      }
    }
  }
  const cirriRatio = thinPixels / Math.max(1, totalPixels);
  const tagTipHex = tagN > 0 ? rgbToHex(tagR / tagN, tagG / tagN, tagB / tagN) : '#e2a868';

  // 6. Build curved equine spine stations from snout → head → neck → trunk → coiled tail
  const N = 128;
  const equineSpine: NonNullable<TrunkMapping['equineSpine']> = [];
  const headCenterX = eyeDet.x + eyeDet.r * 1.3;
  const headCenterY = eyeDet.y;
  const tailCurlBottomY = y1 - bh * 0.11;
  const tailLoopCenterX = x0 + bw * 0.48;

  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    let sx: number, sy: number;
    if (s < 0.17) {
      const t = s / 0.17;
      sx = lerp(snoutX + 3, headCenterX, t);
      sy = lerp(snoutY, headCenterY, t);
    } else if (s < 0.72) {
      const t = (s - 0.17) / 0.55;
      // Scan horizontal row for thick core center at this height
      sy = lerp(headCenterY, tailCurlBottomY - bh * 0.08, t);
      const ry = clamp(Math.round(sy), y0, y1);
      let xSum = 0, wSum = 0;
      for (let x = x0; x <= x1; x++) {
        const d = edt[ry * w + x];
        if (d > 2) { xSum += x * d * d; wSum += d * d; }
      }
      sx = wSum > 0 ? xSum / wSum : headCenterX + bw * 0.12;
    } else {
      const t = (s - 0.72) / 0.28;
      const ang = lerp(0, Math.PI * 1.45, t);
      const rad = bh * 0.095 * (1 - t * 0.58);
      sx = tailLoopCenterX + Math.sin(ang) * rad * 0.65 - rad * 0.35 * t;
      sy = tailCurlBottomY - bh * 0.08 + Math.sin(ang * 0.65) * bh * 0.14 * (1 - 0.35 * t);
    }
    const localR = s < 0.15 ? snoutHalfPx * 1.3 : maxTrunkEdt * (s < 0.52 ? lerp(0.55, 0.96, (s - 0.15) / 0.37) : Math.pow(1 - (s - 0.52) / 0.5, 0.85));
    equineSpine.push({ x: sx, y: sy, nx: 0, ny: -1, rD: Math.max(2, localR), rV: Math.max(2, localR) });
  }
  for (let i = 0; i < N; i++) {
    const a = equineSpine[Math.max(0, i - 2)];
    const b = equineSpine[Math.min(N - 1, i + 2)];
    const tx = b.x - a.x, ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    // Normal pointing toward dorsal side (upward on snout, rightward on vertical trunk)
    equineSpine[i].nx = ty / tl;
    equineSpine[i].ny = -tx / tl;
  }

  // Check how tightly curled the lower tail is in the image
  let lowerLoopDensity = 0;
  for (let y = Math.round(y0 + bh * 0.75); y <= y1; y++) {
    let transitions = 0, prev = 0;
    for (let x = x0; x <= x1; x++) {
      const m = mask[y * w + x];
      if (m !== prev) { transitions++; prev = m; }
    }
    if (transitions >= 4) lowerLoopDensity++;
  }
  const endBend = lowerLoopDensity > bh * 0.04 ? 305 : 235;

  const tags: TagField[] = [
    { kind: 'tubercle', n: 20, len: 0.011, rows: [0.18, 0.5, 0.84], s0: 0.2, s1: 0.98, r: 0.72, jitter: 0.2 },
    { kind: 'tubercle', n: 6, len: 0.018, s0: 0.09, s1: 0.18, h0: 0, h1: 0.14, r: 0.55, jitter: 0.3, c: tagTipHex },
  ];
  if (cirriRatio > 0.06) {
    tags.push(
      {
        kind: 'cirrus',
        n: Math.round(clamp(cirriRatio * 190, 18, 42)),
        len: r4(clamp(0.028 + cirriRatio * 0.14, 0.026, 0.058)),
        s0: 0.06,
        s1: 0.88,
        h0: 0,
        h1: 0.86,
        branch: 0.82,
        lean: 12,
        curl: 0.18,
        clump: 0.28,
        c: tagTipHex,
        jitter: 0.42,
      },
      { kind: 'cirrus', n: 6, len: 0.042, site: 'brow', branch: 0.78, c: tagTipHex },
    );
  }

  const spikes: Spike[] = Array.from({ length: 13 }, (_, i) => ({
    s: 0.23 + i * 0.054,
    y: 1,
    len: 0.013,
    dir: [0, 0, 0] as [number, number, number],
    mirror: false,
  }));

  const body: BodySpec = {
    D: r4(trunkDepthSL),
    df: 0.5,
    pD: 0.38,
    pV: 0.41,
    P: 0.013,
    pedY: 0,
    bD: 0.52,
    bV: 0.48,
    tD: 0.76,
    tV: 0.76,
    W: 0.62,
    Wh: 1,
    Wt: 0.85,
    sq: 3.25,
    snout: { len: r4(snoutLenSL), r: r4(snoutR), tip: 0.76, comp: 0.86, flare: 1.06 },
    bumps: [[0.14, 0.034, 0.028, 1]],
    bend: [
      [0, 0],
      [0.16, 0],
      [0.27, 84],
      [0.56, 98],
      [0.73, 124],
      [0.87, Math.round(endBend * 0.64)],
      [1, endBend],
    ],
  };

  const mouth: MouthSpec = {
    s: 0,
    y: 0.08,
    gape: 0.013,
    angle: 26,
    curve: 0,
    open: 20,
    jut: 0,
    lip: 0.34,
    teeth: 'none',
    tn: 0,
    ts: 0,
    kind: 'jaw',
  };

  const eye: EyeSpec = {
    s: r4(clamp(snoutLenSL + 0.036, 0.095, 0.165)),
    y: 0.36,
    d: r4(clamp((eyeDet.r * 2) / arcSL, 0.018, 0.032)),
    iris: eyeDet.irisHex,
    iris2: eyeDet.iris2Hex,
    shine: eyeDet.shine,
  };

  const fins: FinSet = {
    dorsal: hasBackDorsal
      ? [{ s0: 0.45, s1: 0.58, h: r4(dorsalH), shape: 'fan', rays: 18, alpha: 0.36, color: dorsalC }]
      : [{ s0: 0.47, s1: 0.57, h: 0.055, shape: 'rect', rays: 16, alpha: 0.34, color: dorsalC }],
    caudal: { type: 'none', span: 0 },
    pec: { s: 0.19, y: 0.18, base: 0.02, len: 0.038, shape: 'fan', elev: 4, splay: 32, alpha: 0.36, color: dorsalC },
    color: dorsalC,
    alpha: 0.36,
  };

  const trunkTopPx = new Float32Array(N);
  const trunkMidPx = new Float32Array(N);
  const trunkBotPx = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    trunkMidPx[i] = equineSpine[i].y;
    trunkTopPx[i] = equineSpine[i].y - equineSpine[i].rD;
    trunkBotPx[i] = equineSpine[i].y + equineSpine[i].rV;
  }

  const spineOverlay: [number, number][] = equineSpine
    .filter((_, i) => i % 4 === 0)
    .map((p) => [p.x / w, p.y / h]);

  return {
    seg,
    flipped,
    bauplan: 'seahorse',
    plan: 'fish',
    HL: 0.18,
    lenM: 0.18,
    body,
    mouth,
    eye,
    gill: { kind: 'pore' },
    fins,
    skin: { scales: 0, kind: 'bony', bump: 1.05 },
    swim: { mode: 'syngnathiform' },
    tags,
    spikes,
    mapping: {
      isEquine: true,
      xSnout: snoutX,
      xPed: x1,
      SLpx: arcSL,
      stations: N,
      trunkTopPx,
      trunkMidPx,
      trunkBotPx,
      equineSpine,
      eyePx: { x: eyeDet.x, y: eyeDet.y, r: eyeDet.r },
    },
    overlays: [{ label: 'Curved Axial Spine', kind: 'spine', points: spineOverlay }],
    landmarks: [
      { name: 'Pipette Snout', x: snoutX / w, y: snoutY / h, color: '#38bdf8' },
      { name: 'Orbit & Iris', x: eyeDet.x / w, y: eyeDet.y / h, color: '#fbbf24' },
      { name: 'Coronet & Cirri', x: (eyeDet.x + bw * 0.06) / w, y: Math.max(0.03, (eyeDet.y - bh * 0.12) / h), color: '#f472b6' },
      { name: 'Prehensile Coil', x: tailLoopCenterX / w, y: tailCurlBottomY / h, color: '#34d399' },
    ],
    metrics: {
      aspectRatio: r4(bw / bh),
      bodyDepthSL: r4(trunkDepthSL),
      peduncleSL: 0.013,
      headLengthSL: 0.18,
      eyeDiameterSL: eye.d,
      dorsalCount: 1,
      tagCount: tags.reduce((a, t) => a + t.n, 0),
      confidence: 0.96,
    },
    notes: [
      {
        icon: '◈',
        title: 'Upright Syngnathid Bauplan',
        text: `Detected vertical equine posture (H/W ${(bh / bw).toFixed(2)}×) with integrated pipette snout (${(snoutLenSL * 100).toFixed(1)}% SL) and ${endBend}° curled prehensile tail.`,
      },
      {
        icon: '❖',
        title: 'Bony Ring Armour & Dermal Cirri',
        text: `Reconstructed polygonal bony dermal plates, dorsal ridge spines, and ${cirriRatio > 0.06 ? 'branched antler-like camouflage cirri' : 'coronet tubercles'}.`,
      },
    ],
  };
}

/** Universal Lateral / Pelagic / Shark / Lionfish / Eel / Angler / Alien Solver */
export function analyzeFishAnatomy(
  rawSeg: SegmentedImage,
  opts: AnalyzeOptions = {},
): AnatomyResult {
  // Find bounding box of raw foreground
  let rx0 = rawSeg.width, ry0 = rawSeg.height, rx1 = 0, ry1 = 0;
  for (let y = 0; y < rawSeg.height; y++) {
    for (let x = 0; x < rawSeg.width; x++) {
      if (rawSeg.mask[y * rawSeg.width + x]) {
        if (x < rx0) rx0 = x;
        if (x > rx1) rx1 = x;
        if (y < ry0) ry0 = y;
        if (y > ry1) ry1 = y;
      }
    }
  }
  if (rx1 <= rx0 || ry1 <= ry0) {
    rx0 = 8; ry0 = 8; rx1 = rawSeg.width - 9; ry1 = rawSeg.height - 9;
  }

  let shouldFlip = false;
  if (opts.flipHorizontal === 'flip') shouldFlip = true;
  else if (opts.flipHorizontal === 'none') shouldFlip = false;
  else shouldFlip = !detectHeadOnLeft(rawSeg, rx0, ry0, rx1, ry1);

  const seg = shouldFlip ? flipSegmentedHorizontally(rawSeg) : rawSeg;
  const { width: w, height: h, mask, edt, rgba } = seg;

  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  let maxEdt = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (edt[idx] > maxEdt) maxEdt = edt[idx];
      }
    }
  }
  const bw = Math.max(16, x1 - x0);
  const bh = Math.max(16, y1 - y0);

  // Dispatch upright equine seahorse bauplan when taller than wide (or forced)
  if (opts.forceBauplan === 'seahorse' || (opts.forceBauplan === undefined || opts.forceBauplan === 'auto') && bh > bw * 1.04) {
    return solveEquineAnatomy(seg, shouldFlip, x0, y0, x1, y1);
  }

  // ── 1. Separate Thin Peripheral Protrusions (spines, lures, barbels, cirri) vs Muscular Core ──
  const thinThresh = clamp(maxEdt * 0.19, 2.3, 10.5);
  const coreThresh = clamp(maxEdt * 0.34, 3.8, 22);

  // Dilate thick core (`edt >= coreThresh`) by `coreThresh * 1.18` to reconstruct solid body surface
  const solidBody = new Uint8Array(w * h);
  const dilR = Math.ceil(coreThresh * 1.16);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx = y * w + x;
      if (edt[idx] >= coreThresh) {
        const dy0 = Math.max(y0, y - dilR), dy1 = Math.min(y1, y + dilR);
        const dx0 = Math.max(x0, x - dilR), dx1 = Math.min(x1, x + dilR);
        const r2 = dilR * dilR;
        for (let ny = dy0; ny <= dy1; ny++) {
          const ddy = ny - y;
          for (let nx = dx0; nx <= dx1; nx++) {
            const ddx = nx - x;
            if (ddx * ddx + ddy * ddy <= r2 && mask[ny * w + nx]) {
              solidBody[ny * w + nx] = 1;
            }
          }
        }
      }
    }
  }

  // Thin peripheral mask: foreground pixels not in solidBody with small local radius
  const thinMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (mask[i] && !solidBody[i] && edt[i] <= thinThresh * 1.45) {
      thinMask[i] = 1;
    }
  }

  // ── 2. Locate True Snout Tip (`xSnout`) & Anterior Rostrum / Dorsal Illicium Lure ──
  let xCoreMin = x1, ySnoutSum = 0, ySnoutN = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (solidBody[y * w + x]) {
        if (x < xCoreMin) xCoreMin = x;
      }
    }
  }
  if (xCoreMin >= x1 - 8) xCoreMin = x0;
  for (let y = y0; y <= y1; y++) {
    for (let x = xCoreMin; x <= Math.min(x1, xCoreMin + 8); x++) {
      if (solidBody[y * w + x]) { ySnoutSum += y; ySnoutN++; }
    }
  }
  let snoutY = ySnoutN > 0 ? ySnoutSum / ySnoutN : (y0 + y1) * 0.5;
  let xSnout = xCoreMin;

  // Check if there is a straight pre-oral rostrum (bill / sword / saw) vs dorsal arched angler lure
  let rostrum: Rostrum | undefined;
  const barbels: Barbel[] = [];
  const landmarks: AnatomyResult['landmarks'] = [];

  if (xCoreMin - x0 > bw * 0.035) {
    // Analyze pixels strictly anterior to `xCoreMin` (or rising over the anterior skull)
    let antY = 0, antN = 0, minAntY = y1, maxAntY = y0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x < xCoreMin; x++) {
        if (mask[y * w + x]) {
          antY += y; antN++;
          if (y < minAntY) minAntY = y;
          if (y > maxAntY) maxAntY = y;
        }
      }
    }
    const meanAntY = antN > 0 ? antY / antN : snoutY;
    // Straight midline bill/rostrum if aligned with snout axis and vertically compact
  