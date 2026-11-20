, rgba[k + 2]);
        if (tailCol.L - L > 22) darkDots++;
      }
    }
    const cSpotRatio = darkDots / Math.max(1, tot);
    const cSpots = cSpotRatio > 0.04 && cSpotRatio < 0.36 ? Math.round(clamp(cSpotRatio * 75, 4, 14)) : 0;
    const [tL, ta, tb] = rgbToLab(tailCol.r, tailCol.g, tailCol.b);
    const dBg = Math.hypot(tL - seg.bgLab[0], ta - seg.bgLab[1], tb - seg.bgLab[2]);

    caudal = {
      type: cType,
      span: r4(spanSL),
      up: r4(upFrac),
      len: r4(clamp(maxReachSL, 0.08, 0.45)),
      lenUp: r4(upperLobe),
      lenDn: r4(lowerLobe),
      fork: r4(forkRatio),
      rays: cType === 'hetero' ? 0 : 20,
      color: tailCol.hex,
      tip: tailTipCol.count > 4 ? tailTipCol.hex : tailCol.hex,
      spots: cSpots || undefined,
      spotCol: '#221410',
      alpha: r4(cType === 'hetero' ? 0.98 : dBg < 18 ? 0.44 : dBg < 32 ? 0.72 : 0.9),
      customTrail,
    };
  }

  // ── 9. Detect Dermal Skin Tags, Brow Tentacles, Chin Barbels & Glowing Lures ──
  const tags: TagField[] = [];
  {
    // Connected components on `thinMask`
    const tLabels = new Int32Array(w * h);
    const q = new Int32Array(w * h);
    let compId = 0;
    let browCount = 0, browLenSL = 0, browHex = '#d86848';
    let jawFlapCount = 0, jawFilaCount = 0, jawFilaLenSL = 0, jawHex = '#d8cfc8';
    let bodyTagCount = 0, bodyTagLenSL = 0, bodyTagHex = '#c89a68';

    for (let i = 0; i < w * h; i++) {
      if (!thinMask[i] || tLabels[i]) continue;
      compId++;
      let hIdx = 0, tIdx = 0;
      q[tIdx++] = i;
      tLabels[i] = compId;
      let cx0 = w, cy0 = h, cx1 = 0, cy1 = 0;
      let tipX = i % w, tipY = Math.floor(i / w), maxTipDist = -1;
      let rootX = tipX, rootY = tipY, minRootDist = 1e9;

      while (hIdx < tIdx) {
        const cur = q[hIdx++];
        const cx = cur % w, cy = (cur - cx) / w;
        if (cx < cx0) cx0 = cx;
        if (cx > cx1) cx1 = cx;
        if (cy < cy0) cy0 = cy;
        if (cy > cy1) cy1 = cy;

        // Check distance from trunk center
        const sEst = clamp((cx - xSnout) / SLpx, 0, 1);
        const stIdx = clamp(Math.round(sEst * (M - 1)), 0, M - 1);
        const distFromTrunk = Math.min(Math.abs(cy - trunkTopPx[stIdx]), Math.abs(cy - trunkBotPx[stIdx]));
        if (distFromTrunk > maxTipDist) { maxTipDist = distFromTrunk; tipX = cx; tipY = cy; }
        if (distFromTrunk < minRootDist) { minRootDist = distFromTrunk; rootX = cx; rootY = cy; }

        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            if (nx < 0 || nx >= w) continue;
            const ni = ny * w + nx;
            if (thinMask[ni] && !tLabels[ni]) {
              tLabels[ni] = compId;
              q[tIdx++] = ni;
            }
          }
        }
      }

      if (tIdx < 10) continue;
      const sRoot = (rootX - xSnout) / SLpx;
      const spanLenSL = Math.hypot(cx1 - cx0, cy1 - cy0) / SLpx;
      if (spanLenSL < 0.018 || sRoot > 0.96) continue;

      // Skip dorsal/pectoral fin spines already captured inside a fin run!
      const inDorsalRun = cy1 <= trunkTopPx[clamp(Math.round(clamp(sRoot) * (M - 1)), 0, M - 1)] + 6 &&
        dorsalFins.some((f) => sRoot >= f.s0 - 0.025 && sRoot <= f.s1 + 0.025);
      if (inDorsalRun) continue;
      const inPecRun = pecFin && cy0 >= trunkBotPx[clamp(Math.round(clamp(sRoot) * (M - 1)), 0, M - 1)] - 6 &&
        sRoot >= pecFin.s - 0.04 && sRoot <= pecFin.s + pecFin.len * 0.9;
      if (inPecRun) continue;

      const compCol = sampleRegionColor(seg, cx0, cy0, cx1, cy1, (_x, _y, idx) => tLabels[idx] === compId);
      const tipCol = sampleRegionColor(seg, tipX - 5, tipY - 5, tipX + 5, tipY + 5);

      // 1. Dorsal head bioluminescent angler/alien lure (`sRoot < 0.24`, above eye/skull, bright/chromatic tip bulb)
      if (sRoot < 0.24 && cy0 < trunkTopPx[clamp(Math.round(clamp(sRoot) * (M - 1)), 0, M - 1)] - 4 && spanLenSL > 0.055) {
        if (tipCol.L > 60 && tipCol.chroma > 22 && barbels.length === 0) {
          barbels.push({
            s: r4(clamp(sRoot, 0.04, 0.18)),
            y: 0.95,
            len: r4(clamp(spanLenSL * 1.05, 0.12, 0.34)),
            dir: [0.85, 0.92, 0],
            droop: 0.32,
            r: 0.0055,
            bulb: tipCol.hex,
            pairs: false,
          });
          landmarks.push({ name: 'Bioluminescent Illicium Lure', x: tipX / w, y: tipY / h, color: tipCol.hex });
          continue;
        }
        // Supraorbital brow tentacles (Lionfish / Blenny / Scorpionfish)
        browCount++;
        browLenSL = Math.max(browLenSL, spanLenSL);
        browHex = compCol.hex;
      } else if (sRoot < 0.25 && cy1 > trunkBotPx[clamp(Math.round(clamp(sRoot) * (M - 1)), 0, M - 1)] + 4) {
        // Anterior chin / lower jaw appendages: long thin threads vs fleshy jaw flaps
        if (spanLenSL > 0.085) {
          jawFilaCount++;
          jawFilaLenSL = Math.max(jawFilaLenSL, spanLenSL);
          jawHex = compCol.hex;
        } else {
          jawFlapCount++;
          jawHex = compCol.hex;
        }
      } else if (sRoot >= 0.18 && sRoot <= 0.92) {
        bodyTagCount++;
        bodyTagLenSL = Math.max(bodyTagLenSL, spanLenSL);
        bodyTagHex = compCol.hex;
      }
    }

    if (browCount > 0) {
      tags.push({
        kind: 'flap',
        n: Math.min(4, Math.max(2, browCount * 2)),
        len: r4(clamp(browLenSL * 0.85, 0.035, 0.095)),
        site: 'brow',
        sym: true,
        flat: 0.62,
        fringe: 0.28,
        lean: 6,
        curl: 0.14,
        band: '#f4ebe2',
        c: browHex,
      });
    }
    if (jawFlapCount > 0) {
      tags.push({
        kind: 'flap',
        n: Math.min(14, Math.max(6, jawFlapCount * 3)),
        len: 0.022,
        site: 'jaw',
        fringe: 0.65,
        flat: 0.65,
        band: '#f2e8df',
        c: jawHex,
      });
    }
    if (jawFilaCount > 0) {
      // Long sensory chin barbels / alien jaw filaments
      for (let b = 0; b < Math.min(3, jawFilaCount); b++) {
        barbels.push({
          s: r4(0.035 + b * 0.028),
          y: -0.92,
          len: r4(clamp(jawFilaLenSL * (0.92 - b * 0.12), 0.09, 0.28)),
          dir: [-0.28 - b * 0.1, -0.88, 0.18],
          droop: 0.55,
          r: 0.0028,
          pairs: true,
        });
      }
      tags.push({
        kind: 'filament',
        n: 8,
        len: r4(clamp(jawFilaLenSL * 0.55, 0.04, 0.12)),
        site: 'jaw',
        sway: 0.88,
        c: jawHex,
      });
    }
    if (bodyTagCount >= 3) {
      tags.push({
        kind: 'cirrus',
        n: Math.min(28, bodyTagCount * 3),
        len: r4(clamp(bodyTagLenSL * 0.75, 0.018, 0.045)),
        site: 'body',
        branch: 0.55,
        clump: 0.4,
        c: bodyTagHex,
      });
    }
  }

  // ── 10. Bauplan Classification, Mouth, Scales & Locomotion ────────────────
  const isSharkLike =
    opts.forceBauplan === 'shark' ||
    ((opts.forceBauplan === undefined || opts.forceBauplan === 'auto') &&
      !isSlenderEel &&
      (caudal.type === 'hetero' || (gillSlitPeaks >= 3 && dorsalFins.length >= 1 && (dorsalFins[0]?.incise ?? 0) < 0.2)));

  const isLionfishLike =
    opts.forceBauplan === 'lionfish' ||
    ((opts.forceBauplan === undefined || opts.forceBauplan === 'auto') &&
      dorsalFins.some((d) => (d.incise ?? 0) >= 0.35 && d.h > 0.18) &&
      (pecFin?.len ?? 0) > 0.24);

  // Check dark abyssal + neon bioluminescent alien/deep-sea signature
  const midFlankCol = sampleRegionColor(
    seg,
    xSnout + SLpx * 0.28,
    trunkTopPx[64],
    xSnout + SLpx * 0.72,
    trunkBotPx[64],
  );
  let brightCyanVioletPx = 0, darkFlankPx = 0;
  for (let y = Math.round(trunkTopPx[64]); y <= Math.round(trunkBotPx[64]); y += 2) {
    for (let x = Math.round(xSnout + SLpx * 0.25); x <= Math.round(xSnout + SLpx * 0.78); x += 2) {
      const idx = y * w + clamp(x, 0, w - 1);
      if (!mask[idx]) continue;
      const k = idx * 4;
      const [L, ca, cb] = rgbToLab(rgba[k], rgba[k + 1], rgba[k + 2]);
      if (L < 34) darkFlankPx++;
      if (Math.hypot(ca, cb) > 36 && (cb < -18 || ca > 22)) brightCyanVioletPx++;
    }
  }
  const isAlienAbyssal =
    opts.forceBauplan === 'alien' ||
    opts.forceBauplan === 'angler' ||
    barbels.some((b) => Boolean(b.bulb)) ||
    (darkFlankPx > 40 && brightCyanVioletPx > 18);

  const bauplan: DetectedBauplan =
    opts.forceBauplan && opts.forceBauplan !== 'auto'
      ? opts.forceBauplan
      : isSlenderEel
        ? 'eel'
        : isSharkLike
          ? 'shark'
          : isLionfishLike
            ? 'lionfish'
            : isAlienAbyssal
              ? 'alien'
              : maxDepthSL > 0.48
                ? 'boxfish'
                : 'teleost';

  if (isSharkLike) {
    // Refine shark dorsal/pectoral hydrofoils
    dorsalFins.forEach((d) => {
      d.shape = 'shark';
      d.foil = 1;
      d.rays = 0;
      d.alpha = 1;
    });
    if (pecFin) {
      pecFin.shape = 'shark';
      pecFin.foil = 1;
      pecFin.rays = 0;
      pecFin.splay = 72;
      pecFin.alpha = 1;
    }
  }

  // Mouth construction
  const mouth: MouthSpec = isSharkLike
    ? {
        s: 0.048,
        y: -0.45,
        gape: 0.068,
        angle: 8,
        curve: -0.04,
        open: 34,
        jut: -0.012,
        lip: 0.22,
        protrude: 0.2,
        gular: 0.24,
        teeth: 'shark',
        tn: 12,
        ts: 0.01,
        throat: 0.08,
      }
    : detectedOpenJaw
      ? {
          s: 0,
          y: 0.02,
          gape: r4(jawCleftGapeSL),
          angle: 14,
          curve: 0.03,
          open: 36,
          jut: 0.004,
          lip: 0.34,
          protrude: 0.35,
          gular: 0.42,
          teeth: jawTeethScore > 0.08 || isAlienAbyssal || isSlenderEel ? 'fang' : 'cone',
          tn: 11,
          ts: jawTeethScore > 0.08 || isAlienAbyssal ? 0.015 : 0.008,
        }
      : isLionfishLike
        ? {
            s: 0,
            y: 0.08,
            gape: 0.082,
            angle: 34,
            curve: 0,
            open: 36,
            jut: 0.006,
            lip: 0.5,
            protrude: 0.62,
            gular: 0.5,
            teeth: 'fine',
            tn: 12,
            ts: 0.003,
          }
        : {
            s: 0,
            y: 0,
            gape: r4(clamp(HL * 0.28, 0.04, 0.095)),
            angle: 18,
            curve: 0,
            open: 30,
            jut: 0,
            lip: 0.38,
            protrude: 0.42,
            gular: 0.35,
            teeth: 'cone',
            tn: 10,
            ts: 0.005,
          };

  const eye: EyeSpec = {
    s: r4(eyeS),
    y: r4(eyeYNorm),
    d: r4(eyeDiamSL),
    iris: eyeDet.irisHex,
    iris2: eyeDet.iris2Hex,
    pupil: isSharkLike ? 'slitV' : 'round',
    shine: isAlienAbyssal ? 0.55 : eyeDet.shine,
    bulge: eyeYNorm > 0.72 ? 0.65 : isSharkLike ? 0.16 : 0.28,
  };

  const gill: GillSpec = {
    kind: isSharkLike ? 'slits' : isSlenderEel ? 'pore' : 'opercle',
  };

  // Measure high-frequency diagonal scale-lattice energy inside mid-trunk
  let scaleEnergy = 0, scaleN = 0;
  for (let y = Math.round(trunkTopPx[64] + 6); y <= Math.round(trunkBotPx[64] - 6); y += 2) {
    for (let x = Math.round(xSnout + SLpx * 0.32); x <= Math.round(xSnout + SLpx * 0.68); x += 2) {
      const cx = clamp(x, 2, w - 3), cy = clamp(y, 2, h - 3);
      const idx = cy * w + cx;
      if (!solidBody[idx]) continue;
      const lumAt = (ox: number, oy: number) => {
        const k = ((cy + oy) * w + (cx + ox)) * 4;
        return 0.299 * rgba[k] + 0.587 * rgba[k + 1] + 0.114 * rgba[k + 2];
      };
      const lap = Math.abs(4 * lumAt(0, 0) - lumAt(2, 2) - lumAt(-2, 2) - lumAt(2, -2) - lumAt(-2, -2));
      scaleEnergy += lap;
      scaleN++;
    }
  }
  const meanScaleLap = scaleN > 0 ? scaleEnergy / scaleN : 10;

  const skin: SkinSpec = isSharkLike
    ? { scales: 0, kind: 'placoid', bump: 0.45 }
    : isSlenderEel
      ? { scales: 0, kind: 'smooth', bump: 0.22 }
      : meanScaleLap > 18
        ? { scales: Math.round(clamp(28 + meanScaleLap * 0.85, 32, 68)), kind: 'ctenoid', bump: 0.78 }
        : { scales: 44, kind: 'cycloid', bump: 0.55 };

  const swim: SwimSpec = {
    mode: isSlenderEel
      ? 'anguilliform'
      : isSharkLike
        ? 'selachian'
        : isLionfishLike
          ? 'labriform'
          : caudal.type === 'lunate'
            ? 'thunniform'
            : 'carangiform',
  };

  const body: BodySpec = {
    D: r4(maxDepthSL),
    df: r4(clamp(maxTopSL / Math.max(0.02, maxDepthSL), 0.32, 0.68)),
    pD: r4(pD),
    pV: r4(pV),
    P: r4(pedDepthSL),
    pedY: r4(pedYSL),
    bD: r4(clamp(1 - snoutExp, 0.25, 0.78)),
    bV: r4(clamp(1 - snoutExp, 0.25, 0.78)),
    tD: 0.95,
    tV: 0.95,
    W: isSlenderEel ? 0.62 : isSharkLike ? 0.68 : maxDepthSL > 0.34 ? 0.46 : 0.54,
    Wh: isSharkLike ? 1.08 : 1.0,
    Wt: isSharkLike ? 0.95 : 0.85,
    sq: isSharkLike ? 2.15 : 2.25,
    bellyFlat: isSharkLike ? 0.28 : 0.08,
    keel: caudal.type === 'lunate' || isSharkLike ? 0.014 : undefined,
    prof,
  };

  const fins: FinSet = {
    dorsal: dorsalFins.length > 0 ? dorsalFins : undefined,
    anal: analFins.length > 0 ? analFins : undefined,
    pec: pecFin,
    pel: pelFin,
    caudal,
    color: dorsalFins[0]?.color ?? caudal.color ?? '#6a7a88',
    tip: dorsalFins[0]?.tip,
    alpha: dorsalFins[0]?.alpha ?? caudal.alpha ?? 0.78,
  };

  // ── 11. Build Diagnostic 2D Overlays & Landmarks for Interactive Studio ───
  const overlays: OverlayPolygon[] = [];
  {
    const trunkPts: [number, number][] = [];
    for (let i = 0; i < M; i += 3) {
      trunkPts.push([(xSnout + (i / (M - 1)) * SLpx) / w, trunkTopPx[i] / h]);
    }
    for (let i = M - 1; i >= 0; i -= 3) {
      trunkPts.push([(xSnout + (i / (M - 1)) * SLpx) / w, trunkBotPx[i] / h]);
    }
    overlays.push({ label: 'Muscular Trunk Loft', kind: 'trunk', points: trunkPts });

    dorsalFins.forEach((df, idx) => {
      const pts: [number, number][] = [];
      for (let k = 0; k <= 16; k++) {
        const u = k / 16, s = lerp(df.s0, df.s1, u);
        const stI = clamp(Math.round(s * (M - 1)), 0, M - 1);
        const cp = df.customProfile?.[Math.min((df.customProfile?.length ?? 1) - 1, Math.round(u * ((df.customProfile?.length ?? 1) - 1)))][1] ?? 0.8;
        pts.push([(xSnout + s * SLpx) / w, (trunkTopPx[stI] - df.h * cp * SLpx) / h]);
      }
      for (let k = 16; k >= 0; k--) {
        const s = lerp(df.s0, df.s1, k / 16);
        const stI = clamp(Math.round(s * (M - 1)), 0, M - 1);
        pts.push([(xSnout + s * SLpx) / w, trunkTopPx[stI] / h]);
      }
      overlays.push({ label: `Dorsal Fin ${idx + 1}`, kind: 'dorsal', points: pts });
    });

    if (hasDistinctCaudal) {
      const cPts: [number, number][] = [[xPed / w, trunkTopPx[M - 1] / h]];
      const ct = caudal.customTrail ?? [[0, 1], [0.5, 0.5], [1, 1]];
      const cSpanPx = caudal.span * SLpx;
      const cUp = caudal.up ?? 0.5;
      for (const [uu, rf] of ct) {
        cPts.push([
          (xPed + rf * (caudal.len ?? 0.2) * SLpx) / w,
          (pedCenterY - cSpanPx * cUp + uu * cSpanPx) / h,
        ]);
      }
      cPts.push([xPed / w, trunkBotPx[M - 1] / h]);
      overlays.push({ label: `Caudal (${caudal.type})`, kind: 'caudal', points: cPts });
    }
  }

  landmarks.push(
    { name: 'Snout Tip (s=0)', x: xSnout / w, y: snoutY / h, color: '#38bdf8' },
    { name: 'Eye & Iris', x: eyeDet.x / w, y: eyeDet.y / h, color: '#fbbf24' },
    { name: `Gill (${gill.kind})`, x: (xSnout + HL * SLpx) / w, y: localMidPx / h, color: '#a78bfa' },
    { name: 'Caudal Peduncle (s=1)', x: xPed / w, y: pedCenterY / h, color: '#34d399' },
  );

  const notes: AnatomyResult['notes'] = [
    {
      icon: '◈',
      title: `Measured ${bauplan[0].toUpperCase() + bauplan.slice(1)} Silhouette`,
      text: `64-station monotone Hermite profile: max body depth ${(maxDepthSL * 100).toFixed(1)}% SL at s=${pD.toFixed(2)}, peduncle ${(pedDepthSL * 100).toFixed(1)}% SL${straightenWave ? ' (undulating axial wave straightened for live anguilliform swimming)' : ''}.`,
    },
    {
      icon: '◧',
      title: 'Fin & Caudal Architecture',
      text: `${dorsalFins.length} dorsal fin${dorsalFins.length === 1 ? '' : 's'}${dorsalFins[0]?.incise ? ` (spiny incision ${Math.round(dorsalFins[0].incise * 100)}%)` : ''}, ${analFins.length} anal fin${analFins.length === 1 ? '' : 's'}, ${caudal.type} caudal tail (span ${(caudal.span * 100).toFixed(0)}% SL).`,
    },
    {
      icon: '◉',
      title: 'Cranial, Dermal & Scale Organs',
      text: `Eye ${(eyeDiamSL * 100).toFixed(1)}% SL (${eye.iris}), ${mouth.teeth !== 'none' ? `${mouth.teeth}-toothed jaw` : 'smooth jaw'}, ${gill.kind} gill, ${skin.kind} integument${tags.length + barbels.length > 0 ? `, plus ${tags.length + barbels.length} living dermal appendage group(s)` : ''}.`,
    },
  ];

  const lenM =
    bauplan === 'shark' ? 3.2 : bauplan === 'eel' ? 1.4 : bauplan === 'alien' ? 0.85 : bauplan === 'lionfish' ? 0.38 : 0.42;

  return {
    seg,
    flipped: shouldFlip,
    bauplan,
    plan: 'fish',
    HL,
    lenM,
    body,
    mouth,
    eye,
    gill,
    fins,
    skin,
    swim,
    rostrum,
    barbels: barbels.length > 0 ? barbels : undefined,
    tags: tags.length > 0 ? tags : undefined,
    mapping: {
      isEquine: false,
      xSnout,
      xPed,
      SLpx,
      stations: M,
      trunkTopPx,
      trunkMidPx,
      trunkBotPx,
      eyePx: { x: eyeDet.x, y: eyeDet.y, r: eyeDet.r },
    },
    overlays,
    landmarks,
    metrics: {
      aspectRatio: r4(bw / bh),
      bodyDepthSL: r4(maxDepthSL),
      peduncleSL: r4(pedDepthSL),
      headLengthSL: HL,
      eyeDiameterSL: eye.d,
      dorsalCount: dorsalFins.length,
      tagCount: tags.reduce((a, t) => a + t.n, 0) + barbels.length,
      confidence: r4(clamp(0.86 + (eyeDet.score > 25 ? 0.08 : 0.02) + (seg.foregroundRatio > 0.08 ? 0.04 : 0), 0.75, 0.99)),
    },
    notes,
  };
}
