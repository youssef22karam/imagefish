 irange(r, 50, 100), r: 0.005, c: '#f0e0b0', h0: 0.05, h1: 0.6, irr: 0.4, a: 0.8 }); motifs.push('pale char spots'); }
  return {
    color: { top, side, belly, cs: [0.3, 0.68], iri: range(r, 0.2, 0.45), metal: 0.25, rough: 0.3, layers },
    fins: { color: mix(top, side, 0.5), alpha: 0.82, d: { pattern: 'spots', spotCol: '#1e1a12', spots: 6 }, c: { pattern: 'spots', spotCol: '#1e1a12', spots: 6 }, v: { color: mix(side, '#e86a2a', 0.4), tip: '#f0f0ea' }, a: { tip: '#f0f0ea' } },
    iris: '#c8a040', motifs,
  };
};
const drab: Painter = (c) => {
  const { r } = c;
  const g = groundOf(c);
  const top = darker(g, 0.35), side = mix(g, '#a8a898', 0.45);
  const layers: Layer[] = [{ k: 'mottle', c: darker(g, 0.4), sc: 0.05, th: 0.58, soft: 0.14, a: 0.35, h0: 0, h1: 0.6 }];
  const motifs = ['muddy mottling'];
  if (chance(r, 0.4)) { layers.push({ k: 'stripe', h: 0.45, w: 0.015, c: darker(g, 0.3), s0: 0.1, s1: 0.98, a: 0.4, soft: 0.01 }); motifs.push('faint midline'); }
  if (chance(r, 0.3)) layers.push({ k: 'scaleEdge', c: darker(g, 0.4), a: 0.35 });
  const redFins = chance(r, 0.3);
  if (redFins) motifs.push('red-tinged fins');
  return {
    color: { top, side, belly: '#e2dfd2', cs: [0.32, 0.7], rough: 0.4, iri: 0.15, layers },
    fins: { color: redFins ? '#a85a40' : mix(top, side, 0.5), alpha: 0.82 },
    iris: pick(r, ['#c8a040', '#a8a060', '#d06a30']), motifs,
  };
};
const neon: Painter = (c) => {
  const { r, sp } = c;
  const glowC = pick(r, ['#2fd6ff', '#38f0c8', '#4a8aff', '#7affd0']);
  const red = pick(r, ['#e01e2e', '#ff3a1e', '#ff6a1a']);
  const layers: Layer[] = [
    { k: 'grad', c: '#2a2a20', s0: 0.1, s1: 0.98, h0: 0, h1: 0.22, soft: 0.04, a: 0.45 },
    { k: 'stripe', h: range(r, 0.33, 0.42), w: range(r, 0.025, 0.04), c: glowC, s0: range(r, 0.05, 0.12), s1: range(r, 0.75, 0.9), glow: true, taper: 0.25 },
  ];
  const motifs = ['glowing neon stripe'];
  const opt = pick(r, ['lowerRed', 'fullRed', 'tailRed', 'spot'] as const);
  if (opt === 'lowerRed') { layers.push({ k: 'grad', c: red, s0: range(r, 0.4, 0.55), s1: 1, h0: 0.5, h1: 0.96, soft: 0.04 }); motifs.push('scarlet rear belly'); }
  if (opt === 'fullRed') { layers.push({ k: 'grad', c: red, s0: 0.08, s1: 1, h0: 0.48, h1: 0.97, soft: 0.04 }); motifs.push('scarlet belly'); }
  if (opt === 'tailRed') { layers.push({ k: 'grad', c: red, s0: 0.82, s1: 1.05, h0: 0.1, h1: 0.9, soft: 0.03 }); motifs.push('red tail base'); }
  if (opt === 'spot') { layers.push({ k: 'spots', n: 1, r: 0.02, c: '#141414', s0: 0.9, s1: 0.9, h0: 0.5, h1: 0.5 }); motifs.push('black peduncle spot'); }
  void sp;
  return {
    color: { top: '#4a4632', side: '#c2c8c8', belly: '#eaecec', cs: [0.26, 0.6], iri: 0.55, rough: 0.28, trans: chance(r, 0.4) ? 0.18 : undefined, layers },
    fins: { color: '#e8eaea', alpha: 0.4, a: { tip: chance(r, 0.5) ? '#f4f4f0' : red }, c: chance(r, 0.4) ? { color: red, alpha: 0.6 } : {} },
    iris: pick(r, ['#c03030', '#d0c0a0', '#2fd6ff']), motifs,
  };
};
function photophores(c: Ctx, col: string, layers: Layer[], motifs: string[]) {
  const { r, sp } = c;
  const n = irange(r, 1, 3);
  for (let i = 0; i < n; i++) layers.push({ k: 'photo', h: r4(0.92 - i * range(r, 0.07, 0.11)), n: irange(r, 10, 22), c: col, s0: clamp(sp.HL * 0.8, 0.08, 0.4), s1: range(r, 0.8, 0.95), r: range(r, 0.004, 0.007) });
  motifs.push(`${n} ventral photophore row${n > 1 ? 's' : ''}`);
  if (chance(r, 0.5)) { layers.push({ k: 'row', h: clamp(hEye(sp) + 0.08, 0.1, 0.9), n: 1, r: range(r, 0.008, 0.014), c: pick(r, ['#ff3b2f', col, '#ffe0a0']), s0: sp.eye.s + 0.035, s1: sp.eye.s + 0.035, glow: true }); motifs.push('post-orbital light organ'); }
  if (chance(r, 0.35)) { layers.push({ k: 'spots', n: irange(r, 20, 60), r: 0.0025, c: col, irr: 0.3, a: 0.8 }); motifs.push('scattered luminous dots'); }
}
const deepBlack: Painter = (c) => {
  const { r } = c;
  const k = pick(r, ['#0f0d0d', '#0c0f16', '#140f0c', '#100c14']);
  const layers: Layer[] = [{ k: 'mottle', c: lighter(k, 0.08), sc: 0.04, th: 0.6, soft: 0.12, a: 0.35 }];
  const motifs: string[] = ['velvet-black skin'];
  photophores(c, pick(r, ['#9fe4ff', '#6ad6ff', '#5cf0c8', '#b07aff']), layers, motifs);
  return {
    color: { top: k, side: lighter(k, 0.04), belly: lighter(k, 0.07), rough: 0.4, sheen: 0.22, iri: 0.15, layers },
    fins: { color: lighter(k, 0.06), alpha: 0.9 },
    iris: '#3a3a44', iris2: '#8a9ab0', motifs,
  };
};
const deepRed: Painter = (c) => {
  const { r } = c;
  const red = hsl(range(r, 355, 372), range(r, 0.55, 0.75), range(r, 0.28, 0.4));
  const layers: Layer[] = [{ k: 'mottle', c: darker(red, 0.3), sc: 0.04, th: 0.58, soft: 0.12, a: 0.4 }];
  const motifs = ['scarlet skin'];
  if (chance(r, 0.6)) photophores(c, pick(r, ['#9fe4ff', '#6ad6ff']), layers, motifs);
  return {
    color: { top: darker(red, 0.25), side: red, belly: lighter(red, 0.25), rough: 0.38, sheen: 0.2, layers },
    fins: { color: lighter(red, 0.1), alpha: 0.75 },
    iris: '#1a1a20', iris2: '#c0c8d8', motifs,
  };
};
const deepSilver: Painter = (c) => {
  const { r } = c;
  const top = hsl(range(r, 210, 235), 0.45, 0.09);
  const layers: Layer[] = [{ k: 'grad', c: '#3e6f8a', s0: 0.05, s1: 0.98, h0: 0.25, h1: 0.45, soft: 0.05, a: 0.35 }];
  const motifs = ['mirror flanks'];
  photophores(c, pick(r, ['#9fe4ff', '#6ad6ff', '#5cf0c8']), layers, motifs);
  return {
    color: { top, side: '#9aa6b4', belly: '#5a6270', cs: [0.3, 0.72], iri: 0.75, metal: 0.62, rough: 0.2, layers },
    fins: { color: '#2e3440', alpha: 0.6 },
    iris: '#2a2c30', iris2: '#a8b4c0', motifs,
  };
};
const ghost: Painter = (c) => {
  const { r } = c;
  const pink = hsl(range(r, 0, 25), range(r, 0.3, 0.55), range(r, 0.8, 0.88));
  const layers: Layer[] = [
    { k: 'grad', c: '#d88a8a', s0: 0.12, s1: 0.32, h0: 0.35, h1: 0.85, soft: 0.06, a: 0.45 },
    { k: 'grad', c: '#f8eee8', s0: 0, s1: 1, h0: 0, h1: 0.3, soft: 0.08, a: 0.4 },
  ];
  return {
    color: { top: lighter(pink, 0.15), side: pink, belly: lighter(pink, 0.35), cs: [0.3, 0.7], rough: 0.3, sheen: 0.35, trans: range(r, 0.35, 0.55), layers },
    fins: { color: '#f0e4e0', alpha: 0.38 },
    iris: '#c08080', motifs: ['depigmented, translucent skin', 'gills glowing through'],
  };
};
const polar: Painter = (c) => {
  const { r } = c;
  const icefish = chance(r, 0.5);
  const base = icefish ? hsl(range(r, 190, 215), 0.12, range(r, 0.72, 0.82)) : hsl(range(r, 30, 60), 0.12, range(r, 0.42, 0.55));
  const layers: Layer[] = [{ k: 'mottle', c: darker(base, 0.3), sc: 0.05, th: 0.58, soft: 0.14, a: icefish ? 0.25 : 0.5 }];
  if (chance(r, 0.5)) layers.push({ k: 'bars', at: seq(0.3, 0.88, irange(r, 4, 6)), w: 0.035, c: darker(base, 0.35), h0: 0, h1: 0.6, a: 0.35, rough: 0.005 });
  return {
    color: { top: darker(base, 0.25), side: base, belly: '#f2f4f4', rough: 0.35, iri: 0.25, ...(icefish ? { trans: range(r, 0.15, 0.3) } : {}), layers },
    fins: { color: lighter(base, 0.2), alpha: 0.55 },
    iris: icefish ? '#c8d8e0' : '#a89870', motifs: icefish ? ['colourless “white-blooded” pallor'] : ['pale mottling'],
  };
};
const jewel: Painter = (c) => {
  const { r } = c;
  const hue = pick(r, [220, 350, 175, 280, 10]);
  const base = hsl(hue + range(r, -10, 10), 0.75, range(r, 0.3, 0.42));
  const acc = hsl(hue + pick(r, [180, 150, 40]), 0.85, 0.55);
  const layers: Layer[] = [{ k: 'scaleFill', c: lighter(base, 0.3), a: 0.35, r: 0.3 }];
  const motifs = ['iridescent scale sheen'];
  if (chance(r, 0.5)) { layers.push({ k: 'spots', n: irange(r, 80, 180), r: 0.004, c: '#e8f4ff', irr: 0.3, even: 0.9, h0: 0.15, h1: 0.9, a: 0.85 }); motifs.push('pearl spots'); }
  else { layers.push({ k: 'stripe', h: 0.5, w: 0.02, c: darker(base, 0.5), s0: 0.08, s1: 0.95, a: 0.6, wob: 0.006 }); motifs.push('dark midline'); }
  return {
    color: { top: darker(base, 0.2), side: base, belly: mix(base, acc, 0.35), cs: [0.3, 0.72], iri: 0.45, rough: 0.28, layers },
    fins: { color: base, alpha: 0.9, d: { color: base, edge: acc, edgeWidth: 0.08 }, a: { color: mix(base, acc, 0.3), edge: acc, edgeWidth: 0.08 }, c: { color: base, edge: acc, edgeWidth: 0.06 }, v: { color: acc } },
    iris: '#d03020', motifs,
  };
};
const pelagicBold: Painter = (c) => {
  const { r } = c;
  const top = hsl(range(r, 160, 200), 0.7, 0.32), side = hsl(range(r, 45, 60), 0.8, 0.52);
  return {
    color: { top, side, belly: '#f2ecc0', cs: [0.32, 0.66], iri: 0.45, metal: 0.3, rough: 0.24, layers: [{ k: 'spots', n: irange(r, 40, 90), r: 0.005, c: '#2a6aff', h0: 0.1, h1: 0.7, irr: 0.4, a: 0.8 }, { k: 'grad', c: '#4ab0ff', s0: 0.02, s1: 0.98, h0: 0.15, h1: 0.32, soft: 0.04, a: 0.45 }] },
    fins: { color: mix(top, side, 0.4), alpha: 0.85, c: { color: side } },
    iris: '#2a2a20', motifs: ['electric blue spots', 'gold flanks'],
  };
};
const streamDisplay: Painter = (c) => {
  const { r, sp } = c;
  const base = hsl(range(r, 60, 100), 0.35, 0.42), hot = pick(r, ['#e86a1a', '#d83a2a', '#f0a020']), cool = pick(r, ['#2a6ad0', '#2aa0b0', '#3a4ad0']);
  return {
    color: { top: darker(base, 0.3), side: base, belly: hot, cs: [0.3, 0.68], rough: 0.32, layers: [{ k: 'bars', at: seq(trunk0(sp), 0.92, irange(r, 7, 11)), w: 0.022, c: cool, h0: 0.2, h1: 0.9, a: 0.85, rough: 0.003 }, { k: 'mottle', c: darker(base, 0.4), sc: 0.03, th: 0.58, soft: 0.1, a: 0.35, h0: 0, h1: 0.35 }] },
    fins: { color: base, alpha: 0.85, d: { color: hot, edge: cool, edgeWidth: 0.1 }, a: { color: cool, edge: hot, edgeWidth: 0.08 } },
    iris: '#c8a040', motifs: ['breeding bars', 'orange belly'],
  };
};
const PAINTERS: Record<Strategy, Painter> = { silver, matte, reef, cryptic, disruptive, kelp, grass, riverine, drab, neon, deepBlack, deepRed, deepSilver, ghost, polar, jewel, pelagicBold, streamDisplay };
export function paint(sp: Species, H: Habitat, niche: Niche, L: Lineage, r: Rnd, force?: Strategy): Paint {
  const strategy = force ?? chooseStrategy(sp, H, niche, L, r);
  return { ...PAINTERS[strategy]({ sp, H, niche, L, r }), strategy };
}
const FIN_COLOR_KEYS = ['color', 'tip', 'edge', 'edgeWidth', 'marks', 'spots', 'mid', 'pattern', 'spotCol', 'ocellus'] as const;
function strip<T extends object>(f: T): T {
  const o = { ...f } as Record<string, unknown>;
  for (const k of FIN_COLOR_KEYS) delete o[k];
  if (typeof o.alpha === 'number' && (o.alpha as number) < 1) delete o.alpha;
  return o as T;
}
/** lay a paint job onto a genome (replaces its integument, fin and iris colours) */
export function applyPaint(sp: Species, p: Paint): Species {
  const f = sp.fins, fp = p.fins;
  const fins = { ...f, color: fp.color, tip: fp.tip, alpha: fp.alpha ?? f.alpha };
  fins.dorsal = f.dorsal?.map((d, i) => ({ ...strip(d), ...(i === f.dorsal!.length - 1 || !fp.d?.ocellus ? fp.d : { ...fp.d, ocellus: undefined }) } as MedianFin));
  fins.anal = f.anal?.map((d) => ({ ...strip(d), ...fp.a } as MedianFin));
  fins.caudal = { ...strip(f.caudal), ...fp.c };
  if (f.pec) fins.pec = { ...strip(f.pec), ...fp.p };
  if (f.pel) fins.pel = { ...strip(f.pel), ...fp.v };
  if (f.finlets) fins.finlets = { ...f.finlets, color: fp.fl ?? mix(fp.color, '#d6b42c', 0.5) };
  const ghost = p.strategy === 'ghost';
  return {
    ...sp,
    color: { ...p.color },
    fins,
    eye: { ...sp.eye, iris: p.iris, iris2: p.iris2, ring: undefined },
    rostrum: sp.rostrum ? { ...sp.rostrum, color: mix(p.color.top, p.color.side, 0.4) } : undefined,
    fronds: sp.fronds ? { ...sp.fronds, c: mix(p.color.side, '#c8a040', 0.3) } : undefined,
    spines: sp.spines ? { ...sp.spines, c: lighter(p.color.side, 0.3) } : undefined,
    barbels: sp.barbels?.map((b) => (b.bulb ? b : b)),
    mouth: ghost ? { ...sp.mouth, beak: sp.mouth.beak ? '#f0e8e0' : undefined } : sp.mouth,
  };
}
/** gentle recolouring that keeps a parent's measured pattern (low-novelty offspring) */
export function hueDrift(sp: Species, r: Rnd, amt: number): Species {
  const dh = (r() * 2 - 1) * 28 * amt, ds = 1 + (r() * 2 - 1) * 0.2 * amt;
  const t = (c: string | undefined) => (c && /^#[0-9a-f]{6}$/i.test(c) ? tone(c, { h: dh, s: ds }) : c);
  const layers = sp.color.layers?.map((l) => ({ ...l, c: t(l.c)! })) as Layer[] | undefined;
  return {
    ...sp,
    color: { ...sp.color, top: t(sp.color.top)!, side: t(sp.color.side)!, belly: t(sp.color.belly)!, layers },
    fins: {
      ...sp.fins, color: t(sp.fins.color)!, tip: t(sp.fins.tip),
      dorsal: sp.fins.dorsal?.map((d) => ({ ...d, color: t(d.color), tip: t(d.tip), mid: t(d.mid) })),
      anal: sp.fins.anal?.map((d) => ({ ...d, color: t(d.color), tip: t(d.tip), mid: t(d.mid) })),
      caudal: { ...sp.fins.caudal, color: t(sp.fins.caudal.color), tip: t(sp.fins.caudal.tip), mid: t(sp.fins.caudal.mid) },
    },
  };
}
