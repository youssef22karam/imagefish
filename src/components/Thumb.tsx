import { memo, useId, useMemo } from 'react';
import { BodyModel } from '../engine/model';
import { caudalTrailFactor, finShapeH } from '../engine/fins';
import { DEG, lerp } from '../engine/math';
import type { CaudalSpec, MedianFin, Species } from '../engine/types';
/** Field-guide plate: a lateral silhouette lofted by the engine's own body model, in the specimen's colours. */
function Thumb({ sp, w = 132, h = 70, className }: { sp: Species; w?: number; h?: number; className?: string }) {
  const gid = useId().replace(/:/g, '');
  const d = useMemo(() => {
    try {
      const m = new BodyModel(sp, 1);
      const ray = sp.plan === 'ray';
      const top = (s: number) => (ray ? m.hw(s) : m.top(s));
      const bot = (s: number) => (ray ? m.hw(s) : m.bot(s));
      const c = sp.fins.caudal;
      const cl = ray || c.type === 'none' ? 0 : c.len ?? c.span * 0.6;
      const s0 = m.sMin - 0.015, s1 = 1 + Math.max(0.02, cl) + 0.015;
      const N = 72;
      let yT = 0.02, yB = 0.02;
      for (let i = 0; i <= N; i++) { const s = lerp(m.sMin, 1, i / N); yT = Math.max(yT, top(s)); yB = Math.max(yB, bot(s)); }
      if (!ray) {
        for (const f of sp.fins.dorsal ?? []) yT = Math.max(yT, m.top((f.s0 + f.s1) / 2) + f.h * 0.9);
        for (const f of sp.fins.anal ?? []) yB = Math.max(yB, m.bot((f.s0 + f.s1) / 2) + f.h * 0.9);
        yT = Math.max(yT, c.span * 0.55 + sp.body.pedY); yB = Math.max(yB, c.span * 0.55 - sp.body.pedY);
      }
      const pad = 3;
      const k = Math.min((w - pad * 2) / (s1 - s0), (h - pad * 2) / (yT + yB));
      const ox = (w - (s1 - s0) * k) / 2, oy = (h - (yT + yB) * k) / 2 + yT * k;
      const X = (s: number) => w - ox - (s - s0) * k;
      const Y = (y: number) => oy - y * k;
      const P = (s: number, y: number) => `${X(s).toFixed(1)},${Y(y).toFixed(1)}`;
      let body = '';
      for (let i = 0; i <= N; i++) { const s = lerp(m.sMin, 1, i / N); body += `${i ? 'L' : 'M'}${P(s, top(s))}`; }
      for (let i = N; i >= 0; i--) { const s = lerp(m.sMin, 1, i / N); body += `L${P(s, -bot(s))}`; }
      body += 'Z';
      const fins: string[] = [];
      const med = (f: MedianFin, side: 1 | -1) => {
        const sw = (f.sweep ?? (f.shape === 'shark' || f.shape === 'falcate' ? 30 : 16)) * DEG;
        let p = '';
        const K = 16;
        for (let i = 0; i <= K; i++) {
          const u = i / K, s = lerp(f.s0, f.s1, u), hh = f.h * finShapeH(f, u);
          const yb = side > 0 ? m.top(s) : -m.bot(s);
          p += `${i ? 'L' : 'M'}${P(s + hh * Math.sin(sw), yb + side * hh * Math.cos(sw))}`;
        }
        p += `L${P(f.s1, side > 0 ? m.top(f.s1) * 0.9 : -m.bot(f.s1) * 0.9)}L${P(f.s0, side > 0 ? m.top(f.s0) * 0.9 : -m.bot(f.s0) * 0.9)}Z`;
        return p;
      };
      if (!ray) {
        for (const f of sp.fins.dorsal ?? []) fins.push(med(f, 1));
        for (const f of sp.fins.anal ?? []) fins.push(med(f, -1));
      }
      const tail = ray || c.type === 'none' ? '' : caudalPath(c, sp.body.P, sp.body.pedY, P);
      const e = sp.eye;
      const eye = !ray && e.d > 0 ? { x: X(e.s), y: Y(m.normY(e.s, m.eyeYn)), r: Math.max(1.1, (e.d / 2) * k) } : null;
      const pec = sp.fins.pec && !ray ? { x: X(sp.fins.pec.s + sp.fins.pec.len * 0.35), y: Y(m.normY(sp.fins.pec.s, sp.fins.pec.y)), rx: sp.fins.pec.len * k * 0.42, ry: Math.max(1, sp.fins.pec.base * k * 0.9), a: -sp.fins.pec.elev * 0.5 } : null;
      return { body, fins, tail, eye, pec, y1: Y(yT * 0.9), y2: Y(-yB * 0.9) };
    } catch {
      return null;
    }
  }, [sp, w, h]);
  if (!d) return <div className={className} style={{ width: w, height: h }} />;
  const cs = sp.color.cs ?? [0.3, 0.7];
  const finC = sp.fins.color, fa = Math.min(0.95, Math.max(0.45, sp.fins.alpha));
  const glow = sp.barbels?.find((b) => b.bulb)?.bulb;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={className} aria-hidden>
      <defs>
        <linearGradient id={`b${gid}`} x1="0" y1={d.y1} x2="0" y2={d.y2} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={sp.color.top} />
          <stop offset={cs[0]} stopColor={sp.color.side} />
          <stop offset={cs[1]} stopColor={sp.color.side} />
          <stop offset="1" stopColor={sp.color.belly} />
        </linearGradient>
      </defs>
      {d.tail && <path d={d.tail} fill={sp.fins.caudal.color ?? finC} fillOpacity={fa} />}
      {d.fins.map((p, i) => <path key={i} d={p} fill={finC} fillOpacity={fa * 0.9} />)}
      <path d={d.body} fill={`url(#b${gid})`} stroke="rgba(0,0,0,0.35)" strokeWidth={0.6} />
      {d.pec && <ellipse cx={d.pec.x} cy={d.pec.y} rx={d.pec.rx} ry={d.pec.ry} transform={`rotate(${d.pec.a} ${d.pec.x} ${d.pec.y})`} fill={sp.fins.pec?.color ?? finC} fillOpacity={0.7} />}
      {d.eye && (<><circle cx={d.eye.x} cy={d.eye.y} r={d.eye.r} fill={sp.eye.iris} /><circle cx={d.eye.x} cy={d.eye.y} r={d.eye.r * 0.55} fill="#05070a" /></>)}
      {glow && <circle cx={d.eye ? d.eye.x + 6 : w - 8} cy={d.eye ? d.eye.y - 9 : 8} r={2.4} fill={glow} style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />}
    </svg>
  );
}
function caudalPath(c: CaudalSpec, P: number, pedY: number, pt: (s: number, y: number) => string) {
  const len = c.len ?? c.span * 0.6, hs = c.span / 2, p = Math.max(0.004, P / 2);
  const up = (c.up ?? 0.5) * 2;
  const A = (s: number, y: number) => pt(1 + s, pedY + y);
  if (c.customTrail && c.customTrail.length >= 2) {
    let d = `M${A(0, p)}`;
    const K = 20;
    for (let i = 0; i <= K; i++) {
      const uu = i / K;
      const reach = (caudalTrailFactor(c, uu) ?? 0.8) * len;
      const yy = lerp(c.span * (c.up ?? 0.5), -c.span * (1 - (c.up ?? 0.5)), uu);
      d += `L${A(reach, yy)}`;
    }
    return `${d}L${A(0, -p)}Z`;
  }
  switch (c.type) {
    case 'forked': case 'lyre': return `M${A(0, p)}L${A(len, hs * up)}L${A(len * (c.fork ?? 0.35), 0)}L${A(len, -hs * (2 - up))}L${A(0, -p)}Z`;
    case 'lunate': return `M${A(0, p)}L${A(len, hs)}L${A(len * 0.42, 0)}L${A(len, -hs)}L${A(0, -p)}Z`;
    case 'emarginate': return `M${A(0, p)}L${A(len, hs)}L${A(len * 0.8, 0)}L${A(len, -hs)}L${A(0, -p)}Z`;
    case 'truncate': return `M${A(0, p)}L${A(len, hs)}L${A(len, -hs)}L${A(0, -p)}Z`;
    case 'pointed': return `M${A(0, p)}L${A(len, 0)}L${A(0, -p)}Z`;
    case 'swallow': return `M${A(0, p)}L${A(len * 1.45, hs * up * 1.05)}L${A(len * 0.18, 0)}L${A(len * 1.45, -hs * (2 - up) * 1.05)}L${A(0, -p)}Z`;
    case 'hypo': return `M${A(0, p)}L${A(len * 0.8, hs * up * 0.85)}L${A(len * 0.3, 0)}L${A(len * 1.35, -hs * (2 - up) * 1.1)}L${A(0, -p)}Z`;
    case 'sword': return `M${A(0, p)}L${A(len * 0.85, hs * up * 0.85)}L${A(len * 0.9, -hs * 0.4)}L${A(len * 2.4, -hs * (2 - up) * 0.95)}L${A(len * 2.2, -hs * (2 - up) * 1.12)}L${A(0, -p)}Z`;
    case 'spade': return `M${A(0, p)}L${A(len * 0.38, hs * up)}L${A(len * 1.25, 0)}L${A(len * 0.38, -hs * (2 - up))}L${A(0, -p)}Z`;
    case 'double': return `M${A(0, p)}L${A(len * 0.55, hs * up)}L${A(len * 1.05, hs * 0.5)}L${A(len * 0.5, 0)}L${A(len * 1.05, -hs * 0.5)}L${A(len * 0.55, -hs * (2 - up))}L${A(0, -p)}Z`;
    case 'crown': { let d = `M${A(0, p)}`; for (let i = 0; i <= 12; i++) { const t = i / 12, y = hs * (1 - 2 * t), x = len * (0.55 + 0.45 * Math.sin(Math.PI * t)) * (i % 2 ? 0.78 : 1.05); d += `L${A(x, y)}`; } return d + `L${A(0, -p)}Z`; }
    case 'whip': return `M${A(0, p)}L${A(len * 0.35, hs * 0.4)}L${A(len * 2.6, hs * 0.03)}L${A(len * 2.6, -hs * 0.03)}L${A(len * 0.35, -hs * 0.4)}L${A(0, -p)}Z`;
    case 'clavus': { let d = `M${A(0, p)}`; for (let i = 0; i <= 9; i++) { const t = i / 9; d += `L${A(len * (i % 2 ? 0.3 : 0.55), hs * (1 - 2 * t))}`; } return d + `L${A(0, -p)}Z`; }
    case 'veil': return `M${A(0, p)}L${A(len * 0.9, hs * 0.5)}L${A(len * 1.7, -hs * 0.4)}L${A(len * 1.3, -hs * 1.5)}L${A(len * 0.5, -hs * 1.2)}L${A(0, -p)}Z`;
    case 'doubleEm': return `M${A(0, p)}L${A(len, hs * up)}L${A(len * 0.62, hs * 0.5)}L${A(len, 0)}L${A(len * 0.62, -hs * 0.5)}L${A(len, -hs * (2 - up))}L${A(0, -p)}Z`;
    case 'trilobe': return `M${A(0, p)}L${A(len * 0.5, hs * up * 0.9)}L${A(len * 0.55, hs * 0.25)}L${A(len * 1.15, hs * 0.14)}L${A(len * 1.15, -hs * 0.14)}L${A(len * 0.55, -hs * 0.25)}L${A(len * 0.5, -hs * (2 - up) * 0.9)}L${A(0, -p)}Z`;
    case 'hetero': return `M${A(0, p)}L${A(len, hs * 1.15)}L${A(len * 0.32, 0)}L${A(len * 0.45, -hs * 0.55)}L${A(0, -p)}Z`;
    default: {
      let d = `M${A(0, p)}`;
      for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 - (i / 10) * Math.PI; d += `L${A(len * (0.35 + 0.65 * Math.cos(a)), hs * Math.sin(a))}`; }
      return `${d}L${A(0, -p)}Z`;
    }
  }
}
export default memo(Thumb);
