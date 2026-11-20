  if (antN > 15 && Math.abs(meanAntY - snoutY) < bh * 0.11 && (maxAntY - minAntY) < bh * 0.14) {
      const roLen = clamp((xCoreMin - x0) / (bw * 0.84), 0.08, 0.36);
      const roCol = sampleRegionColor(seg, x0, minAntY, xCoreMin, maxAntY);
      rostrum = {
        kind: roLen > 0.22 ? 'sword' : 'bill',
        len: r4(roLen),
        r: r4(clamp((maxAntY - minAntY) / (2 * bw * 0.84), 0.008, 0.024)),
        color: roCol.hex,
      };
    }
  }

  // ── 3. Locate Exact Caudal Peduncle (`xPed`) ──────────────────────────────
  // Scan columns from 68% to 96% of [xSnout..x1] using non-thin silhouette height
  const colSpan = new Float32Array(w);
  const colTopAll = new Int32Array(w).fill(h);
  const colBotAll = new Int32Array(w).fill(0);
  const colTopBody = new Int32Array(w).fill(h);
  const colBotBody = new Int32Array(w).fill(0);

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const idx = y * w + x;
      if (mask[idx]) {
        if (y < colTopAll[x]) colTopAll[x] = y;
        if (y > colBotAll[x]) colBotAll[x] = y;
        if (!thinMask[idx]) {
          if (y < colTopBody[x]) colTopBody[x] = y;
          if (y > colBotBody[x]) colBotBody[x] = y;
        }
      }
    }
    if (colBotBody[x] < colTopBody[x] && colBotAll[x] >= colTopAll[x]) {
      colTopBody[x] = colTopAll[x];
      colBotBody[x] = colBotAll[x];
    }
    colSpan[x] = colBotBody[x] >= colTopBody[x] ? colBotBody[x] - colTopBody[x] + 1 : 0;
  }

  const totalSpanX = Math.max(20, x1 - xSnout);
  const pedSearch0 = Math.round(xSnout + totalSpanX * 0.68);
  const pedSearch1 = Math.round(xSnout + totalSpanX * 0.94);
  let xPed = Math.round(xSnout + totalSpanX * 0.84);
  let minPedSpan = 1e9;
  for (let x = pedSearch0; x <= pedSearch1; x++) {
    const sVal = colSpan[x];
    if (sVal > 2 && sVal < minPedSpan) {
      minPedSpan = sVal;
      xPed = x;
    }
  }
  let maxAfterPed = 0;
  for (let x = xPed + 2; x <= x1; x++) {
    const spAll = colBotAll[x] >= colTopAll[x] ? colBotAll[x] - colTopAll[x] + 1 : 0;
    if (spAll > maxAfterPed) maxAfterPed = spAll;
  }

  const hasDistinctCaudal = maxAfterPed > minPedSpan * 1.22 && (x1 - xPed) > totalSpanX * 0.045;
  if (!hasDistinctCaudal) {
    // Continuous tapering tail (moray eel, oarfish, whip-tail ray)
    xPed = Math.round(xSnout + totalSpanX * 0.965);
    minPedSpan = Math.max(3, colSpan[Math.min(x1 - 2, xPed)]);
  }
  const SLpx = Math.max(24, xPed - xSnout);

  // Refine snoutY at xSnout
  if (colBotAll[xSnout + 2] >= colTopAll[xSnout + 2]) {
    snoutY = 0.5 * (colTopAll[xSnout + 2] + colBotAll[xSnout + 2]);
  }

  // ── 4. Muscular Trunk vs Dorsal / Anal / Paired Fin Envelope Separation ───
  const M = 128;
  const rawOuterTop = new Float32Array(M);
  const rawOuterBot = new Float32Array(M);
  const rawCoreTop = new Float32Array(M);
  const rawCoreBot = new Float32Array(M);

  for (let i = 0; i < M; i++) {
    const s = i / (M - 1);
    const xf = xSnout + s * SLpx;
    const xi = clamp(Math.round(xf), x0, x1);
    const oT = colTopAll[xi] < h ? colTopAll[xi] : snoutY;
    const oB = colBotAll[xi] > 0 ? colBotAll[xi] : snoutY;
    rawOuterTop[i] = oT;
    rawOuterBot[i] = oB;

    // Thick core top/bot at column xi
    let cT = h, cB = 0;
    for (let y = y0; y <= y1; y++) {
      if (solidBody[y * w + xi]) {
        if (y < cT) cT = y;
        if (y > cB) cB = y;
      }
    }
    if (cB >= cT) {
      rawCoreTop[i] = cT;
      rawCoreBot[i] = cB;
    } else {
      rawCoreTop[i] = lerp(oT, oB, 0.25);
      rawCoreBot[i] = lerp(oT, oB, 0.75);
    }
  }

  // Rolling lower-curvature hull on rawCoreTop (remember smaller Y = higher up on screen!)
  // A fin sticks UP (smaller Y than smooth muscular trunk) or DOWN (larger Y than smooth muscular trunk).
  // Rolling max-of-min (morphological opening along 1D profile) strips narrow triangular/sail fins cleanly!
  const profileOpen1D = (prof: Float32Array, isTop: boolean, winRadius: number) => {
    // For top (smaller Y = outward fin): erode outward peaks by sliding max-filter then min-filter
    const a = new Float32Array(M);
    const b = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      const r = Math.min(winRadius, i, M - 1 - i);
      let v = prof[i];
      for (let k = -r; k <= r; k++) {
        v = isTop ? Math.max(v, prof[i + k]) : Math.min(v, prof[i + k]);
      }
      a[i] = v;
    }
    for (let i = 0; i < M; i++) {
      const r = Math.min(winRadius, i, M - 1 - i);
      let v = a[i];
      for (let k = -r; k <= r; k++) {
        v = isTop ? Math.min(v, a[i + k]) : Math.max(v, a[i + k]);
      }
      b[i] = v;
    }
    return smoothArray(b, 4, 2);
  };

  const slenderness = (maxEdt * 2) / SLpx;
  const isSlenderEel = slenderness < 0.185 && !hasDistinctCaudal;

  let trunkTopPx: Float32Array;
  let trunkBotPx: Float32Array;

  if (isSlenderEel) {
    // Eels have a narrow uniform ribbon fin hugging the undulating muscular cylinder:
    // keep the muscular cylinder ~82% of total ribbon thickness so continuous dorsal/anal ribbons sit cleanly on top
    trunkTopPx = new Float32Array(M);
    trunkBotPx = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      const s = i / (M - 1);
      const oT = rawOuterTop[i], oB = rawOuterBot[i];
      const span = Math.max(2, oB - oT);
      const ribbonFrac = s > 0.12 ? 0.14 : 0.03;
      trunkTopPx[i] = oT + span * ribbonFrac;
      trunkBotPx[i] = oB - span * (s > 0.36 ? ribbonFrac * 0.9 : 0.02);
    }
    trunkTopPx = smoothArray(trunkTopPx, 3, 2);
    trunkBotPx = smoothArray(trunkBotPx, 3, 2);
  } else {
    const winR = Math.round(M * 0.14); // ~14% SL window strips triangular shark/teleost/sail fins while keeping broad body curvature
    const hullTop = profileOpen1D(rawCoreTop, true, winR);
    const hullBot = profileOpen1D(rawCoreBot, false, winR);
    trunkTopPx = new Float32Array(M);
    trunkBotPx = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      // Trunk cannot extend outside rawCoreTop/rawCoreBot
      trunkTopPx[i] = Math.max(rawCoreTop[i], hullTop[i]);
      trunkBotPx[i] = Math.min(rawCoreBot[i], hullBot[i]);
      if (trunkBotPx[i] < trunkTopPx[i] + 2) {
        const mid = 0.5 * (rawOuterTop[i] + rawOuterBot[i]);
        trunkTopPx[i] = mid - 1.5;
        trunkBotPx[i] = mid + 1.5;
      }
    }
    // Pin snout tip and caudal peduncle exactly
    trunkTopPx[0] = snoutY - 1;
    trunkBotPx[0] = snoutY + 1;
    trunkTopPx[M - 1] = colTopBody[xPed] < h ? colTopBody[xPed] : trunkTopPx[M - 2];
    trunkBotPx[M - 1] = colBotBody[xPed] > 0 ? colBotBody[xPed] : trunkBotPx[M - 2];
    trunkTopPx = smoothArray(trunkTopPx, 3, 2);
    trunkBotPx = smoothArray(trunkBotPx, 3, 2);
  }

  const trunkMidPx = new Float32Array(M);
  for (let i = 0; i < M; i++) trunkMidPx[i] = 0.5 * (trunkTopPx[i] + trunkBotPx[i]);

  // Check if jaw is wide open at anterior snout (`s < 0.15`) with background gap & white fangs
  let detectedOpenJaw = false;
  let jawCleftGapeSL = 0.065;
  let jawTeethScore = 0;
  {
    const jEnd = Math.round(xSnout + SLpx * 0.16);
    let cleftCols = 0, maxCleftX = xSnout;
    let brightToothPixels = 0, gapNeighborPixels = 0;
    for (let x = xSnout + 2; x <= jEnd; x++) {
      const tY = colTopAll[x], bY = colBotAll[x];
      if (bY - tY < 6) continue;
      let hasGap = false;
      for (let y = tY + 3; y <= bY - 3; y++) {
        const idx = y * w + x;
        if (!mask[idx]) {
          hasGap = true;
        } else if (edt[idx] <= 3.2) {
          const k = idx * 4;
          const L = 0.299 * rgba[k] + 0.587 * rgba[k + 1] + 0.114 * rgba[k + 2];
          gapNeighborPixels++;
          if (L > 168) brightToothPixels++;
        }
      }
      if (hasGap) {
        cleftCols++;
        if (x > maxCleftX) maxCleftX = x;
      }
    }
    if (cleftCols >= Math.max(4, SLpx * 0.025)) {
      detectedOpenJaw = true;
      jawCleftGapeSL = clamp((maxCleftX - xSnout) / SLpx, 0.055, 0.165);
      jawTeethScore = brightToothPixels / Math.max(1, gapNeighborPixels);
    }
  }

  // ── 5. Construct 64-Station Measured ProfileSpec (`body.prof`) ────────────
  // If slender undulating eel, measure d(s), v(s) relative to local midline `trunkMidPx`
  // Otherwise measure relative to straight snout→peduncle axis so dorsal humps & deep bellies stay 100% authentic!
  const pedCenterY = trunkMidPx[M - 1];
  let midWaveStd = 0;
  for (let i = 0; i < M; i++) {
    const linY = lerp(snoutY, pedCenterY, i / (M - 1));
    const dy = trunkMidPx[i] - linY;
    midWaveStd += dy * dy;
  }
  midWaveStd = Math.sqrt(midWaveStd / M) / SLpx;
  const straightenWave = isSlenderEel || (slenderness < 0.21 && midWaveStd > 0.024);

  const profD: number[] = [];
  const profV: number[] = [];
  let maxDepthSL = 0.06, maxTopSL = 0.03, maxBotSL = 0.03, pD = 0.36, pV = 0.4;

  const P_N = 64;
  for (let k = 1; k <= P_N; k++) {
    const s = k / P_N;
    const idxF = s * (M - 1);
    const i0 = Math.min(M - 2, Math.floor(idxF)), u = idxF - i0;
    const tPx = lerp(trunkTopPx[i0], trunkTopPx[i0 + 1], u);
    const bPx = lerp(trunkBotPx[i0], trunkBotPx[i0 + 1], u);
    const mPx = lerp(trunkMidPx[i0], trunkMidPx[i0 + 1], u);
    const axisY = straightenWave ? mPx : snoutY;

    const dSL = Math.max(0.004, (axisY - tPx) / SLpx);
    const vSL = Math.max(0.004, (bPx - axisY) / SLpx);
    profD.push(r4(s), r4(dSL));
    profV.push(r4(s), r4(vSL));

    if (dSL + vSL > maxDepthSL) maxDepthSL = dSL + vSL;
    if (dSL > maxTopSL) { maxTopSL = dSL; pD = s; }
    if (vSL > maxBotSL) { maxBotSL = vSL; pV = s; }
  }

  const pedTopSL = profD[profD.length - 1];
  const pedBotSL = profV[profV.length - 1];
  const pedDepthSL = clamp(pedTopSL + pedBotSL, 0.012, 0.22);
  const pedYSL = straightenWave ? 0 : clamp((pedTopSL - pedBotSL) * 0.5, -0.08, 0.08);

  // Estimate snout exponent `n` (0.46 bluff rounded forehead .. 0.88 pointed shark/pike wedge)
  const dAt05 = profD[Math.min(profD.length - 1, 5)] + profV[Math.min(profV.length - 1, 5)];
  const snoutRatio = dAt05 / Math.max(0.02, maxDepthSL);
  const snoutExp = clamp(1.02 - snoutRatio * 0.95, 0.46, 0.9);

  const prof: ProfileSpec = {
    d: profD,
    v: profV,
    n: r4(snoutExp),
    D: r4(maxDepthSL),
  };

  // ── 6. Extract Dorsal, Anal, Pectoral & Pelvic Fins + Colors & Spines ─────
  interface RawFinRun {
    i0: number;
    i1: number;
    s0: number;
    s1: number;
    maxH: number; // SL
    heights: number[]; // per-column SL height above trunk
    peaks: number;
    incise: number;
  }

  const extractFinRuns = (isDorsal: boolean): RawFinRun[] => {
    const hArr = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      const s = i / (M - 1);
      if (s < 0.06 || s > 0.985) continue;
      // Ignore dorsal anterior arched lure when computing median dorsal fin
      const xCol = clamp(Math.round(xSnout + s * SLpx), x0, x1);
      // Scan from trunk outward; allow separated spiny rays by finding furthest foreground pixel (excluding isolated lure far ahead of s=0.18)
      let extPx = isDorsal ? trunkTopPx[i] : trunkBotPx[i];
      if (isDorsal) {
        const yLimit = s < 0.21 ? Math.round(trunkTopPx[i] - SLpx * 0.12) : y0;
        for (let y = Math.max(y0, yLimit); y < trunkTopPx[i] - 1; y++) {
          if (mask[y * w + xCol]) { extPx = y; break; }
        }
        hArr[i] = Math.max(0, (trunkTopPx[i] - extPx) / SLpx);
      } else {
        // Exclude ultra-thin chin barbels (`s < 0.23` and `thinMask`) from paired/anal fin height
        for (let y = y1; y > trunkBotPx[i] + 1; y--) {
          const idx = y * w + xCol;
          if (mask[idx] && !(s < 0.23 && thinMask[idx])) { extPx = y; break; }
        }
        hArr[i] = Math.max(0, (extPx - trunkBotPx[i]) / SLpx);
      }
    }

    // Bridge narrow gaps between separated dorsal/pectoral spines (dilation of 3 stations ~ 2.4% SL)
    const envArr = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      let mx = hArr[i];
      for (let k = -2; k <= 2; k++) {
        const j = clamp(i + k, 0, M - 1);
        if (hArr[j] > mx) mx = hArr[j];
      }
      envArr[i] = mx;
    }

    const minFinH = isSlenderEel ? 0.012 : Math.max(0.018, maxDepthSL * 0.065);
    const runs: RawFinRun[] = [];
    let i = Math.round(M * (isDorsal ? 0.08 : 0.15));
    while (i < M - 2) {
      if (envArr[i] >= minFinH) {
        const start = i;
        while (i < M - 1 && envArr[i] >= minFinH * 0.52) i++;
        const end = i - 1;
        if (end - start >= 4) {
          // Check if a two-part notched dorsal/ventral fin has a deep saddle notch in the middle (`< 22%` of both lobes)
          let splitAt = -1;
          if (end - start >= 20) {
            let leftPeak = 0, rightPeak = 0;
            for (let k = start; k <= end; k++) {
              if (k < (start + end) / 2) leftPeak = Math.max(leftPeak, envArr[k]);
              else rightPeak = Math.max(rightPeak, envArr[k]);
            }
            let minMid = 1e9, minIdx = -1;
            for (let k = start + 6; k <= end - 6; k++) {
              if (envArr[k] < minMid) { minMid = envArr[k]; minIdx = k; }
            }
            if (minIdx > 0 && minMid < Math.min(leftPeak, rightPeak) * 0.26) {
              splitAt = minIdx;
            }
          }

          const buildRun = (a: number, b: number): RawFinRun => {
            let maxH = 0, peaks = 0, valleyDropSum = 0, valleyN = 0;
            const heights: number[] = [];
            for (let k = a; k <= b; k++) {
              heights.push(envArr[k]);
              if (envArr[k] > maxH) maxH = envArr[k];
              if (k > a && k < b && hArr[k] > hArr[k - 1] + 0.008 && hArr[k] >= hArr[k + 1] + 0.005 && hArr[k] > maxDepthSL * 0.08) {
                peaks++;
              }
              if (envArr[k] > 0.025) {
                valleyDropSum += (envArr[k] - hArr[k]) / envArr[k];
                valleyN++;
              }
            }
            const rawIncise = valleyN > 0 ? valleyDropSum / valleyN : 0;
            const incise = peaks >= 4 && rawIncise > 0.16 ? clamp(rawIncise * 2.1, 0.28, 0.88) : rawIncise > 0.22 ? 0.35 : 0;
            return {
              i0: a,
              i1: b,
              s0: r4(a / (M - 1)),
              s1: r4(b / (M - 1)),
              maxH: r4(clamp(maxH, 0.015, 0.42)),
              heights,
              peaks,
              incise: r4(incise),
            };
          };

          if (splitAt > 0) {
            runs.push(buildRun(start, splitAt - 1));
            runs.push(buildRun(splitAt + 1, end));
          } else {
            runs.push(buildRun(start, end));
          }
        }
      } else {
        i++;
      }
    }
    return runs;
  };

  const sampleFinAppearance = (s0: number, s1: number, finH: number, isDorsal: boolean) => {
    const fx0 = xSnout + s0 * SLpx;
    const fx1 = xSnout + s1 * SLpx;
    const sMid = 0.5 * (s0 + s1);
    const iMid = clamp(Math.round(sMid * (M - 1)), 0, M - 1);
    const basePx = isDorsal ? trunkTopPx[iMid] : trunkBotPx[iMid];
    const hPx = finH * SLpx;

    const baseCol = sampleRegionColor(
      seg,
      fx0,
      isDorsal ? basePx - hPx * 0.68 : basePx + 2,
      fx1,
      isDorsal ? basePx - 2 : basePx + hPx * 0.68,
    );
    const tipCol = sampleRegionColor(
      seg,
      fx0,
      isDorsal ? basePx - hPx * 1.02 : basePx + hPx * 0.68,
      fx1,
      isDorsal ? basePx - hPx * 0.68 : basePx + hPx * 1.02,
    );

    // Check dark spot density inside fin membrane (e.g. Lionfish spotted rear dorsal/anal/caudal)
    let darkDots = 0, finMaskCnt = 0;
    const iy0 = clamp(Math.round(isDorsal ? basePx - hPx : basePx + 2), y0, y1);
    const iy1 = clamp(Math.round(isDorsal ? basePx - 2 : basePx + hPx), y0, y1);
    for (let y = iy0; y <= iy1; y += 2) {
      for (let x = Math.round(fx0); x <= Math.round(fx1); x += 2) {
        const idx = y * w + clamp(x, 0, w - 1);
        if (!mask[idx]) continue;
        finMaskCnt++;
        const k = idx * 4;
        const [L] = rgbToLab(rgba[k], rgba[k + 1], rgba[k + 2]);
        if (baseCol.L - L > 22) darkDots++;
      }
    }
    const spotRatio = darkDots / Math.max(1, finMaskCnt);
    const spots = spotRatio > 0.045 && spotRatio < 0.36 ? Math.round(clamp(spotRatio * 65, 3, 12)) : 0;

    // Estimate membrane alpha from closeness of baseCol to background LAB
    const [bL, ba, bb] = rgbToLab(baseCol.r, baseCol.g, baseCol.b);
    const dBg = Math.hypot(bL - seg.bgLab[0], ba - seg.bgLab[1], bb - seg.bgLab[2]);
    const alpha = dBg < 18 ? 0.42 : dBg < 32 ? 0.68 : 0.88;

    return {
      color: baseCol.count > 4 ? baseCol.hex : '#6c7c8c',
      tip: tipCol.count > 3 ? tipCol.hex : baseCol.hex,
      spots,
      spotCol: '#241410',
      alpha: r4(alpha),
    };
  };

  const toCustomProfile = (heights: number[], maxH: number): [number, number][] => {
    const K = 20;
    const pts: [number, number][] = [];
    for (let k = 0; k <= K; k++) {
      const u = k / K;
      const idx = u * Math.max(0, heights.length - 1);
      const i0 = Math.floor(idx), i1 = Math.min(heights.length - 1, i0 + 1);
      const val = lerp(heights[i0] ?? 0, heights[i1] ?? 0, idx - i0) / Math.max(1e-4, maxH);
      pts.push([r4(u), r4(clamp(val, 0.05, 1.15))]);
    }
    return pts;
  };

  const classifyMedianShape = (r: RawFinRun): FinShape => {
    const span = r.s1 - r.s0;
    if (r.incise >= 0.32 || r.peaks >= 5) return 'spiny';
    if (span > 0.55 && r.maxH < 0.08) return 'even';
    let peakU = 0.5, best = 0;
    r.heights.forEach((v, idx) => {
      if (v > best) { best = v; peakU = idx / Math.max(1, r.heights.length - 1); }
    });
    if (r.maxH > 0.2 && span > 0.25) return 'sail';
    if (peakU < 0.32 && span < 0.22) return 'shark';
    if (peakU < 0.24) return 'falcate';
    if (peakU > 0.65) return 'round';
    return 'tri';
  };

  const dorsalRuns = extractFinRuns(true);
  const ventralRuns = extractFinRuns(false);

  const dorsalFins: MedianFin[] = isSlenderEel
    ? [{
        s0: 0.12,
        s1: 0.99,
        h: r4(clamp(maxDepthSL * 0.26, 0.022, 0.055)),
        shape: 'even',
        rays: 48,
        ...sampleFinAppearance(0.15, 0.92, maxDepthSL * 0.24, true),
      }]
    : dorsalRuns.slice(0, 3).map((r) => {
        const shape = classifyMedianShape(r);
        const app = sampleFinAppearance(r.s0, r.s1, r.maxH, true);
        return {
          s0: r.s0,
          s1: r.s1,
          h: r.maxH,
          shape,
          incise: r.incise > 0.1 ? r.incise : undefined,
          spines: r.incise >= 0.28 ? Math.max(6, r.peaks + 3) : undefined,
          rays: Math.round(clamp((r.s1 - r.s0) * 48, 7, 30)),
          customProfile: toCustomProfile(r.heights, r.maxH),
          ...app,
        };
      });

  // Partition ventral excursions into Paired Pectoral (s0 < 0.44), Pelvic (mid-ventral), and Median Anal (s0 >= 0.46)
  let pecFin: PairedFin | undefined;
  let pelFin: PairedFin | undefined;
  const analFins: MedianFin[] = [];

  if (isSlenderEel) {
    analFins.push({
      s0: 0.42,
      s1: 0.99,
      h: r4(clamp(maxDepthSL * 0.22, 0.018, 0.045)),
      shape: 'even',
      rays: 36,
      ...sampleFinAppearance(0.45, 0.94, maxDepthSL * 0.2, false),
    });
  } else {
    for (const r of ventralRuns) {
      const sMid = 0.5 * (r.s0 + r.s1);
      const app = sampleFinAppearance(r.s0, r.s1, r.maxH, false);
      if (r.s0 < 0.36 && sMid < 0.48 && !pecFin) {
        // Large ventrally projecting pectoral fin (Lionfish fan, Shark hydrofoil wing, Flying fish)
        const isFan = r.incise >= 0.22 || (r.s1 - r.s0) > 0.2;
        pecFin = {
          s: r4(clamp(r.s0 + 0.03, 0.18, 0.34)),
          y: -0.52,
          base: r4(clamp((r.s1 - r.s0) * 0.38, 0.045, 0.095)),
          len: r4(clamp(Math.hypot(r.maxH, (r.s1 - r.s0) * 0.72), 0.16, 0.46)),
          shape: isFan ? 'fan' : 'shark',
          elev: -20,
          splay: isFan ? 54 : 70,
          incise: r.incise >= 0.2 ? clamp(r.incise, 0.35, 0.68) : undefined,
          foil: isFan ? 0.15 : 0.9,
          rays: isFan ? 14 : 0,
          color: app.color,
          tip: app.tip,
          spots: app.spots,
          spotCol: app.spotCol,
          alpha: isFan ? Math.min(0.75, app.alpha) : 0.96,
        };
      } else if (r.s0 < 0.62 && ventralRuns.some((o) => o.s0 > r.s1 + 0.02) && !pelFin) {
        pelFin = {
          s: r4(clamp(r.s0 + 0.02, 0.3, 0.62)),
          y: -0.88,
          base: r4(clamp((r.s1 - r.s0) * 0.55, 0.028, 0.065)),
          len: r4(clamp(r.maxH * 1.15, 0.06, 0.22)),
          shape: r.maxH > 0.14 ? 'veil' : 'tri',
          elev: -32,
          splay: 34,
          color: app.color,
          tip: app.tip,
          alpha: app.alpha,
        };
      } else if (r.s1 > 0.52) {
        const s0Clamp = Math.max(0.46, r.s0);
        if (r.s1 > s0Clamp + 0.03) {
          analFins.push({
            s0: r4(s0Clamp),
            s1: r.s1,
            h: r.maxH,
            shape: classifyMedianShape(r),
            incise: r.incise > 0.15 ? r.incise : undefined,
            rays: Math.round(clamp((r.s1 - s0Clamp) * 44, 6, 26)),
            customProfile: toCustomProfile(r.heights, r.maxH),
            ...app,
          });
        }
      }
    }
  }

  // ── 7. Head Organs: Eye, Mouth/Teeth, Opercle/Gill Slits ──────────────────
  const eyeSearchY0 = y0 + bh * 0.06;
  const eyeSearchY1 = y0 + bh * 0.72;
  const eyeDet = findEyeInBox(
    seg,
    xSnout + SLpx * 0.025,
    eyeSearchY0,
    xSnout + SLpx * 0.28,
    eyeSearchY1,
    Math.max(3.5, SLpx * 0.009),
    Math.max(8, SLpx * 0.052),
  );
  const eyeS = clamp((eyeDet.x - xSnout) / SLpx, 0.03, 0.26);
  const eyeIdx = clamp(Math.round(eyeS * (M - 1)), 0, M - 1);
  const localTopPx = trunkTopPx[eyeIdx];
  const localBotPx = trunkBotPx[eyeIdx];
  const localMidPx = 0.5 * (localTopPx + localBotPx);
  const localHalfPx = Math.max(4, 0.5 * (localBotPx - localTopPx));
  const eyeYNorm = clamp((localMidPx - eyeDet.y) / localHalfPx, -0.45, 0.92);
  const eyeDiamSL = clamp((eyeDet.r * 2) / SLpx, 0.014, 0.075);

  // Detect 3–7 vertical shark gill slits behind the eye (`s ∈ [eyeS + 0.05, 0.33]`)
  let gillSlitPeaks = 0;
  {
    const gx0 = Math.round(xSnout + SLpx * Math.max(0.14, eyeS + 0.05));
    const gx1 = Math.round(xSnout + SLpx * 0.31);
    const gyMid = Math.round(localMidPx + localHalfPx * 0.12);
    const colDark = new Float32Array(Math.max(1, gx1 - gx0 + 1));
    for (let x = gx0; x <= gx1; x++) {
      const cx = clamp(x, 0, w - 1);
      let sL = 0, n = 0;
      for (let dy = -Math.round(localHalfPx * 0.35); dy <= Math.round(localHalfPx * 0.4); dy += 2) {
        const cy = clamp(gyMid + dy, 0, h - 1);
        const idx = cy * w + cx;
        if (mask[idx]) {
          const k = idx * 4;
          sL += 0.299 * rgba[k] + 0.587 * rgba[k + 1] + 0.114 * rgba[k + 2];
          n++;
        }
      }
      colDark[x - gx0] = n > 0 ? sL / n : 128;
    }
    const sm = smoothArray(colDark, 4, 2);
    for (let i = 2; i < colDark.length - 2; i++) {
      const dip = sm[i] - colDark[i];
      if (dip > 6.5 && colDark[i] < colDark[i - 1] && colDark[i] <= colDark[i + 1]) {
        gillSlitPeaks++;
        i += 2;
      }
    }
  }

  // Head Length `HL`
  const HL = r4(
    isSlenderEel
      ? clamp(eyeS * 2.65, 0.11, 0.17)
      : pecFin
        ? clamp(pecFin.s - 0.015, Math.max(0.18, eyeS + eyeDiamSL + 0.05), 0.38)
        : clamp(eyeS * 2.35 + 0.04, 0.2, 0.36),
  );

  // Fallback paired pectoral fin if folded flat inside lateral flank silhouette (e.g. Alien Leviathan / Reef Fish)
  if (!pecFin && !isSlenderEel) {
    const px0 = xSnout + HL * SLpx;
    const px1 = xSnout + (HL + 0.17) * SLpx;
    const flankPecCol = sampleRegionColor(
      seg,
      px0,
      localMidPx - localHalfPx * 0.15,
      px1,
      localMidPx + localHalfPx * 0.65,
    );
    pecFin = {
      s: r4(clamp(HL + 0.015, 0.2, 0.34)),
      y: -0.28,
      base: 0.052,
      len: 0.165,
      shape: 'fan',
      elev: -12,
      splay: 36,
      rays: 13,
      color: flankPecCol.hex,
      alpha: 0.68,
    };
  }

  // ── 8. Exact 33-Station Caudal Tail Reconstruction ────────────────────────
  let caudal: CaudalSpec;
  if (!hasDistinctCaudal) {
    caudal = {
      type: 'pointed',
      span: r4(Math.max(0.025, pedDepthSL * 1.15)),
      len: r4(clamp((x1 - xPed) / SLpx, 0.035, 0.12)),
      color: dorsalFins[0]?.color ?? '#5a6a78',
      alpha: 0.85,
    };
  } else {
    let tailTopY = h, tailBotY = 0;
    for (let x = xPed; x <= x1; x++) {
      if (colTopAll[x] < tailTopY) tailTopY = colTopAll[x];
      if (colBotAll[x] > tailBotY) tailBotY = colBotAll[x];
    }
    const tailSpanPx = Math.max(8, tailBotY - tailTopY);
    const spanSL = clamp(tailSpanPx / SLpx, Math.max(0.08, pedDepthSL * 2.25), 0.68);
    const upFrac = clamp((pedCenterY - tailTopY) / tailSpanPx, 0.3, 0.74);

    // Measure rightmost trailing edge reach across 33 vertical stations `uu ∈ [0..1]`
    const T_N = 33;
    const rawReachSL = new Float32Array(T_N);
    let maxReachSL = 0.08;
    for (let k = 0; k < T_N; k++) {
      const uu = k / (T_N - 1);
      const ySample = Math.round(lerp(tailTopY + 2, tailBotY - 2, uu));
      let rightmost = xPed;
      for (let x = x1; x >= xPed; x--) {
        let hit = false;
        for (let dy = -2; dy <= 2; dy++) {
          const yy = clamp(ySample + dy, 0, h - 1);
          if (mask[yy * w + x]) { hit = true; break; }
        }
        if (hit) { rightmost = x; break; }
      }
      const rSL = Math.max(0.015, (rightmost - xPed) / SLpx);
      rawReachSL[k] = rSL;
      if (rSL > maxReachSL) maxReachSL = rSL;
    }

    // Upper lobe reach, lower lobe reach, center reach (and check tri-lobed center peak!)
    let upperLobe = 0, lowerLobe = 0, midCenter = rawReachSL[Math.floor(T_N / 2)];
    let upperMidMin = maxReachSL, lowerMidMin = maxReachSL;
    for (let k = 1; k <= 9; k++) upperLobe = Math.max(upperLobe, rawReachSL[k]);
    for (let k = T_N - 10; k <= T_N - 2; k++) lowerLobe = Math.max(lowerLobe, rawReachSL[k]);
    for (let k = 12; k <= 20; k++) midCenter = Math.max(midCenter, rawReachSL[k]);
    for (let k = 8; k <= 14; k++) upperMidMin = Math.min(upperMidMin, rawReachSL[k]);
    for (let k = 18; k <= 24; k++) lowerMidMin = Math.min(lowerMidMin, rawReachSL[k]);
    const centerMin = Math.min(rawReachSL[15], rawReachSL[16], rawReachSL[17]);

    const lobeMax = Math.max(0.06, upperLobe, lowerLobe);
    const forkRatio = clamp(centerMin / lobeMax, 0.1, 1.05);
    const hasTrilobePeak = midCenter > Math.max(upperMidMin, lowerMidMin) * 1.16 && forkRatio < 0.88;

    let cType: CaudalType = 'forked';
    if (upperLobe > lowerLobe * 1.24 && upFrac > 0.56) cType = 'hetero';
    else if (lowerLobe > upperLobe * 1.28) cType = 'hypo';
    else if (hasTrilobePeak) cType = 'trilobe';
    else if (forkRatio < 0.28) cType = 'lunate';
    else if (forkRatio < 0.62) cType = 'forked';
    else if (forkRatio < 0.86) cType = 'emarginate';
    else if (rawReachSL[0] < midCenter * 0.72 && rawReachSL[T_N - 1] < midCenter * 0.72) cType = 'rounded';
    else cType = 'truncate';

    const customTrail: [number, number][] = [];
    const smReach = smoothArray(rawReachSL, 1, 1);
    for (let k = 0; k < T_N; k++) {
      customTrail.push([r4(k / (T_N - 1)), r4(clamp(smReach[k] / maxReachSL, 0.08, 1.15))]);
    }

    const tailCol = sampleRegionColor(seg, xPed + 3, tailTopY, x1 - Math.round((x1 - xPed) * 0.25), tailBotY);
    const tailTipCol = sampleRegionColor(seg, x1 - Math.round((x1 - xPed) * 0.25), tailTopY, x1, tailBotY);

    // Check caudal spots
    let darkDots = 0, tot = 0;
    for (let y = tailTopY; y <= tailBotY; y += 3) {
      for (let x = xPed + 2; x <= x1; x += 3) {
        const idx = y * w + x;
        if (!mask[idx]) continue;
        tot++;
        const k = idx * 4;
        const [L] = rgbToLab(rgba[k], rgba[k + 1]