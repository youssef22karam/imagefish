//  Convergent adaptation. Unrelated fishes living under the same physics end up
//  looking alike: big eyes in dim water, blind in caves, lunate tails on fast
//  cruisers, deep discs among coral, whiskers in mud, lures in the abyss.
//  Each rule moves the genome toward the habitat optimum by `k` (selection
//  strength) and writes a field-guide note explaining why.
// ─────────────────────────────────────────────────────────────────────────────
import type { Barbel, CaudalSpec, CaudalType, MedianFin, Species, TeethKind } from '../engine/types';
import { isSuperior } from '../engine/model';
import type { Habitat } from './habitats';
import type { Lineage, Niche } from './lineages';
import { clone, reshape } from './morph';
import { chance, clamp, irange, lerp, pick, r4, range, type Rnd } from './util';
export interface Note { icon: string; title: string; text: string }
export interface AdaptCtx { H: Habitat; niche: Niche; L: Lineage; r: Rnd; k: number; novelty: number }
const NICHE_SPEED: Record<Niche, number> = {
  apex: 0.92, pursuit: 0.82, planktivore: 0.62, filter: 0.45, scavenger: 0.4, grazer: 0.38, picker: 0.3, crusher: 0.3,
  benthivore: 0.22, ambush: 0.22, lure: 0.1, cryptic: 0.05, crevice: 0.15, parasite: 0.3,
};
export const speedOf = (H: Habitat, n: Niche) => clamp(NICHE_SPEED[n] + (H.flow - 0.4) * 0.35);
const RANK: Partial<Record<CaudalType, number>> = { lunate: 0, forked: 1, lyre: 1.3, emarginate: 2, truncate: 3, halfmoon: 3.4, delta: 3.6, rounded: 4, hetero: 1 };
export function caudalGeom(t: CaudalType, D: number, P: number, r: Rnd): CaudalSpec {
  const base = 0.2 + 0.35 * clamp(D, 0.1, 0.6);
  const g: Record<string, [number, number, number?]> = {
    lunate: [base * range(r, 1.45, 1.7), range(r, 0.17, 0.22)],
    forked: [base * range(r, 1.1, 1.25), range(r, 0.2, 0.26), range(r, 0.25, 0.4)],
    lyre: [base * range(r, 1.25, 1.4), range(r, 0.24, 0.3), 0.3],
    emarginate: [base * range(r, 1, 1.08), range(r, 0.17, 0.2)],
    truncate: [base * range(r, 0.92, 1), range(r, 0.14, 0.18)],
    rounded: [base * range(r, 0.85, 0.95), range(r, 0.15, 0.2)],
    halfmoon: [base * range(r, 1.5, 1.8), range(r, 0.18, 0.22)],
    delta: [base * range(r, 1.3, 1.5), range(r, 0.22, 0.26)],
  };
  const [span, len, fork] = g[t] ?? [base, 0.18];
  return { type: t, span: r4(Math.max(span, P * 2.6)), len: r4(len), ...(fork ? { fork: r4(fork) } : {}) };
}
interface MouthTarget { gape: [number, number]; angle: [number, number]; open: [number, number]; teeth: TeethKind[]; protrude?: number; lip?: number; gular?: number; jut?: number; inferior?: boolean; sup?: boolean }
const MOUTH: Partial<Record<Niche, MouthTarget>> = {
  apex: { gape: [0.11, 0.15], angle: [12, 24], open: [34, 40], teeth: ['fang', 'cone'], protrude: 0.2, lip: 0.24, jut: 0.01 },
  pursuit: { gape: [0.09, 0.13], angle: [14, 28], open: [32, 36], teeth: ['cone', 'fang', 'needle', 'fine'], protrude: 0.25, lip: 0.26, jut: 0.008 },
  ambush: { gape: [0.12, 0.16], angle: [22, 42], open: [38, 46], teeth: ['fine', 'cone', 'fang'], protrude: 0.35, gular: 0.55, lip: 0.34 },
  lure: { gape: [0.15, 0.2], angle: [34, 58], open: [56, 74], teeth: ['fang'], gular: 0.5, lip: 0.18, sup: true },
  planktivore: { gape: [0.045, 0.07], angle: [26, 40], open: [30, 36], teeth: ['none', 'fine'], protrude: 0.65, lip: 0.24, jut: 0.008 },
  filter: { gape: [0.1, 0.17], angle: [5, 14], open: [38, 44], teeth: ['none'], gular: 0.85, lip: 0.2 },
  grazer: { gape: [0.025, 0.04], angle: [5, 18], open: [26, 30], teeth: ['fine'], protrude: 0.35, lip: 0.55 },
  picker: { gape: [0.02, 0.034], angle: [6, 24], open: [26, 30], teeth: ['fine'], protrude: 0.6, lip: 0.45 },
  benthivore: { gape: [0.04, 0.07], angle: [0, 10], open: [30, 34], teeth: ['none', 'fine'], protrude: 0.72, lip: 0.68, gular: 0.4, inferior: true, sup: false },
  crusher: { gape: [0.03, 0.05], angle: [0, 10], open: [26, 30], teeth: ['cone', 'fine'], lip: 0.55 },
  scavenger: { gape: [0.06, 0.1], angle: [8, 20], open: [30, 34], teeth: ['fine'], lip: 0.32 },
  crevice: { gape: [0.07, 0.11], angle: [8, 14], open: [24, 30], teeth: ['fang', 'fine'], lip: 0.2 },
};
const GLOW = ['#9ff4ff', '#a0f0ff', '#7fd8ff', '#c8ffe8', '#ffe8a0', '#ff9ad0'];
export function adapt(sp0: Species, c: AdaptCtx): { sp: Species; notes: Note[] } {
  const { H, niche, L, r, k, novelty } = c;
  let sp = clone(sp0);
  const notes: Note[] = [];
  const speed = speedOf(H, niche);
  const bony = L.kind === 'bony' || L.kind === 'eel' || L.kind === 'odd';
  // ── body size ─────────────────────────────────────────────────────────────
  const [s0, s1] = H.size;
  const nicheK = niche === 'apex' || niche === 'filter' ? 1.8 : niche === 'picker' || niche === 'planktivore' ? 0.7 : 1;
  const targetLen = clamp(sp.lenM * nicheK * Math.exp(range(r, -0.5, 0.5)), s0, s1 * (niche === 'apex' || niche === 'filter' ? 2.5 : 1));
  sp.lenM = r4(Math.exp(lerp(Math.log(sp.lenM), Math.log(targetLen), k * 0.8)));
  // ── eyes ↔ light ──────────────────────────────────────────────────────────
  const light = H.light * (1 - 0.5 * H.turb);
  const e = sp.eye;
  if (e.d > 0) {
    let f = 1, why = '';
    if (H.id === 'cave') {
      if (chance(r, 0.4 + 0.5 * k)) { f = 0; why = 'In permanent darkness eyes are costly to build and maintain — they regressed under skin; the lateral line and taste buds took over.'; }
      else { f = 0.4; why = 'Vestigial, half-buried eyes: a recent cave colonist still losing its vision.'; }
    } else if (light < 0.03) { f = niche === 'lure' || niche === 'apex' || niche === 'ambush' ? range(r, 0.8, 1.05) : range(r, 0.55, 0.75); why = f < 0.8 ? 'Below the reach of sunlight vision is nearly useless; small eyes, a sensitive lateral line and smell find food.' : 'Eyes kept just big enough to catch the flashes of bioluminescent prey.'; }
    else if (light < 0.2) { f = range(r, 1.45, 1.85); why = 'Huge eyes gather the last blue photons filtering down from the surface and spot glowing prey.'; }
    else if (light < 0.35) { f = range(r, 1.15, 1.35); why = 'Enlarged eyes for hunting in dim, tea-coloured or turbid water.'; }
    else if (H.turb > 0.6) { f = range(r, 0.72, 0.88); why = 'Small eyes: in murky water touch and taste matter more than sight.'; }
    else f = range(r, 0.92, 1.1);
    const nd = f === 0 ? 0 : e.d * Math.pow(f, k);
    sp.eye = { ...e, d: r4(nd) };
    if (why && Math.abs(f - 1) > 0.12) notes.push({ icon: f === 0 ? '◌' : f > 1 ? '◉' : '•', title: f === 0 ? 'Eyes lost' : f > 1 ? `Eyes ×${Math.pow(f, k).toFixed(2)}` : `Eyes ×${Math.pow(f, k).toFixed(2)}`, text: why });
    if (nd > 0 && (light < 0.3 || H.turb > 0.55)) sp.eye.shine = r4(range(r, 0.3, 0.6));
  }
  // ── jaws ↔ diet ───────────────────────────────────────────────────────────
  const T = MOUTH[niche];
  const beak = sp.mouth.teeth === 'beak';
  if (T && L.mouth && sp.mouth.kind !== 'tube' && sp.mouth.kind !== 'disc' && sp.mouth.kind !== 'none' && sp.mouth.gape > 0.004 && !sp.body.snout && !sp.rostrum) {
    const m = { ...sp.mouth };
    const kk = k * range(r, 0.75, 1);
    m.gape = r4(lerp(m.gape, range(r, T.gape[0], T.gape[1]), kk));
    m.angle = r4(lerp(m.angle, range(r, T.angle[0], T.angle[1]), kk));
    m.open = Math.round(lerp(m.open, range(r, T.open[0], T.open[1]), kk));
    if (T.protrude !== undefined) m.protrude = r4(lerp(m.protrude ?? 0.3, T.protrude, kk));
    if (T.lip !== undefined) m.lip = r4(lerp(m.lip, T.lip, kk));
    if (T.gular !== undefined) m.gular = r4(lerp(m.gular ?? 0.3, T.gular, kk));
    if (T.jut !== undefined) m.jut = r4(lerp(m.jut, T.jut, kk * 0.6));
    if (T.inferior && kk > 0.35) { m.s = r4(lerp(m.s, range(r, 0.012, 0.03), kk)); m.y = r4(lerp(m.y, range(r, -0.55, -0.3), kk)); m.jut = 0; }
    if (!beak && chance(r, kk)) m.teeth = pick(r, T.teeth);
    if (niche === 'grazer' && (c.L.name.startsWith('Wrasse') || c.L.name.startsWith('Puffer')) && chance(r, kk)) { m.teeth = 'beak'; m.beak = m.beak ?? '#e8e0c8'; }
    const fangs = m.teeth === 'fang';
    m.tn = fangs ? irange(r, 10, 16) : m.teeth === 'none' ? 0 : Math.max(6, Math.round(m.tn || 10));
    m.ts = r4(fangs ? (niche === 'lure' ? range(r, 0.018, 0.032) : range(r, 0.008, 0.014)) : m.teeth === 'fine' ? range(r, 0.003, 0.006) : m.teeth === 'none' ? 0.004 : Math.max(0.004, m.ts));
    if (niche === 'lure' || niche === 'ambush') m.sup = T.sup ?? (m.angle >= 32 && m.y > -0.3);
    else if (T.sup === false) m.sup = false;
    else m.sup = isSuperior({ ...m, sup: undefined });
    // the rictus must stay inside the head
    m.gape = r4(Math.min(m.gape, sp.HL * 0.86));
    sp.mouth = m;
    const dg = sp.mouth.gape / Math.max(1e-3, sp0.mouth.gape);
    const txt: Partial<Record<Niche, string>> = {
      lure: 'A cavernous, upturned gape lined with glassy fangs: meals are rare, so anything that approaches must be swallowed whole.',
      apex: 'Large terminal jaws with gripping teeth for seizing big, fast prey.',
      pursuit: 'A long, sharp-toothed jaw for snapping up fleeing fishes.',
      ambush: 'An oversized, upturned mouth that expands explosively — prey is sucked in within milliseconds.',
      planktivore: 'A small, highly protrusible, toothless mouth that pipettes individual copepods from the water.',
      filter: 'A broad, toothless gape that sieves plankton by the cubic metre.',
      grazer: 'A small mouth with scraping teeth or a fused beak for cropping algal turf.',
      picker: 'A tiny, protrusible mouth for tweezering invertebrates from crevices.',
      benthivore: 'A downturned, fleshy, protrusible mouth that vacuums the substrate.',
      crusher: 'Thick lips over stout teeth powered by massive jaw muscles for cracking shells.',
      scavenger: 'A generalist mouth for tearing carrion.',
      crevice: 'A long, gripping jaw for seizing prey inside narrow holes.',
    };
    if (txt[niche] && (Math.abs(dg - 1) > 0.15 || sp.mouth.teeth !== sp0.mouth.teeth || T.inferior)) notes.push({ icon: '⌓', title: `${niche === 'lure' ? 'Gulper jaws' : niche[0].toUpperCase() + niche.slice(1) + ' jaws'}`, text: txt[niche]! });
  }
  // ── tail & locomotion ↔ speed ─────────────────────────────────────────────
  const allowed = L.caudal;
  if (allowed && allowed.length && sp.fins.caudal.type !== 'none') {
    let ideal = (1 - speed) * 4.2 + (r() - 0.5) * 0.9;
    if (L.name.startsWith('Betta') && H.flow < 0.15 && chance(r, 0.6)) ideal = 3.5;
    if (H.id === 'reef' && niche === 'planktivore' && chance(r, 0.25)) ideal = 1.3;
    const best = allowed.reduce((a, b) => (Math.abs((RANK[b] ?? 2) - ideal) < Math.abs((RANK[a] ?? 2) - ideal) ? b : a));
    if (best !== sp.fins.caudal.type && chance(r, 0.35 + 0.65 * k)) {
      const old = sp.fins.caudal;
      const g = L.kind === 'shark' ? { type: best, span: old.span * (best === 'lunate' ? 1.1 : 0.95), len: old.len } : caudalGeom(best, sp.body.D, sp.body.P, r);
      sp.fins.caudal = { ...old, ...g, lenUp: undefined, lenDn: undefined, up: undefined };
      const why: Record<string, string> = {
        lunate: 'A high, crescent (lunate) tail on a narrow, stiff peduncle — the hydrofoil of sustained high-speed cruising.',
        forked: 'A forked tail trims drag for long-distance swimming.',
        lyre: 'A lyre tail with trailing filaments — speed in bursts and a flourish for display.',
        emarginate: 'A shallowly notched tail balances cruising and agility.',
        truncate: 'A square-cut tail delivers thrust for quick starts in cluttered habitat.',
        rounded: 'A broad, rounded tail gives explosive acceleration from a standstill — ideal for ambush and tight manoeuvres.',
        halfmoon: 'A flowing half-moon tail: in still water display beats speed.',
        delta: 'A wide delta tail spreads like a fan for courtship display.',
        hetero: 'A heterocercal tail whose long upper lobe generates lift as well as thrust.',
      };
      notes.push({ icon: '⟩', title: `${best[0].toUpperCase() + best.slice(1)} tail`, text: why[best] ?? '' });
    }
  }
  // ── silhouette ↔ structure & speed ────────────────────────────────────────
  if (L.body && sp.body.prof && !sp.body.disc && !sp.body.bend) {
    let depth = 1, ped = 1, hump = 0, belly = 0, why = '';
    if ((niche === 'picker' || niche === 'grazer' || niche === 'planktivore') && H.struct > 0.55 && speed < 0.55) { depth = range(r, 1.12, 1.35); why = 'A deep, laterally compressed disc pivots on the spot among coral, roots and stems.'; }
    else if (speed > 0.78) { depth = range(r, 0.84, 0.95); ped = range(r, 0.62, 0.8); why = 'A fusiform spindle with a slim peduncle: minimum drag for open-water speed.'; }
    else if (niche === 'crevice') { depth = range(r, 0.75, 0.88); why = 'An elongated, slender body threads through narrow holes.'; }
    else if (niche === 'ambush' && H.substrate !== 'open') { depth = range(r, 0.98, 1.12); ped = range(r, 1.05, 1.2); belly = range(r, 0.02, 0.05); }
    else if (niche === 'benthivore') { belly = range(r, 0.02, 0.06); ped = range(r, 1, 1.15); }
    if ((L.name.startsWith('Cichlid') || L.name.startsWith('Wrasse') || L.name.startsWith('Perches')) && chance(r, 0.12 + 0.25 * novelty)) { hump = range(r, 0.07, 0.16); notes.push({ icon: '⌒', title: 'Nuchal hump', text: 'A fatty forehead hump — a dominance signal that grows with social rank.' }); }
    const D0 = sp.body.D;
    const kd = clamp(Math.pow(depth, k), 0.62, 1.5);
    if (Math.abs(kd - 1) > 0.02 || hump || belly || ped !== 1) {
      sp = reshape(sp, { depth: clamp(kd, 0.06 / Math.max(0.06, D0), 0.9 / Math.max(0.06, D0)), ped: Math.pow(ped, k), hump: hump * k, belly: belly * k });
      if (why && Math.abs(kd - 1) > 0.07) notes.push({ icon: '⬭', title: kd > 1 ? 'Deep-bodied' : 'Streamlined', text: why });
      const kf = Math.sqrt(sp.body.D / D0);
      sp.fins.dorsal = sp.fins.dorsal?.map((d) => ({ ...d, h: r4(d.h * kf) }));
      sp.fins.anal = sp.fins.anal?.map((d) => ({ ...d, h: r4(d.h * kf) }));
    }
    if ((niche === 'benthivore' || niche === 'ambush') && H.substrate !== 'open' && L.kind === 'bony') sp.body.bellyFlat = r4(lerp(sp.body.bellyFlat ?? 0, range(r, 0.3, 0.55), k));
  }
  // ── paired fins & swimming gait ───────────────────────────────────────────
  if (L.finMods && sp.fins.pec && ['tri', 'round', 'falcate', 'fan'].includes(sp.fins.pec.shape)) {
    const p = { ...sp.fins.pec };
    if (speed > 0.8 && p.shape !== 'falcate' && chance(r, k)) { p.shape = 'falcate'; p.len = r4(p.len * 1.15); notes.push({ icon: '◢', title: 'Sickle pectorals', text: 'Long, stiff, sickle-shaped pectorals act as hydroplanes at speed.' }); }
    else if (speed < 0.35 && H.struct > 0.5 && p.shape === 'tri' && chance(r, k)) { p.shape = 'round'; p.len = r4(p.len * 1.08); }
    sp.fins.pec = p;
  }
  if (L.kind === 'bony' && ['carangiform', 'subcarangiform', 'labriform'].includes(sp.swim.mode)) {
    const mode = speed > 0.85 ? 'carangiform' : speed < 0.32 && sp.body.D > 0.33 ? 'labriform' : sp.swim.mode === 'carangiform' && speed < 0.6 ? 'subcarangiform' : sp.swim.mode;
    sp.swim = { mode: mode as Species['swim']['mode'] };
  }
  // ── skin ──────────────────────────────────────────────────────────────────
  if ((H.id === 'abyss' || H.id === 'hadal') && L.kind === 'bony' && sp.skin.scales > 0 && chance(r, 0.6 * k)) { sp.skin = { scales: 0, kind: 'smooth', bump: 0.2 }; notes.push({ icon: '◍', title: 'Scaleless, watery flesh', text: 'Scales, bone and muscle are expensive where food is scarce: a gelatinous, near-neutrally buoyant body.' }); }
  if (niche === 'ambush' && (H.substrate === 'rock' || H.substrate === 'coral' || H.substrate === 'weed') && L.kind === 'bony' && chance(r, 0.3 * k + 0.1 * novelty)) { sp.skin = { scales: 0, kind: 'warty', bump: 1 }; notes.push({ icon: '⁂', title: 'Warty skin', text: 'Lumpy, algae-like skin turns the fish into another encrusted rock.' }); }
  // ── ecological modules ────────────────────────────────────────────────────
  const hasBulb = !!sp.barbels?.some((b) => b.bulb);
  if (niche === 'lure' && !hasBulb && sp.mouth.gape > 0.004) {
    const col = pick(r, GLOW);
    const chin = L.name.startsWith('Dragon') ? chance(r, 0.6) : chance(r, 0.25);
    const b: Barbel = chin
      ? { s: r4(clamp(sp.mouth.gape * 0.35, 0.02, 0.07)), y: -0.95, len: r4(range(r, 0.12, 0.3)), dir: [-0.2, -1, 0], droop: -0.3, r: 0.002, bulb: col, pairs: false }
      : { s: r4(clamp(sp.eye.s * range(r, 0.6, 1.1), 0.03, 0.18)), y: 1, len: r4(range(r, 0.14, 0.42)), dir: [r4(range(r, 0.6, 1)), r4(range(r, 0.9, 1.3)), 0], droop: r4(range(r, 0.1, 0.35)), r: 0.005, bulb: col, pairs: false };
    sp.barbels = [...(sp.barbels ?? []), b];
    notes.push({ icon: '✦', title: chin ? 'Luminous chin barbel' : 'Bioluminescent lure', text: chin ? 'A long chin barbel tipped with a glowing bulb of symbiotic bacteria, twitched to mimic a tiny glowing animal.' : 'The first dorsal spine has migrated onto the snout as a fishing rod (illicium) with a glowing esca full of luminous bacteria.' });
  }
  const murky = H.turb > 0.45 || H.light < 0.2 || H.substrate === 'mud' || H.substrate === 'sand';
  if ((niche === 'benthivore' || niche === 'scavenger') && murky && !sp.barbels?.length && bony && L.mouth && chance(r, 0.35 + 0.4 * novelty + (H.id === 'cave' || H.id === 'river' ? 0.25 : 0))) {
    const type = pick(r, ['chin', 'whiskers', 'rictal'] as const);
    const ms = Math.max(0.006, sp.mouth.s), mg = sp.mouth.gape;
    if (type === 'chin') sp.barbels = [{ s: r4(ms + mg * 0.4), y: -0.95, len: r4(range(r, 0.03, 0.06)), dir: [0.1, -1, 0], droop: 0, r: 0.003, pairs: false }];
    else if (type === 'rictal') sp.barbels = [{ s: r4(ms + mg * 0.6), y: -0.35, len: r4(range(r, 0.025, 0.05)), dir: [0.2, -0.6, 0.6], droop: 0.2, r: 0.003 }, { s: r4(ms + 0.006), y: -0.2, len: r4(range(r, 0.015, 0.03)), dir: [0.4, -0.4, 0.6], droop: 0.2, r: 0.0025 }];
    else sp.barbels = [{ s: r4(ms + mg * 0.7), y: 0.15, len: r4(range(r, 0.12, 0.24)), dir: [0.4, 0.1, 1], droop: 0.25, r: 0.0045 }, { s: r4(ms + mg * 0.5), y: -0.85, len: r4(range(r, 0.04, 0.07)), dir: [0.4, -1, 0.3], droop: 0.1, r: 0.003 }, ...(chance(r, 0.5) ? [{ s: r4(ms + 0.004), y: 0.4, len: r4(range(r, 0.04, 0.08)), dir: [1, 0.3, 0.5] as [number, number, number], droop: 0.1, r: 0.003 }] : [])];
    notes.push({ icon: '〰', title: type === 'whiskers' ? 'Sensory whiskers' : 'Barbels', text: 'Barbels studded with taste buds “taste” the bottom for buried prey where eyes are of little use.' });
  }
  if ((niche === 'ambush' || niche === 'cryptic') && ['reef', 'rocky', 'kelp', 'sandflat', 'seagrass'].includes(H.id) && L.kind === 'bony' && !sp.cirri && chance(r, 0.35 + 0.3 * novelty)) { sp.cirri = true; notes.push({ icon: '⁑', title: 'Fringed cirri', text: 'Feathery skin flaps above the eyes break up the head outline and mimic algae.' }); }
  if (L.finMods && sp.fins.dorsal?.length && novelty > 0.25) {
    const d0 = sp.fins.dorsal[0];
    const display = ['reef', 'amazon', 'swamp', 'seagrass', 'lake'].includes(H.id) && ['picker', 'grazer', 'planktivore'].includes(niche);
    if (display && chance(r, 0.12 + 0.3 * novelty) && d0.shape !== 'spiny' && d0.shape !== 'adipose') {
      const pen = L.name.startsWith('Butterfly') && chance(r, 0.5);
      sp.fins.dorsal = [{ ...d0, shape: pen ? 'pennant' : 'sail', h: r4(Math.min(0.32, d0.h * range(r, 1.8, 2.5))) } as MedianFin, ...sp.fins.dorsal.slice(1)];
      notes.push({ icon: '⛵', title: pen ? 'Pennant dorsal' : 'Sail fin', text: pen ? 'An elongated dorsal filament streams behind like a banner — confusing predators and signalling to mates.' : 'A towering sail-like dorsal, raised to look bigger to rivals and folded for speed.' });
    }
  }
  if (L.finMods && sp.fins.pel && ['swamp', 'amazon', 'reef', 'lake'].includes(H.id) && niche === 'picker' && chance(r, 0.08 + 0.25 * novelty) && sp.fins.pel.shape !== 'thread') {
    sp.fins.pel = { ...sp.fins.pel, shape: 'thread', len: r4(range(r, 0.22, 0.38)), base: Math.min(sp.fins.pel.base, 0.02) };
    notes.push({ icon: '⌇', title: 'Feeler pelvics', text: 'Pelvic fins drawn out into long, mobile, touch-sensitive threads that probe ahead in dim, cluttered water.' });
  }
  if (L.name.startsWith('Betta') && H.flow < 0.2 && chance(r, 0.4 + 0.4 * novelty)) {
    sp.fins.dorsal = sp.fins.dorsal?.map((d) => ({ ...d, h: r4(d.h * range(r, 1.3, 1.6)), fray: 0.25 }));
    sp.fins.anal = sp.fins.anal?.map((d) => ({ ...d, h: r4(d.h * range(r, 1.3, 1.6)), fray: 0.25 }));
    sp.fins.caudal = { ...sp.fins.caudal, fray: 0.3 };
    notes.push({ icon: '❀', title: 'Flowing fins', text: 'Long, frayed finnage is affordable in still water and wins mates.' });
  }
  if (L.name.startsWith('Puffer') && !sp.spines && niche === 'crusher' && chance(r, 0.15 + 0.3 * novelty)) { sp.spines = { n: irange(r, 90, 160), len: r4(range(r, 0.025, 0.04)) }; notes.push({ icon: '✶', title: 'Erectile spines', text: 'Inflating the stomach with water erects a coat of spines — an unswallowable ball.' }); }
  return { sp, notes };
}
