//  Generator utilities: seeded randomness and colour science.
//  Everything the generator does is a pure function of (habitat, seed, novelty),
//  so every specimen can be re-created exactly from its URL.
// ─────────────────────────────────────────────────────────────────────────────
import { rng } from '../engine/math';
export type Rnd = () => number;
export const makeRng = (seed: number): Rnd => rng(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
export const range = (r: Rnd, a: number, b: number) => a + (b - a) * r();
export const irange = (r: Rnd, a: number, b: number) => Math.min(b, Math.floor(a + (b - a + 1) * r()));
export const chance = (r: Rnd, p: number) => r() < p;
export const pick = <T,>(r: Rnd, a: readonly T[]): T => a[Math.min(a.length - 1, Math.floor(r() * a.length))];
export const logRange = (r: Rnd, a: number, b: number) => Math.exp(range(r, Math.log(a), Math.log(b)));
export const jit = (r: Rnd, v: number, pct: number) => v * (1 + (r() * 2 - 1) * pct);
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const seq = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => +(a + ((b - a) * i) / Math.max(1, n - 1)).toFixed(4));
export const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
/** weighted pick over a record of weights */
export function wpick<K extends string>(r: Rnd, w: Partial<Record<K, number>>, fallback?: K): K {
  const keys = Object.keys(w) as K[];
  let tot = 0;
  for (const k of keys) tot += Math.max(0, w[k] ?? 0);
  if (tot <= 0) return fallback ?? keys[0];
  let x = r() * tot;
  for (const k of keys) {
    x -= Math.max(0, w[k] ?? 0);
    if (x <= 0) return k;
  }
  return keys[keys.length - 1];
}
export function shuffle<T>(r: Rnd, a: readonly T[]): T[] {
  const o = a.slice();
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
}
export function hashSeed(...parts: (string | number)[]) {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
// ── colour ──────────────────────────────────────────────────────────────────
export type RGB = [number, number, number];
export const isHex = (x: unknown): x is string => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x);
export function hex2rgb(h: string): RGB {
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgb2hex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export function rgb2hsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}
/** hue in degrees, saturation & lightness 0..1 */
export function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgb2hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
export const toHsl = (c: string) => rgb2hsl(hex2rgb(c));
/** gamma-aware mix (no muddy midpoints) */
export function mix(a: string, b: string, t: number): string {
  const A = hex2rgb(a), B = hex2rgb(b), g = 2.2;
  return rgb2hex(A.map((v, i) => Math.pow(lerp(Math.pow(v / 255, g), Math.pow(B[i] / 255, g), clamp(t)), 1 / g) * 255) as RGB);
}
/** shift hue (deg), scale saturation, add lightness */
export function tone(c: string, o: { h?: number; s?: number; l?: number; lm?: number }) {
  const [h, s, l] = toHsl(c);
  return hsl(h + (o.h ?? 0), s * (o.s ?? 1), l * (o.lm ?? 1) + (o.l ?? 0));
}
export const darker = (c: string, k: number) => tone(c, { lm: 1 - k });
export const lighter = (c: string, k: number) => mix(c, '#ffffff', k);
export function luma(c: string) {
  const [r, g, b] = hex2rgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
/** evocative English colour word, used for common names */
export function colorWord(c: string): string {
  const [h, s, l] = toHsl(c);
  if (l < 0.11) return 'Ebony';
  if (s < 0.13) return l > 0.82 ? 'Pearl' : l > 0.6 ? 'Silver' : l > 0.36 ? 'Slate' : 'Sooty';
  if (s < 0.3 && l < 0.5) return h < 60 ? (l < 0.3 ? 'Umber' : 'Bronze') : h < 170 ? 'Olive' : 'Steel';
  if (h < 12 || h >= 350) return l < 0.32 ? 'Maroon' : l > 0.7 ? 'Rose' : 'Crimson';
  if (h < 24) return l < 0.35 ? 'Rusty' : 'Vermilion';
  if (h < 40) return s < 0.45 ? 'Sandy' : l < 0.35 ? 'Chestnut' : 'Tangerine';
  if (h < 52) return s < 0.45 ? 'Tawny' : 'Golden';
  if (h < 66) return l < 0.36 ? 'Olive' : 'Lemon';
  if (h < 95) return l < 0.4 ? 'Olive' : 'Chartreuse';
  if (h < 150) return l < 0.3 ? 'Forest' : 'Emerald';
  if (h < 178) return 'Jade';
  if (h < 198) return 'Turquoise';
  if (h < 222) return 'Azure';
  if (h < 246) return l < 0.35 ? 'Sapphire' : 'Cobalt';
  if (h < 270) return 'Indigo';
  if (h < 296) return 'Violet';
  if (h < 330) return 'Magenta';
  return 'Rose';
}
