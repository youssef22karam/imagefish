* env, b.snout.r * 0.75 * smooth(b.snout.len * 0.4, b.snout.len * 1.0, s));
    }
    return w;
  }
  private discW(s: number) {
    const d = this.sp.body.disc!;
    const tail = d.tailW * (1 - 0.7 * smooth(d.end, 1, s));
    let w: number;
    if (s <= d.pW) {
      const t = s / d.pW;
      w = d.span * Math.pow(this.front(t, 0.12), d.fr);
      if (d.head) w = Math.max(w, d.head * this.front(s / 0.03, 0.8));
    } else if (s <= d.end) {
      const t = (s - d.pW) / (d.end - d.pW);
      w = d.span * Math.pow(1 - t, d.bk);
    } else w = 0;
    return Math.max(w, s > d.pW * 0.5 ? tail : 0);
  }
  /** half perimeter of a section (SL units) – used for isotropic texturing */
  halfPerim(s: number) {
    const h = (this.top(s) + this.bot(s)) / 2;
    const w = this.hw(s);
    return PI * Math.sqrt((h * h + w * w) / 2) + 1e-4;
  }
  normY(s: number, yn: number) {
    return yn >= 0 ? yn * this.top(s) : yn * this.bot(s);
  }
  // ── centreline (supports seahorse-like bending) ───────────────────────────
  private buildCenterline() {
    const K = this.K;
    const bend = this.sp.body.bend;
    const f = bend && bend.length > 1 ? curve(bend) : () => 0;
    this.cx = new Float64Array(K + 1);
    this.cy = new Float64Array(K + 1);
    this.th = new Float64Array(K + 1);
    let x = 0, y = 0;
    for (let i = 0; i <= K; i++) {
      const s = i / K;
      const t = f(s) * DEG;
      this.th[i] = t;
      this.cx[i] = x;
      this.cy[i] = y;
      x += -Math.cos(t) / K;
      y += -Math.sin(t) / K;
    }
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    for (let i = 0; i <= K; i++) {
      mnx = Math.min(mnx, this.cx[i]); mxx = Math.max(mxx, this.cx[i]);
      mny = Math.min(mny, this.cy[i]); mxy = Math.max(mxy, this.cy[i]);
    }
    const ox = (mnx + mxx) / 2, oy = bend ? (mny + mxy) / 2 : 0;
    for (let i = 0; i <= K; i++) { this.cx[i] -= ox; this.cy[i] -= oy; }
  }
  private sample(arr: Float64Array, s: number) {
    const f = clamp(s) * this.K;
    const i = Math.min(this.K - 1, Math.floor(f));
    const t = f - i;
    if (s > 1) return arr[this.K] + (arr[this.K] - arr[this.K - 1]) * (s - 1) * this.K;
    if (s < 0) return arr[0] + (arr[1] - arr[0]) * s * this.K;
    return lerp(arr[i], arr[i + 1], t);
  }
  heading(s: number) {
    return this.sample(this.th, clamp(s));
  }
  /** local (s, y, z) in SL units → object space */
  local(s: number, y: number, z: number, out = new THREE.Vector3()) {
    const t = this.heading(s);
    const nx = -Math.sin(t), ny = Math.cos(t);
    const cx = this.sample(this.cx, s), cy = this.sample(this.cy, s);
    return out.set((cx + nx * y) * this.L, (cy + ny * y) * this.L, z * this.L);
  }
  /** backward tangent and dorsal normal (object space, unit) */
  frame(s: number) {
    const t = this.heading(s);
    return {
      T: new THREE.Vector3(-Math.cos(t), -Math.sin(t), 0),
      N: new THREE.Vector3(-Math.sin(t), Math.cos(t), 0),
    };
  }
  // ── operculum (gill cover) ────────────────────────────────────────────────
  hasOpercle() {
    return this.opercle;
  }
  /**
   * Station where the gill cover meets the shoulder at texture height hN (0 dorsal … 1 ventral).
   * Head length is measured to the hind-most point of the cover, so the margin (plus its soft membrane)
   * reaches HL at mid flank and sweeps forward toward the nape above and the isthmus below.
   */
  opercleS(hN: number) {
    const hl = this.sp.HL;
    const bow = 1 - Math.pow(Math.sin(PI * clamp((hN - 0.16) / 0.72)), 0.8);
    // below the cheek the branchiostegal membrane runs forward under the head toward the isthmus
    const isth = smooth(0.6, 0.9, hN);
    return hl * (1 - 0.064 * bow - 0.28 * (hN - 0.52) * (hN - 0.52) - 0.27 * isth * isth) - clamp(0.022 * hl, 0.003, 0.007);
  }
  private gillKind(): 'opercle' | 'restricted' | 'pore' | 'slits' | 'none' {
    const sp = this.sp, id = sp.id;
    if (sp.gill?.kind) return sp.gill.kind;
    if (sp.plan === 'ray' || sp.body.disc || sp.group.startsWith('Rays')) return 'none'; // batoid slits are ventral
    if (sp.mouth.kind === 'disc' || /hagfish|lamprey/.test(id)) return 'none';
    if (sp.skin.kind === 'placoid') return 'slits';
    if (sp.HL <= 0.1) return 'none';
    if (/moray|seahorse|seadragon|pipefish|frogfish|anglerfish/.test(id)) return 'pore';
    if (sp.group.startsWith('Eels') || /eel|goby|mudskipper|puffer|porcupine|trigger|cowfish|boxfish|ocean-sunfish|ratfish/.test(id)) return 'restricted';
    return 'opercle';
  }
  private pecSpanH() {
    const f = this.sp.fins.pec;
    if (!f) return { h: 0.6, dh: 0 };
    const s1 = clamp(f.s, 0.01, 0.98);
    return { h: this.phiAtY(s1, this.normY(s1, f.y)) / PI, dh: (0.7 * f.base * Math.cos(f.splay * DEG)) / this.halfPerim(s1) };
  }
  private makeGills(): GillOpening[] {
    const sp = this.sp, hl = sp.HL, e = sp.eye, pec = sp.fins.pec;
    const kind = this.gillKind();
    if (kind === 'none') return [];
    const sH = clamp(hl, 0.03, 0.9);
    const hwH = this.hw(sH), hp = this.halfPerim(sH);
    const pk = this.pecSpanH();
    if (kind === 'slits') {
      const lay = sp.color.layers?.find((l) => l.k === 'gills') as Extract<Layer, { k: 'gills' }> | undefined;
      const at = lay?.at?.length ? lay.at : [0, 1, 2, 3, 4].map((i) => hl * (0.8 + 0.07 * i));
      const h0 = lay?.h0 ?? 0.38;
      const h1 = Math.max(h0 + 0.12, Math.min(lay?.h1 ?? 0.72, pec ? pk.h - pk.dh - 0.02 : 1));
      const gap = at.length > 1 ? (at[at.length - 1] - at[0]) / (at.length - 1) : 0.015;
      const depth = clamp(0.1 * hwH, 0.0025, 0.007), len = Math.min(gap * 0.8, 0.018);
      return at.map((a0) => ({
        kind: 'slit' as const, h0, h1, depth, over: 0.0016, thick: 0.0011, arches: 0, amp: 0.55,
        edge: (h: number) => { const v = ((h - h0) / (h1 - h0)) * 2 - 1; return a0 + 0.003 - 0.005 * v * v; },
        len: () => len,
      }));
    }
    // the pocket never reaches the orbit or the jaw joint
    const front = Math.max(e.d > 0 ? e.s + 0.8 * e.d : 0, this.jaw ? this.hinge.s + 0.006 : 0) + 0.01;
    if (kind === 'opercle') {
      const edge = (h: number) => this.opercleS(h);
      // the opening starts at the level of the upper orbit margin (posttemporal) and runs down to the isthmus
      const yTop = e.d > 0 ? this.normY(e.s, this.eyeYn) + 0.6 * e.d : 0.6 * this.top(sH);
      const hTop = clamp(this.phiAtY(sH, Math.min(yTop, 0.92 * this.top(sH))) / PI, 0.24, 0.42);
      return [{
        kind: 'opercle', h0: hTop, h1: 0.87, depth: clamp(0.2 * hwH, 0.004, 0.02), over: clamp(0.022 * hl, 0.003, 0.007),
        thick: clamp(0.01 * hl, 0.0012, 0.0028), arches: 4, amp: 1, edge,
        len: (h: number) => clamp(Math.min(0.3 * hl, edge(h) - front), 0.012, 0.2),
      }];
    }
    const pore = kind === 'pore';
    const axil = pore && !!pec && /frogfish|anglerfish/.test(sp.id); // lophiiform pore: in the pectoral axil
    const half = pore ? clamp(0.011 / hp, 0.025, 0.06) : clamp((0.75 * (pec?.base ?? 0.03)) / hp, 0.07, 0.15);
    const over = pore ? 0.0015 : clamp(0.016 * hl, 0.002, 0.005);
    let hc = pec ? pk.h - (pore ? 0 : 0.3 * half) : 0.5;
    let sE = hl - over;
    if (/seahorse|seadragon|pipefish/.test(sp.id)) hc = 0.3;
    if (axil && pec) { hc = pk.h + pk.dh + half + 0.02; sE = pec.s + pec.base * 0.6 + 0.02; }
    hc = clamp(hc, 0.2 + half, 0.9 - half);
    const h0 = hc - half, h1 = hc + half, bow = pore ? 0.005 : 0.02 * hl;
    const edge = (h: number) => { const v = ((h - h0) / (h1 - h0)) * 2 - 1; return sE - bow * v * v; };
    return [{
      kind: pore ? 'pore' : 'slit', h0, h1, axil, over, edge,
      depth: pore ? 0.003 : clamp(0.14 * hwH, 0.003, 0.012), thick: pore ? 0.001 : clamp(0.008 * hl, 0.001, 0.0022),
      arches: pore ? 0 : 2, amp: pore ? 0.35 : 0.6,
      len: (h: number) => (pore ? 0.014 : clamp(Math.min(0.16 * hl, edge(h) - front), 0.012, 0.2)),
    }];
  }
  /** depth (SL) of the gill chamber under the cover at (s, hN): deepest just in front of the shoulder wall */
  gillDepth(g: GillOpening, s: number, h: number) {
    const v = (h - g.h0) / (g.h1 - g.h0);
    if (v <= 0 || v >= 1) return 0;
    const E = g.edge(h), len = g.len(h);
    if (s >= E || s <= E - len) return 0;
    const wall = Math.min(0.005, 0.3 * len);
    return g.depth * Math.pow(smooth(0, 0.6, (s - (E - len)) / len), 1.3) * (1 - smooth(E - wall, E, s)) * Math.pow(Math.sin(PI * v), 0.6);
  }
  /** 0…1 swing of the gill COVER at (s, hN): hinged in front, free behind, tied down at both ends of the opening */
  gillSwing(g: GillOpening, s: number, h: number) {
    const v = (h - g.h0) / (g.h1 - g.h0);
    if (v <= 0 || v >= 1) return 0;
    const E = g.edge(h), len = g.len(h);
    return g.amp * smooth(0, 0.25, v) * (1 - smooth(0.75, 1, v)) * Math.pow(smooth(E - 1.5 * len, E, Math.min(s, E)), 1.5);
  }
  /** swing of the body skin / chamber floor: follows the cover in front of the pocket, fixed inside it and on the shoulder */
  gillFloor(g: GillOpening, s: number, h: number) {
    const E = g.edge(h);
    if (s >= E) return 0;
    const wall = Math.min(0.005, 0.3 * g.len(h));
    return this.gillSwing(g, s, h) * (1 - smooth(0, 0.25, this.gillDepth(g, s, h) / g.depth)) * (1 - smooth(E - 2 * wall, E - wall, s));
  }
  /** skinning weight of the body loft for the opercular pump */
  gillWeight(s: number, phi: number) {
    if (!this.gills.length || s > this.gS1) return 0;
    const hN = (phi <= PI ? phi : PI2 - phi) / PI;
    let w = 0;
    for (const g of this.gills) w = Math.max(w, this.gillFloor(g, s, hN));
    return w;
  }
  private placePec() {
    const f = this.sp.fins.pec;
    if (!f) return 0;
    let s = f.s;
    const { h, dh } = this.pecSpanH();
    const reach = dh + 0.012;
    // cleithrum + the part of the fin base that leans forward of its origin
    const fwd = 0.35 * f.base * Math.sin(f.splay * DEG) + 0.1 * f.base + 0.007;
    for (const g of this.gills) {
      if (g.axil) continue;
      for (let k = 0; k <= 12; k++) {
        const hh = h - reach + (2 * reach * k) / 12;
        if (hh <= g.h0 || hh >= g.h1) continue;
        const v = (hh - g.h0) / (g.h1 - g.h0);
        s = Math.max(s, g.edge(hh) + g.over * Math.sqrt(Math.sin(PI * v)) + fwd);
      }
    }
    return Math.min(s, 0.9);
  }
  private foilEnv(s: number) {
    let foil = 0;
    for (const [bs, e, ww] of this.sp.body.wbumps ?? []) {
      if (e > 0.04) {
        const d = (s - bs) / (ww * 1.15);
        foil = Math.max(foil, Math.exp(-d * d * d * d) * smooth(0.002, 0.012, Math.max(0, s)));
      }
    }
    return foil;
  }
  // ── cross-section ─────────────────────────────────────────────────────────
  sectionYZ(s: number, phi: number): [number, number] {
    const b = this.sp.body;
    const ro = this.sp.rostrum;
    const { flat } = this;
    const kR = this.tipRound(s);
    const ed = lerp(this.ed, Math.min(this.ed, 1), kR), ev = lerp(this.ev, Math.min(this.ev, 1), kR);
    const c = Math.cos(phi), sn = Math.sin(phi);
    // lenticular blade edge on flat swords, paddles and saws ahead of the skull
    const blade = ro && (ro.kind === 'sword' || ro.kind === 'paddle' || ro.kind === 'saw') ? 1 - smooth(-0.02, 0.07, s) : 0;
    const foil = this.foilEnv(s);
    const edLoc = lerp(lerp(ed, 0.56, foil * 0.72), 1.18, blade);
    const evLoc = lerp(lerp(ev, 0.58, foil * 0.72), 1.18, blade);
    const y = c >= 0 ? this.top(s) * Math.pow(c, edLoc) : -this.bot(s) * Math.pow(-c, evLoc);
    // lateral width profile: epaxial muscular shoulder fullness + pterygiophore fin-crest taper + ventral keel
    const ez = lerp(c >= 0 ? ed : lerp(ed, ev, 0.7), 0.86, blade);
    let wShape = Math.pow(Math.abs(sn), ez);
    if (!b.disc && b.sq < 3.2 && blade < 0.95) {
      const bodyK = 1 - blade;
      wShape *= 1 + 0.065 * c * (1 - flat * 0.6) * bodyK;
      const kv = b.keelVentral ?? 0;
      if (kv > 0 && c < 0) wShape *= 1 - kv * 0.38 * Math.pow(-c, 1.4) * bodyK;
      // hydrodynamic pterygiophore ridge compression into dorsal & anal fin bases (eliminates tubby flat backs)
      const crest = b.crest ?? clamp((0.6 - b.W) * 0.58, 0.05, 0.28);
      const ac = Math.abs(c);
      if (ac > 0.64 && s > 0.14) {
        const ridge = Math.pow((ac - 0.64) / 0.36, 1.55) * (c > 0 ? 1 : 1 - flat * 0.85);
        wShape *= 1 - crest * ridge * smooth(0.14, 0.28, s) * bodyK;
      }
    }
    let w = this.hw(s) * wShape;
    if (this.opercle) {
      const hl = this.sp.HL;
      // smooth lateral opercular fullness (mid-flank gill cover, never creasing the midlines)
      const op = smooth(hl * 0.3, hl * 0.82, s) * (1 - smooth(hl * 0.84, hl * 1.22, s));
      w *= 1 + 0.028 * op * sn * sn;
    }
    // cranial relief: brow shelf, cheek fullness and the preopercular step (see headForm)
    const hf = this.headForm(s, phi);
    if (hf !== 1) w *= hf;
    // gill chamber: the skin under each gill cover is recessed (the cover itself is built by gills.ts)
    if (!this.rawMode && s > this.gS0 && s < this.gS1) {
      const hN = Math.acos(clamp(c, -1, 1)) / PI;
      let d = 0;
      for (const g of this.gills) d = Math.max(d, this.gillDepth(g, s, hN));
      if (d > 0) w = Math.max(w * 0.4, w - d * Math.min(1, 1.25 * Math.abs(sn)));
    }
    // hydrodynamic lateral caudal peduncle keel (tunas, billfishes, lamnid sharks, jacks)
    if (b.keel && s > 0.79 && s < 0.995) {
      const ks = Math.sin(PI * clamp((s - 0.8) / 0.19));
      const kp = Math.exp(-Math.pow(c / 0.2, 2));
      w += b.keel * ks * kp * Math.abs(sn);
    }
    return [y, Math.sign(sn) * w];
  }
  surface(s: number, phi: number, out = new THREE.Vector3()) {
    const [y, z] = this.sectionYZ(s, phi);
    return this.local(s, y, z, out);
  }
  /** lateral-projection height (SL) of the skin at (s, φ): the y of sectionYZ without the width work */
  yAt(s: number, phi: number) {
    const ro = this.sp.rostrum;
    const blade = ro && (ro.kind === 'sword' || ro.kind === 'paddle' || ro.kind === 'saw') ? 1 - smooth(-0.02, 0.07, s) : 0;
    const foil = this.foilEnv(s);
    const kR = this.tipRound(s);
    const edLoc = lerp(lerp(lerp(this.ed, Math.min(this.ed, 1), kR), 0.56, foil * 0.72), 1.18, blade);
    const evLoc = lerp(lerp(lerp(this.ev, Math.min(this.ev, 1), kR), 0.58, foil * 0.72), 1.18, blade);
    const c = Math.cos(phi);
    return c >= 0
      ? this.top(s) * Math.pow(c, edLoc)
      : -this.bot(s) * Math.pow(-c, evLoc);
  }
  /**
   * Station of the free hind edge of the preopercle at texture height h (0 dorsal … 1 ventral): the edge the
   * cheek rises to, just in front of the hinge line of the opercular plates (edge − len), overlapping it by
   * a twentieth of the pocket it covers – the same line head.ts draws its sutures from.
   */
  preopS(g: GillOpening, h: number) {
    return g.edge(h) - g.len(h) * 1.05 - 0.05 * g.over;
  }
  /**
   * Cranial relief of the loft itself, as a lateral-width multiplier at (s, φ): a low brow shelf over the
   * orbit, the fullness of the cheek between eye and jaw joint, and the small step where the cheek meets
   * the gill cover along the preopercle edge. headmap.ts paints the matching bones and sutures onto this
   * form. Kept clear of both midlines so the loft never creases there.
   */
  headForm(s: number, phi: number) {
    const sp = this.sp, hl = sp.HL, e = sp.eye;
    if (this.bent || sp.plan !== 'fish' || sp.body.disc || hl < 0.06 || s > hl * 1.3 || s <= 0.003) return 1;
    const sn = Math.sin(phi);
    if (Math.abs(sn) < 0.28) return 1;
    const c = Math.cos(phi);
    const lat = Math.pow(clamp((Math.abs(sn) - 0.25) / 0.75, 0, 1), 1.45);
    let m = 1;
    if (e.d > 0) {
      const t = Math.max(0.04, this.top(s));
      const ce = clamp(this.normY(e.s, this.eyeYn) / t, -0.85, 0.88);
      const ds = (s - e.s) / (1.05 * e.d + 0.012);
      // supraorbital brow ridge: frontal bone arching over the upper orbit
      m += 0.021 * Math.exp(-ds * ds) * Math.exp(-Math.pow((c - ce - 0.32) / 0.26, 2)) * lat;
      // lachrymal / suborbital shelf below and slightly ahead of the orbit
      const dLach = (s - (e.s - 0.32 * e.d)) / (0.85 * e.d + 0.01);
      m += 0.014 * Math.exp(-dLach * dLach) * Math.exp(-Math.pow((c - ce + 0.28) / 0.26, 2)) * lat;
      // nasal capsule boss on the preorbital snout
      if (e.s > 0.025) {
        const sNas = e.s * 0.55;
        const dNas = (s - sNas) / Math.max(0.008, e.s * 0.28);
        m += 0.012 * Math.exp(-dNas * dNas) * Math.exp(-Math.pow((c - (ce + 0.16)) / 0.24, 2)) * lat;
      }
      // adductor mandibulae cheek muscle swelling between the orbit, jaw hinge, and preopercle
      const sCheek = e.s + 0.58 * Math.max(0.018, this.hinge.s - e.s);
      const dc = (s - sCheek) / Math.max(0.018, 0.58 * Math.max(0.025, this.hinge.s - e.s));
      m += 0.026 * Math.exp(-dc * dc) * Math.exp(-Math.pow((c - ce + 0.40) / 0.38, 2)) * lat;
    }
    // preopercular step & anterior opercular boss
    const g = this.gills.find((q) => q.kind === 'opercle');
    if (g) {
      const hN = (phi <= PI ? phi : PI2 - phi) / PI;
      if (hN > g.h0 - 0.04 && hN < g.h1 + 0.02) {
        const pre = this.preopS(g, clamp(hN, g.h0, g.h1));
        const mar = g.edge(clamp(hN, g.h0, g.h1));
        m *= 1 + 0.014 * (1 - smooth(pre - 0.0035, pre + 0.0035, s)) * smooth(0.008, 0.03, s) * lat;
        // subtle opercular bone convexity over the upper hyomandibular socket
        const uOp = (s - pre) / Math.max(0.01, mar - pre);
        if (uOp > 0 && uOp < 1) {
          const vOp = (hN - g.h0) / Math.max(0.05, g.h1 - g.h0);
          m += 0.011 * Math.sin(PI * uOp) * Math.exp(-Math.pow((vOp - 0.32) / 0.28, 2)) * lat;
        }
      }
    }
    return m;
  }
  /** angle φ on the right flank at which the section reaches height y (kept just off the midlines) */
  phiAtY(s: number, y: number) {
    return this.phiLim(s, y, 0.985);
  }
  /** as phiAtY, but allowed to reach the dorsal / ventral midline exactly */
  phiRaw(s: number, y: number) {
    return this.phiLim(s, y, 1);
  }
  private phiLim(s: number, y: number, lim: number) {
    const ro = this.sp.rostrum;
    const blade = ro && (ro.kind === 'sword' || ro.kind === 'paddle' || ro.kind === 'saw') ? 1 - smooth(-0.02, 0.07, s) : 0;
    const foil = this.foilEnv(s);
    const kR = this.tipRound(s);
    const edLoc = lerp(lerp(lerp(this.ed, Math.min(this.ed, 1), kR), 0.56, foil * 0.72), 1.18, blade);
    const evLoc = lerp(lerp(lerp(this.ev, Math.min(this.ev, 1), kR), 0.58, foil * 0.72), 1.18, blade);
    const t = this.top(s), b = this.bot(s);
    let c: number;
    if (y >= 0) c = t < 1e-7 ? 0 : Math.pow(Math.min(y / t, lim), 1 / edLoc);
    else c = b < 1e-7 ? 0 : -Math.pow(Math.min(-y / b, lim), 1 / evLoc);
    return Math.acos(clamp(c, -1, 1));
  }
  /** outward surface point & normal for an attachment at (s, normalised y) on the right/left flank */
  attach(s: number, yn: number, side: 1 | -1 = 1) {
    const s1 = clamp(s, this.sMin + 0.0005, 0.9995);
    const phi = this.phiAtY(s1, this.normY(s1, yn));
    const ph = side === 1 ? phi : PI2 - phi;
    return { p: this.surface(s1, ph), n: this.normalAt(s1, ph), phi: ph };
  }
  // ── mouth & fleshy plasticity ─────────────────────────────────────────────
  /** height of the oral cleft at s (from the midline arch to the rictus) */
  mouthY(s: number) {
    const { mouthTip: a, rictus: r, sSym, wrap } = this;
    const m = this.sp.mouth;
    if (wrap !== 0 && s < a.s) {
      const y = lerp(this.arcY0, a.y, clamp((s - sSym) / Math.max(1e-6, a.s - sSym)));
      return clamp(y, -this.bot(s), this.top(s));
    }
    const t = clamp((s - a.s) / Math.max(1e-4, r.s - a.s));
    const y = lerp(a.y, r.y, t) + m.curve * m.gape * Math.sin(PI * t);
    return clamp(y, -this.bot(s) * 0.96, this.top(s) * 0.96);
  }
  hasJaw() {
    return this.jaw;
  }
  /** φ of the mouth seam for any station (on the midline in front of the arch, smoothly continued past the rictus) */
  seamPhi(s: number) {
    if (!this.jaw) return PI * 0.5 + 0.35;
    const { rictus: r, sSym, wrap } = this;
    if (this.sMin < 0 && s <= 0) return PI;
    if (wrap !== 0 && s <= sSym) return wrap > 0 ? 0 : PI;
    const s1 = Math.max(s, 1e-6);
    if (s <= r.s) return this.phiRaw(s1, this.mouthY(s1));
    const pr = this.phiRaw(r.s, this.mouthY(r.s));
    return lerp(pr, PI * 0.5 + 0.35, smooth(r.s, r.s + 0.25, s));
  }
  /** A single motion field for the loft, lips and every organ mounted on the skin. */
  lowerDepth(s: number, phi: number) {
    const seam = this.seamPhi(s);
    const fold = phi <= PI ? phi : PI2 - phi;
    return clamp((fold - seam) / Math.max(1e-6, PI - seam));
  }
  private jawSpan() {
    return Math.max(0.004, this.rictus.s - (this.wrap === 0 ? 0 : this.sSym));
  }
  private cornerJaw(s: number) {
    const r = this.rictus.s, len = this.jawSpan();
    return 0.34 * smooth(r - len * 0.52, r - len * 0.08, s)
      * (1 - smooth(r - 0.001, r + clamp(len * 0.62, 0.018, 0.077), s));
  }
  /** Rigid symphysis and dentary, with a broad blend into the cheek and throat behind it. */
  jawWeight(s: number, depth: number) {
    if (!this.jaw || (this.wrap < 0 && s < this.sSym)) return 0;
    if (this.wrap > 0 && s <= this.sSym) return 1;
    const r = this.rictus.s, len = this.jawSpan();
    const along = 1 - smooth(r - len * 0.62, r, s);
    const joint = this.cornerJaw(s);
    const dh = Math.max(0.0001, this.mouthY(s) + this.bot(s));
    const lowerH = clamp(this.sp.mouth.gape * 0.22 + Math.max(0, r - s) * 0.59, 0.005, 0.15);
    const floor = 1 - smooth(lowerH * 0.65, lowerH * 2.65, dh * depth);
    const chin = this.wrap > 0 ? 1 - smooth(this.sSym, this.sSym + len * 0.42, s) : 0;
    // Behind the cleft use a smooth angular field with derivative zero at its seam.
    const cheek = 1 - smooth(0, 0.98, depth);
    return along * lerp(floor, 1, chin) + (1 - along) * joint * cheek;
  }
  upperJawWeight(s: number, phi: number) {
    if (!this.jaw) return 0;
    if (this.wrap > 0 && s < this.sSym) return 1; // the projecting chin belongs to the mandible
    const fold = phi <= PI ? phi : PI2 - phi;
    return this.cornerJaw(s) * (1 - smooth(0, 0.8, Math.max(0, this.seamPhi(s) - fold)));
  }
  /** Chin fullness. The actual upper and lower cutting edges coincide in the bind pose. */
  jutAt(s: number, depth: number) {
    const m = this.sp.mouth;
    if (!this.jaw || m.jut <= 0 || this.wrap !== 0) return 0;
    const len = this.jawSpan();
    return Math.min(m.jut, m.gape * 0.11, 0.012) * (1 - smooth(len * 0.22, len * 0.92, s))
      * smooth(0, 0.45, depth) * smooth(0, len * 0.10, s);
  }
  /** premaxillary travel, bounded by the size of the mouth rather than the body length */
  protrudeAmt() {
    if (!this.jaw) return 0;
    const m = this.sp.mouth;
    if (this.sp.cephalic || this.sp.rostrum) return 0.0009;
    if (m.teeth === 'beak') return m.gape * 0.025;
    const k = m.teeth === 'shark' ? 0.09 : clamp((m.protrude ?? 0.44) * 0.24, 0.033, 0.19);
    return Math.min(m.gape * k, 0.019) * (this.wrap > 0 ? 0.5 : 1);
  }
  /** Hyoid expansion is secondary to the hinge and cannot pull the flank or orbit out of shape. */
  gularAmt() {
    if (!this.jaw) return 0;
    const m = this.sp.mouth;
    return Math.min(m.gape * (0.095 + 0.10 * clamp(m.gular ?? 0.5)), this.sp.body.D * 0.075, 0.021);
  }
  /** Premaxilla, lateral cheek flare, throat expansion, labial-fold tension. */
  plasticAt(s: number, phi: number, isLower: boolean): [number, number, number, number] {
    if (!this.jaw) return [0, 0, 0, 0];
    const { rictus: r, sSym, wrap } = this;
    const len = this.jawSpan();
    const p = phi <= PI ? phi : PI2 - phi;
    const pm = this.seamPhi(s);
    let prot = 0;
    if (!isLower && (wrap === 0 || s >= sSym)) {
      const stop = r.s - len * 0.12;
      const front = wrap === 0 ? 1 : smooth(sSym - 0.001, sSym + len * 0.04, s);
      prot = front * (1 - smooth(r.s - len * 0.85, stop, s)) * (1 - smooth(0, 1.12, Math.max(0, pm - p)));
    }
    const hl = Math.max(this.sp.HL, r.s + 0.035);
    const cheek = smooth(r.s - len * 0.44, r.s + 0.016, s) * (1 - smooth(hl * 0.80, hl * 1.08, s));
    const gular = smooth(r.s - len * 0.30, r.s + 0.014, s) * (1 - smooth(hl * 0.75, hl * 1.12, s));
    return [prot, cheek * Math.pow(Math.abs(Math.sin(phi)), 1.7), gular * smooth(0.35, 1.0, -Math.cos(p)), 0];
  }
  poseAt(s: number, phi: number, lower = this.hasJaw() && (phi <= PI ? phi : PI2 - phi) > this.seamPhi(s)) {
    const depth = lower ? this.lowerDepth(s, phi) : 0;
    return {
      jaw: lower ? this.jawWeight(s, depth) : this.upperJawWeight(s, phi),
      plastic: this.plasticAt(s, phi, lower),
      gill: this.gillWeight(s, phi),
      jut: lower ? this.jutAt(s, depth) * this.L : 0,
      uv: [this.uOf(s), phi / PI2] as [number, number],
    };
  }
  jawAngle() {
    if (!this.jaw) return 0;
    const m = this.sp.mouth;
    // A small beak or a broad cartilaginous oral slit needs far less rotation than an ambush mouth.
    const limit = this.sp.cephalic ? 21 : m.teeth === 'beak' ? 25 : wrapLimit(this.wrap, m.gape);
    // A long jaw swings its chin far: keep the drop of the lower-jaw tip within the head's own depth, otherwise a
    // great-jawed hunter's mandible hangs below the body like a plank instead of framing an open mouth.
    const sR = clamp(this.rictus.s, 0.01, 0.9);
    const dep = this.top(sR) + this.bot(sR);
    const drop = Math.asin(clamp((0.7 * dep) / Math.max(1e-3, m.gape), 0, 1)) / DEG;
    return clamp(m.open, 0, Math.min(limit, Math.max(14, drop)));
  }
  /** Half width (SL) where a straight-body appendage samples its local collision envelope. */
  skinWidthAt(s: number, y: number) {
    if (s < this.sMin || s > 1 || y >= this.top(s) || y <= -this.bot(s)) return 0;
    return Math.abs(this.sectionYZ(s, this.phiRaw(s, y))[1]);
  }
  /** φ on the right flank (0..π) where the section half-width equals zAbs (dorsal or ventral half) */
  phiAtZ(s: number, zAbs: number, dorsal: boolean) {
    let lo = dorsal ? 0 : PI / 2, hi = dorsal ? PI / 2 : PI;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      const z = Math.abs(this.sectionYZ(s, mid)[1]);
      if ((z < zAbs) === dorsal) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  /** outward unit surface normal at (s, φ) – valid right up to the snout or rostrum tip */
  normalAt(s: number, phi: number) {
    const s1 = clamp(s, this.sMin + 2e-5, 0.9995);
    const ds = clamp(0.25 * (s1 - this.sMin), 1e-5, 0.0015), dp = 0.012;
    const a = this.surface(Math.min(0.9999, s1 + ds), phi).sub(this.surface(Math.max(this.sMin + 1e-6, s1 - ds), phi));
    const b = this.surface(s1, phi + dp).sub(this.surface(s1, phi - dp));
    const n = new THREE.Vector3().crossVectors(b, a);
    const hd = (this.top(s1) + this.bot(s1)) / 2;
    const out = this.surface(s1, phi).sub(this.local(Math.min(0.9995, s1 + clamp(hd, 0.004, 0.06)), 0, 0));
    if (n.lengthSq() < 1e-22) n.copy(out);
    n.normalize();
    if (n.dot(out) < 0) n.negate();
    if (!isFinite(n.x) || n.lengthSq() < 0.5) n.set(0, Math.cos(phi), Math.sin(phi));
    return n;
  }
  /** approximate body-surface coordinates (s, φ) of an object-space point near the skin */
  project(p: THREE.Vector3): { s: number; phi: number } {
    if (!this.bent) return this.locate(p);
    let best = 0, bd = 1e9;
    const x = p.x / this.L, y0 = p.y / this.L;
    for (let i = 0; i <= this.K; i += 4) {
      const dx = x - this.cx[i], dy = y0 - this.cy[i];
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i / this.K; }
    }
    let s = best;
    for (let k = 0; k < 3; k++) {
      const step = p.clone().sub(this.local(s, 0, 0)).dot(this.frame(s).T) / this.L;
      s = cl