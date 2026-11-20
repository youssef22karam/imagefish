// ─────────────────────────────────────────────────────────────────────────────
//  2D Ichthyological Image Segmentation & Euclidean Distance Transform
//  Handles transparent PNGs, studio plates (#E4EBF0 / white / black / grey),
//  and natural underwater depth gradients via perceptual CIELAB modeling.
// ─────────────────────────────────────────────────────────────────────────────

export interface SegmentedImage {
  width: number;
  height: number;
  rgba: Uint8ClampedArray; // edge-decontaminated foreground RGBA
  rawRgba: Uint8ClampedArray; // original resized RGBA
  mask: Uint8Array; // 1 = fish foreground, 0 = background
  edt: Float32Array; // exact Euclidean distance (px) to nearest background pixel
  bgLab: [number, number, number];
  bgHex: string;
  previewDataUrl: string; // compact preview of uploaded 2D source
  foregroundRatio: number;
  usedAlpha: boolean;
}

export interface SegmentOptions {
  maxDim?: number;
  sensitivity?: number; // -0.35 .. +0.35 user threshold tweak (0 = auto)
  flipHorizontal?: 'auto' | 'none' | 'flip';
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function labDist(a: [number, number, number], b: [number, number, number]): number {
  const dL = (a[0] - b[0]) * 0.88;
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Exact 2D Euclidean Distance Transform (Meijster / Felzenszwalb O(W*H)) */
export function computeEDT(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const f = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) f[i] = mask[i] ? INF : 0;

  // 1D pass along columns
  const g = new Float32Array(w * h);
  const v = new Int32Array(Math.max(w, h) + 1);
  const z = new Float32Array(Math.max(w, h) + 2);

  const edt1D = (src: Float32Array, dst: Float32Array, n: number, stride: number, offset: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      const fq = src[offset + q * stride];
      let s = ((fq + q * q) - (src[offset + v[k] * stride] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        if (k < 0) {
          k = 0;
          s = -INF;
          break;
        }
        s = ((fq + q * q) - (src[offset + v[k] * stride] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      const dx = q - v[k];
      dst[offset + q * stride] = dx * dx + src[offset + v[k] * stride];
    }
  };

  for (let x = 0; x < w; x++) edt1D(f, g, h, w, x);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) edt1D(g, out, w, 1, y * w);
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(Math.max(0, out[i]));
  return out;
}

export async function loadImageElement(source: string | File | Blob): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to decode uploaded image'));
      img.src = url;
    });
  } finally {
    if (typeof source !== 'string') {
      // revoke after decode on next microtask
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

export function flipSegmentedHorizontally(seg: SegmentedImage): SegmentedImage {
  const { width: w, height: h } = seg;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const rawRgba = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8Array(w * h);
  const edt = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = y * w + (w - 1 - x);
      const dstIdx = y * w + x;
      mask[dstIdx] = seg.mask[srcIdx];
      edt[dstIdx] = seg.edt[srcIdx];
      const s4 = srcIdx * 4, d4 = dstIdx * 4;
      rgba[d4] = seg.rgba[s4];
      rgba[d4 + 1] = seg.rgba[s4 + 1];
      rgba[d4 + 2] = seg.rgba[s4 + 2];
      rgba[d4 + 3] = seg.rgba[s4 + 3];
      rawRgba[d4] = seg.rawRgba[s4];
      rawRgba[d4 + 1] = seg.rawRgba[s4 + 1];
      rawRgba[d4 + 2] = seg.rawRgba[s4 + 2];
      rawRgba[d4 + 3] = seg.rawRgba[s4 + 3];
    }
  }
  return { ...seg, rgba, rawRgba, mask, edt };
}

export async function segmentFishImage(
  source: string | File | Blob,
  opts: SegmentOptions = {},
): Promise<SegmentedImage> {
  const img = await loadImageElement(source);
  const maxDim = opts.maxDim ?? 720;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.max(64, Math.round((img.naturalWidth || img.width) * scale));
  const h = Math.max(64, Math.round((img.naturalHeight || img.height) * scale));

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const rawData = ctx.getImageData(0, 0, w, h).data;
  const rawRgba = new Uint8ClampedArray(rawData);

  // Build compact preview data URL (max 420px) for Field Guide & PostgreSQL persistence
  const prevScale = Math.min(1, 420 / Math.max(w, h));
  const pw = Math.max(48, Math.round(w * prevScale));
  const ph = Math.max(48, Math.round(h * prevScale));
  const pcv = document.createElement('canvas');
  pcv.width = pw;
  pcv.height = ph;
  const pctx = pcv.getContext('2d')!;
  pctx.drawImage(cv, 0, 0, pw, ph);
  const previewDataUrl = pcv.toDataURL('image/webp', 0.82);

  // Check if image has genuine alpha transparency
  let transparentBorder = 0;
  let borderTotal = 0;
  const margin = Math.max(2, Math.round(Math.min(w, h) * 0.025));
  const borderSamples: [number, number, number][] = [];
  const borderRgb: [number, number, number][] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < margin || x >= w - margin || y < margin || y >= h - margin) {
        borderTotal++;
        const k = (y * w + x) * 4;
        if (rawRgba[k + 3] < 210) transparentBorder++;
        if ((x + y) % 3 === 0 && rawRgba[k + 3] >= 200) {
          borderSamples.push(rgbToLab(rawRgba[k], rawRgba[k + 1], rawRgba[k + 2]));
          borderRgb.push([rawRgba[k], rawRgba[k + 1], rawRgba[k + 2]]);
        }
      }
    }
  }

  const mask = new Uint8Array(w * h);
  let bgLab: [number, number, number] = [92, -1, -3];
  let bgHex = '#e4ebf0';
  const usedAlpha = transparentBorder > borderTotal * 0.22;

  if (usedAlpha) {
    const alphaThresh = Math.round(96 - (opts.sensitivity ?? 0) * 140);
    for (let i = 0; i < w * h; i++) {
      mask[i] = rawRgba[i * 4 + 3] >= alphaThresh ? 1 : 0;
    }
  } else {
    // 1. Precompute full LAB buffer
    const Lbuf = new Float32Array(w * h);
    const abuf = new Float32Array(w * h);
    const bbuf = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const k = i * 4;
      const [L, a, b] = rgbToLab(rawRgba[k], rawRgba[k + 1], rawRgba[k + 2]);
      Lbuf[i] = L;
      abuf[i] = a;
      bbuf[i] = b;
    }

    // 2. K-means (K = 4) on perimeter samples to model studio or multi-tone water background
    const K = Math.min(4, Math.max(1, borderSamples.length));
    const centers: [number, number, number][] = [];
    for (let c = 0; c < K; c++) {
      const s = borderSamples[Math.floor((c * borderSamples.length) / K)] ?? [92, 0, 0];
      centers.push([s[0], s[1], s[2]]);
    }
    const counts = new Int32Array(K);
    for (let iter = 0; iter < 8; iter++) {
      const sumL = new Float64Array(K);
      const suma = new Float64Array(K);
      const sumb = new Float64Array(K);
      counts.fill(0);
      for (const s of borderSamples) {
        let best = 0, bestD = 1e9;
        for (let c = 0; c < K; c++) {
          const d = labDist(s, centers[c]);
          if (d < bestD) { bestD = d; best = c; }
        }
        sumL[best] += s[0];
        suma[best] += s[1];
        sumb[best] += s[2];
        counts[best]++;
      }
      for (let c = 0; c < K; c++) {
        if (counts[c] > 0) {
          centers[c] = [sumL[c] / counts[c], suma[c] / counts[c], sumb[c] / counts[c]];
        }
      }
    }
    let domCluster = 0;
    for (let c = 1; c < K; c++) if (counts[c] > counts[domCluster]) domCluster = c;
    bgLab = centers[domCluster];
    if (borderRgb.length > 0) {
      let rSum = 0, gSum = 0, bSum = 0;
      for (const rgb of borderRgb) { rSum += rgb[0]; gSum += rgb[1]; bSum += rgb[2]; }
      bgHex = rgbToHex(rSum / borderRgb.length, gSum / borderRgb.length, bSum / borderRgb.length);
    }

    // 3. Row-wise background LAB estimate (handles vertical underwater light gradients)
    const rowBg: [number, number, number][] = new Array(h);
    for (let y = 0; y < h; y++) {
      let lS = 0, aS = 0, bS = 0, n = 0;
      for (let dx = 0; dx < margin; dx++) {
        for (const x of [dx, w - 1 - dx]) {
          const i = y * w + x;
          lS += Lbuf[i]; aS += abuf[i]; bS += bbuf[i]; n++;
        }
      }
      rowBg[y] = n > 0 ? [lS / n, aS / n, bS / n] : bgLab;
    }

    // Measure background noise floor on perimeter
    const borderDists: number[] = [];
    for (let y = 0; y < h; y += 2) {
      for (const x of [1, w - 2]) {
        const i = y * w + x;
        const px: [number, number, number] = [Lbuf[i], abuf[i], bbuf[i]];
        let minC = labDist(px, rowBg[y]);
        for (let c = 0; c < K; c++) {
          if (counts[c] > borderSamples.length * 0.08) {
            minC = Math.min(minC, labDist(px, centers[c]));
          }
        }
        borderDists.push(minC);
      }
    }
    borderDists.sort((a, b) => a - b);
    const p90 = borderDists[Math.floor(borderDists.length * 0.9)] ?? 2.5;

    // 4. Sobel gradient magnitude (helps preserve translucent white fins & pale bellies against light studio bg)
    const grad = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = Lbuf[i + 1] - Lbuf[i - 1] + 0.6 * (abuf[i + 1] - abuf[i - 1]) + 0.6 * (bbuf[i + 1] - bbuf[i - 1]);
        const gy = Lbuf[i + w] - Lbuf[i - w] + 0.6 * (abuf[i + w] - abuf[i - w]) + 0.6 * (bbuf[i + w] - bbuf[i - w]);
        grad[i] = Math.hypot(gx, gy);
      }
    }

    // 5. Combined color-difference + edge energy map
    const diff = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const rLab = rowBg[y];
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const px: [number, number, number] = [Lbuf[i], abuf[i], bbuf[i]];
        let dMin = labDist(px, rLab);
        for (let c = 0; c < K; c++) {
          if (counts[c] > borderSamples.length * 0.08) {
            dMin = Math.min(dMin, labDist(px, centers[c]));
          }
        }
        diff[i] = dMin + grad[i] * 0.36;
      }
    }

    const baseThresh = Math.max(4.8, Math.min(18.5, p90 * 2.35 + 3.4));
    const floodThresh = Math.max(2.6, baseThresh * (1 - (opts.sensitivity ?? 0) * 0.75));
    const holeThresh = Math.max(2.4, floodThresh * 0.76);

    // 6. Exterior flood-fill from image perimeter
    const bgVisited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let qHead = 0, qTail = 0;
    const pushBg = (idx: number) => {
      if (!bgVisited[idx]) {
        bgVisited[idx] = 1;
        queue[qTail++] = idx;
      }
    };

    for (let x = 0; x < w; x++) {
      if (diff[x] < floodThresh * 1.35) pushBg(x);
      const bot = (h - 1) * w + x;
      if (diff[bot] < floodThresh * 1.35) pushBg(bot);
    }
    for (let y = 0; y < h; y++) {
      const lf = y * w;
      if (diff[lf] < floodThresh * 1.35) pushBg(lf);
      const rt = y * w + (w - 1);
      if (diff[rt] < floodThresh * 1.35) pushBg(rt);
    }

    while (qHead < qTail) {
      const cur = queue[qHead++];
      const cx = cur % w, cy = (cur - cx) / w;
      if (cx > 0 && !bgVisited[cur - 1] && diff[cur - 1] < floodThresh) pushBg(cur - 1);
      if (cx < w - 1 && !bgVisited[cur + 1] && diff[cur + 1] < floodThresh) pushBg(cur + 1);
      if (cy > 0 && !bgVisited[cur - w] && diff[cur - w] < floodThresh) pushBg(cur - w);
      if (cy < h - 1 && !bgVisited[cur + w] && diff[cur + w] < floodThresh) pushBg(cur + w);
    }

    // 7. Also punch out enclosed true-background pockets (between open jaws, coiled tails, fin rays)
    for (let i = 0; i < w * h; i++) {
      if (!bgVisited[i] && diff[i] < holeThresh && grad[i] < 4.2) {
        const px: [number, number, number] = [Lbuf[i], abuf[i], bbuf[i]];
        if (labDist(px, bgLab) < holeThresh * 0.85) {
          bgVisited[i] = 1;
        }
      }
      mask[i] = bgVisited[i] ? 0 : 1;
    }
  }

  // 8. Connected-component cleanup: keep dominant fish body + nearby delicate spine/lure tips
  const labels = new Int32Array(w * h);
  const compSizes: number[] = [0];
  const compBoxes: [number, number, number, number][] = [[0, 0, 0, 0]];
  const bfs = new Int32Array(w * h);
  let nextLabel = 0;

  for (let i = 0; i < w * h; i++) {
    if (mask[i] && !labels[i]) {
      nextLabel++;
      let head = 0, tail = 0;
      bfs[tail++] = i;
      labels[i] = nextLabel;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      while (head < tail) {
        const cur = bfs[head++];
        const cx = cur % w, cy = (cur - cx) / w;
        if (cx < x0) x0 = cx;
        if (cx > x1) x1 = cx;
        if (cy < y0) y0 = cy;
        if (cy > y1) y1 = cy;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            if (nx < 0 || nx >= w) continue;
            const ni = ny * w + nx;
            if (mask[ni] && !labels[ni]) {
              labels[ni] = nextLabel;
              bfs[tail++] = ni;
            }
          }
        }
      }
      compSizes.push(tail);
      compBoxes.push([x0, y0, x1, y1]);
    }
  }

  if (nextLabel > 0) {
    let mainComp = 1;
    for (let c = 2; c <= nextLabel; c++) {
      if (compSizes[c] > compSizes[mainComp]) mainComp = c;
    }
    const [mx0, my0, mx1, my1] = compBoxes[mainComp];
    const pad = Math.round(Math.max(mx1 - mx0, my1 - my0) * 0.055) + 4;
    const keep = new Uint8Array(nextLabel + 1);
    keep[mainComp] = 1;
    for (let c = 1; c <= nextLabel; c++) {
      if (c === mainComp || compSizes[c] < 8) continue;
      const [x0, y0, x1, y1] = compBoxes[c];
      const nearMain = x1 >= mx0 - pad && x0 <= mx1 + pad && y1 >= my0 - pad && y0 <= my1 + pad;
      if (nearMain) keep[c] = 1;
    }
    for (let i = 0; i < w * h; i++) {
      mask[i] = keep[labels[i]] ? 1 : 0;
    }
  }

  // 9. Compute exact Euclidean Distance Transform inside fish silhouette
  const edt = computeEDT(mask, w, h);

  // 10. Edge color decontamination: pull interior pigment outward by 1-2px onto silhouette rim
  const rgba = new Uint8ClampedArray(rawRgba);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i]) {
        rgba[i * 4 + 3] = 0;
        continue;
      }
      if (edt[i] <= 2.1) {
        let best = i, bestD = edt[i];
        for (let dy = -2; dy <= 2; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const ni = ny * w + nx;
            if (edt[ni] > bestD) {
              bestD = edt[ni];
              best = ni;
            }
          }
        }
        if (best !== i) {
          rgba[i * 4] = rawRgba[best * 4];
          rgba[i * 4 + 1] = rawRgba[best * 4 + 1];
          rgba[i * 4 + 2] = rawRgba[best * 4 + 2];
        }
      }
      rgba[i * 4 + 3] = 255;
    }
  }

  let fgCount = 0;
  for (let i = 0; i < w * h; i++) if (mask[i]) fgCount++;

  return {
    width: w,
    height: h,
    rgba,
    rawRgba,
    mask,
    edt,
    bgLab,
    bgHex,
    previewDataUrl,
    foregroundRatio: fgCount / Math.max(1, w * h),
    usedAlpha,
  };
}
