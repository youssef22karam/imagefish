 g.eV = range(r, 0.5, 0.72);
        whip = chance(r, 0.45);
        if (whip) { g.sP = 1; g.P = range(r, 0.008, 0.02); g.tD = range(r, 1.2, 1.9); g.tV = range(r, 1.2, 1.9); }
        else { g.sP = range(r, 0.9, 0.95); g.P = range(r, 0.035, 0.06); g.tD = range(r, 0.7, 1.15); g.tV = range(r, 0.7, 1.15); }
        W = range(r, 0.5, 0.8); Wh = range(r, 1.1, 1.5); HL = range(r, 0.34, 0.46);
        break;
      case 'hatchet':
        g.D = range(r, 0.4, 0.64); g.df = range(r, 0.26, 0.4); g.pD = range(r, 0.3, 0.42); g.pV = range(r, 0.26, 0.38); g.eD = range(r, 0.5, 0.72); g.eV = range(r, 0.45, 0.6);
        g.tD = range(r, 0.7, 1); g.tV = range(r, 1.1, 1.7); g.P = range(r, 0.04, 0.065); g.sP = range(r, 0.84, 0.9);
        W = range(r, 0.17, 0.3); keelV = range(r, 0.6, 0.9); HL = range(r, 0.28, 0.35);
        break;
      case 'tadpole':
        g.D = range(r, 0.16, 0.29); g.pD = range(r, 0.13, 0.22); g.pV = range(r, 0.17, 0.27); g.eD = range(r, 0.45, 0.62); g.eV = range(r, 0.5, 0.7);
        g.tD = range(r, 1.2, 1.9); g.tV = range(r, 1.2, 1.9); g.P = range(r, 0.008, 0.02); g.sP = 1; whip = true;
        W = range(r, 0.78, 1.05); Wh = range(r, 1.1, 1.35); HL = range(r, 0.22, 0.31);
        break;
      default: // shark
        g.D = benthicShark ? range(r, 0.11, 0.16) : range(r, 0.13, 0.21); g.df = range(r, 0.52, 0.58); g.pD = range(r, 0.3, 0.42); g.pV = g.pD + range(r, 0.02, 0.1);
        g.eD = range(r, 0.8, 1.08); g.eV = range(r, 0.7, 0.92); g.tD = range(r, 0.7, 1); g.tV = range(r, 0.7, 1.05); g.P = range(r, 0.03, 0.046); g.sP = range(r, 0.92, 0.955);
        W = benthicShark ? range(r, 0.95, 1.3) : range(r, 0.7, 0.9); Wh = range(r, 1.05, 1.32); bellyFlat = benthicShark ? range(r, 0.5, 0.8) : range(r, 0.2, 0.4); HL = range(r, 0.19, 0.25); sq = 2.05;
        if (speed > 0.8) keel = range(r, 0.014, 0.024);
    }
    g.pedY = whip ? 0 : g.P * range(r, -0.08, 0.14);
    // optional relief
    const humps: [number, number, number, number][] = [];
    const firm = !whip && !sharky && plan !== 'arrow';
    if (firm && (plan === 'disc' || plan === 'spindle') && !deep && speed < 0.7 && chance(r, 0.1 + 0.16 * wild)) {
      humps.push([HL * range(r, 0.55, 0.9), g.D * range(r, 0.07, 0.15), range(r, 0.05, 0.09), 1]);
      notes.push({ icon: '⌒', title: 'Nuchal hump', text: 'A fatty forehead hump — a dominance signal that grows with social rank.' });
    }
    if (firm && plan === 'spindle' && (niche === 'benthivore' || niche === 'grazer') && chance(r, 0.4)) { humps.push([g.pD, g.D * range(r, 0.06, 0.12), 0.12, 1]); bellyFlat = Math.max(bellyFlat, range(r, 0.3, 0.6)); }
    if (firm && plan === 'spindle' && chance(r, 0.12 * wild) && speed < 0.6) humps.push([g.pV, g.D * range(r, 0.06, 0.14), 0.1, -1]);
    g.humps = humps;
    // forceps / tube snout: precision feeders in cluttered habitat
    const precise = niche === 'picker' || niche === 'cryptic';
    const forceps = precise && (plan === 'disc' || plan === 'arrow' || plan === 'spindle') && H.struct > 0.5
      && chance(r, plan === 'arrow' ? 0.55 : plan === 'disc' ? 0.3 + 0.2 * wild : 0.12);
    if (forceps) {
      g.sn = plan === 'arrow' ? range(r, 0.1, 0.2) : range(r, 0.06, 0.13);
      g.snR = Math.max(0.0075, g.D * (plan === 'arrow' ? range(r, 0.09, 0.14) : range(r, 0.028, 0.045)));
      g.eD = Math.max(g.eD, 0.95); g.eV = Math.max(g.eV, 0.9);
      g.pD = Math.max(g.pD, g.sn + 0.2); g.pV = Math.max(g.pV, g.sn + 0.22);
      HL = Math.max(HL, g.sn + range(r, 0.14, 0.19));
      notes.push({ icon: '⟝', title: plan === 'arrow' ? 'Tube snout' : 'Forceps snout', text: 'The jaws are carried at the end of a long, narrow snout — a pair of tweezers that reaches where no head can follow.' });
    }
    HL = clamp(HL, 0.06, 0.48);
    const o = outline(g);
    const prof = buildProfile(o.d, o.v, clamp(Math.min(g.eD, g.eV) * 0.78, 0.44, 0.92));

    // 5 ── jaws
    let mouth: MouthSpec;
    let rostrum: Species['rostrum'];
    let beakNote = false;
    if (sharky) {
      const filt = niche === 'filter';
      mouth = filt
        ? { s: 0, y: -0.15, gape: r4(range(r, 0.07, 0.09)), angle: 2, curve: 0, open: 36, jut: 0, lip: 0.2, gular: 0.8, teeth: 'fine', tn: 20, ts: 0.002, kind: 'jaw' }
        : { s: r4(range(r, 0.035, 0.075)), y: -0.78, gape: r4(benthicShark ? range(r, 0.04, 0.056) : range(r, 0.066, 0.095)), angle: r4(range(r, 9, 15)), curve: 0.06, open: benthicShark ? 24 : 28, jut: 0, lip: 0.22, protrude: 0.2, gular: 0.22, teeth: benthicShark ? 'fine' : pick(r, ['shark', 'shark', 'tri'] as TeethKind[]), tn: 12, ts: r4(benthicShark ? 0.004 : range(r, 0.008, 0.013)), throat: 0.08, kind: 'jaw' };
      if (filt) { Wh = range(r, 1.25, 1.4); W = Math.max(W, 0.95); }
    } else if (forceps) {
      mouth = { s: 0, y: 0, gape: r4(range(r, 0.012, 0.02)), angle: r4(range(r, 4, 14)), curve: 0, open: 26, jut: 0, lip: 0.3, protrude: 0.5, gular: 0.4, teeth: 'none', tn: 0, ts: 0.003, kind: 'jaw' };
    } else {
      mouth = jaws(niche, HL, r, plan === 'maw' ? 1.25 : plan === 'eel' || plan === 'ribbon' ? 0.9 : plan === 'globe' || plan === 'disc' ? 0.8 : 1);
      if (plan === 'maw') { mouth.gape = r4(Math.min(HL * 0.8, Math.max(mouth.gape, HL * range(r, 0.55, 0.78)))); mouth.open = Math.round(range(r, 52, 72)); mouth.gular = 0.7; }
      if (plan === 'globe' || ((niche === 'grazer' || niche === 'crusher') && plan === 'disc' && H.id === 'reef' && chance(r, 0.5))) { mouth.teeth = 'beak'; mouth.tn = 4; mouth.beak = pick(r, ['#e8e0c8', '#dfe6e0', '#c8d8d0', '#f0e6d2']); mouth.sup = false; mouth.lip = 0.8; beakNote = true; }
      if (plan === 'bottom' && niche === 'grazer') { mouth.s = r4(range(r, 0.014, 0.03)); mouth.y = r4(range(r, -0.7, -0.45)); mouth.lip = 1; mouth.sup = false; }
      // surface feeders of still, structured water look up
      if (!mouth.sup && mouth.s === 0 && (H.id === 'swamp' || H.id === 'estuary' || H.id === 'amazon') && (niche === 'picker' || niche === 'planktivore') && chance(r, 0.4)) { mouth.sup = true; mouth.angle = r4(range(r, 34, 50)); mouth.y = r4(range(r, 0.05, 0.3)); mouth.jut = 0.006; }
    }
    notes.push({ icon: '⌓', title: `${niche[0].toUpperCase() + niche.slice(1)} jaws`, text: forceps ? DIET_TXT.picker : beakNote ? 'Teeth fused into a parrot-like beak that shears coral, shell and spine.' : DIET_TXT[niche] });
    // bills & paddles
    if (plan === 'spindle' && (niche === 'apex' || niche === 'pursuit') && H.id === 'pelagic' && lenM > 0.8 && chance(r, 0.22 + 0.12 * wild)) {
      const sword = chance(r, 0.4);
      rostrum = { kind: sword ? 'sword' : 'bill', len: r4(sword ? range(r, 0.24, 0.34) : range(r, 0.14, 0.26)), r: r4(range(r, 0.013, 0.019)), ...(sword ? { flat: 0.6 } : {}) };
      mouth = { ...mouth, s: 0.004, y: -0.85, angle: 5, jut: 0, sup: false, teeth: 'fine', ts: 0.003 };
      notes.push({ icon: '⟋', title: sword ? 'Sword' : 'Bill', text: 'The upper jaw is drawn out into a rigid spear: slashed through shoals to stun prey, and a low-drag bow at speed.' });
    } else if ((plan === 'arrow' || sharky) && niche === 'filter' && fresh) {
      rostrum = { kind: 'paddle', len: r4(range(r, 0.3, 0.5)), r: r4(range(r, 0.034, 0.045)) };
      notes.push({ icon: '⟋', title: 'Paddle rostrum', text: 'A long paddle studded with electroreceptors detects swarms of plankton in muddy water.' });
    } else if (sharky && benthicShark && (H.id === 'estuary' || H.id === 'sandflat' || H.id === 'river') && chance(r, 0.22)) {
      rostrum = { kind: 'saw', len: r4(range(r, 0.2, 0.3)), r: r4(range(r, 0.02, 0.028)), flat: 0.6 };
      notes.push({ icon: '⟋', title: 'Saw rostrum', text: 'A toothed blade swung sideways through the mud to stun and dig out prey.' });
    }

    // 6 ── eyes
    const top = plan === 'bottom' && chance(r, 0.62); // eyes on top of the head
    let ed = eyeRel * HL * (sharky ? 0.55 : plan === 'eel' ? 0.85 : plan === 'maw' ? 0.6 : 1);
    ed = clamp(ed, 0, Math.max(0.008, g.D * (plan === 'eel' ? 0.34 : 0.3)));
    const snoutLen = sharky ? Math.max(mouth.s + 0.012, HL * range(r, 0.32, 0.42))
      : forceps ? (g.sn ?? 0) + ed * 0.9 + 0.012
        : HL * (plan === 'maw' ? range(r, 0.12, 0.22) : plan === 'arrow' ? range(r, 0.42, 0.56) : niche === 'apex' || niche === 'pursuit' ? range(r, 0.34, 0.44) : range(r, 0.26, 0.4));
    const eye: Species['eye'] = {
      s: r4(Math.max(snoutLen, ed * 0.75 + 0.006)), y: r4(top ? range(r, 0.8, 0.98) : sharky ? range(r, 0.15, 0.35) : mouth.sup ? range(r, 0.45, 0.62) : range(r, 0.24, 0.52)), d: r4(ed), iris: '#c8a040',
      ...(shine !== undefined ? { shine } : {}),
    };
    if (top && ed > 0) {
      eye.bulge = r4(range(r, 0.45, 0.8));
      if ((H.id === 'estuary' || H.id === 'swamp' || (H.id === 'rocky' && chance(r, 0.3))) && chance(r, 0.6)) {
        eye.bulge = 1; eye.close = r4(range(r, 0.3, 0.5)); eye.stalk = r4(range(r, 0.45, 0.9)); eye.pupil = 'slitH'; eye.y = 0.98; eye.d = r4(Math.max(eye.d, HL * 0.24));
        notes.push({ icon: '◉', title: 'Periscope eyes', text: 'Both eyes ride on raised turrets on the roof of the skull, nearly touching — they keep watch above the waterline while the body stays hidden in the mud.' });
      } else notes.push({ icon: '◉', title: 'Dorsal eyes', text: 'Eyes set high on the head look upward for prey and predators from a body pressed to the bottom.' });
    } else if (eyeWhy && ed > 0 && Math.abs(eyeF - 1) > 0.12) notes.push({ icon: eyeF > 1 ? '◉' : '•', title: eyeF > 1 ? 'Enlarged eyes' : 'Reduced eyes', text: eyeWhy });
    if (ed === 0) notes.push({ icon: '◌', title: 'Eyes lost', text: eyeWhy });

    // 7 ── median fins
    const D = g.D, sE = whip ? 0.985 : g.sP - range(r, 0.02, 0.04); // posterior limit of the fin field
    const hB = clamp(0.035 + 0.2 * D, 0.03, 0.17) * range(r, 0.8, 1.25) * (plan === 'eel' ? 0.5 : 1);
    const soft = () => softShape(speed, still, r);
    const nape = Math.max(HL * 0.92, 0.1);
    let dorsal: MedianFin[] = [], anal: MedianFin[] = [];
    let finlets: Species['fins']['finlets'];
    let spinyRayed = false, dTxt = '';
    type DC = 'spinySoft' | 'twoSep' | 'single' | 'long' | 'post' | 'crest' | 'three' | 'full' | 'none' | 'sail';
    const dcw: Partial<Record<DC, number>> = ({
      spindle: speed > 0.75 ? { twoSep: 2.4, single: 1.4, spinySoft: 0.6, crest: 0.5, long: 0.3 } : { spinySoft: 2, single: 2, twoSep: 1.3, long: 1, three: fresh ? 0.1 : 0.5, sail: 0.3 + 0.4 * wild, crest: 0.3 },
      disc: { spinySoft: 2.4, long: 2, sail: 0.9, single: 0.4, crest: 0.4 },
      arrow: { post: 3, single: 0.8, twoSep: 0.7, long: 0.5, crest: 0.3 * wild },
      eel: { full: 4, none: 0.3 },
      ribbon: { full: 2, crest: 1.6, none: 1.6 },
      bottom: { twoSep: 2, spinySoft: 1.5, long: 1.2, single: 1 },
      globe: { post: 3, single: 0.6, twoSep: 0.5 },
      maw: whip ? { full: 2, single: 1 } : { post: 1.6, single: 1.4, long: 0.8 },
      hatchet: { single: 2, post: 1 },
      tadpole: { full: 3 },
      shark: { twoSep: 1 },
    } as Record<string, Partial<Record<DC, number>>>)[plan] ?? { single: 1 };
    const dc = wpick<DC>(r, dcw, 'single');
    if (sharky) {
      const s0 = benthicShark ? range(r, 0.46, 0.58) : range(r, 0.3, 0.44), l1 = range(r, 0.09, 0.13);
      const h1 = benthicShark ? range(r, 0.05, 0.08) : range(r, 0.085, 0.15);
      const s2 = benthicShark ? s0 + l1 + range(r, 0.05, 0.09) : range(r, 0.72, 0.78), l2 = benthicShark ? range(r, 0.07, 0.1) : range(r, 0.04, 0.06);
      dorsal = [M(r4(s0), r4(s0 + l1), r4(h1), 'shark', { foil: 1 }), M(r4(s2), r4(Math.min(s2 + l2, g.sP - 0.03)), r4(benthicShark ? h1 * range(r, 0.7, 0.95) : range(r, 0.022, 0.04)), 'shark', { foil: 1 })];
      if (chance(r, 0.7)) anal = [M(r4(Math.min(s2 + 0.03, 0.84)), r4(Math.min(s2 + 0.08, 0.89)), r4(range(r, 0.02, 0.032)), 'shark', { foil: 1 })];
      dTxt = benthicShark ? 'Two low, equal dorsal fins set far back on a bottom-resting body.' : 'A tall, rigid first dorsal foil stops the body rolling at speed; the second is a small trim tab.';
    } else {
      const a0 = clamp(Math.max(nape, g.pD - range(r, 0.02, 0.12)), 0.08, 0.6);
      switch (dc) {
        case 'spinySoft': {
          const b = sE - range(r, 0, 0.06), m = lerp(a0, b, range(r, 0.48, 0.66));
          const tall = plan === 'disc' ? range(r, 1, 1.9) : range(r, 1, 1.4);
          dorsal = [M(r4(a0), r4(m), r4(hB * range(r, 0.75, 1.1)), 'spiny', { incise: r4(range(r, 0.12, 0.5)), spines: irange(r, 6, 12) }), M(r4(m + 0.005), r4(b), r4(hB * tall), soft())];
          spinyRayed = true; dTxt = 'A spiny front dorsal (defence, and a keel when erect) joined to a soft-rayed rear lobe that sculls and steers.';
          break;
        }
        case 'twoSep': {
          const l1 = range(r, 0.1, 0.2), gap = range(r, 0.025, 0.08), s2 = Math.min(a0 + l1 + gap, sE - 0.1), l2 = Math.min(range(r, 0.09, 0.24), sE - s2);
          dorsal = [M(r4(a0), r4(a0 + l1), r4(hB * range(r, 0.8, 1.2)), speed > 0.75 ? 'spiny' : pick(r, ['spiny', 'spiny', 'fan', 'tri'] as FinShape[]), { incise: r4(range(r, 0.15, 0.4)), spines: irange(r, 5, 10) }), M(r4(s2), r4(s2 + l2), r4(hB * range(r, 0.9, 1.35)), soft())];
          spinyRayed = true; dTxt = 'Two separate dorsals: the spiny first folds flat into a groove at speed, the soft second provides thrust and trim.';
          break;
        }
        case 'long': {
          const b = sE - range(r, 0, 0.04);
          dorsal = [M(r4(Math.min(a0, 0.34)), r4(b), r4(hB * range(r, 0.6, 1)), pick(r, ['even', 'even', 'rect', 'low'] as FinShape[]), plan === 'disc' || chance(r, 0.4) ? { spines: irange(r, 8, 14), incise: r4(range(r, 0.05, 0.25)) } : {})];
          spinyRayed = plan === 'disc' || plan === 'bottom'; dTxt = 'One long, even dorsal ribbon whose travelling waves let the fish hover, back up and turn in its own length.';
          break;
        }
        case 'post': {
          const l = range(r, 0.1, 0.2);
          dorsal = [M(r4(sE - l), r4(sE), r4(hB * range(r, 0.9, 1.4)), pick(r, ['round', 'tri', 'falcate', 'even'] as FinShape[]))];
          dTxt = 'The dorsal sits far back, opposite the anal fin: together with the tail they form one large paddle for a sudden lunge.';
          break;
        }
        case 'crest': {
          const a = clamp(HL * range(r, 0.45, 0.9), 0.07, 0.3);
          dorsal = [M(r4(a), r4(sE), r4(hB * (whip ? range(r, 0.85, 1.35) : range(r, 1.2, 1.9))), whip ? pick(r, ['even', 'marlin'] as FinShape[]) : pick(r, ['marlin', 'even', 'sail'] as FinShape[]))];
          dTxt = 'A crest running from the skull to the tail, tallest at the front — a display banner that also drives the body by undulation.';
          break;
        }
        case 'three': {
          const L3 = (sE - a0 - 0.04) / 3;
          dorsal = [0, 1, 2].map((i) => M(r4(a0 + i * (L3 + 0.02)), r4(a0 + i * (L3 + 0.02) + L3), r4(hB * (i === 0 ? 1.1 : 0.9)), i === 0 ? 'tri' : 'round'));
          dTxt = 'Three separate soft dorsals — the fin field of a cold-water cruiser, each lobe trimmed independently.';
          break;
        }
        case 'full': {
          const a = plan === 'tadpole' ? Math.max(nape, 0.2) : clamp(range(r, 0.12, 0.4), nape, 0.5);
          dorsal = [M(r4(a), 0.985, r4(hB * range(r, 0.55, 0.9)), pick(r, ['even', 'low'] as FinShape[]))];
          dTxt = 'Dorsal, tail and anal fins are confluent: one continuous fringe around the rear of the body.';
          break;
        }
        case 'sail': {
          const b = sE - range(r, 0.02, 0.1);
          dorsal = [M(r4(a0), r4(b), r4(Math.min(0.36, hB * range(r, 1.9, 2.8))), 'sail')];
          notes.push({ icon: '⛵', title: 'Sail fin', text: 'A towering sail-like dorsal, raised to look bigger to rivals and to herd prey, folded for speed.' });
          break;
        }
        case 'none': dTxt = 'No dorsal fin at all: the back is a rigid, smooth ridge.'; break;
        default: {
          const c = plan === 'hatchet' ? range(r, 0.5, 0.6) : range(r, 0.4, 0.58), l = range(r, 0.1, 0.2);
          dorsal = [M(r4(c - l / 2), r4(Math.min(c + l / 2, sE)), r4(hB * range(r, 1, 1.45)), plan === 'maw' ? 'round' : soft())];
          dTxt = 'A single short, soft-rayed dorsal at the balance point of the body.';
        }
      }
      // anal fin
      const vent = clamp(Math.max(g.pV + range(r, 0.06, 0.14), 0.46), 0.3, sE - 0.1);
      const softD = dorsal[dorsal.length - 1];
      if (plan === 'eel' || plan === 'tadpole' || (dc === 'full' && plan !== 'ribbon')) anal = [M(r4(clamp(range(r, 0.3, 0.5), HL + 0.08, 0.6)), 0.985, r4(hB * range(r, 0.45, 0.8)), 'even')];
      else if (plan === 'ribbon') {
        if (dc === 'none' || chance(r, 0.35)) { anal = [M(r4(range(r, HL + 0.04, HL + 0.14)), 0.975, r4(hB * range(r, 0.75, 1.15)), 'even')]; if (dc === 'none') dTxt = 'No dorsal fin: a single anal fin running the length of the belly ripples forwards or backwards while the body stays rigid as a blade.'; }
      } else if (plan === 'arrow' || plan === 'globe' || dc === 'post') {
        const l = softD ? softD.s1 - softD.s0 : 0.14;
        anal = [M(r4(Math.max(vent, sE - l * range(r, 0.85, 1.1))), r4(sE), r4((softD?.h ?? hB) * range(r, 0.8, 1)), softD?.shape ?? 'round')];
      } else if (plan === 'hatchet') anal = [M(r4(range(r, 0.56, 0.62)), r4(sE), r4(hB * 0.6), 'even')];
      else if (softD && (plan === 'disc' || chance(r, 0.55))) {
        const a = clamp(Math.max(vent, softD.s0 + range(r, -0.02, 0.06)), 0.3, sE - 0.08);
        anal = [M(r4(a), r4(Math.min(softD.s1 + range(r, -0.02, 0.01), sE)), r4(softD.h * range(r, 0.75, 1)), softD.shape === 'sail' || softD.shape === 'marlin' ? 'falcate' : softD.shape)];
      } else {
        const l = range(r, 0.08, 0.15), a = clamp(Math.max(vent, range(r, 0.58, 0.7)), 0.3, sE - l);
        anal = [M(r4(a), r4(a + l), r4(hB * range(r, 0.75, 1.05)), pick(r, ['tri', 'round', 'falcate'] as FinShape[]))];
      }
      // adipose fin: salmon-, tetra- and catfish-like soft-rayed river forms
      if (!spinyRayed && !whip && (dc === 'single') && (fresh || H.id === 'polar' || H.id === 'twilight') && chance(r, 0.5)) {
        const a = Math.min(sE - 0.03, Math.max(dorsal[0].s1 + 0.1, 0.74));
        if (a > dorsal[0].s1 + 0.05) { dorsal.push(M(r4(a), r4(a + 0.035), r4(Math.max(0.012, hB * 0.3)), 'adipose')); dTxt += ' Behind it sits a small rayless adipose fin, a flow sensor ahead of the tail.'; }
      }
      // finlets: stiff vortex generators of the fastest cruisers
      if (plan === 'spindle' && speed > 0.82 && dc === 'twoSep' && chance(r, 0.6)) {
        const f0 = dorsal[1].s1 + 0.015;
        if (g.sP - f0 > 0.08) { finlets = { s0: r4(f0), s1: r4(g.sP - 0.01), n: irange(r, 4, 8), h: r4(range(r, 0.014, 0.022)) }; notes.push({ icon: '⋰', title: 'Finlets', text: 'A row of tiny rigid finlets behind the dorsal and anal fins straightens the flow over the tail root.' }); }
      }
      // display plumes in calm, clear, structured water
      if (softD && softD.shape !== 'sail' && ['reef', 'amazon', 'swamp', 'lake', 'seagrass'].includes(H.id) && plan === 'disc' && chance(r, 0.18 + 0.25 * wild)) {
        const k = range(r, 1.5, 2.4);
        dorsal[dorsal.length - 1] = { ...softD, shape: chance(r, 0.5) ? 'pennant' : 'sail', h: r4(Math.min(0.42, softD.h * k)) };
        if (anal[0] && chance(r, 0.6)) anal[0] = { ...anal[0], shape: 'falcate', h: r4(Math.min(0.4, anal[0].h * k)) };
        notes.push({ icon: '⚑', title: 'Trailing fin banners', text: 'Dorsal and anal rays drawn out into streaming banners that double the apparent size of the fish.' });
      }
      if (still && !deep && H.id !== 'cave' && (plan === 'spindle' || plan === 'disc') && speed < 0.45 && chance(r, 0.14 + 0.2 * wild)) {
        dorsal = dorsal.map((d) => (d.shape === 'spiny' || d.shape === 'adipose' ? d : { ...d, h: r4(Math.min(0.4, d.h * range(r, 1.3, 1.7))), fray: 0.25 }));
        anal = anal.map((d) => ({ ...d, h: r4(Math.min(0.38, d.h * range(r, 1.3, 1.7))), fray: 0.25 }));
        notes.push({ icon: '❀', title: 'Flowing fins', text: 'Long, soft finnage is affordable only where the water barely moves — and it wins mates.' });
      }
    }
    if (dTxt) notes.push({ icon: '△', title: 'Fin architecture', text: dTxt });

    // 8 ── tail
    let caudal: CaudalSpec;
    let tTxt = '';
    if (sharky) {
      const fast = speed > 0.78;
      caudal = fast ? { type: 'lunate', span: r4(range(r, 0.36, 0.46)), up: 0.56, len: r4(range(r, 0.24, 0.28)) } : { type: 'hetero', span: r4(range(r, 0.3, 0.46)), len: r4(benthicShark ? range(r, 0.28, 0.36) : range(r, 0.26, 0.32)) };
      tTxt = fast ? 'A near-symmetric crescent tail on a keeled peduncle: the engine of a warm-bodied ocean sprinter.' : 'A heterocercal tail whose long upper lobe gives lift as well as thrust.';
    } else if (whip) {
      const tuft = plan !== 'eel' && chance(r, 0.18);
      caudal = tuft ? { type: 'rounded', span: r4(range(r, 0.06, 0.1)), len: r4(range(r, 0.06, 0.1)) } : { type: 'pointed', span: r4(Math.max(0.03, g.P * 3)), len: r4(range(r, 0.035, 0.07)) };
      tTxt = tuft ? 'The whip ends in a small tuft of a tail fin.' : 'The body simply runs out into a point; thrust comes from the whole trunk.';
    } else {
      const tw: Partial<Record<CaudalType, number>> = speed > 0.8 ? { lunate: 2.2, forked: 1.4 }
        : speed > 0.6 ? { forked: 2.2, emarginate: 1, lunate: 0.5, lyre: 0.5 }
          : speed > 0.4 ? { emarginate: 1.5, forked: 1.1, truncate: 1.1, lyre: 0.6, rounded: 0.5 }
            : { rounded: 2, truncate: 1.5, emarginate: 0.6, lyre: 0.5, halfmoon: still ? 0.9 : 0, delta: still ? 0.6 : 0, pointed: 0.35 };
      if (plan === 'bottom') { delete tw.lyre; delete tw.forked; delete tw.lunate; }
      if (plan === 'globe') { delete tw.lyre; delete tw.halfmoon; delete tw.delta; delete tw.pointed; }
      if (plan === 'hatchet' || plan === 'maw') Object.assign(tw, { forked: 2 });
      const t = wpick<CaudalType>(r, tw, 'emarginate');
      caudal = t === 'pointed' ? { type: 'pointed', span: r4(clamp(D * 0.9, 0.08, 0.2)), len: r4(range(r, 0.16, 0.24)) } : caudalGeom(t, D, g.P, r);
      if ((t === 'forked' || t === 'lyre') && chance(r, 0.08 + 0.14 * wild)) {
        const up = chance(r, 0.4), k = range(r, 1.35, 1.9), l = caudal.len ?? 0.22;
        caudal = { ...caudal, lenUp: r4(up ? l * k : l), lenDn: r4(up ? l : l * k) };
        notes.push({ icon: '⟩', title: up ? 'Whip-lobed tail' : 'Sword tail', text: `The ${up ? 'upper' : 'lower'} tail lobe is drawn out far beyond the other — a streamer for display${up ? '' : ' and for skittering at the surface'}.` });
      }
      if ((t === 'halfmoon' || t === 'delta') && chance(r, 0.6)) caudal.fray = 0.3;
      tTxt = ({ lunate: 'A high, stiff crescent on a narrow peduncle — the hydrofoil of sustained high-speed cruising.', forked: 'A forked tail trims drag for long-distance swimming.', lyre: 'A lyre tail with trailing tips: speed in bursts and a flourish for display.', emarginate: 'A shallowly notched tail balances cruising and agility.', truncate: 'A square-cut tail delivers thrust for quick starts in cluttered habitat.', rounded: 'A broad, rounded tail gives explosive acceleration from a standstill.', halfmoon: 'A flowing half-moon tail: in still water display beats speed.', delta: 'A wide delta tail spreads like a fan for courtship.', pointed: 'A spear-shaped tail: slow, precise sculling.' } as Record<string, string>)[t] ?? '';
    }
    if (tTxt) notes.push({ icon: '⟩', title: `${caudal.type[0].toUpperCase() + caudal.type.slice(1)} tail`, text: tTxt });

    // 9 ── paired fins
    let pec: PairedFin | undefined, pel: PairedFin | undefined;
    const ps = r4(HL + range(r, 0.004, 0.02));
    if (sharky) {
      pec = Pf(ps, -0.68, r4(range(r, 0.06, 0.08)), r4(benthicShark ? range(r, 0.13, 0.18) : range(r, 0.17, 0.27)), 'shark', -20, Math.round(benthicShark ? range(r, 62, 80) : range(r, 55, 74)), { alpha: 1, rays: 0, foil: 1 });
      pel = Pf(r4(range(r, 0.55, 0.62)), -0.88, 0.048, r4(range(r, 0.06, 0.085)), 'shark', -22, 56, { alpha: 1, rays: 0, foil: 1 });
    } else if (plan === 'eel') {
      if (chance(r, 0.6)) pec = Pf(ps, -0.15, 0.014, r4(range(r, 0.02, 0.04)), 'round', -6, 22);
    } else {
      const wings = plan === 'spindle' && (H.id === 'pelagic' || H.id === 'seagrass' || H.id === 'estuary') && speed > 0.5 && speed < 0.8 && chance(r, 0.1 + 0.12 * wild);
      const benthic = plan === 'bottom' || plan === 'tadpole';
      if (wings) {
        pec = Pf(ps, r4(range(r, 0.1, 0.35)), 0.04, r4(range(r, 0.42, 0.62)), 'falcate', -4, Math.round(range(r, 55, 72)));
        notes.push({ icon: '◢', title: 'Wing pectorals', text: 'Enormous, stiff pectoral fins held out as wings: a burst from the tail launches the fish into a long glide above the surface.' });
      } else if (benthic) {
        pec = Pf(ps, r4(range(r, -0.7, -0.5)), r4(range(r, 0.055, 0.09)), r4(range(r, 0.15, 0.26)), 'fan', Math.round(range(r, -50, -25)), Math.round(range(r, 30, 55)), { alpha: 1 });
        notes.push({ icon: '◢', title: 'Fan pectorals', text: 'Broad, muscular fan pectorals on a low base prop the fish on the bottom and paddle it in short hops.' });
      } else if (speed > 0.72) pec = Pf(ps, r4(range(r, -0.5, -0.25)), r4(range(r, 0.03, 0.045)), r4(range(r, 0.17, 0.3)), 'falcate', Math.round(range(r, -22, -10)), Math.round(range(r, 28, 50)));
      else if (plan === 'globe') pec = Pf(ps, r4(range(r, -0.2, 0.1)), 0.04, r4(range(r, 0.07, 0.11)), 'fan', 0, 25);
      else pec = Pf(ps, r4(range(r, -0.42, -0.18)), r4(range(r, 0.035, 0.055)), r4(range(r, 0.12, 0.2) * (plan === 'ribbon' || plan === 'arrow' ? 0.65 : 1)), pick(r, ['round', 'round', 'tri', 'fan'] as FinShape[]), Math.round(range(r, -16, -4)), Math.round(range(r, 20, 32)));
      // pelvics: thoracic in spiny-rayed forms, abdominal in soft-rayed ones, jugular in cold bottom forms, lost in ribbons and globes
      const pl = clamp(0.06 + D * 0.2, 0.05, 0.16) * range(r, 0.8, 1.2);
      if (plan === 'globe' || plan === 'ribbon' || (plan === 'maw' && chance(r, 0.5))) pel = undefined;
      else if (plan === 'hatchet') pel = Pf(r4(g.pV + 0.06), -0.95, 0.015, 0.04, 'tri', -40, 12);
      else if (benthic) pel = Pf(r4(chance(r, 0.4) ? HL * range(r, 0.72, 0.9) : ps + range(r, 0.01, 0.04)), -0.95, 0.03, r4(pl * 0.8), 'round', -58, 12);
      else if (spinyRayed || plan === 'disc') pel = Pf(r4(ps + range(r, 0.015, 0.05)), -0.94, 0.03, r4(pl), 'tri', Math.round(range(r, -44, -34)), 20, { incise: 0, spine: true });
      else pel = Pf(r4(clamp(range(r, 0.42, 0.56), ps + 0.08, (anal[0]?.s0 ?? 0.7) - 0.06)), -0.95, 0.028, r4(pl * 0.85), 'tri', -36, 18);
      if (pel && !benthic && (H.id === 'swamp' || H.id === 'amazon' || H.id === 'reef' || H.id === 'lake') && speed < 0.45 && chance(r, 0.1 + 0.2 * wild)) {
        pel = { ...pel, shape: 'thread', len: r4(range(r, 0.22, 0.4)), base: 0.016 };
        notes.push({ icon: '⌇', title: 'Feeler pelvics', text: 'Pelvic fins drawn out into long, mobile, touch-sensitive threads that probe ahead in dim, cluttered water.' });
      }
    }

    // 10 ── skin, gait, clade texture
    const armored = plan === 'globe' && sq > 3;
    const gar = plan === 'arrow' && fresh && chance(r, 0.3);
    let skin: Species['skin'] =
      sharky ? { scales: 0, kind: 'placoid', bump: 0.5 }
        : armored ? { scales: 0, kind: 'bony', bump: 0.7 }
          : gar ? { scales: irange(r, 50, 64), kind: 'ganoid', bump: 0.8 }
            : plan === 'eel' || plan === 'tadpole' || plan === 'maw' || plan === 'globe' || (plan === 'ribbon' && chance(r, 0.6)) || (plan === 'bottom' && chance(r, 0.4)) ? { scales: 0, kind: 'smooth', bump: 0.2 }
              : { scales: Math.round(clamp(range(r, 28, 70) * (D < 0.16 ? 1.7 : 1) * (lenM < 0.08 ? 0.7 : 1), 24, 130)), kind: spinyRayed ? 'ctenoid' : 'cycloid', bump: r4(range(r, 0.4, 0.75)) };
    if (hide && !sharky && (plan === 'bottom' || plan === 'globe') && ['rock', 'coral', 'weed'].includes(H.substrate) && chance(r, 0.4)) { skin = { scales: 0, kind: '