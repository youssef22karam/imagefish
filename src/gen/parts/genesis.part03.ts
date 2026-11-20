warty', bump: 1 }; notes.push({ icon: '⁂', title: 'Warty skin', text: 'Lumpy, algae-like skin turns the fish into another encrusted rock.' }); }
    if (gar) notes.push({ icon: '◆', title: 'Enamelled armour', text: 'Interlocking rhombic ganoid scales form a flexible suit of mail.' });
    const mode: Species['swim']['mode'] = sharky ? 'carangiform' : plan === 'eel' || plan === 'ribbon' || plan === 'tadpole' ? 'anguilliform' : plan === 'globe' ? 'ostraciiform'
      : speed > 0.86 && caudal.type === 'lunate' ? 'thunniform' : speed > 0.7 ? 'carangiform' : speed < 0.36 && D > 0.33 ? 'labriform' : 'subcarangiform';
    const group = sharky ? 'Sharks' : plan === 'eel' ? 'Eels' : deep ? 'Deep sea' : plan === 'globe' || plan === 'ribbon' ? 'Oddballs'
      : plan === 'disc' ? (fresh ? 'Cichlids' : 'Reef fishes') : plan === 'bottom' ? (skin.kind === 'warty' ? 'Scorpionfishes' : skin.kind === 'smooth' ? 'Catfishes' : 'Gobies & blennies')
        : plan === 'arrow' ? (gar ? 'Primitive' : 'Predators') : plan === 'hatchet' ? 'Characins' : plan === 'tadpole' ? 'Cods'
          : speed > 0.8 ? pick(r, ['Tunas & mackerels', 'Jacks']) : fresh ? pick(r, spinyRayed ? ['Sunfishes & perches', 'Cichlids'] : ['Carps & minnows', 'Salmon & trout', 'Characins']) : pick(r, spinyRayed ? ['Wrasses & parrotfishes', 'Groupers', 'Reef fishes'] : ['Herrings', 'Cods', 'Tarpons']);
    const gill: Species['gill'] = sharky ? { kind: 'slits' } : plan === 'eel' || plan === 'globe' || (plan === 'bottom' && eye.bulge === 1) ? { kind: 'restricted' } : undefined;

    // 11 ── ecological organs
    const barbels: Barbel[] = [];
    const spikes: Spike[] = [];
    let spines: Species['spines'], fronds: Species['fronds'], cirri = false;
    const ms = Math.max(0.006, mouth.s), mg = mouth.gape;
    if (niche === 'lure') {
      const col = pick(r, ['#9ff4ff', '#a0f0ff', '#7fd8ff', '#c8ffe8', '#ffe8a0', '#ff9ad0']);
      const chin = plan === 'maw' && whip && chance(r, 0.5);
      barbels.push(chin
        ? { s: r4(clamp(mg * 0.35, 0.02, 0.07)), y: -0.95, len: r4(range(r, 0.12, 0.3)), dir: [-0.2, -1, 0], droop: -0.3, r: 0.002, bulb: col, pairs: false }
        : { s: r4(clamp(eye.s * range(r, 0.6, 1.1), 0.03, 0.18)), y: 1, len: r4(range(r, 0.14, 0.42)), dir: [r4(range(r, 0.6, 1)), r4(range(r, 0.9, 1.3)), 0], droop: r4(range(r, 0.1, 0.35)), r: 0.005, bulb: col, pairs: false });
      notes.push({ icon: '✦', title: chin ? 'Luminous chin barbel' : 'Bioluminescent lure', text: chin ? 'A long chin barbel tipped with a glowing bulb, twitched to mimic a small glowing animal.' : 'The first dorsal spine has migrated onto the snout as a fishing rod tipped with a bulb of luminous bacteria.' });
    }
    const murky = H.turb > 0.45 || H.light < 0.2 || H.substrate === 'mud' || H.substrate === 'sand';
    if (!sharky && !forceps && !barbels.length && (niche === 'benthivore' || niche === 'scavenger' || H.id === 'cave') && murky && chance(r, plan === 'bottom' ? 0.75 : 0.4)) {
      const type = pick(r, ['chin', 'whiskers', 'whiskers', 'rictal'] as const);
      const long = H.id === 'river' || H.id === 'amazon' || H.id === 'cave' ? 1.6 : 1;
      if (type === 'chin') barbels.push({ s: r4(ms + mg * 0.4), y: -0.95, len: r4(range(r, 0.03, 0.06)), dir: [0.1, -1, 0], droop: 0, r: 0.003, pairs: false });
      else if (type === 'rictal') barbels.push({ s: r4(ms + mg * 0.6), y: -0.35, len: r4(range(r, 0.025, 0.05)), dir: [0.2, -0.6, 0.6], droop: 0.2, r: 0.003 }, { s: r4(ms + 0.006), y: -0.2, len: r4(range(r, 0.015, 0.03)), dir: [0.4, -0.4, 0.6], droop: 0.2, r: 0.0025 });
      else barbels.push({ s: r4(ms + mg * 0.7), y: 0.15, len: r4(range(r, 0.12, 0.24) * long), dir: [0.4, 0.1, 1], droop: 0.25, r: 0.0045 }, { s: r4(ms + mg * 0.5), y: -0.85, len: r4(range(r, 0.04, 0.07) * long), dir: [0.4, -1, 0.3], droop: 0.1, r: 0.003 });
      notes.push({ icon: '〰', title: type === 'whiskers' ? 'Sensory whiskers' : 'Barbels', text: 'Barbels studded with taste buds “taste” the bottom for buried prey where eyes are of little use.' });
    }
    if (sharky && benthicShark && !rostrum && chance(r, 0.5)) barbels.push({ s: r4(Math.max(0.01, mouth.s * 0.55)), y: -0.6, len: r4(range(r, 0.018, 0.032)), dir: [0.3, -1, 0.3], droop: 0.1, r: 0.003 });
    if (hide && !sharky && ['reef', 'rocky', 'kelp', 'sandflat', 'seagrass'].includes(H.id) && (plan === 'bottom' || plan === 'spindle') && chance(r, 0.5)) { cirri = true; notes.push({ icon: '⁑', title: 'Fringed cirri', text: 'Feathery skin flaps above the eyes break up the head outline and mimic algae.' }); }
    if (plan === 'globe' && !armored && niche !== 'lure' && chance(r, 0.4)) { spines = { n: irange(r, 90, 160), len: r4(range(r, 0.022, 0.04)) }; notes.push({ icon: '✶', title: 'Erectile spines', text: 'Inflating the stomach with water erects a coat of spines — an unswallowable ball.' }); }
    if ((armored || (plan === 'bottom' && skin.kind !== 'smooth')) && ed > 0 && !top && chance(r, armored ? 0.55 : 0.12 * wild)) {
      const len = range(r, 0.07, 0.2);
      spikes.push({ s: r4(Math.max(0.05, eye.s * 0.8)), y: 0.9, len: r4(len), dir: [1, 0.22, 0.17], r: 0.21, horn: 1 });
      if (armored && chance(r, 0.6)) spikes.push({ s: r4(g.sP - 0.12), y: -0.9, len: r4(len * 0.6), dir: [-1, -0.1, 0.14], r: 0.22, horn: 0.8 });
      notes.push({ icon: '⟟', title: 'Brow horns', text: 'The armour is drawn out above each eye into a long horn — awkward to swallow and painful to bite.' });
    }
    if (!sharky && (H.id === 'kelp' || H.id === 'seagrass') && hide && (plan === 'arrow' || plan === 'spindle' || plan === 'bottom') && chance(r, 0.4)) {
      const n = irange(r, 3, 6), at: [number, number, number][] = [];
      for (let i = 0; i < n; i++) at.push([r4(lerp(0.2, 0.85, (i + 0.5) / n)), 1, r4(range(r, 0.06, 0.13))]);
      for (let i = 0; i < n - 1; i++) at.push([r4(lerp(0.26, 0.8, (i + 0.5) / (n - 1))), -1, r4(range(r, 0.05, 0.11))]);
      fronds = { at, c: '#8a9a40', style: H.id === 'kelp' ? 'leaf' : 'paddle' };
      notes.push({ icon: '❧', title: 'Leafy appendages', text: `Skin lobes shaped like ${H.id === 'kelp' ? 'kelp blades' : 'seagrass'} sway with the surge: the fish is one more drifting frond.` });
    }
    notes.unshift({ icon: '⬭', title: I.clade, text: I.what });

    const over = {
      id: id0, name: '', sci: '', group, note: '', lenM, plan: 'fish', HL: r4(HL),
      body: {
        D: r4(g.D), df: r4(g.df), pD: r4(g.pD), pV: r4(g.pV), P: r4(g.P), pedY: r4(g.pedY), W: r4(W), Wh: r4(Wh), Wt, sq: r4(sq), prof,
        ...(bellyFlat ? { bellyFlat: r4(bellyFlat) } : {}), ...(keelV ? { keelVentral: r4(keelV) } : {}), ...(snoutFlat ? { snoutFlat: r4(snoutFlat) } : {}), ...(keel ? { keel: r4(keel) } : {}),
      },
      mouth, eye, skin, swim: { mode },
      fins: { dorsal, anal, caudal, pec, pel, finlets, color: '#9aa4a8', alpha: sharky ? 1 : plan === 'disc' || plan === 'globe' ? 0.85 : 0.72 },
      ...(rostrum ? { rostrum } : {}), ...(gill ? { gill } : {}), ...(barbels.length ? { barbels } : {}), ...(spikes.length ? { spikes } : {}),
      ...(spines ? { spines } : {}), ...(fronds ? { fronds } : {}), ...(cirri ? { cirri } : {}),
    };
    sp = remeasure(make([], over as unknown as SP));
  }
  if (plan === 'ray' || plan === 'flat') notes.unshift({ icon: '⬭', title: I.clade, text: I.what });
  const L: Lineage = { name: I.clade, niches: Object.keys(AFF[plan]) as Niche[], roots: I.roots, nouns: I.nouns, kind: I.kind, mouth: true, body: true, caudal: null, finMods: true };
  return { sp, plan, niche, L, lineage: I.lineage, clade: I.clade, notes, speed };
}
export const PLAN_NAMES = Object.fromEntries((Object.keys(INFO) as Plan[]).map((p) => [p, INFO[p].clade])) as Record<Plan, string>;
