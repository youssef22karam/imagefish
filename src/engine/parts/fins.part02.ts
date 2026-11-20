     return edge * (radius * Math.pow(1 - smooth(0, lobe ? 0.49 : 0.25, vv), 2) + 0.00078 * L);
    };
    const spacing = (f.base * L + f.len * L * spread) / Math.max(1, rays);
    const weight = (_u: number, vv: number) => smooth(0.075, 0.75, vv);
    const skinRoot = (uu: number, sgn: 1 | -1) => {
      const b = base(uu);
      const target = b.p.clone().addScaledVector(finN, sgn * thick(uu, 0));
      const foot = model.drop(target, b.n, Math.max(0.005 * L, radius * 1.5));
      const normal = model.normalAt(foot.s, foot.phi);
      return { ...foot, p: foot.p.addScaledVector(normal, -0.00085 * L), n: normal };
    };
    const soles = [1, -1].map((sgn) => Array.from({ length: NU + 1 }, (_, i) => skinRoot(i / NU, sgn as 1 | -1)));
    const sole = (uu: number, sgn: 1 | -1) => soles[sgn > 0 ? 0 : 1][Math.round(uu * NU)];
    const rightG = finShell({
      nu: NU, nv: NV, rays, vPow: 1.43, mid, thick,
      ridge: Math.min(0.17 * spacing, 0.0021 * L), pleat: Math.min(0.15 * spacing, 0.0048 * L),
      root: sole,
      shape: (uu, vv, sgn, q) => {
        const b = base(uu);
        const correction = sole(uu, sgn).p.clone().sub(b.p.clone().addScaledVector(b.n, -0.00075 * L).addScaledVector(finN, sgn * thick(uu, 0)));
        q.addScaledVector(correction, 1 - smooth(0, 0.19, vv));
        if (contact && vv > 0.02) {
          const skin = contact(q);
          if (skin > 0.0002 * L) q.z += Math.max(0, skin + 0.0016 * L - q.z) * smooth(0.02, 0.19, vv);
        }
        return q;
      },
      uv: (uu, _vv, sgn) => { const b = sole(uu, sgn); return [model.uOf(b.s), b.phi / (2 * Math.PI)]; },
      pose: (uu, vv, sgn) => {
        const b = sole(uu, sgn);
        // The edge of the shoulder flexes with the skin; the free ray retains its joint's motion.
        return vv < 0.06 ? model.poseAt(b.s, b.phi) : base(uu).pose;
      },
      weight, kind: 2, side: 1,
    });
    const isPec = which === 'pec';
    const rowAxis = chord.clone();
    if (new THREE.Vector3().crossVectors(rowAxis, dir).dot(at.n) < 0) rowAxis.negate();
    const joint: Joint = {
      kind: 2, pivot: at.p.clone(), axis: rowAxis, axis2: dir.clone(),
      amp: (isPec ? (labriform ? 0.47 : cart ? 0.085 : 0.28) : (cart ? 0.045 : 0.18)) * clamp(f.row ?? 1, 0.3, model.bent ? 0.78 : 1.2),
      amp2: isPec ? (labriform ? 0.37 : cart ? 0.052 : 0.23) : 0.13,
      freq: labriform ? 6.4 : 4.3, phase: isPec ? 0 : 1.7,
    };
    const mat = finMaterial(ctx, { ...f, rays, alpha: cart ? 1 : f.alpha, solid: cart, root: cart ? 0.25 : lobe ? 0.35 : 0.16 }, joint);
    addMesh(rightG, mat, cart ? 2 : 4, true).name = `fin:paired:${which}:R`;
    addMesh(mirrorZ(rightG, -1, true), mat, cart ? 2 : 4, true).name = `fin:paired:${which}:L`;
    if (!cart && (f.spine ?? (which === 'pel' && hasSpinyDorsal))) {
      const pts = Array.from({ length: 16 }, (_, k) => mid(0.03, k / 15).p);
      const r0 = clamp(0.20 * spacing, 0.0008 * L, 0.004 * L);
      const b = baseAt(0.03);
      const sg = tubeAlong(pts, (k) => r0 * Math.pow(1 - k / 15, 1.2), 8,
        (k) => ({ ...b.pose, fin: [weight(0, k / 15), 0.03, k / 15, 2], side: 1 }));
      const sm = spineMat(f.color, joint);
      addMesh(sg, sm, 3, true);
      addMesh(mirrorZ(sg, -1, true), sm, 3, true);
    }
  };
  if (fs.pec) paired(fs.pec, 'pec');
  if (fs.pel) paired(fs.pel, 'pel');

  // ── 4. gonopodium (male livebearers): modified anal fin rod with a hooked tip ──
  if (fs.gono) {
    const go = fs.gono;
    const fr = model.frame(go.s);
    const base = model.local(go.s, -model.bot(go.s) * 0.92, 0);
    const K = 16;
    const pts = Array.from({ length: K + 1 }, (_, k) => {
      const t = k / K;
      return base.clone().addScaledVector(fr.T, t * go.len * L).addScaledVector(fr.N, (-0.22 * t + 0.16 * Math.pow(t, 5)) * go.len * L);
    });
    const r0 = 0.0085 * L;
    const g = tubeAlong(pts, (k) => r0 * (k === 0 ? 1.6 : 1) * (1 - 0.72 * (k / K)) * (k === K ? 0.25 : 1), 8,
      (k) => ({ fin: [Math.pow(k / K, 1.3), 0.5, k / K, 1], uv: [model.uOf(go.s), 0.5] }));
    const joint: Joint = { kind: 1, amp: 0.02, freq: 3.1, phase: 0.6 };
    const gm = patchMaterial(new THREE.MeshPhysicalMaterial({ color: go.color ?? fs.color, roughness: 0.4, clearcoat: 0.5 }), ctx.u, undefined, { joint });
    ctx.track(gm);
    addMesh(g, gm, 3, true);
  }
}
