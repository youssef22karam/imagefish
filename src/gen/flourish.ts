// ─────────────────────────────────────────────────────────────────────────────
//  FLOURISH · the long tail of real fish morphology.
//  genesis.ts grows a coherent construction; this pass lets every de-novo genome reach the rarer outlines
//  that real fishes evolved: swallow-, sword-, crown-, veil-, spade-, double-, whip-, trilobed and
//  double-emarginate tails, the hypocercal tail of flying fishes and the clavus of the ocean sunfish;
//  crested, scythe, streamer, notched, saddle, plume and comb dorsals; gliding wings, walking "hands",
//  lionfish fans and gourami feelers; nuchal humps, hammer heads, saw and needle snouts.
//  Every choice stays ecological (speed, water, depth, construction) and is recorded as a field note.
// ─────────────────────────────────────────────────────────────────────────────
import type { CaudalType, FinShape, MedianFin, Species } from '../engine/types';
import type { Habitat } from './habitats';
import type { Plan } from './genesis';
import type { Note } from './adapt';
import { chance, clamp, r4, range, wpick, type Rnd } from './util';

export const TAIL_INFO: Partial<Record<CaudalType, [string, string]>> = {
  swallow: ['Swallowtail', 'Both lobes drawn into long scissor blades: a deep, high-aspect fork for effortless long-range cruising.'],
  hypo: ['Hypocercal tail', 'The lower lobe is the longer — it keeps sculling the surface film while the body lifts off, as in flying fishes.'],
  sword: ['Sword tail', 'The lowest caudal rays run on into a long, pigmented sword: a courtship flag that females prefer.'],
  spade: ['Spade tail', 'A broad tail that tapers to a central point, like a spade: steering and display in slow water.'],
  double: ['Double tail', 'The caudal fin is split into two rounded lobes stacked one above the other, each with its own fan of rays.'],
  crown: ['Crowntail', 'Rays extend far beyond the webbing, so the margin bristles like a crown of spikes.'],
  whip: ['Whip filament', 'The tail ends in a single living thread, a sensory streamer that trails behind the fish.'],
  clavus: ['Clavus', 'No true tail at all: a scalloped rudder of fused dorsal and anal rays closes the body — the ocean-sunfish solution.'],
  veil: ['Veiltail', 'Long, soft caudal membranes flow and drape downward; in still water display beats speed.'],
  doubleEm: ['Double-emarginate tail', 'Two shallow concavities with a pointed centre — a compromise between cruising and turning.'],
  trilobe: ['Trilobed tail', 'Upper and lower lobes flank a small central lobe on the extended notochord — the coelacanth pattern.'],
};
export const FIN_INFO: Partial<Record<FinShape, [string, string]>> = {
  crest: ['Crested dorsal', 'The dorsal margin rises and falls in a scalloped crest, each crown carried by a stiffened ray.'],
  scythe: ['Scythe dorsal', 'A tall, sickle-shaped leading lobe sweeps back over a low trailing fin.'],
  notch: ['Notched dorsal', 'A deep notch divides the dorsal into a spiny forward fan and a soft rear fin.'],
  saddle: ['Saddle dorsal', 'High at both ends and dipped in the middle, the dorsal sits on the back like a saddle.'],
  plume: ['Plume fin', 'The fin rises toward the rear into a flowing plume that ripples with every turn.'],
  streamer: ['Streamer ray', 'One leading ray is drawn out into a long pennant streamer, like a Moorish idol\u2019s.'],
  comb: ['Comb of spines', 'The spiny dorsal has lost most of its webbing: separate, venom-tipped spines stand like a comb.'],
};

/** de-novo genomes only: reach the rare outlines real fishes evolved, within the ecology genesis chose */
export function flourish(sp0: Species, plan: Plan, H: Habitat, r: Rnd, novelty: number, notes: Note[]): Species {
  const sp: Species = { ...sp0, body: { ...sp0.body }, fins: { ...sp0.fins, caudal: { ...sp0.fins.caudal } } };
  const f = sp.fins, b = sp.body;
  const wild = clamp((novelty - 0.25) / 0.75, 0, 1);
  const still = ['reef', 'amazon', 'swamp', 'lake', 'seagrass', 'cave'].includes(H.id);
  const deep = ['twilight', 'abyss', 'hadal'].includes(H.id);
  const bent = !!(b.bend && b.bend.length > 1);
  const ct = f.caudal.type;

  // 1 ── tails
  if (!bent && ct !== 'hetero' && ct !== 'none' && ct !== 'diphy' && f.caudal.span > 0.03 && chance(r, 0.32 + 0.36 * wild)) {
    const tw: Partial<Record<CaudalType, number>> =
      ct === 'lunate' || ct === 'forked' ? { swallow: 1, hypo: 0.5, doubleEm: 0.35 }
        : ct === 'lyre' ? { swallow: 0.8, crown: still ? 0.6 : 0.1, doubleEm: 0.5 }
          : ct === 'emarginate' || ct === 'truncate' ? { doubleEm: 1, sword: 0.55, spade: 0.4, trilobe: 0.2 + 0.4 * wild, double: 0.2 }
            : ct === 'pointed' ? { whip: 1, spade: 0.6 }
              : { spade: 0.8, double: still ? 0.7 : 0.25, crown: still ? 0.8 : 0.15, veil: still ? 0.9 : 0.2, sword: 0.35, trilobe: 0.3 };
    if ((plan === 'globe' || plan === 'disc') && b.D > 0.42) tw.clavus = 0.45 + wild;
    if (plan === 'globe' || plan === 'disc') delete tw.whip;
    if (deep) tw.whip = (tw.whip ?? 0) + 0.5;
    if (plan === 'bottom' || plan === 'flat') { delete tw.swallow; delete tw.hypo; delete tw.veil; }
    if (plan === 'eel' || plan === 'ribbon' || plan === 'tadpole') {
      for (const k of Object.keys(tw) as CaudalType[]) if (k !== 'whip' && k !== 'spade') delete tw[k];
      tw.whip = (tw.whip ?? 0) + 0.8;
    }
    const t = wpick<CaudalType>(r, tw, 'doubleEm');
    const c = f.caudal, len0 = c.len ?? c.span * 0.6;
    const K: Partial<Record<CaudalType, [number, number]>> = {
      swallow: [1, 1.1], hypo: [1, 1], sword: [0.95, 0.85], spade: [0.95, 1.05], double: [1, 1], crown: [1.05, 1.15],
      whip: [0.75, 0.9], clavus: [1.3, 0.42], veil: [1.1, 1.25], doubleEm: [1, 1], trilobe: [0.85, 0.9],
    };
    const [kS, kL] = K[t] ?? [1, 1];
    f.caudal = {
      ...c, type: t,
      span: r4(clamp(c.span * kS, 0.06, t === 'clavus' ? Math.max(0.2, b.D * 0.95) : 0.62)),
      len: r4(clamp(len0 * kL, 0.04, 0.42)),
      lenUp: undefined, lenDn: undefined, fork: undefined, up: undefined,
      fray: t === 'crown' ? 0.55 : t === 'veil' || t === 'double' ? 0.25 : c.fray,
      rays: t === 'crown' ? Math.max(16, c.rays ?? 18) : c.rays,
    };
    if (t === 'clavus') {
      // ocean-sunfish construction: tall, opposed dorsal and anal blades placed far back drive the body
      const D = b.D;
      f.dorsal = [{ ...(f.dorsal?.find((d) => d.shape !== 'adipose') ?? {}), s0: 0.56, s1: 0.74, h: r4(clamp(D * 0.62, 0.12, 0.45)), shape: 'falcate', sweep: 16, rays: 16 } as MedianFin];
      f.anal = [{ ...(f.anal?.[0] ?? {}), s0: 0.58, s1: 0.76, h: r4(clamp(D * 0.56, 0.11, 0.42)), shape: 'falcate', sweep: 12, rays: 14 } as MedianFin];
    }
    const info = TAIL_INFO[t];
    if (info) notes.push({ icon: '⟩', title: info[0], text: info[1] });
  }

  // 2 ── median-fin outlines
  const soft = (d: MedianFin) => d.shape !== 'spiny' && d.shape !== 'adipose' && d.shape !== 'thread' && d.shape !== 'comb';
  if (f.dorsal?.length && f.caudal.type !== 'clavus' && chance(r, 0.24 + 0.34 * wild)) {
    const i = f.dorsal.findIndex(soft);
    if (i >= 0) {
      const ns = wpick<FinShape>(r, { crest: 1, scythe: 0.9, notch: f.dorsal.length === 1 ? 1 : 0.2, saddle: 0.5, plume: 0.8, streamer: still ? 0.9 : 0.35 }, 'crest');
      const k = ns === 'streamer' || ns === 'scythe' ? range(r, 1.45, 2.05) : ns === 'plume' ? range(r, 1.2, 1.5) : range(r, 1, 1.2);
      f.dorsal = f.dorsal.map((d, j) => (j === i ? { ...d, shape: ns, h: r4(Math.min(0.45, d.h * k)), incise: ns === 'crest' ? 0.35 : d.incise } : d));
      const info = FIN_INFO[ns];
      if (info) notes.push({ icon: '△', title: info[0], text: info[1] });
    }
  }
  if (f.anal?.length && f.caudal.type !== 'clavus' && chance(r, 0.16 + 0.26 * wild)) {
    const ns = wpick<FinShape>(r, { scythe: 0.8, plume: 0.7, saddle: 0.5, crest: 0.5 }, 'scythe');
    f.anal = f.anal.map((d, j) => (j === 0 && soft(d) ? { ...d, shape: ns, h: r4(Math.min(0.42, d.h * (ns === 'scythe' ? range(r, 1.3, 1.8) : range(r, 1, 1.25)))) } : d));
  }
  if (f.dorsal?.some((d) => d.shape === 'spiny') && chance(r, 0.12 + 0.24 * wild)) {
    f.dorsal = f.dorsal.map((d) => (d.shape === 'spiny' ? { ...d, shape: 'comb', incise: 0.88, h: r4(Math.min(0.4, d.h * range(r, 1.3, 1.9))) } : d));
    const info = FIN_INFO.comb!;
    notes.push({ icon: '⋔', title: info[0], text: info[1] });
  }

  // 3 ── paired fins
  if (f.pec && !deep && (H.id === 'pelagic' || plan === 'arrow' || plan === 'spindle') && plan !== 'shark' && chance(r, (H.id === 'pelagic' ? 0.16 : 0.05) + 0.12 * wild)) {
    f.pec = { ...f.pec, shape: 'wing', len: r4(clamp(f.pec.len * range(r, 2.2, 3.1), 0.12, 0.42)), base: r4(f.pec.base * 1.3), splay: 74, elev: 6, sweep: 18, foil: 0 };
    notes.push({ icon: '✈', title: 'Gliding wings', text: 'Enormous pectoral fins open like wings: chased from below, the fish launches and glides over the surface.' });
  } else if (f.pec && (plan === 'bottom' || plan === 'globe' || plan === 'maw') && chance(r, 0.1 + 0.16 * wild)) {
    f.pec = { ...f.pec, shape: 'lobe', foil: 0.9, len: r4(f.pec.len * 0.85), elev: -38, splay: 58, row: 0.5 };
    notes.push({ icon: '✋', title: 'Walking fins', text: 'Stout, elbowed pectorals plant on the bottom like hands — the fish walks more than it swims.' });
  } else if (f.pec && still && plan !== 'shark' && plan !== 'ray' && chance(r, 0.07 + 0.14 * wild)) {
    f.pec = { ...f.pec, shape: 'fan', len: r4(clamp(f.pec.len * range(r, 1.6, 2.3), 0.08, 0.36)), incise: 0.6, splay: 64 };
    notes.push({ icon: '❋', title: 'Fan pectorals', text: 'Broad, deeply incised pectoral fans herd prey into corners, lionfish-style.' });
  }
  if (f.pel && plan !== 'shark' && plan !== 'ray' && plan !== 'flat' && chance(r, 0.04 + 0.07 * wild)) {
    f.pel = { ...f.pel, shape: 'thread', len: r4(clamp(f.pel.len * range(r, 2.2, 3.4), 0.08, 0.48)), base: r4(f.pel.base * 0.4) };
    notes.push({ icon: '〰', title: 'Feeler pelvics', text: 'The pelvic fins are reduced to long taste-bud threads that probe ahead of the fish.' });
  }

  // 4 ── head and body signatures
  if ((plan === 'spindle' || plan === 'disc') && !b.prof && chance(r, 0.06 + 0.12 * wild)) {
    b.bumps = [...(b.bumps ?? []), [r4(sp.HL * 0.55), r4(b.D * range(r, 0.1, 0.17)), r4(range(r, 0.07, 0.11)), 1]];
    notes.push({ icon: '◠', title: 'Nuchal hump', text: 'A fatty hump swells on the forehead of mature males — a badge of size and status.' });
  }
  if (plan === 'shark' && !sp.rostrum && !b.wbumps && chance(r, 0.13 + 0.14 * wild)) {
    b.wbumps = [[0.035, r4(range(r, 0.09, 0.13)), 0.026]];
    notes.push({ icon: '⊤', title: 'Cephalofoil', text: 'The head is flattened into a hammer: eyes at the wing tips, a wide array of electroreceptors between them.' });
  } else if (plan === 'shark' && !sp.rostrum && chance(r, 0.07 + 0.1 * wild)) {
    sp.rostrum = { kind: 'saw', len: r4(range(r, 0.18, 0.28)), r: 0.024, flat: 0.75 };
    notes.push({ icon: '⫘', title: 'Saw rostrum', text: 'A flat, toothed blade projects from the snout to slash through schools and rake the sand.' });
  }
  if (plan === 'arrow' && !sp.rostrum && chance(r, 0.08 + 0.12 * wild)) {
    sp.rostrum = { kind: 'bill', len: r4(range(r, 0.12, 0.22)), r: 0.012 };
    notes.push({ icon: '➶', title: 'Needle bill', text: 'The upper jaw runs on into a slender bill — a spear for side-swiping small fishes at the surface.' });
  }
  return sp;
}
