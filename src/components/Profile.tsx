import { useMemo } from 'react';
import { BodyModel } from '../engine/model';
import { caudalTrailFactor, finShapeH } from '../engine/fins';
import { DEG, lerp, smooth } from '../engine/math';
import type { MedianFin, Species } from '../engine/types';

/** Lateral morphometric diagram (snout to the right, like the 3D side view). */
export default function Profile({ sp }: { sp: Species }) {
  const d = useMemo(() => {
    const m = new BodyModel(sp, 1);
    const cl = sp.fins.caudal.len ?? sp.fins.caudal.span * 0.6;
    const s0 = m.sMin - 0.025, s1 = 1 + Math.max(0.04, cl) + 0.03;
    const W = 340, H = 150;
    const k = W / (s1 - s0);
    const maxY = Math.max(0.28, ...Array.from({ length: 70 }, (_, i) => {
      const s = lerp(m.sMin, 1, i / 69);
      return Math.max(m.top(s), m.bot(s)) + 0.02;
    }), ...(sp.fins.dorsal ?? []).map((f) => m.top((f.s0 + f.s1) / 2) + f.h), sp.fins.caudal.span / 2 + 0.02);
    const ky = Math.min(k, (H / 2 - 6) / maxY);
    const X = (s: number) => W - (s - s0) * k;
    const Y = (y: number) => H / 2 - y * ky;
    const N = 140;
    let body = '';
    for (let i = 0; i <= N; i++) { const s = lerp(m.sMin, 1, i / N); body += `${i ? 'L' : 'M'}${X(s).toFixed(1)},${Y(m.top(s)).toFixed(1)}`; }
    for (let i = N; i >= 0; i--) { const s = lerp(m.sMin, 1, i / N); body += `L${X(s).toFixed(1)},${Y(-m.bot(s)).toFixed(1)}`; }
    body += 'Z';
    const fins: string[] = [];
    const med = (f: MedianFin, side: 1 | -1) => {
      const sw = (f.sweep ?? (f.shape === 'shark' ? 30 : f.shape === 'falcate' || f.shape === 'marlin' ? 32 : f.shape === 'squami' ? 18 : 14)) * DEG;
      const K = 24;
      let p = '';
      for (let i = 0; i <= K; i++) {
        const u = i / K, s = lerp(f.s0, f.s1, u);
        const yB = side > 0 ? m.top(s) : -m.bot(s);
        const hh = f.h * finShapeH(f, u);
        const rear = f.shape === 'squami' ? 0.34 * Math.pow(smooth(0.54, 1, u), 1.35) * hh : 0;
        const sx = s + hh * Math.sin(sw) + rear;
        const sy = yB + side * hh * Math.cos(sw);
        p += `${i ? 'L' : 'M'}${X(sx).toFixed(1)},${Y(sy).toFixed(1)}`;
      }
      for (let i = K; i >= 0; i--) {
        const s = lerp(f.s0, f.s1, i / K);
        p += `L${X(s).toFixed(1)},${Y(side > 0 ? m.top(s) : -m.bot(s)).toFixed(1)}`;
      }
      fins.push(p + 'Z');
    };
    (sp.fins.dorsal ?? []).forEach((f) => med(f, 1));
    (sp.fins.anal ?? []).forEach((f) => med(f, -1));
    const cs = sp.fins.caudal;
    if (cs.span > 0) {
      const up = cs.up ?? (cs.type === 'hetero' ? 0.68 : 0.5);
      if (cs.customTrail && cs.customTrail.length >= 2) {
        let cp = `M${X(1)},${Y(m.top(1))}`;
        for (let i = 0; i <= 24; i++) {
          const uu = i / 24;
          const reach = (caudalTrailFactor(cs, uu) ?? 0.8) * cl;
          const yy = lerp(cs.span * up, -cs.span * (1 - up), uu) + sp.body.pedY;
          cp += ` L${X(1 + reach).toFixed(1)},${Y(yy).toFixed(1)}`;
        }
        cp += ` L${X(1)},${Y(-m.bot(1))}Z`;
        fins.push(cp);
      } else {
        const fork = cs.type === 'forked' || cs.type === 'lunate' || cs.type === 'hetero' || cs.type === 'lyre' ? (cs.fork ?? 0.3) : 0.92;
        fins.push(`M${X(1)},${Y(m.top(1))} L${X(1 + cl)},${Y(cs.span * up)} L${X(1 + cl * fork)},${Y(0)} L${X(1 + cl)},${Y(-cs.span * (1 - up))} L${X(1)},${Y(-m.bot(1))}Z`);
      }
    }
    const tip = m.mouthTip, ric = m.rictus, hin = m.hinge;
    let cleft = '';
    for (let i = 0; i <= 18; i++) {
      const s = tip.s + ((ric.s - tip.s) * i) / 18;
      cleft += `${i ? 'L' : 'M'}${X(s).toFixed(1)},${Y(m.mouthY(s)).toFixed(1)}`;
    }
    const eyeY = m.normY(sp.eye.s, m.eyeYn);
    return { W, H, body, fins, X, Y, tip, ric, hin, cleft, eyeY, ky, k, m };
  }, [sp]);
  const { W, H, X, Y, tip, ric, hin, cleft } = d;
  const jaw = sp.mouth.kind === 'jaw' || sp.mouth.kind === undefined;
  const hasMouth = jaw && sp.mouth.gape > 0.004;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <pattern id="gridp" width="17" height="17" patternUnits="userSpaceOnUse">
          <path d="M17 0H0V17" fill="none" stroke="#1e3a4c" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#gridp)" />
      <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} stroke="#2c5870" strokeDasharray="3 3" strokeWidth="0.6" />
      {d.fins.map((f, i) => <path key={i} d={f} fill="#2b6a8a" opacity="0.45" stroke="#5fb4d8" strokeWidth="0.6" />)}
      <path d={d.body} fill="#1b4a63" stroke="#8fd6f5" strokeWidth="1.1" />
      <line x1={X(sp.HL)} x2={X(sp.HL)} y1={Y(d.m.top(sp.HL))} y2={Y(-d.m.bot(sp.HL))} stroke="#8fd6f5" strokeDasharray="2 2" strokeWidth="0.6" opacity="0.7" />
      {sp.eye.d > 0 && <circle cx={X(sp.eye.s)} cy={Y(d.eyeY)} r={Math.max(1.5, (sp.eye.d / 2) * d.k)} fill="#0b1820" stroke="#80dae1" strokeWidth="0.9" />}
      {hasMouth && (
        <g>
          <path d={cleft} fill="none" stroke="#ff5a6a" strokeWidth="2" strokeLinecap="round" />
          <circle cx={X(ric.s)} cy={Y(ric.y)} r="2.4" fill="#ff5a6a" />
          <circle cx={X(hin.s)} cy={Y(hin.y)} r="2" fill="none" stroke="#ffd36a" strokeWidth="1" />
          <line x1={X(tip.s)} y1={Y(tip.y)} x2={X(tip.s + 0.12)} y2={Y(tip.y)} stroke="#ff8a96" strokeWidth="0.6" strokeDasharray="2 2" />
          <text x={X(ric.s) - 4} y={Y(ric.y) + 13} fill="#ffb3bb" fontSize="9" fontFamily="ui-monospace,monospace" textAnchor="end">
            {`cleft ${+sp.mouth.angle.toFixed(1)}° · gape ${(sp.mouth.gape * 100).toFixed(1)}% SL`}
          </text>
        </g>
      )}
      <text x={6} y={12} fill="#6fa8c4" fontSize="8.5" fontFamily="ui-monospace,monospace">caudal</text>
      <text x={W - 6} y={12} fill="#6fa8c4" fontSize="8.5" fontFamily="ui-monospace,monospace" textAnchor="end">snout</text>
    </svg>
  );
}
