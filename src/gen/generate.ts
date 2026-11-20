//  IchthyoGenesis — the generator.
//
//    habitat + seed + novelty  →  a complete, coherent Species genome
//
//  novelty 0     : a real species native to the habitat (any of the 106 measured anchors)
//  novelty ~0.3  : sister species — hybrids inside a lineage, gentle adaptation, inherited pattern
//  novelty ~0.6  : new species — colonists from other lineages, strong convergent adaptation,
//                  procedurally painted livery, ecological organs (lures, barbels, sails…)
//  novelty 1     : chimeras — cross-lineage hybrids pushed hard by selection, still anatomically
//                  coherent because every organ is placed by the engine's own body model
// ─────────────────────────────────────────────────────────────────────────────
import type { Species } from '../engine/types';
import { BodyModel, isSuperior } from '../engine/model';
import { SPECIES } from '../data/species';
import { HABITAT, HABITATS, type HabitatId } from './habitats';
import { flourish } from './flourish';
import { growDermis } from './dermis';
import { ANCHORS, LINEAGES, anchorsOf, type Anchor, type LineageId, type Niche } from './lineages';
import { blendSpecies, clone, compatKey, mutate } from './morph';
import { adapt, speedOf, type Note } from './adapt';
import { applyPaint, hueDrift, paint, STRATEGY_INFO, type Strategy } from './pigment';
import { headLivery } from './headlivery';
import { nameFish } from './names';
import { chance, clamp, hashSeed, makeRng, pick, r4, range, wpick, type Rnd } from './util';
import { genesis, type Plan } from './genesis';
import type { Lineage } from './lineages';
export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export interface GenFish {
  key: string;
  species: Species;
  seed: number;
  habitat: HabitatId;
  novelty: number;
  niche: Niche;
  lineage: LineageId;
  anchor: string;
  parents: { id: string; name: string; share: number }[];
  real: boolean;
  strategy: Strategy | 'inherited';
  motifs: string[];
  notes: Note[];
  common: string;
  latin: string;
  description: string;
  epithetWhy: string;
  genome: { k: string; v: number; lo: string; hi: string }[];
  origin: 'generated' | 'blind' | 'migrated' | 'crossed' | 'atlas' | 'mutated' | 'uploaded';
  /** de-novo fishes: the construction they were grown as, and the synthetic clade that names and paints them */
  plan?: Plan;
  clade?: string;
  L?: Lineage;
  uploadedSourceUrl?: string;
}
/** the clade record of any specimen (synthetic for de-novo fishes) */
export const lineageOf = (g: Pick<GenFish, 'L' | 'lineage'>): Lineage => g.L ?? LINEAGES[g.lineage];
/** natural individual variation of a measured species (keeps its identity, photo and pattern) */
export function individual(sp: Species, seed: number): Species {
  if (seed === 1) return sp;
  const r = makeRng(seed * 7919);
  const j = (v: number, pct: number) => v * (1 + (r() - 0.5) * 2 * pct);
  return {
    ...sp,
    body: { ...sp.body, D: j(sp.body.D, 0.05), P: j(sp.body.P, 0.06), pD: j(sp.body.pD, 0.03), W: j(sp.body.W, 0.05) },
    mouth: { ...sp.mouth, gape: j(sp.mouth.gape, 0.05), angle: sp.mouth.angle + (r() - 0.5) * 4, sup: isSuperior(sp.mouth) },
    eye: { ...sp.eye, d: j(sp.eye.d, 0.06) },
    fins: {
      ...sp.fins,
      dorsal: sp.fins.dorsal?.map((f) => ({ ...f, h: j(f.h, 0.08) })),
      anal: sp.fins.anal?.map((f) => ({ ...f, h: j(f.h, 0.08) })),
      caudal: { ...sp.fins.caudal, span: j(sp.fins.caudal.span, 0.05) },
    },
  };
}
// ── coherence repair ────────────────────────────────────────────────────────
const finite = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
export function repair(sp0: Species): Species {
  const sp = clone(sp0);
  sp.HL = r4(clamp(finite(sp.HL, 0.25), 0.04, 0.5));
  sp.lenM = r4(clamp(finite(sp.lenM, 0.3), 0.012, 14));
  const m = sp.mouth;
  if (sp.cephalic) {
    if (sp.plan !== 'ray' || !sp.body.disc || (m.kind ?? 'jaw') !== 'jaw') delete sp.cephalic;
    else {
      sp.cephalic.length = clamp(finite(sp.cephalic.length, 0.123), 0.075, 0.145);
      sp.cephalic.width = clamp(finite(sp.cephalic.width, 0.063), 0.036, 0.079);
      sp.cephalic.curl = clamp(finite(sp.cephalic.curl, 1.24), 0.55, 1.55);
    }
  }
  if (m.gape > 0.004 && sp.plan === 'fish' && !sp.rostrum) m.gape = r4(Math.min(m.gape, sp.HL * 0.9));
  m.open = Math.round(clamp(finite(m.open, 30), 10, 78));
  const f = sp.fins;
  const tidy = (arr: typeof f.dorsal, lo: number) => {
    if (!arr) return arr;
    const a = arr.map((x) => ({ ...x, s0: clamp(x.s0, lo, 0.97), s1: clamp(x.s1, lo + 0.01, 0.985), h: r4(clamp(finite(x.h, 0.05), 0.004, 0.42)) })).sort((x, y) => x.s0 - y.s0);
    for (let i = 1; i < a.length; i++) if (a[i].s0 < a[i - 1].s1 + 0.004) a[i].s0 = Math.min(a[i].s1 - 0.01, a[i - 1].s1 + 0.004);
    return a.filter((x) => x.s1 > x.s0 + 0.005);
  };
  f.dorsal = tidy(f.dorsal, 0.06);
  f.anal = tidy(f.anal, 0.2);
  if (f.caudal.type !== 'none') f.caudal.span = r4(Math.max(f.caudal.span, sp.body.P * 2.2, 0.03));
  // the eye must sit inside the skull outline (dorsal periscope eyes excepted)
  if (sp.plan === 'fish' && sp.eye.d > 0) {
    const e = sp.eye;
    e.s = r4(clamp(e.s, 0.008, Math.max(0.03, sp.HL * 0.8)));
    for (let i = 0; i < 16; i++) {
      const md = new BodyModel(sp, 1);
      const top = md.top(e.s), bot = md.bot(e.s);
      const yc = md.normY(e.s, md.eyeYn);
      const over = e.y < 0.72 && yc + e.d / 2 > top * 1.03;
      const under = yc - e.d / 2 < -bot * 0.92;
      const big = e.d > (top + bot) * 0.6;
      if (!over && !under && !big) break;
      if (big || i > 8) e.d = r4(e.d * 0.9);
      if (over) e.y = r4(e.y - 0.05);
      if (under) e.y = r4(e.y + 0.05);
      e.d = r4(e.d * 0.97);
    }
  }
  return sp;
}
// ── helpers ─────────────────────────────────────────────────────────────────
function genome(sp: Species, g: Pick<GenFish, 'habitat' | 'niche' | 'strategy' | 'novelty'>) {
  const crypsis: Record<string, number> = { cryptic: 0.05, kelp: 0.15, grass: 0.15, drab: 0.2, ghost: 0.3, deepBlack: 0.2, deepRed: 0.25, polar: 0.25, disruptive: 0.35, riverine: 0.35, silver: 0.3, matte: 0.25, deepSilver: 0.35, pelagicBold: 0.7, streamDisplay: 0.8, neon: 0.85, jewel: 0.9, reef: 0.95, inherited: 0.5 };
  return [
    { k: 'Cruising speed', v: speedOf(HABITAT[g.habitat], g.niche), lo: 'hover', hi: 'sprint' },
    { k: 'Body depth', v: clamp(sp.body.D / 0.7), lo: 'eel', hi: 'disc' },
    { k: 'Eye size', v: clamp(sp.eye.d / Math.max(0.05, sp.HL) / 0.5), lo: 'blind', hi: 'huge' },
    { k: 'Gape', v: clamp(sp.mouth.gape / 0.2), lo: 'pipette', hi: 'gulper' },
    { k: 'Livery', v: crypsis[g.strategy] ?? 0.5, lo: 'cryptic', hi: 'signal' },
    { k: 'Novelty', v: g.novelty, lo: 'known', hi: 'alien' },
  ];
}
const sp = (id: string) => SPECIES_BY_ID[id];
function pickAnchor(r: Rnd, pool: Anchor[], hid: HabitatId, nativeOnly: boolean): Anchor | undefined {
  const w: Record<string, number> = {};
  for (const a of pool) if (sp(a.id) && (!nativeOnly || a.habitats.includes(hid))) w[a.id] = a.habitats.includes(hid) ? 3 : 1;
  if (!Object.keys(w).length) return undefined;
  return ANCHORS[wpick(r, w)];
}
export interface GenOpts { novelty: number; lineage?: LineageId; origin?: GenFish['origin']; plan?: Plan; niche?: Niche; avoid?: Plan[] }
/**
 * DE-NOVO generation: no atlas parent. The body outline, head, jaws, eyes, every fin and the tail are grown
 * from the habitat's physics and a diet (genesis.ts), then painted with the habitat's own colour ecology.
 */
export function generateNovo(hid: HabitatId, seed: number, o: GenOpts): GenFish {
  const H = HABITAT[hid];
  const novelty = clamp(o.novelty);
  let last: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const r = makeRng(hashSeed('novo', hid, seed, attempt));
      const n = genesis(H, r, novelty, { plan: o.plan, niche: o.niche, avoid: o.avoid });
      n.sp = flourish(n.sp, n.plan, H, r, novelty, n.notes); // the long tail of real tails, fins and heads
      n.sp = growDermis(n.sp, n.plan, n.niche, H, r, novelty, n.notes); // cirri, flaps, papillae, tubercles, prickles
      const body = repair(n.sp); // settle eye & fin positions first, so the livery registers on the final anatomy
      const p = paint(body, H, n.niche, n.L, r);
      let g = applyPaint(body, p);
      const hlv = headLivery(g, p.strategy, seed);
      g = repair(hlv.sp);
      const motifs = [...p.motifs, ...hlv.motifs];
      const md = new BodyModel(g, 1); // the engine must accept the genome
      for (let i = 1; i <= 40; i++) { const s = i / 40; if (!Number.isFinite(md.top(s) + md.bot(s) + md.hw(s))) throw new Error('non-finite outline'); }
      const nm = nameFish(g, H, n.L, n.niche, p.strategy, motifs, n.notes, '', novelty, r);
      g.id = `novo-${n.plan}~${(seed >>> 0).toString(36)}${attempt}`;
      g.name = nm.common; g.sci = nm.latin; g.note = nm.description;
      const info = STRATEGY_INFO[p.strategy];
      const out: GenFish = {
        key: `${hid}-${seed}-${Math.round(novelty * 100)}-novo`, species: g, seed, habitat: hid, novelty, niche: n.niche, lineage: n.lineage, anchor: `novo-${n.plan}`,
        parents: [], real: false, strategy: p.strategy, motifs,
        notes: [n.notes[0], { icon: '◐', title: info.name, text: info.why[0].toUpperCase() + info.why.slice(1) + '.' }, ...n.notes.slice(1)],
        common: nm.common, latin: nm.latin, description: nm.description, epithetWhy: nm.epithetWhy, genome: [], origin: o.origin ?? 'generated',
        plan: n.plan, clade: n.clade, L: n.L,
      };
      out.genome = genome(g, out);
      return out;
    } catch (e) { last = e; }
  }
  throw last instanceof Error ? last : new Error('genesis failed');
}
export function generate(hid: HabitatId, seed: number, o: GenOpts): GenFish {
  const H = HABITAT[hid];
  const novelty = clamp(o.novelty);
  if (novelty >= 0.08 && !o.lineage) return generateNovo(hid, seed, o);
  const r = makeRng(hashSeed('gen', hid, seed, Math.round(novelty * 100)));
  // 1 ── which lineages live here (natives) or could colonise (weighted by novelty)
  const w: Partial<Record<LineageId, number>> = {};
  for (const a of Object.values(ANCHORS)) if (a.habitats.includes(hid)) w[a.lineage] = Math.min(2.2, (w[a.lineage] ?? 0) + 1);
  const colonK = novelty < 0.08 ? 0 : 0.2 + 1.4 * novelty;
  for (const [l, v] of Object.entries(H.colonizers) as [LineageId, number][]) w[l] = (w[l] ?? 0) + v * colonK;
  const lineage = o.lineage ?? wpick(r, w, 'perch');
  const L = LINEAGES[lineage];
  // 2 ── anchor genome (natives preferred)
  const pool = anchorsOf(lineage);
  const anchor = pickAnchor(r, pool, hid, novelty < 0.08) ?? pickAnchor(r, pool, hid, false)!;
  const native = anchor.habitats.includes(hid);
  const base = sp(anchor.id);
  // 3 ── ecological niche (colonists and high-novelty forms may shift niche)
  let niche: Niche = anchor.niche;
  if (!native || chance(r, novelty * 0.45)) {
    const nw: Partial<Record<Niche, number>> = {};
    for (const n of L.niches) nw[n] = H.niches[n] ?? 0.05;
    niche = wpick(r, nw, anchor.niche);
  }
  // 4 ── a real species, as it exists
  if (novelty < 0.08 && native) {
    const s = individual(base, seed === 1 ? 2 : seed);
    return finalizeReal(s, base, hid, seed, novelty, niche, lineage, anchor.id, o.origin ?? 'generated');
  }
  // 5 ── hybridisation inside the lineage
  let g = clone(base);
  const parents = [{ id: base.id, name: base.name, share: 1 }];
  const ck = compatKey(base);
  const mates = pool.filter((a) => a.id !== anchor.id && sp(a.id) && compatKey(sp(a.id)) === ck);
  if (mates.length && chance(r, 0.3 + 0.55 * novelty)) {
    const mate = pickAnchor(r, mates, hid, false)!;
    const t = r4(range(r, 0.15, 0.5));
    g = blendSpecies(g, sp(mate.id), t);
    parents[0].share = r4(1 - t);
    parents.push({ id: mate.id, name: sp(mate.id).name, share: t });
  }
  // 6 ── cross-lineage chimera (introgression from a habitat neighbour with the same body plan)
  if (novelty > 0.55 && chance(r, (novelty - 0.5) * 0.9)) {
    const donors = Object.values(ANCHORS).filter((a) => a.lineage !== lineage && sp(a.id) && compatKey(sp(a.id)) === ck && (a.habitats.includes(hid) || (H.colonizers[a.lineage] ?? 0) > 0));
    if (donors.length) {
      const d = pick(r, donors);
      const t = r4(range(r, 0.12, 0.3));
      g = blendSpecies(g, sp(d.id), t);
      parents.forEach((p) => (p.share = r4(p.share * (1 - t))));
      parents.push({ id: d.id, name: sp(d.id).name, share: t });
    }
  }
  // 7 ── individual mutation
  g = mutate(g, r, 0.35 + 0.8 * novelty, L.mouth);
  // 8 ── convergent adaptation to the habitat
  const k = clamp(0.2 + novelty * 0.85 + (native ? 0 : 0.25));
  const ad = adapt(g, { H, niche, L, r, k, novelty });
  g = ad.sp;
  // 9 ── livery: inherit (sister species) or evolve a new one
  let strategy: GenFish['strategy'] = 'inherited';
  let motifs: string[] = ['inherited pattern'];
  if (native && novelty < 0.35 && chance(r, 0.75)) g = hueDrift(g, r, novelty * 1.6);
  else {
    const p = paint(g, H, niche, L, r);
    g = applyPaint(g, p);
    strategy = p.strategy;
    motifs = p.motifs;
    // the head wears its own livery, registered on the skull (headlivery.ts; its own random stream,
    // so the body pattern, the fins and the name stream are untouched)
    const hlv = headLivery(g, p.strategy, seed);
    g = hlv.sp;
    motifs = [...motifs, ...hlv.motifs];
  }
  // 10 ── coherence repair
  g = repair(g);
  // 11 ── identity
  const nm = nameFish(g, H, L, niche, strategy, motifs, ad.notes, anchor.id, novelty, r);
  g.id = `${anchor.id}~${(seed >>> 0).toString(36)}${Math.round(novelty * 100).toString(36)}`;
  g.name = nm.common;
  g.sci = nm.latin;
  g.note = nm.description;
  g.group = base.group; // the anatomical clade drives organ construction in the engine
  const notes = strategy !== 'inherited' ? [{ icon: '◐', title: STRATEGY_INFO[strategy].name, text: STRATEGY_INFO[strategy].why[0].toUpperCase() + STRATEGY_INFO[strategy].why.slice(1) + '.' }, ...ad.notes] : ad.notes;
  const out: GenFish = {
    key: `${hid}-${seed}-${Math.round(novelty * 100)}`, species: g, seed, habitat: hid, novelty, niche, lineage, anchor: anchor.id, parents,
    real: false, strategy, motifs, notes, common: nm.common, latin: nm.latin, description: nm.description, epithetWhy: nm.epithetWhy,
    genome: [], origin: o.origin ?? 'generated',
  };
  out.genome = genome(g, out);
  return out;
}
function finalizeReal(s: Species, base: Species, hid: HabitatId, seed: number, novelty: number, niche: Niche, lineage: LineageId, anchor: string, origin: GenFish['origin']): GenFish {
  const out: GenFish = {
    key: `${hid}-${seed}-${Math.round(novelty * 100)}`, species: s, seed, habitat: hid, novelty, niche, lineage, anchor,
    parents: [{ id: base.id, name: base.name, share: 1 }], real: true, strategy: 'inherited', motifs: ['natural pattern'],
    notes: [{ icon: '✓', title: 'Known species', text: `A living species, generated exactly as measured from its reference photograph, with natural individual variation.` }],
    common: base.name, latin: base.sci, description: base.note, epithetWhy: '', genome: [], origin,
  };
  out.genome = genome(s, out);
  return out;
}
/** wrap a measured atlas species as a GenFish (so it can be migrated / crossed) */
export function fromSpecies(s: Species): GenFish {
  const a = ANCHORS[s.id.split('~')[0]];
  const hid = a?.habitats[0] ?? 'reef';
  return finalizeReal(s, s, hid, 1, 0, a?.niche ?? 'picker', a?.lineage ?? 'perch', s.id, 'atlas');
}
/** blind generation: any habitat, any degree of novelty */
export function blind(seed: number): GenFish {
  const r = makeRng(hashSeed('blind', seed));
  const h = pick(r, HABITATS).id;
  const nov = r4(clamp(Math.pow(r(), 0.7)));
  return { ...generate(h, seed, { novelty: nov, origin: 'blind' }), origin: 'blind' };
}
/** an ecosystem census: n distinct species sharing one habitat */
export function census(hid: HabitatId, seed: number, n: number, novelty: number): GenFish[] {
  const out: GenFish[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < n && i < n * 6; i++) {
    const f = generate(hid, hashSeed('census', seed, i) % 1e9, { novelty: clamp(novelty + (i % 3 - 1) * 0.08), avoid: out.slice(-2).reverse().map((x) => x.plan).filter((x): x is Plan => !!x) });
    const k = f.real ? f.anchor : f.plan ? `${f.plan}-${f.niche}-${f.species.fins.caudal.type}-${f.species.fins.dorsal?.length ?? 0}` : `${f.lineage}-${f.anchor}-${f.strategy}`;
    if (seen.has(k) && i < n * 4) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}
/** migration: the same lineage colonises another habitat and is reshaped by its selection pressures */
export function migrate(src: GenFish, hid: HabitatId, seed: number, novelty: number): GenFish {
  const H = HABITAT[hid], L = lineageOf(src);
  const r = makeRng(hashSeed('migrate', src.key, hid, seed));
  const nw: Partial<Record<Niche, number>> = {};
  for (const n of L.niches) nw[n] = H.niches[n] ?? 0.05;
  const niche = wpick(r, nw, src.niche);
  const nov = Math.max(0.5, novelty);
  const ad = adapt(clone(src.species), { H, niche, L, r, k: clamp(0.55 + 0.45 * nov), novelty: nov });
  const p = paint(ad.sp, H, niche, L, r);
  let g = applyPaint(ad.sp, p);
  const hlv = headLivery(g, p.strategy, seed); // the colonist's head livery, on the same skull rules
  g = repair(hlv.sp);
  p.motifs.push(...hlv.motifs);
  const nm = nameFish(g, H, L, niche, p.strategy, p.motifs, ad.notes, src.anchor, nov, r);
  g = { ...g, id: `${src.anchor}~m${(seed >>> 0).toString(36)}`, name: nm.common, sci: nm.latin, note: nm.description };
  const out: GenFish = {
    ...src, key: `mig-${src.key}-${hid}-${seed}`, species: g, seed, habitat: hid, novelty: nov, niche, real: false, strategy: p.strategy, motifs: p.motifs,
    notes: [{ icon: '➜', title: `Colonised the ${H.name}`, text: `Descendant of ${src.common} after generations under new selection pressures.` }, { icon: '◐', title: STRATEGY_INFO[p.strategy].name, text: STRATEGY_INFO[p.strategy].why[0].toUpperCase() + STRATEGY_INFO[p.strategy].why.slice(1) + '.' }, ...ad.notes],
    common: nm.common, latin: nm.latin, description: nm.description, epithetWhy: nm.epithetWhy, origin: 'migrated',
    parents: [{ id: src.species.id, name: src.common, share: 1 }],
  };
  out.genome = genome(g, out);
  return out;
}
/** offspring of the current specimen: same habitat, small heritable variation */
export function offspring(src: GenFish, seed: number): GenFish {
  const H = HABITAT[src.habitat], L = lineageOf(src);
  const r = makeRng(hashSeed('kid', src.key, seed));
  let g = mutate(src.species, r, 0.9, L.mouth);
  if (!src.real && chance(r, 0.5)) g = hueDrift(g, r, 0.35);
  g = repair(g);
  g = { ...g, id: `${src.anchor}~k${(seed >>> 0).toString(36)}` };
  const out: GenFish = { ...src, key: `kid-${src.key}-${seed}`, species: g, seed, real: false, origin: 'mutated', parents: [{ id: src.species.id, name: src.common, share: 1 }], notes: [{ icon: '❦', title: 'Offspring', text: `A descendant of ${src.common}: heritable variation in proportions, fins and colour.` }, ...src.notes.filter((n) => n.title !== 'Known species')] };
  if (src.real) { out.common = `${src.common} (variant)`; g.name = out.common; }
  void H;
  out.genome = genome(g, out);
  return out;
}
/** cross two specimens; incompatible body plans pass anatomy from A and colouration from B */
export function cross(a: GenFish, b: GenFish, seed: number, share = 0.4): GenFish {
  const r = makeRng(hashSeed('cross', a.key, b.key, seed));
  const A = a.species, B = b.species;
  const ok = compatKey(A) === compatKey(B);
  let g: Species;
  const notes: Note[] = [];
  if (ok) { g = blendSpecies(A, B, share); notes.push({ icon: '⚭', title: 'Hybrid', text: `Silhouettes, fins, jaws and colours interpolated ${Math.round((1 - share) * 100)} : ${Math.round(share * 100)} between the parents.` }); }
  else {
    g = clone(A);
    g.color = clone(B.color);
    g.fins = { ...g.fins, color: B.fins.color, tip: B.fins.tip, caudal: { ...g.fins.caudal, color: B.fins.caudal.color, tip: B.fins.caudal.tip, pattern: B.fins.caudal.pattern } };
    g.eye = { ...g.eye, iris: B.eye.iris, iris2: B.eye.iris2 };
    notes.push({ icon: '⚭', title: 'Introgression', text: `The body plans are incompatible (${A.plan === B.plan ? 'different jaw or loft construction' : 'different body plans'}); the offspring keeps ${a.common}'s anatomy and inherits ${b.common}'s colouration.` });
  }
  g = repair(mutate(g, r, 0.4, lineageOf(a).mouth));
  const H = HABITAT[a.habitat], L = lineageOf(a);
  const nm = nameFish(g, H, L, a.niche, 'inherited', [...a.motifs, ...b.motifs], notes, a.anchor, 0.6, r);
  const common = `${nm.common.split(' ').slice(0, -1).join(' ')} × ${L.nouns[0]}`.trim();
  g = { ...g, id: `${a.anchor}~x${(seed >>> 0).toString(36)}`, name: nm.common, sci: `${nm.latin.split(' ')[0]} × ${(b.latin.split(' ')[1] ?? 'hybrida')}`, note: nm.description };
  const out: GenFish = {
    ...a, key: `x-${a.key}-${b.key}-${seed}`, species: g, seed, real: false, origin: 'crossed', strategy: 'inherited', motifs: [...a.motifs.slice(0, 2), ...b.motifs.slice(0, 2)],
    parents: [{ id: A.id, name: a.common, share: r4(1 - share) }, { id: B.id, name: b.common, share: r4(share) }], notes: [...notes, ...a.notes.slice(0, 2)],
    common: nm.common, latin: g.sci, description: nm.description, epithetWhy: nm.epithetWhy,
  };
  void common;
  out.genome = genome(g, out);
  return out;
}
