] = [], keep: boolean[] = [];
        const roundEnds = s0 > model.sMin + 0.01 && s1 < 0.99;
        for (let i = 0; i <= N; i++) {
          const t = i / N, s = lerp(s0, s1, t), hs = hp(s);
          const endF = roundEnds ? 0.3 + 0.7 * Math.sqrt(smooth(0, 0.04, t) * smooth(0, 0.04, 1 - t)) : 1;
          const w = (((L.w * (1 - (L.taper ?? 0) * t)) / hs) * 0.5) * endF;
          const ctr = L.h + (L.wob ?? 0) * Math.sin(s * 30) + (rough / hs) * n1(s * 9, sd);
          up.push([s, ctr - w / 2 + (rough / hs) * 0.6 * n1(s * 37, sd + 1)]);
          dn.push([s, ctr + w / 2 + (rough / hs) * 0.6 * n1(s * 37, sd + 2)]);
          keep.push(n1(s * 6, sd + 3) > thr);
        }
        d.fillStyle = css(col);
        if (L.glow) { d.shadowColor = css(col); d.shadowBlur = (6 * TW) / 4096; }
        both(d, () => runs(keep, (i0, i1) => {
          d.beginPath();
          for (let i = i0; i <= i1; i++) d.lineTo(up[i][0], up[i][1]);
          for (let i = i1; i >= i0; i--) d.lineTo(dn[i][0], dn[i][1]);
          d.closePath(); d.fill();
        }));
        flush(L.soft ?? 0.001, (L.a ?? 1) * col[3]);
        break;
      }
      case 'spots': {
        const rv = L.rv ?? 0.4, irr = L.irr ?? 0.35, el = L.el ?? 1, ang = L.ang ?? 0;
        const core = rgbOf(L.c);
        for (const flip of [false, true]) {
          const R = rng(seed + (L.seed ?? 0) + L.n + li * 7 + (flip ? 11731 : 0));
          const pts = place(L.n, L.s0 ?? 0.02, L.s1 ?? 0.99, L.h0 ?? 0, L.h1 ?? 1, L.bias ?? 1, L.even ?? 0.5, R);
          const sz = pts.map(() => L.r * (1 - rv / 2 + R() * rv));
          const shp = pts.map(() => [R(), R(), R(), R(), R(), R()]);
          flank(d, flip, () => pts.forEach(([s, h], i) => {
            const radius = sz[i] * clamp(hp(s) / hp(0.4), 0.48, 1.12);
            if (L.ring) { d.fillStyle = L.ring; blob(d, s, h, radius * (L.rw ?? 1.45), irr * 0.7, el, ang, shp[i]); d.fill(); }
            if (L.hole) { d.globalCompositeOperation = 'destination-out'; d.fillStyle = '#000'; } else d.fillStyle = css(core);
            blob(d, s, h, radius, irr, el, ang, shp[i]); d.fill();
            d.globalCompositeOperation = 'source-over';
          }));
        }
        flush(L.soft ?? Math.min(0.0012, L.r * 0.16), (L.a ?? 1) * (L.hole ? 1 : core[3]));
        break;
      }
      case 'lattice': {
        const col = rgbOf(L.c);
        for (const flip of [false, true]) {
          const R = rng(seed * 67 + (L.seed ?? 0) * 1117 + li * 47 + (flip ? 20117 : 0));
          flank(d, flip, () => {
            d.fillStyle = css(col);
            for (let row = 0; row < L.rows; row++) for (let column = 0; column < L.cols; column++) {
              if (R() < (L.skip ?? 0.1)) continue;
              const gapS = (L.s1 - L.s0) / L.cols, gapH = (L.h1 - L.h0) / L.rows;
              const j = L.jitter ?? 0.2;
              const s = L.s0 + (column + 0.5 + (row % 2) * 0.17 + (R() - 0.5) * j) * gapS;
              const h = L.h0 + (row + 0.5 + (R() - 0.5) * j) * gapH;
              if (s > L.s1 || h > L.h1) continue;
              const sz = L.r * (0.7 + 0.55 * R()) * Math.sqrt(clamp(hp(s) / hp(0.45), 0.35, 1.25));
              blob(d, s, h, sz, 0.18 + R() * 0.27, 0.85 + R() * 0.35, 0, [R(), R(), R(), R(), R(), R()]);
              d.fill();
            }
          });
        }
        flush(L.soft ?? 0.0007, (L.a ?? 1) * col[3]);
        break;
      }
      case 'blotch': {
        const R = rng(seed + (L.seed ?? 0) + L.n + li * 7);
        const pts = place(L.n, L.s0 ?? 0.02, L.s1 ?? 0.99, L.h0 ?? 0, L.h1 ?? 1, 1, 0.3, R);
        const sub = pts.map(() => Array.from({ length: 7 }, () => [R() - 0.5, R() - 0.5, 0.45 + R() * 0.5, R(), R(), R(), R(), R(), R()]));
        const col = rgbOf(L.c);
        d.fillStyle = css(col);
        both(d, () => pts.forEach(([s, h], i) => {
          for (const q of sub[i]) { blob(d, s + q[0] * L.r * 1.4, h + (q[1] * L.r * 1.4) / hp(s), L.r * q[2], 0.7, 1, 0, q.slice(3)); d.fill(); }
        }));
        flush(L.soft ?? Math.max(0.0016, L.r * 0.12), (L.a ?? 1) * col[3]);
        break;
      }
      case 'reticulate': {
        // snakeskin / mosaic net: irregular cell outlines, drawn in pixel space for even stroke width
        const r2 = rng(seed + (L.seed ?? 0) + 913);
        const s0 = L.s0 ?? 0.2, s1 = L.s1 ?? 0.98, h0 = L.h0 ?? 0.08, h1 = L.h1 ?? 0.8;
        const ds = (s1 - s0) / L.n;
        const cells: [number, number][] = [];
        for (let sc0 = s0 + ds / 2; sc0 < s1; sc0 += ds) {
          const dh = ds / hp(sc0);
          for (let hc = h0 + dh / 2; hc < h1; hc += dh) cells.push([sc0 + (r2() - 0.5) * ds * 0.45, hc + (r2() - 0.5) * dh * 0.45]);
        }
        const col = rgbOf(L.c);
        d.save();
        d.setTransform(1, 0, 0, 1, 0, 0);
        d.strokeStyle = css(col);
        d.lineJoin = 'round';
        for (const flip of [false, true]) {
          for (const [sc0, hc] of cells) {
            const rr = rng(Math.floor(sc0 * 1e5 + hc * 1e4));
            d.lineWidth = Math.max(1, (L.w ?? 0.003) * TW * (0.5 + 0.4 * rr()));
            d.globalAlpha = smooth(s0, s0 + 0.05, sc0) * (1 - smooth(s1 - 0.05, s1, sc0)) * smooth(h0, h0 + 0.06, hc) * (1 - smooth(h1 - 0.12, h1, hc));
            d.beginPath();
            const K = 8, a0 = rr() * 6.28;
            for (let k = 0; k <= K; k++) {
              const aa = a0 + (k / K) * Math.PI * 2;
              const rad = ds * (0.4 + rr() * 0.16);
              const x = model.uOf(sc0 + Math.cos(aa) * rad) * TW;
              const yy = (hc + (Math.sin(aa) * rad) / hp(sc0)) * (TH / 2);
              const y = flip ? TH - yy : yy;
              if (k === 0) d.moveTo(x, y); else d.lineTo(x, y);
            }
            d.stroke();
          }
        }
        d.restore();
        flush(L.soft ?? 0.0007, (L.a ?? 1) * col[3]);
        break;
      }
      case 'scaleFill': {
        // a pigment spot in the centre of every scale (parrotfishes, some wrasses) – on the shader's lattice
        const { n, rows } = lattice;
        const dx = 1 / n, dh = 1 / rows, rr = L.r ?? 0.34;
        const col = rgbOf(L.c);
        const R = rng(seed + 4411);
        d.save();
        d.setTransform(1, 0, 0, 1, 0, 0);
        d.fillStyle = css(col);
        for (const flip of [false, true]) {
          for (let i = Math.floor(n * Math.max(L.s0 ?? 0, sp.HL * 0.9)); i < n; i++) {
            for (let j = 0; j < rows; j++) {
              const sc0 = (i + 0.5 + (j % 2) * 0.5) * dx, hc = (j + 0.5) * dh;
              if (hc < (L.h0 ?? 0.04) || hc > (L.h1 ?? 0.9) || sc0 > 0.995) continue;
              const yy = hc * (TH / 2), k = 0.75 + 0.5 * R();
              d.globalAlpha = 0.6 + 0.4 * R();
              d.beginPath();
              d.ellipse(model.uOf(sc0 - dx * 0.06) * TW, flip ? TH - yy : yy, ((dx * rr * k) / spanS) * TW, dh * rr * 1.1 * k * (TH / 2), 0, 0, Math.PI * 2);
              d.fill();
            }
          }
        }
        d.restore();
        flush(0.0005, (L.a ?? 0.85) * col[3]);
        break;
      }
      case 'flow': {
        const col = rgbOf(L.c), R = rng(seed * 53 + li * 97 + (L.seed ?? 0) * 1009);
        const hEye = sp.eye.d ? model.phiAtY(sp.eye.s, model.normY(sp.eye.s, model.eyeYn)) / Math.PI : 0.4;
        d.fillStyle = css(col);
        for (let i = 0; i < L.n; i++) {
          const hb = lerp(L.h0, L.h1, (i + 0.5) / L.n);
          // Neighbouring pigment streamlines share an underlying flow. Independent phases would cross into a web.
          const phase = i * 0.24 + R() * 0.25, freq = L.freq * (0.96 + R() * 0.06);
          const offset = (R() - 0.5) * (L.h1 - L.h0) / L.n * 0.2;
          const start = L.s0 + R() * 0.035, end = L.s1 - R() * 0.035;
          const pts: Pt[] = [];
          for (let k = 0; k <= 145; k++) {
            const t = k / 145, s = lerp(start, end, t);
            const wave = Math.sin(s * freq + phase) * 0.67 + Math.sin(s * freq * 1.95 + phase * 1.3) * 0.16;
            const meander = n1(s * 6.5 + i * 0.23, seed * 29 + li) * 0.12;
            let h = hb + offset + (L.slant ?? 0) * (s - 0.5) + L.amp * (wave + meander);
            if (sp.eye.d && s < sp.HL + 0.1) {
              const eyeX = (s - sp.eye.s) / Math.max(0.035, sp.eye.d * 2.2);
              const eyeY = (hb - hEye) / 0.2;
              h += Math.sign(eyeY || 1) * 0.033 * Math.exp(-2.8 * eyeX * eyeX - eyeY * eyeY);
            }
            pts.push([s, clamp(h, 0.005, 0.995)]);
          }
          both(d, () => { ribbon(d, pts, L.w * (0.72 + R() * 0.42), hp, 0, true); d.fill(); });
        }
        flush(L.soft ?? 0.0006, (L.a ?? 1) * col[3]);
        break;
      }
      case 'waves': {
        const col = rgbOf(L.c), rough = L.rough ?? 0.0012, sd = seed * 7 + li * 53;
        d.strokeStyle = css(col);
        d.lineCap = 'round';
        if (L.vertical) {
          both(d, () => {
            d.lineWidth = L.w * 0.25;
            const h0 = L.h0 ?? 0.04, h1 = L.h1 ?? 0.96, s0 = L.s0 ?? 0, s1 = L.s1 ?? 1;
            for (let i = 0; i < L.n; i++) {
              const sb = s0 + (s1 - s0) * ((i + 0.5) / L.n);
              d.beginPath();
              for (let k = 0; k <= 80; k++) {
                const h = h0 + (h1 - h0) * (k / 80);
                const sx = sb + L.amp * 0.02 * Math.sin(h * L.freq + i * 1.7) + (L.slant ?? 0) * (h - 0.5) + rough * n1(h * 8 + i * 3.1, sd);
                if (k === 0) d.moveTo(sx, h); else d.lineTo(sx, h);
              }
              d.stroke();
            }
          });
        } else {
          both(d, () => {
            const h0 = L.h0 ?? 0.02, h1 = L.h1 ?? 0.98, s0 = L.s0 ?? 0, s1 = L.s1 ?? 1;
            for (let i = 0; i < L.n; i++) {
              const hb = h0 + (h1 - h0) * ((i + 0.5) / L.n);
              for (let k = 0; k < 120; k++) {
                const sA = s0 + (s1 - s0) * (k / 120), sB = s0 + (s1 - s0) * ((k + 1) / 120);
                const hA = hb + (L.amp * Math.sin(sA * L.freq + i * 1.7)) / hp(sA) * 0.1 + (L.slant ?? 0) * (sA - 0.5) + (rough / hp(sA)) * n1(sA * 11 + i * 2.3, sd);
                const hB = hb + (L.amp * Math.sin(sB * L.freq + i * 1.7)) / hp(sB) * 0.1 + (L.slant ?? 0) * (sB - 0.5) + (rough / hp(sB)) * n1(sB * 11 + i * 2.3, sd);
                d.lineWidth = (L.w / hp(sA)) * 0.5;
                d.beginPath(); d.moveTo(sA, hA); d.lineTo(sB, hB); d.stroke();
              }
            }
          });
        }
        flush(L.soft ?? 0.0008, (L.a ?? 1) * col[3]);
        break;
      }
      case 'mottle':
      case 'vermic': {
        const col = rgbOf(L.c), sd = seed * 13 + (L.seed ?? 0) * 7 + li * 211;
        const [kx, ky] = L.st ?? [1, 1];
        const W0 = Math.round(clamp((spanS / L.sc) * (L.k === 'vermic' ? 72 : 40), 384, 1024));
        if (L.k === 'mottle') {
          const th = L.th ?? 0.55, sf = L.soft ?? 0.06;
          fieldOnto(W0, (s, y) => {
            const x = (s / L.sc) * kx, yy = (y / L.sc) * ky;
            const wx = fbm(x + 3.1, yy + 7.7, sd, 3) - 0.5, wy = fbm(x + 11.3, yy + 2.9, sd + 1, 3) - 0.5;
            return smooth(th - sf, th + sf, fbm(x + wx * 1.7, yy + wy * 1.7, sd + 2, 4));
          }, L.s0 ?? model.sMin, L.s1 ?? 1, L.h0 ?? 0, L.h1 ?? 1);
        } else {
          const w = L.w ?? 0.05;
          fieldOnto(W0, (s, y) => {
            const x = (s / L.sc) * kx, yy = (y / L.sc) * ky;
            const wx = fbm(x + 5.3, yy + 1.1, sd, 3) - 0.5, wy = fbm(x + 2.2, yy + 8.4, sd + 1, 3) - 0.5;
            return 1 - smooth(w * 0.5, w, Math.abs(fbm(x + wx * 1.3, yy + wy * 1.3, sd + 2, 4) - 0.5));
          }, L.s0 ?? model.sMin, L.s1 ?? 1, L.h0 ?? 0, L.h1 ?? 1);
        }
        tint(col);
        flush(0.0004, (L.a ?? 1) * col[3]);
        break;
      }
      case 'line': {
        const col = rgbOf(L.c);
        const pts = crm(pairs(L.p), false, 12);
        d.fillStyle = css(col);
        both(d, () => { ribbon(d, pts, L.w, hp, L.taper ?? 0); d.fill(); });
        flush(L.soft ?? 0.0008, (L.a ?? 1) * col[3]);
        break;
      }
      case 'patch': {
        const col = rgbOf(L.c), rough = L.rough ?? 0.002, sd = seed * 7 + li * 71;
        const pts = crm(pairs(L.p), true, 14).map(([s, h], i, arr) => {
          const t = i / arr.length;
          return [s + rough * n1(t * 23, sd), h + (rough / hp(s)) * n1(t * 23, sd + 5)] as Pt;
        });
        d.fillStyle = css(col);
        both(d, () => { d.beginPath(); pts.forEach(([s, h], k) => (k ? d.lineTo(s, h) : d.moveTo(s, h))); d.closePath(); d.fill(); });
        flush(L.soft ?? 0.0015, (L.a ?? 1) * col[3]);
        break;
      }
      case 'row': {
        const col = rgbOf(L.c), R = rng(seed + li * 17);
        const s0 = L.s0 ?? 0.15, s1 = L.s1 ?? 0.9;
        const shp = Array.from({ length: L.n }, () => [R(), R(), R(), R(), R(), R()]);
        if (L.glow) { d.shadowColor = css(col); d.shadowBlur = (8 * TW) / 4096; }
        both(d, () => {
          for (let i = 0; i < L.n; i++) {
            const s = s0 + (s1 - s0) * (i / Math.max(1, L.n - 1));
            if (L.ring) { d.fillStyle = L.ring; blob(d, s, L.h, L.r * 1.5, 0.2, 1, 0, shp[i]); d.fill(); }
            d.fillStyle = css(col);
            blob(d, s, L.h, L.r, 0.25, 1, 0, shp[i]); d.fill();
          }
        });
        flush(L.soft ?? 0.0005, (L.a ?? 1) * col[3]);
        break;
      }
      case 'gills': {
        if (model.gills.length) break; // real slits with moving septal flaps are built by gills.ts
        d.strokeStyle = L.c;
        both(d, () => {
          for (const at of L.at) {
            d.lineWidth = 0.0025;
            d.beginPath();
            d.moveTo(at, L.h0 ?? 0.38);
            d.quadraticCurveTo(at - 0.006, ((L.h0 ?? 0.38) + (L.h1 ?? 0.72)) / 2, at + 0.002, L.h1 ?? 0.72);
            d.stroke();
          }
        });
        flush(0.0006);
        break;
      }
      case 'lateral': {
        const col = rgbOf(L.c);
        const pts: Pt[] = [];
        for (let k = 0; k <= 60; k++) pts.push([sp.HL * 0.9 + (1 - sp.HL * 0.9) * (k / 60), (L.h ?? 0.32) + 0.12 * Math.pow(k / 60, 1.3)]);
        d.fillStyle = css(col);
        both(d, () => { ribbon(d, pts, (L.w ?? 0.006) * 0.6, hp, 0.45); d.fill(); });
        flush(0.0008, (L.a ?? 1) * col[3]);
        break;
      }
      case 'photo': {
        const col = rgbOf(L.c);
        d.fillStyle = css(col);
        d.shadowColor = css(col); d.shadowBlur = (8 * TW) / 4096;
        const shp = [0.1, 0.4, 0.7, 0.2, 0.5, 0.3];
        both(d, () => {
          for (let i = 0; i < L.n; i++) {
            const s = (L.s0 ?? 0.15) + ((L.s1 ?? 0.9) - (L.s0 ?? 0.15)) * (i / Math.max(1, L.n - 1));
            blob(d, s, L.h, L.r ?? 0.006, 0.1, 1, 0, shp); d.fill();
          }
        });
        flush(0);
        break;
      }
      case 'scaleEdge':
        break; // pigmented scale margins are drawn per pixel by the shader, exactly on the scale relief
    }
  }
  // ── flatfishes: the blind side is a pale, unpigmented skin ───────────────
  if (sp.plan === 'flatR' || sp.plan === 'flatL') {
    // eyes.ts seats flatR eyes on the φ < π flank and flatL eyes on φ > π; the φ < π flank is the lower canvas half (flipY)
    const eyedRight = sp.plan === 'flatR';
    const y0 = eyedRight ? 0 : TH / 2;
    const B = rgbOf(c.blind ?? '#f1eee7');
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = css(B);
    g.fillRect(0, y0, TW, TH / 2);
    const cx = model.uOf(0.3) * TW, cy = y0 + TH / 4;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, TW * 0.2);
    rg.addColorStop(0, 'rgba(222,186,176,0.32)'); rg.addColorStop(1, 'rgba(222,186,176,0)');
    g.fillStyle = rg;
    g.fillRect(0, y0, TW, TH / 2);
    g.restore();
  }
  // ── natural variation: no living skin is evenly coloured – large and medium scale tonal drift ──
  {
    const vary = (scale: number, alpha: number, sd: number) => {
      const W0 = 512, H0 = 128;
      const fc = document.createElement('canvas');
      fc.width = W0; fc.height = H0;
      const fx = fc.getContext('2d')!;
      const img = fx.createImageData(W0, H0), D = img.data;
      for (let i = 0; i < W0; i++) {
        const s = model.sMin + ((i + 0.5) / W0) * spanS, hs = hp(s);
        for (let j = 0; j < H0; j++) {
          const v = fbm(s / scale, (((j + 0.5) / H0) * hs) / scale, sd, 4);
          const q = clamp(128 + (v - 0.5) * 300, 0, 255), k = (j * W0 + i) * 4;
          D[k] = q; D[k + 1] = q; D[k + 2] = q; D[k + 3] = 255;
        }
      }
      fx.putImageData(img, 0, 0);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = alpha;
      g.imageSmoothingEnabled = true;
      g.drawImage(fc, 0, 0, TW, TH / 2);
      g.translate(0, TH); g.scale(1, -1);
      g.drawImage(fc, 0, 0, TW, TH / 2);
      g.restore();
    };
    vary(0.07, c.trans ? 0.22 : 0.4, seed + 501);
    vary(0.022, c.trans ? 0.12 : 0.22, seed + 733);
  }
  // ── batoids: nostrils, nasal curtain, mouth and gill slits on the underside ──
  const face = rayFace(model);
  if (face.mouth.length || face.slits.length || face.nares.length) {
    both(g, () => {
      if (face.curtain.length) {
        g.fillStyle = 'rgba(255,255,255,0.1)';
        g.beginPath(); face.curtain.forEach(([s, h], k) => (k ? g.lineTo(s, h) : g.moveTo(s, h))); g.closePath(); g.fill();
        g.fillStyle = 'rgba(70,52,52,0.4)';
        ribbon(g, face.curtain.slice(2), 0.0016, hp); g.fill();
      }
      for (const o of face.nares) {
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.beginPath(); o.forEach(([s, h], k) => (k ? g.lineTo(s + 0.001, h) : g.moveTo(s + 0.001, h))); g.closePath(); g.fill();
        g.fillStyle = 'rgba(38,24,26,0.78)';
        g.beginPath(); o.forEach(([s, h], k) => (k ? g.lineTo(s, h) : g.moveTo(s, h))); g.closePath(); g.fill();
      }
      if (face.mouth.length) {
        g.fillStyle = 'rgba(205,160,160,0.35)';
        ribbon(g, face.mouth.map(([s, h]) => [s + 0.0028, h] as Pt), 0.0042, hp, 0.4); g.fill();
        g.fillStyle = 'rgba(34,18,20,0.88)';
        ribbon(g, face.mouth, 0.0024, hp, 0.55); g.fill();
      }
      for (const sl of face.slits) {
        g.fillStyle = 'rgba(255,255,255,0.12)';
        ribbon(g, sl.map(([s, h]) => [s - 0.0016, h] as Pt), 0.0022, hp, 0.3); g.fill();
        g.fillStyle = 'rgba(52,34,36,0.6)';
        ribbon(g, sl, 0.0016, hp, 0.3); g.fill();
      }
    });
  }
  // ── anatomy of the head, painted where the geometry puts it ───────────────
  const lm = landmarks(model);
  const dot = (s: number, h: number, r: number) => {
    const rh = r / hp(s);
    g.beginPath();
    g.ellipse(s, h, r, Math.min(rh, 0.5), 0, 0, Math.PI * 2);
  };
  const path = (pts: Pt[], ds = 0, dh = 0) => {
    g.beginPath();
    pts.forEach(([s, h], k) => (k ? g.lineTo(s + ds, h + dh) : g.moveTo(s + ds, h + dh)));
  };
  both(g, () => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const line of lm.gsh) {
      for (const [w, col] of [[0.011, 'rgba(8,3,5,0.1)'], [0.0045, 'rgba(26,6,8,0.3)']] as const) {
        g.strokeStyle = col; g.lineWidth = w;
        path(line, 0.0022); g.stroke();
      }
    }
    if (lm.preop.length) {
      g.strokeStyle = 'rgba(0,0,0,0.075)'; g.lineWidth = 0.0016;
      path(lm.preop); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 0.0016;
      path(lm.preop, -0.002); g.stroke();
    }
    if (lm.maxUp.length) {
      g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 0.0018;
      path(lm.maxUp); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 0.0016;
      path(lm.maxUp, 0, 0.006); g.stroke();
    }
    for (const line of lm.branch) {
      g.strokeStyle = 'rgba(0,0,0,0.05)'; g.lineWidth = 0.0014;
      path(line); g.stroke();
    }
    for (const [sn, hn, rr] of lm.nares) {
      g.fillStyle = 'rgba(255,255,255,0.07)';
      dot(sn, hn, rr * 1.38); g.fill();
      g.fillStyle = 'rgba(12,12,16,0.58)';
      dot(sn, hn, rr); g.fill();
    }
    if (!c.layers?.some((l) => l.k === 'lateral')) {
      g.fillStyle = 'rgba(0,0,0,0.13)';
      for (const [s, h] of lm.lat) { dot(s, h, 0.0011); g.fill(); }
    }
  });
  // living colour of the head over the pigment pattern (skull roof, orbital rim, opercular sheen, lips)
  paintHeadTone(g, model, seed, TW, TH);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  if (asyncPhotoTarget && typeof Image !== 'undefined') {
    const targetUrl = asyncPhotoTarget.url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      photoSkinCache.set(targetUrl, img);
      g.save();
      g.globalAlpha = photoBlend;
      g.drawImage(img, OX, 0, SX, TH / 2);
      g.save();
      g.translate(0, TH);
      g.scale(1, -1);
      g.drawImage(img, OX, 0, SX, TH / 2);
      g.restore();
      g.restore();
      paintHeadTone(g, model, seed, TW, TH);
      tex.needsUpdate = true;
    };
    img.src = targetUrl;
  }
  return { tex, canvas: cv };
}
/** grayscale height map: dermal warts / plates, the bony relief of the head and the batoid ventral face (scales are procedural) */
export function paintBump(model: BodyModel, seed: number) {
  const sp = model.sp;
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, cv.width, cv.height);
  const R = rng(seed ^ 0x9e3779b9);
  const W = cv.width, H = cv.height;
  const k = sp.skin.kind;
  if (k === 'warty' || k === 'bony') {
    for (let i = 0; i < (k === 'warty' ? 2600 : 1400); i++) {
      const x = R() * W, y = R() * H, r = 1 + R() * (k === 'warty' ? 6 : 3);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.8)');
      gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  const spanB = 1 - model.sMin;
  const SXB = W / spanB, OXB = (-model.sMin / spanB) * W;
  const hp = (s: number) => model.halfPerim(clamp(s, model.sMin + 0.001, 0.999));
  const both = (fn: () => void) => {
    g.save(); g.setTransform(SXB, 0, 0, H / 2, OXB, 0); fn(); g.restore();
    g.save(); g.setTransform(SXB, 0, 0, -H / 2, OXB, H); fn(); g.restore();
  };
  const path = (pts: Pt[], ds = 0, dh = 0) => {
    g.beginPath();
    pts.forEach(([s, h], i) => (i ? g.lineTo(s + ds, h + dh) : g.moveTo(s + ds, h + dh)));
  };
  const dot = (s: number, h: number, r: number) => {
    g.beginPath();
    g.ellipse(s, h, r, Math.min(r / hp(s), 0.5), 0, 0, Math.PI * 2);
  };
  const lm = landmarks(model);
  const face = rayFace(model);
  both(() => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (lm.oper.length) {
      const hx = sp.HL * 0.64, hy = 0.36;
      g.strokeStyle = 'rgba(176,176,176,0.2)'; g.lineWidth = 0.0013;
      for (let i = 2; i < lm.oper.length - 2; i += 5) { g.beginPath(); g.moveTo(hx, hy); g.lineTo(lm.oper[i][0] - 0.004, lm.oper[i][1]); g.stroke(); }
    }
    if (lm.preop.length) {
      g.strokeStyle = 'rgba(196,196,196,0.4)'; g.lineWidth = 0.004;
      path(lm.preop, -0.003); g.stroke();
      g.strokeStyle = 'rgba(60,60,60,0.55)'; g.lineWidth = 0.002;
      path(lm.preop); g.stroke();
    }
    if (lm.maxUp.length) {
      g.fillStyle = 'rgba(184,184,184,0.45)';
      g.beginPath();
      lm.maxUp.forEach(([s, h], i) => (i ? g.lineTo(s, h) : g.moveTo(s, h)));
      for (let i = lm.maxLo.length - 1; i >= 0; i--) g.lineTo(lm.maxLo[i][0], lm.maxLo[i][1]);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(52,52,52,0.6)'; g.lineWidth = 0.0018;
      path(lm.maxUp); g.stroke();
    }
    for (const line of lm.branch) {
      g.strokeStyle = 'rgba(190,190,190,0.4)'; g.lineWidth = 0.0032;
      path(line, 0, -0.006); g.stroke();
      g.strokeStyle = 'rgba(70,70,70,0.5)'; g.lineWidth = 0.0016;
      path(line); g.stroke();
    }
    for (const [sn, hn, rr] of lm.nares) {
      g.fillStyle = 'rgba(182,182,182,0.42)';
      dot(sn, hn, rr * 1.48); g.fill();
      g.fillStyle = 'rgba(32,32,32,0.88)';
      dot(sn, hn, rr); g.fill();
    }
    g.fillStyle = 'rgba(48,48,48,0.75)';
    for (const [s, h] of lm.lat) { dot(s, h, 0.0013); g.fill(); }
    // batoid ventral face: raised lips around a deep cleft, nostril pits under a fleshy curtain, gill-slit grooves
    if (face.curtain.length) {
      g.fillStyle = 'rgba(176,176,176,0.6)';
      g.beginPath(); face.curtain.forEach(([s, h], i) => (i ? g.lineTo(s, h) : g.moveTo(s, h))); g.closePath(); g.fill();
    }
    for (const o of face.nares) {
      g.fillStyle = 'rgba(200,200,200,0.7)';
      g.beginPath(); o.forEach(([s, h], i) => (i ? g.lineTo(s + 0.0012, h) : g.moveTo(s + 0.0012, h))); g.closePath(); g.fill();
      g.fillStyle = 'rgba(24,24,24,0.95)';
      g.beginPath(); o.forEach(([s, h], i) => (i ? g.lineTo(s, h) : g.moveTo(s, h))); g.closePath(); g.fill();
    }
    if (face.mouth.length) {
      g.fillStyle = 'rgba(214,214,214,0.85)';
      ribbon(g, face.mouth, 0.0085, hp, 0.4); g.fill();
      g.fillStyle = 'rgba(16,16,16,0.95)';
      ribbon(g, face.mouth, 0.0028, hp, 0.5); g.fill();
    }
    for (const sl of face.slits) {
      g.fillStyle = 'rgba(206,206,206,0.75)';
      ribbon(g, sl.map(([s, h]) => [s - 0.0018, h] as Pt), 0.003, hp, 0.3); g.fill();
      g.fillStyle = 'rgba(30,30,30,0.9)';
      ribbon(g, sl, 0.0019, hp, 0.3); g.fill();
    }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}
