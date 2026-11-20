amp(s + clamp(step, -0.01, 0.01), this.sMin, 1);
    }
    const y = p.clone().sub(this.local(s, 0, 0)).dot(this.frame(s).N) / this.L;
    let phi = this.phiAtY(s, y);
    if (p.z < 0) phi = PI2 - phi;
    return { s, phi };
  }
  /** is the local point (s, y, z – SL units) inside the body? */
  private insideSL(s: number, y: number, z: number) {
    if (s <= this.sMin + 1e-6 || s >= 1) return false;
    if (y >= this.top(s) || y <= -this.bot(s)) return false;
    return Math.abs(z) < Math.abs(this.sectionYZ(s, this.phiRaw(s, y))[1]);
  }
  /** exact surface coordinates of a point on or near the skin (uses both y and z so crests & cephalofoils never collapse to z = 0) */
  locate(p: THREE.Vector3): { s: number; phi: number } {
    if (this.bent) return this.project(p);
    const s = clamp(0.5 - p.x / this.L, this.sMin + 1e-6, 1);
    const ySL = p.y / this.L, zAbs = Math.abs(p.z) / this.L;
    const t = this.top(s), b = this.bot(s);
    let phi = this.phiRaw(s, ySL);
    if ((ySL >= t * 0.96 || ySL <= -b * 0.96) && zAbs > 1e-5) {
      const w = this.hw(s);
      if (w > 1e-6) {
        const ro = this.sp.rostrum;
        const blade = ro && (ro.kind === 'sword' || ro.kind === 'paddle' || ro.kind === 'saw') ? 1 - smooth(-0.02, 0.07, s) : 0;
        const foil = this.foilEnv(s);
        const kR = this.tipRound(s);
        const edR = lerp(this.ed, Math.min(this.ed, 1), kR), evR = lerp(this.ev, Math.min(this.ev, 1), kR);
        const edLoc = lerp(lerp(edR, 0.56, foil * 0.72), 1.18, blade);
        const evLoc = lerp(lerp(evR, 0.58, foil * 0.72), 1.18, blade);
        const ezLoc = lerp(ySL >= 0 ? edR : lerp(edR, evR, 0.7), 0.86, blade);
        const cy = ySL >= 0
          ? Math.pow(Math.max(0, ySL / Math.max(1e-6, t)), 1 / edLoc)
          : -Math.pow(Math.max(0, -ySL / Math.max(1e-6, b)), 1 / evLoc);
        const sz = Math.pow(Math.max(0, zAbs / w), 1 / ezLoc);
        phi = Math.atan2(sz, cy);
      }
    }
    if (p.z < 0) phi = PI2 - phi;
    return { s, phi };
  }
  /**
   * Drop a point that floats near the body onto the skin along the direction ±n (bisection on the
   * analytic solid). Unlike `project` this is exact on forward-, upward- and downward-facing skin,
   * which is what lets lips and orbit rims hug blunt snouts and ventral mouths.
   */
  drop(q: THREE.Vector3, n: THREE.Vector3, reach: number) {
    if (!this.bent) {
      const L = this.L;
      const ins = (t: number) => this.insideSL(0.5 - (q.x + n.x * t) / L, (q.y + n.y * t) / L, (q.z + n.z * t) / L);
      let lo = -reach, hi = reach;
      for (let k = 0; k < 5 && !ins(lo); k++) lo *= 2;
      for (let k = 0; k < 5 && ins(hi); k++) hi *= 2;
      if (ins(lo) && !ins(hi)) {
        for (let k = 0; k < 20; k++) {
          const mid = (lo + hi) / 2;
          if (ins(mid)) lo = mid; else hi = mid;
        }
        const p = q.clone().addScaledVector(n, (lo + hi) / 2);
        const at = this.locate(p);
        return { p, s: at.s, phi: at.phi };
      }
    }
    const pr = this.project(q);
    return { p: this.surface(pr.s, pr.phi), s: pr.s, phi: pr.phi };
  }
  /** object-space hinge position */
  hingeXY() {
    const p = this.local(this.hinge.s, this.hinge.y, 0);
    return new THREE.Vector2(p.x, p.y);
  }
}
