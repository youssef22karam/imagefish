import type { Layer } from './types';
/** One gill opening: a pocket in the flank closed by a free cover whose hind margin lifts with every breath. */
export interface GillOpening {
  kind: 'opercle' | 'slit' | 'pore';
  h0: number; h1: number; // dorsal / ventral end (hN)
  depth: number; // chamber depth (SL)
  over: number; // overhang of the soft margin behind the shoulder wall (SL)
  thick: number; // thickness of the cover at its margin (SL)
  arches: number; // gill arches seen through the opening
  amp: number; // relative opening amplitude
  axil?: boolean; // opening lies behind the pectoral base (anglerfishes)
  edge: (h: number) => number; // station of the shoulder wall = attachment line of the opening
  len: (h: number) => number; // length of the pocket in front of it
}
import * as THREE from 'three';
import type { MouthSpec, Species } from './types';
import { clamp, curve, DEG, lerp, smooth } from './math';
import { compileProfile, type Outline } from './profile';
const PI = Math.PI, PI2 = Math.PI * 2;
const wrapLimit = (wrap: number, gape: number) => wrap > 0 ? lerp(32, 61, smooth(0.027, 0.15, gape)) : lerp(30, 70, smooth(0.018, 0.16, gape));
/** smooth maximum: a concave fillet of size k where the two profiles cross */
const smax = (a: number, b: number, k: number) => {
  if (k <= 1e-9) return Math.max(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};
/**
 * Superior (upturned) mouths – tarpon, arowana, herrings, anglerfishes, bettas: the LOWER jaw forms the
 * tip of the head and the oral cleft starts on the dorsal profile, running down and back.
 */
export const isSuperior = (m: MouthSpec) => m.sup ?? ((m.angle >= 32 && m.y > -0.3) || m.y >= 0.2);
/**
 * BodyModel – the analytic description of one fish, derived purely from its
 * morphometrics. Everything attached to the body (fins, eyes, lips, jaws,
 * barbels, teeth) is positioned through this model so all parts agree.
 *
 * Coordinates: loft parameter s ∈ [0,1] (snout → caudal base),
 * object space: snout points to +X, dorsal is +Y, right flank is +Z.
 * One loft-length = `L` world units.
 */
export class BodyModel {
  readonly sp: Species;
  readonly L: number;
  private cx = new Float64Array(0);
  private cy = new Float64Array(0);
  private th = new Float64Array(0);
  private K = 600;
  /** curved centreline (seahorses, seadragons) */
  readonly bent: boolean;
  /** anterior-most loft station: −rostrum.len for billfishes/paddlefish/sawfish, 0 otherwise */
  readonly sMin: number;
  readonly mouthTip: { s: number; y: number };
  readonly rictus: { s: number; y: number };
  readonly hinge: { s: number; y: number };
  /** station where the oral arch meets the midline (symphysis of the arch) */
  readonly sSym: number;
  /** −1: the cleft arches across the ventral face (inferior / sub-terminal / rostrate), 0: terminal, +1: across the dorsal face (superior) */
  readonly wrap: -1 | 0 | 1;
  /** final normalised height of the eyes */
  readonly eyeYn: number;
  /** inter-eye closeness for high-set eyes: 1 = generic orbit law; < 1 lets turret eyes ride higher on the
   * skull roof, closer to the dorsal midline (mudskippers nearly touch; gobies/blennies sit a little closer) */
  readonly eyeClose: number;
  /** gill openings (pocket under a free cover) – empty for rays, lampreys, tiny-headed fishes */
  gills: GillOpening[] = [];
  /** station of the pectoral fin base: always on the shoulder girdle BEHIND the gill opening */
  pecStation = 0;
  /** true while sampling the un-recessed skin (the surface the gill covers follow) */
  rawMode = false;
  private gS0 = 2;
  private gS1 = -1;
  private arcY0 = 0;
  private orbW = 0;
  /** snout-tip law: length over which the lateral outline is rounded into a blunt cap (0 = untouched) */
  private tipA = 0;
  /** half-width of the muzzle at the lips, its section aspect (width / depth) there, and where the law fades out */
  private tipW = 0;
  private tipK = 1;
  private tipS = 0;
  /** lateral nose cap: half-heights of the rounded tip above / below the snout axis, and the station where it hands over */
  private tipHT = 0;
  private tipHB = 0;
  private tipQ = 0;
  private orbRoof = 0;
  private readonly jaw: boolean;
  private readonly opercle: boolean;
  private readonly ed: number;
  private readonly ev: number;
  private readonly flat: number;
  /** explicit lateral outline (BodySpec.prof): the measured dorsal & ventral silhouette of the species */
  private readonly ol?: Outline;
  private readonly olK: number = 1;
  constructor(sp: Species, L = 2) {
    this.sp = sp;
    this.L = L;
    const b = sp.body, m = sp.mouth, e = sp.eye;
    const ro = sp.rostrum && sp.rostrum.kind !== 'tube' ? sp.rostrum : undefined;
    this.sMin = ro ? -ro.len : 0;
    this.bent = !!(b.bend && b.bend.length > 1);
    this.flat = b.bellyFlat ?? (b.Wh >= 1.25 && !b.disc ? clamp((b.Wh - 1.15) * 0.9, 0, 0.55) : 0);
    this.ed = 2 / b.sq;
    this.ev = 2 / lerp(b.sq, Math.max(b.sq, 3.3), this.flat);
    this.jaw = (m.kind ?? 'jaw') === 'jaw' && m.gape > 0.004;
    this.opercle = !b.disc && sp.skin.kind !== 'placoid' && sp.HL > 0.1 && m.kind !== 'disc' && sp.plan !== 'ray';
    if (b.prof && !b.disc) { this.ol = compileProfile(b.prof); this.olK = b.prof.D ? b.D / b.prof.D : 1; }
    // ── Snout-tip law. No fish ends in a needle: the premaxillae, the lips and the rostral cartilage close the head
    // as a blunt cap whose radius is a fair fraction of the snout. The measured outline leaves the axis like s^q
    // (q → 1 on wedge snouts = a cone) and the old width law grew linearly from zero, which made every snout a
    // knife-thin spike seen from the front. tipA is the length over which the outline is re-timed to leave the
    // axis like √s (a round nose); tipW / tipK (set below, once the skull width is known) give the muzzle its width.
    const kindM = m.kind ?? 'jaw';
    if (sp.plan === 'fish' && !b.disc && !sp.rostrum && !b.snout && !(b.bend && b.bend.length > 1) && kindM !== 'disc' && kindM !== 'tube') {
      const snoutLen = e.d > 0 ? Math.max(0.02, e.s - e.d * 0.5) : clamp(sp.HL * 0.3, 0.02, 0.1);
      this.tipA = clamp(0.36 * snoutLen, 0.006, 0.028);
    }
    this.buildCenterline();
    // ── Orbit laws: a neurocranium is never shallower or narrower than the eyes it houses (small big-eyed fishes:
    // guppies, tetras, zebrafish, lanternfishes). Turret-eyed benthic species (e.y >= 0.72) perch above the skull.
    if (e.d > 0 && sp.plan === 'fish' && !b.disc) {
      if (!b.bend && e.y < 0.72) {
        const needTop = e.d * (0.78 + 0.22 * clamp(e.y, -0.2, 0.6));
        if (this.top(e.s) < needTop) this.orbRoof = Math.min(b.D * b.df * 0.96, needTop);
      } else if (!b.bend && e.y >= 0.72) {
        const needTop = e.d * 0.92;
        if (this.top(e.s) < needTop) this.orbRoof = Math.min(b.D * b.df * 1.05, needTop);
      }
      // the skull is at least as wide as the two globes it houses – an ABSOLUTE half-width at the orbit that never
      // exceeds the trunk (a ratio applied along the whole head ballooned it wherever the head is deeper than at the eye)
      const hd = (this.top(e.s) + this.bot(e.s)) / 2;
      const wCap = e.y >= 0.72 ? 0.92 * e.d : 0.72 * e.d;
      this.orbW = Math.min(wCap, Math.max(b.W * b.Wh * hd, 0.95 * b.W * b.D * 0.5));
    }
    if (this.tipA > 0) {
      // muzzle width: a share of the skull width at the orbit that grows with the size of the mouth (a tang's
      // nibbling mouth is a third of its skull, a bass's bucket nearly all of it); sharks carry a broad parabolic snout
      const sR = e.d > 0 ? clamp(e.s, 0.03, 0.3) : clamp(sp.HL * 0.5, 0.03, 0.2);
      const shark = sp.skin.kind === 'placoid';
      const big = clamp(m.gape / Math.max(0.08, sp.HL));
      const frac = shark ? 0.5 : this.jaw ? clamp(0.34 + 1.2 * big, 0.4, 0.8) : 0.44;
      const wR = this.hw(sR);
      this.tipS = sR;
      this.tipK = clamp(b.W * b.Wh, shark ? 1.3 : 1.0, 2.4);
      this.tipW = wR * frac;
      // lateral cap: the muzzle is about as deep as it is wide (shallower on depressed heads and shark snouts), but
      // never deeper than the measured outline just behind it – a pike or a blue shark keeps its long fine snout
      const Ht = ((shark ? 0.55 : 0.8) * this.tipW) / this.tipK;
      const sQ = clamp(1.85 * Ht, 0.004, 0.06);
      const hT = Math.min(Ht, 0.88 * this.top(sQ)), hB = Math.min(Ht, 0.88 * this.bot(sQ));
      this.tipQ = sQ;
      this.tipHT = hT;
      this.tipHB = hB;
    }
    // ── Oral cleft ────────────────────────────────────────────────────────────
    const a = m.angle * DEG;
    const yTip0 = this.normY(m.s, m.y);
    let tip: { s: number; y: number }, ric: { s: number; y: number }, sSym: number, wrap: -1 | 0 | 1 = 0;
    if (this.jaw && sp.plan === 'fish' && !ro && isSuperior(m)) {
      // upper-jaw symphysis sits on the dorsal profile just behind the projecting chin
      const sA = clamp(Math.max(m.s, m.jut, 0.09 * m.gape), 0.004, 0.03);
      const yA = this.top(sA);
      const rs = clamp(sA + m.gape * Math.cos(a), sA + 0.008, 0.92);
      const ry = clamp(yA - m.gape * Math.sin(a), -this.bot(rs) * 0.66, this.top(rs) * 0.85);
      const lead = clamp(0.25 * (rs - sA), 0.003, 0.03);
      tip = { s: sA + lead, y: Math.min(lerp(yA, ry, lead / (rs - sA)), this.top(sA + lead) * 0.8) };
      ric = { s: rs, y: ry };
      sSym = sA; wrap = 1; this.arcY0 = yA;
    } else if (this.jaw && ro && (ro.kind === 'bill' || ro.kind === 'sword')) {
      // billfishes (marlin, sailfish, swordfish): the upper jaw IS the rostrum; the pointed spear-like
      // lower jaw begins right beneath the rostrum base at s ≈ 0 and runs back below the eye
      const sM = Math.max(0.004, m.s);
      const yBill = -this.rostH(0) * 0.82;
      const rs = clamp(sM + m.gape * Math.cos(a), sM + 0.012, 0.92);
      const ry = clamp(yBill - m.gape * Math.sin(a), -this.bot(rs) * 0.68, this.top(rs) * 0.4);
      tip = { s: sM, y: yBill };
      ric = { s: rs, y: ry };
      sSym = 0.0007;
      wrap = -1;
      this.arcY0 = -this.bot(sSym);
    } else {
      const rs = clamp(m.s + m.gape * Math.cos(a), m.s + 0.004, 0.92);
      let ry = yTip0 - m.gape * Math.sin(a);
      if (m.y <= -0.58 && m.angle < 25) ry = Math.min(ry, -this.bot(rs) * 0.62);
      else ry = Math.max(ry, -this.bot(rs) * 0.72);
      ry = clamp(ry, -this.bot(rs) * 0.9, this.top(rs) * 0.9);
      tip = { s: m.s, y: yTip0 };
      ric = { s: rs, y: ry };
      sSym = Math.max(0.0005, m.s);
      if (this.jaw && m.s > 0.003 && Math.abs(yTip0) > 1e-5) {
        const prof = yTip0 < 0 ? (s: number) => this.bot(s) : (s: number) => this.top(s);
        if (prof(0) >= Math.abs(yTip0) && ro) {
          sSym = 0.001; wrap = yTip0 < 0 ? -1 : 1; this.arcY0 = yTip0 < 0 ? -this.bot(0.001) : this.top(0.001);
        } else {
          let lo = 0, hi = m.s;
          for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (prof(mid) < Math.abs(yTip0)) lo = mid; else hi = mid; }
          if (m.s - hi > 0.0006) { sSym = Math.max(2e-5, hi); wrap = yTip0 < 0 ? -1 : 1; this.arcY0 = yTip0; }
        }
      }
    }
    this.mouthTip = tip;
    this.rictus = ric;
    this.sSym = sSym;
    this.wrap = wrap;
    // quadrate–articular joint: slightly behind and below the rictus
    this.hinge = { s: ric.s + clamp(m.gape * 0.12, 0.003, 0.016), y: ric.y - clamp(m.gape * 0.045, 0.0015, 0.007) };
    // ── Eye height: turret eyes (e.y >= 0.72) clear each other on top of the skull; lateral eyes stay inside
    // the supraorbital frontal roof and cheek margin so the upper lid never pokes above the forehead.
    // Close-set turret eyes: the generic clearance below only asks that the two sockets not collide, which
    // leaves a mudskipper's eyes frog-wide at the sides of the head. Real mudskippers carry the globes high
    // on the skull roof, nearly touching at the midline; gobies and blennies sit a little closer than generic.
    this.eyeClose = e.close !== undefined ? e.close : /mudskipper/.test(sp.id) ? 0.6 : /Gobies & blennies/.test(sp.group) ? 0.82 : 1;
    let yE = e.y;
    if (e.d > 0 && (sp.plan === 'fish' || sp.plan === 'ray')) {
      const r = e.d / 2;
      if (sp.plan === 'fish' && !b.disc && e.y < 0.72) {
        const tE = this.top(e.s), bE = this.bot(e.s);
        const yMax = tE - r * 1.02, yMin = -bE + r * 0.92;
        if (yMax > yMin) {
          const yClamped = clamp(this.normY(e.s, yE), yMin, yMax);
          yE = yClamped >= 0 ? yClamped / Math.max(1e-5, tE) : yClamped / Math.max(1e-5, bE);
        }
      }
      const reqZ = e.y >= 0.72 ? r * 1.22 : r * 1.05;
      for (let k = 0; k < 68 && yE > 0.42; k++) {
        const phi = this.phiAtY(e.s, this.normY(e.s, yE));
        if (Math.abs(this.sectionYZ(e.s, phi)[1]) >= reqZ) break;
        yE -= 0.012;
      }
    }
    this.eyeYn = yE;
    // The orbit never straddles the oral cleft: where the jaws run back under (or into) the eye, the eye rides
    // on the suborbital above the maxilla. (Whale sharks, wide-gaped predators, any generated head.)
    if (e.d > 0 && sp.plan === 'fish' && !b.disc && this.jaw && e.y < 0.72 && m.gape > 0.004) {
      const r = e.d / 2;
      if (e.s - r * 1.2 < ric.s) {
        const tE = this.top(e.s), bE = this.bot(e.s);
        const yCl = this.mouthY(Math.min(e.s, ric.s));
        const yNow = this.normY(e.s, this.eyeYn);
        const need = yCl + r * 1.5;
        if (yNow > yCl - r * 1.5 && yNow < need) {
          const yNew = Math.min(need, tE - r * 1.02);
          if (yNew > yNow) this.eyeYn = yNew >= 0 ? yNew / Math.max(1e-5, tE) : yNew / Math.max(1e-5, bE);
        }
      }
    }
    // Close-set correction: for blunt-headed turret species the loop above cannot bind — it steps down
    // until the section is wide enough, which on a mudskipper/goby head means it runs to its floor and the
    // eyes end up at the widest point of the skull, frog-wide. So for the close-set species only, raise the
    // eye back up the skull roof until its lateral surface offset is eyeClose × the offset the generic law
    // left it at. Every other species keeps the eyeYn the law above produced, untouched.
    if (this.eyeClose < 1 && e.d > 0 && sp.plan === 'fish' && !b.disc) {
      const zAt = (yy: number) => Math.abs(this.sectionYZ(e.s, this.phiAtY(e.s, this.normY(e.s, yy)))[1]);
      const zT = zAt(this.eyeYn) * this.eyeClose;
      let yC = e.y;
      while (yC > this.eyeYn && zAt(yC) < zT) yC = Math.max(this.eyeYn, yC - 0.006);
      this.eyeYn = yC;
    }
    // ── gill openings, then the pectoral fin takes its place on the cleithrum behind them
    const gl = this.makeGills();
    for (const g of gl) for (let k = 0; k <= 16; k++) {
      const h = lerp(g.h0, g.h1, k / 16), E = g.edge(h);
      this.gS0 = Math.min(this.gS0, E - g.len(h) - 0.002);
      this.gS1 = Math.max(this.gS1, E + 0.002);
    }
    this.gills = gl;
    this.pecStation = this.placePec();
  }
  /** map longitudinal station s ∈ [sMin, 1] into texture u ∈ [0, 1] */
  uOf(s: number) {
    return clamp((s - this.sMin) / (1 - this.sMin), 0, 1);
  }
  // ── outline ────────────────────────────────────────────────────────────────
  private front(t: number, b: number) {
    const u = clamp(t);
    const a = 1.55 + b * 1.55;
    // pointed/conical snouts (b < 0.45) keep a crisp wedge slope at the jaws instead of an egg-like vertical nose;
    // blunt-headed species (b > 0.72) still form a steep bluff forehead
    const q = clamp(1.12 - 0.76 * b, 0.36, 1.12);
    const raw = Math.pow(clamp(1 - Math.pow(1 - u, a)), q);
    return raw;
  }
  /** re-times a station near the snout tip so that an outline leaving the axis like s^q leaves it like √s instead:
   * the profile closes in a round nose of finite radius, never a cone or a cusp */
  private bluntS(s: number, q: number) {
    const a = this.tipA;
    if (a <= 0 || s <= 0 || s >= a) return s;
    const p = clamp(0.5 / Math.max(0.3, q), 0.5, 1);
    if (p > 0.985) return s;
    return lerp(a * Math.pow(s / a, p), s, smooth(0.3 * a, a, s));
  }
  private back(t: number, e: number) {
    return 0.5 + 0.5 * Math.cos(PI * Math.pow(clamp(t), e));
  }
  private bumps(s: number, side: 1 | -1) {
    let v = 0;
    for (const [bs, h, w, sd] of this.sp.body.bumps ?? []) {
      if (sd !== side) continue;
      const d = (s - bs) / w;
      v += h * Math.exp(-d * d);
    }
    return v;
  }
  private hypuralFlare(s: number) {
    const b = this.sp.body;
    if (b.disc || b.bend || b.P < 0.025 || b.P > 0.3 || this.sp.fins.caudal.span <= 0.08) return 1;
    return 1 + 0.065 * Math.pow(smooth(0.94, 1.0, s), 1.6);
  }
  /** preorbital snout depression envelope (alligator gar, pike) */
  private snoutFlatEnv(s: number) {
    const sf = this.sp.body.snoutFlat ?? 0;
    if (sf <= 0 || s <= 0) return 0;
    const sE = Math.max(0.12, this.sp.eye.s);
    return sf * (1 - smooth(sE * 0.55, sE * 1.18, s));
  }
  /** integrated rostrum vertical half-thickness (bills, swords, paddles, saws: s ∈ [-ro.len, +HL]) */
  private rostH(s: number) {
    const ro = this.sp.rostrum;
    if (!ro || ro.kind === 'tube') return 0;
    const u = clamp((s + ro.len) / Math.max(1e-4, ro.len), 0, 1.5);
    const tipK = ro.kind === 'paddle' || ro.kind === 'saw' ? 0.042 : 0.02;
    const cap = Math.sqrt(clamp(u / tipK));
    switch (ro.kind) {
      case 'bill':
        return ro.r * (0.06 + 0.94 * Math.pow(Math.min(u, 1.35), 0.7)) * cap;
      case 'sword': {
        const w = ro.r * (0.08 + 0.92 * Math.pow(Math.min(u, 1.35), 0.56)) * cap;
        const flat = ro.flat ?? 0.7;
        return w * lerp(1 - flat, 0.65, smooth(0.82, 1.35, u));
      }
      case 'paddle':
        return ro.r * (0.15 + 0.28 * Math.min(u, 1.25) * Math.min(u, 1.25)) * cap;
      case 'saw':
        return ro.r * (0.64 + 0.36 * Math.min(u, 1.25)) * (1 - (ro.flat ?? 0.78)) * cap;
    }
    return 0;
  }
  /** integrated rostrum lateral half-width (bills, swords, paddles, saws) */
  private rostW(s: number) {
    const ro = this.sp.rostrum;
    if (!ro || ro.kind === 'tube') return 0;
    const u = clamp((s + ro.len) / Math.max(1e-4, ro.len), 0, 1.5);
    const tipK = ro.kind === 'paddle' || ro.kind === 'saw' ? 0.042 : 0.02;
    const cap = Math.sqrt(clamp(u / tipK));
    switch (ro.kind) {
      case 'bill':
        return this.rostH(s) * 1.15;
      case 'sword':
        return ro.r * (0.08 + 0.92 * Math.pow(Math.min(u, 1.35), 0.56)) * cap;
      case 'paddle': {
        const uC = clamp(u, 0, 1.12);
        const oar = 0.34 + 1.55 * Math.pow(Math.sin(PI * clamp(uC * 0.94, 0, 0.96)), 0.68);
        return ro.r * oar * cap;
      }
      case 'saw':
        return ro.r * (0.64 + 0.36 * Math.min(u, 1.25)) * cap;
    }
    return 0;
  }
  /** half depth of an integrated forceps / tubular snout (butterflyfishes, seahorses, pipefishes, seadragons) */
  private snoutR(s: number) {
    const sn = this.sp.body.snout!;
    const tip = sn.tip ?? 0.68;
    const x = clamp(s / Math.max(1e-4, sn.len), 0, 1.85);
    const core = sn.r * (tip + (1 - tip) * Math.pow(Math.min(1, x), 1.7)) * (1 + 0.25 * Math.max(0, x - 1));
    const cap = Math.sqrt(clamp(1 - Math.pow(1 - clamp(s / Math.max(1e-4, sn.r * tip * 0.85)), 2)));
    return core * cap;
  }
  private withSnout(v: number, s: number) {
    const sn = this.sp.body.snout!;
    const fl = sn.flare ?? 1;
    const env = 1 - smooth(sn.len * 1.02, sn.len * 1.75 + 0.05, s);
    return smax(v, this.snoutR(s) * env, sn.r * 1.65 * fl * smooth(sn.len * 0.55, sn.len * 1.08, s));
  }
  /** 0…1: how far the cross-section is rounded toward an ellipse. A compressed trunk is lens-shaped with a keeled
   * back and belly, but a muzzle is soft tissue over the jaws – round – and the keel only rises behind the eyes. */
  private tipRound(s: number) {
    return this.tipW > 0 ? 1 - smooth(this.tipQ * 0.6, Math.max(this.tipS * 0.9, this.tipQ * 1.7), s) : 0;
  }
  /** rounded nose: an elliptical cap of half-height H that the outline joins smoothly (see the snout-tip law) */
  private noseCap(v: number, s: number, H: number) {
    if (H <= 0 || s <= 0 || s >= this.tipQ * 2.2) return v;
    const a = 1.15 * H;
    const cap = H * Math.sqrt(clamp(1 - Math.pow(1 - Math.min(1, s / a), 2))) * (1 - smooth(this.tipQ, this.tipQ * 2.2, s));
    return smax(v, cap, 0.45 * Math.min(v, cap));
  }
  /**
   * Outline-driven silhouette: the measured dorsal / ventral curve, the hypural flare at the caudal base and
   * the orbit roof. Snouts, humps and napes are part of the curve itself, so nothing is unioned on afterwards.
   */
  private olEdge(s: number, dorsal: boolean) {
    if (s <= 0) return 0;
    const o = this.ol!;
    // snouts end in a rounded cap (lips, rostral cartilage), not in a cone
    const sb = this.bluntS(s, o.q);
    let v = (dorsal ? o.top(sb) : o.bot(sb)) * this.olK * this.hypuralFlare(s);
    if (dorsal && this.orbRoof > 0) {
      const eS = this.sp.eye.s, hl = Math.max(this.sp.HL, eS + this.sp.eye.d);
      const env = Math.pow(smooth(0.004, eS * 0.88, s), 0.75) * (1 - smooth(lerp(eS, hl, 0.5), hl * 1.25, s));
      v = smax(v, this.orbRoof * env, 0.014);
    }
    const foil = this.foilEnv(s);
    if (foil > 0.02 && this.sp.eye.d > 0) {
      v = smax(v, this.sp.eye.d * (dorsal ? 0.78 : 0.72) * foil, 0.006);
    }
    return this.noseCap(v, s, dorsal ? this.tipHT : this.tipHB);
  }
  /** dorsal height above the axis (SL units) */
  top(s: number) {
    if (this.ol) return this.olEdge(s, true);
    const b = this.sp.body;
    const ro = this.sp.rostrum && this.sp.rostrum.kind !== 'tube' ? this.sp.rostrum : undefined;
    const Dt = b.D * b.df;
    const Pt = (b.P / 2 + b.pedY) * this.hypuralFlare(s);
    const s0 = b.snout ? b.snout.len * 0.88 : ro ? -Math.min(0.042, ro.len * 0.18) : 0;
    let v: number;
    if (s <= s0) {
      v = 0;
    } else if (s <= b.pD) {
      const t = clamp((this.bluntS(s, clamp(1.12 - 0.76 * b.bD, 0.36, 1.12)) - s0) / Math.max(1e-4, b.pD - s0));
      v = Dt * this.front(t, b.bD);
      const nape = b.nape ?? (b.disc || b.bend ? 0 : clamp(0.5 - b.bD, -0.15, 0.34) * 0.24);
      if (nape !== 0) v -= Dt * nape * Math.sin(PI * Math.pow(t, 0.82)) * (1 - smooth(0.45, 0.95, t));
    } else {
      v = Pt + (Dt - Pt) * this.back((s - b.pD) / Math.max(1e-4, 1 - b.pD), b.tD);
    }
    v = Math.max(0, v + this.bumps(s, 1) * smooth(0, 0.04, s));
    if (this.orbRoof > 0) {
      const eS = this.sp.eye.s, hl = Math.max(this.sp.HL, eS + this.sp.eye.d);
      const env = Math.pow(smooth(0.004, eS * 0.88, s), 0.75) * (1 - smooth(lerp(eS, hl, 0.5), hl * 1.25, s));
      v = smax(v, this.orbRoof * env, 0.014);
    }
    const sf = this.snoutFlatEnv(s);
    if (sf > 0) v *= 1 - 0.34 * sf;
    if (ro) {
      const fade = 1 - smooth(0.03, Math.max(0.15, this.sp.HL * 0.75), s);
      v = smax(v, this.rostH(s) * fade, ro.r * 2.1 * smooth(-0.045, 0.09, s));
    }
    return b.snout ? this.withSnout(v, s) : this.noseCap(v, s, this.tipHT);
  }
  /** ventral depth below the axis (SL units) */
  bot(s: number) {
    if (this.ol) return this.olEdge(s, false);
    const b = this.sp.body;
    const ro = this.sp.rostrum && this.sp.rostrum.kind !== 'tube' ? this.sp.rostrum : undefined;
    const Dv = b.D * (1 - b.df);
    const Pb = (b.P / 2 - b.pedY) * this.hypuralFlare(s);
    const s0 = b.snout ? b.snout.len * 0.88 : 0;
    let v: number;
    if (s <= s0) {
      v = 0;
    } else if (s <= b.pV) {
      const t = clamp((this.bluntS(s, clamp(1.12 - 0.76 * b.bV, 0.36, 1.12)) - s0) / Math.max(1e-4, b.pV - s0));
      const bVeff = ro && (ro.kind === 'bill' || ro.kind === 'sword') ? Math.min(b.bV, 0.16) : b.bV;
      v = Dv * this.front(t, bVeff);
      // concave throat/chin transition beneath forceps/pipette snouts (butterflyfishes, tangs)
      const throatConc = b.snout && !b.bend ? (b.nape ?? 0.24) * 0.88 : 0;
      if (throatConc > 0) v -= Dv * throatConc * Math.sin(PI * Math.pow(t, 0.8)) * (1 - smooth(0.42, 0.92, t));
    } else {
      v = Pb + (Dv - Pb) * this.back((s - b.pV) / Math.max(1e-4, 1 - b.pV), b.tV);
    }
    v = Math.max(0, v + this.bumps(s, -1) * smooth(0, 0.04, s));
    const sf = this.snoutFlatEnv(s);
    if (sf > 0) v *= 1 - 0.3 * sf;
    if (ro) {
      const fade = 1 - smooth(0.02, Math.max(0.14, this.sp.HL * 0.7), s);
      v = smax(v, this.rostH(s) * fade, ro.r * 1.25 * smooth(0.0, 0.08, s));
    }
    return b.snout ? this.withSnout(v, s) : this.noseCap(v, s, this.tipHB);
  }
  /** half width (SL units) */
  hw(s: number) {
    const b = this.sp.body;
    if (b.disc) return this.discW(s);
    const ro = this.sp.rostrum && this.sp.rostrum.kind !== 'tube' ? this.sp.rostrum : undefined;
    const hd = (this.top(Math.max(0, s)) + this.bot(Math.max(0, s))) / 2;
    let ratio = b.W * lerp(b.Wh, 1, smooth(0.02, 0.34, Math.max(0, s))) * lerp(1, b.Wt, smooth(0.35, 0.95, Math.max(0, s)));
    let w = s <= 0 && ro ? 0 : hd * ratio * (ro ? smooth(-0.01, 0.085, s) : 1);
    // ── Head fullness law. Seen from above a fish is widest across the gill covers and shoulders, not where it
    // is deepest: deep compressed species (butterflyfishes, sunfishes, cichlids, tangs) carry a head nearly as
    // thick as the trunk, and a slender snout stays round instead of collapsing into a blade.
    if (!b.bend && !ro && s > 0) {
      const hl = clamp(this.sp.HL, 0.06, 0.5) * 0.9, wMax = b.W * b.D * 0.5;
      const pM = Math.max(hl, (b.pD + b.pV) / 2);
      const r = 1 - Math.min(1, s / hl);
      const tgt = 0.84 * wMax * (1 - r * r) * (1 - smooth(pM, pM + 0.2, s));
      const lim = 0.85 * hd;
      const full = -smax(-tgt, -lim, 0.3 * Math.min(tgt, lim));
      w = smax(w, full, 0.3 * Math.min(w, Math.max(0, full)));
    }
    if (this.orbW > 0 && s > 0) {
      const e = this.sp.eye;
      const env = smooth(0, Math.max(0.02, e.s * 0.7), s) * (1 - smooth(e.s + 0.6 * e.d, e.s + 2.2 * e.d + 0.03, s));
      const wo = Math.min(this.orbW * env, 0.9 * hd);
      w = smax(w, wo, 0.3 * Math.min(w, wo));
    }
    const sf = this.snoutFlatEnv(s);
    if (sf > 0) w *= 1 + 0.46 * sf;
    if (this.sp.skin.kind === 'placoid' && s > 0.16 && s < 0.26) {
      const env = Math.sin(PI * clamp((s - 0.165) / 0.08));
      w *= 1 - 0.022 * env * (0.5 + 0.5 * Math.sin(((s - 0.17) / 0.015) * PI2));
    }
    if (!b.bend && this.sp.fins.caudal.span > 0.06) w *= 1 - 0.46 * Math.pow(smooth(0.92, 1.0, s), 1.5);
    for (const [bs, e, ww] of b.wbumps ?? []) {
      const d = (s - bs) / ww;
      w += e * Math.exp(-d * d * d * d) * smooth(0.0005, 0.009, Math.max(0, s));
    }
    if (ro) {
      const fade = 1 - smooth(0.03, Math.max(0.15, this.sp.HL * 0.72), s);
      w = smax(w, this.rostW(s) * fade, ro.r * 1.45 * smooth(-0.03, 0.1, s));
    }
    if (this.tipW > 0 && s > 0) {
      // the muzzle: at the lips the head is about as wide as it is deep (wider on depressed heads), then holds the
      // width of the mouth until the skull takes over – a rounded nose from above instead of a blade
      const cap = Math.min(this.tipK * hd, this.tipW) * (1 - smooth(this.tipS * 0.55, this.tipS * 1.5, s));
      if (cap > 0) w = smax(w, cap, 0.5 * Math.min(w, cap));
    }
    if (b.snout && this.ol) {
      // outline-defined pipette snouts (seahorses, pipefishes): the tube stays round where the trunk ratio would flatten it
      const ws = hd * (b.snout.comp ?? 0.78) * (1 - smooth(b.snout.len * 1.05, b.snout.len * 1.85 + 0.06, s));
      w = smax(w, ws, 0.3 * Math.min(w, ws));
    } else if (b.snout) {
      const comp = b.snout.comp ?? 0.78;
      const env = 1 - smooth(b.snout.len * 1.05, b.snout.len * 1.85 + 0.06, s);
      w = smax(w, this.snoutR(s) * comp 