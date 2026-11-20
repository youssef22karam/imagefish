import { seq, type Pal } from './palkit';

/** Natural colouration (f – p). Coordinates: s snout → caudal base, h 0 dorsal · 0.5 lateral midline · 1 ventral. */
export const PAL2: Record<string, Pal> = {
  'freshwater-angelfish': {
    // silver with three black bars (through the eye, mid-body, tail base), golden-brown crown, translucent blue-grey fins
    c: { top: '#a8a690', side: '#dcdccc', belly: '#ececdf', cs: [0.3, 0.7], iri: 0.55, metal: 0.3, rough: 0.28, layers: [
      { k: 'grad', c: '#c8b070', s0: 0, s1: 0.3, h0: 0, h1: 0.3, soft: 0.06, a: 0.3 },
      { k: 'bars', at: [0.14, 0.44, 0.74], w: 0.034, c: '#191919', h0: 0, h1: 1, rough: 0.002, a: 0.92 },
    ] },
    f: { color: '#c0c8d0', alpha: 0.55, d: [{ color: '#b8c0c8', tip: '#3a3e44' }], a: [{ color: '#b8c0c8', tip: '#3a3e44' }], c: { color: '#c8d0d8' }, v: { color: '#e8e8e0' } },
    e: { iris: '#c02020' },
  },
  'giant-moray': {
    // brown, densely leopard-spotted with black, black blotch around the gill opening
    c: { top: '#4b3a22', side: '#5c4a2c', belly: '#7a6846', cs: [0.3, 0.75], rough: 0.3, sheen: 0.35, layers: [
      { k: 'mottle', c: '#2a1e10', sc: 0.04, th: 0.6, soft: 0.1, a: 0.32 },
      { k: 'spots', n: 900, r: 0.0055, c: '#1a1208', h0: 0, h1: 1, irr: 0.6, rv: 0.6 },
      { k: 'spots', n: 1, r: 0.012, c: '#0e0a06', s0: 0.12, s1: 0.12, h0: 0.56, h1: 0.56, irr: 0.4 },
    ] },
    f: { color: '#4a3a24', d: [{ pattern: 'spots', spots: 6, spotCol: '#1a1208' }], a: [{ pattern: 'spots', spots: 6, spotCol: '#1a1208' }] },
    e: { iris: '#d8c040' },
  },
  'giant-oarfish': {
    // mirror-silver with dark streaks and spots, crimson dorsal crest
    c: { top: '#a7afb7', side: '#d8dde2', belly: '#e8ecf0', cs: [0.3, 0.7], iri: 0.6, metal: 0.62, rough: 0.2, layers: [
      { k: 'waves', n: 5, c: '#46505a', w: 0.004, amp: 0.3, freq: 60, h0: 0.15, h1: 0.6, s0: 0.1, s1: 0.98, a: 0.5 },
      { k: 'spots', n: 70, r: 0.006, c: '#3a4048', h0: 0.12, h1: 0.62, irr: 0.7, a: 0.8 },
    ] },
    f: { color: '#d02030', d: [{ color: '#d8223a', tip: '#e8303a' }] },
  },
  'giant-trevally': {
    // blue-grey silver with a sprinkle of tiny black dots, dark head, yellowish pectorals
    c: { top: '#4f5f68', side: '#bfc7cb', belly: '#e8eaea', cs: [0.34, 0.56], iri: 0.5, metal: 0.55, rough: 0.22, layers: [
      { k: 'grad', c: '#30383e', s0: 0, s1: 0.18, h0: 0, h1: 0.4, soft: 0.05, a: 0.35 },
      { k: 'grad', c: '#6a8aa0', s0: 0.05, s1: 0.98, h0: 0.25, h1: 0.4, soft: 0.05, a: 0.3 },
      { k: 'spots', n: 90, r: 0.0032, c: '#1a2028', h0: 0.12, h1: 0.62, s0: 0.15, s1: 0.85, irr: 0.4 },
    ] },
    f: { color: '#4a5258', d: [{ color: '#3a4248' }, { color: '#4a5258', tip: '#2a3036' }], a: [{ color: '#4e565c' }], c: { color: '#3e464c', tip: '#2a3036' }, p: { color: '#c8c098' } },
    e: { iris: '#c08a30' },
  },
  goldfish: {
    // saturated orange, each scale with a brighter centre and a deeper rim
    c: { top: '#e0601a', side: '#f2861f', belly: '#f8c26e', cs: [0.3, 0.72], metal: 0.32, rough: 0.28, layers: [
      { k: 'scaleFill', c: '#ffb040', a: 0.25, r: 0.3 },
      { k: 'scaleEdge', c: '#b8480e', a: 0.35 },
    ] },
    f: { color: '#f08a24', tip: '#f6a650', alpha: 0.8 },
  },
  'great-barracuda': {
    // silver, oblique dark bars on the upper flank, scattered black blotches on the lower rear flank, white-tipped tail
    c: { top: '#45545f', side: '#c7cfd5', belly: '#f2f4f4', cs: [0.32, 0.56], iri: 0.45, metal: 0.45, rough: 0.24, layers: [
      { k: 'bars', at: seq(0.33, 0.81, 9), w: 0.022, c: '#2c3a46', h0: 0, h1: 0.4, slant: -0.06, a: 0.6, rough: 0.003 },
      { k: 'spots', n: 24, r: 0.0075, c: '#14161c', h0: 0.42, h1: 0.82, s0: 0.42, s1: 0.95, irr: 0.4 },
    ] },
    f: { color: '#4a5a6a', d: [{ color: '#3a4a58' }, { color: '#3a4a58', tip: '#e8ecef' }], a: [{ color: '#5a6a78', tip: '#e8ecef' }], c: { color: '#3a4a58', tip: '#e6eaee' } },
  },
  'great-white-shark': {
    // slate-grey back, irregular ragged boundary, white belly; black pectoral tips
    c: { top: '#58626b', side: '#6f7b85', belly: '#f4f4f0', cs: [0.47, 0.53], rough: 0.52, layers: [
      { k: 'mottle', c: '#4a535b', sc: 0.05, th: 0.6, soft: 0.12, a: 0.25, h0: 0, h1: 0.5 },
      { k: 'mottle', c: '#f2f2ee', sc: 0.02, th: 0.5, soft: 0.05, a: 0.85, h0: 0.44, h1: 0.56, seed: 3 },
    ] },
    f: { color: '#58626b', p: { color: '#58626b', tip: '#20262c' }, c: { color: '#56606a' } },
  },
  'green-moray': {
    // yellow-green mucus over dark blue skin – even, slightly mottled green
    c: { top: '#3d6a2c', side: '#5b8a3c', belly: '#7a9a48', cs: [0.3, 0.75], rough: 0.28, sheen: 0.4, layers: [
      { k: 'mottle', c: '#2e5420', sc: 0.04, th: 0.6, soft: 0.12, a: 0.3 },
      { k: 'grad', c: '#8aa84a', s0: 0, s1: 0.2, h0: 0.5, h1: 1, soft: 0.05, a: 0.35 },
    ] },
    f: { color: '#3e6a2c', tip: '#5a8a3c' },
    e: { iris: '#c8c040' },
  },
  'greenland-shark': {
    // drab grey-brown with faint darker spots and clouds
    c: { top: '#4d4a42', side: '#5f5c54', belly: '#8a877e', cs: [0.42, 0.58], rough: 0.55, layers: [
      { k: 'mottle', c: '#3e3c35', sc: 0.05, th: 0.55, soft: 0.12, a: 0.35 },
      { k: 'spots', n: 120, r: 0.006, c: '#3a3832', irr: 0.6, a: 0.5, h0: 0, h1: 0.6 },
    ] },
    f: { color: '#4e4c46' },
  },
  guppy: {
    // keep the measured reticulation & tail; add the male's orange and iridescent blue-green body spots
    add: [
      { k: 'spots', n: 4, r: 0.012, c: '#f08a1c', s0: 0.45, s1: 0.9, h0: 0.3, h1: 0.7, irr: 0.45 },
      { k: 'spots', n: 3, r: 0.01, c: '#3ab0d0', s0: 0.4, s1: 0.85, h0: 0.35, h1: 0.7, irr: 0.4, a: 0.85 },
      { k: 'spots', n: 2, r: 0.009, c: '#141410', s0: 0.5, s1: 0.85, h0: 0.35, h1: 0.6, irr: 0.4 },
    ],
  },
  'humpback-anglerfish': {
    c: { top: '#0f0d0d', side: '#141212', belly: '#1a1716', rough: 0.38, sheen: 0.2, layers: [{ k: 'mottle', c: '#252020', sc: 0.04, th: 0.6, soft: 0.12, a: 0.4 }] },
    f: { color: '#1a1717' },
  },
  'humphead-wrasse': {
    // turquoise-green, maze of wavy dark lines on the head, a dark bar on every scale, two lines behind the eye
    c: { top: '#2b6e6a', side: '#47a399', belly: '#7ab6ac', cs: [0.3, 0.72], rough: 0.32, layers: [
      { k: 'vermic', c: '#1c4f4c', sc: 0.022, w: 0.06, a: 0.7, s0: 0, s1: 0.3, h0: 0.1, h1: 0.9 },
      { k: 'waves', n: 70, c: '#163e3c', w: 0.006, amp: 0.25, freq: 26, s0: 0.28, s1: 0.98, h0: 0.04, h1: 0.92, vertical: true, a: 0.5 },
      { k: 'stripe', h: 0.36, w: 0.006, c: '#173c3c', s0: 0.19, s1: 0.27 },
      { k: 'stripe', h: 0.46, w: 0.006, c: '#173c3c', s0: 0.19, s1: 0.26 },
    ] },
    f: { color: '#2a7070', tip: '#3a8ab0' },
    e: { iris: '#d0a020' },
  },
  sailfish: {
    // indigo back, rows of pale-blue bars and spots, cobalt sail peppered with black spots
    c: { top: '#091a3c', side: '#5c7696', belly: '#eef1f5', cs: [0.4, 0.57], iri: 0.58, metal: 0.55, rough: 0.22, layers: [
      { k: 'grad', c: '#1c3a6a', s0: 0, s1: 0.98, h0: 0.34, h1: 0.42, soft: 0.04, a: 0.35 },
      { k: 'bars', at: seq(0.26, 0.83, 14), w: 0.0075, c: '#86c0f2', h0: 0.2, h1: 0.62, a: 0.8, brk: 0.3, rough: 0.0012 },
      { k: 'spots', n: 90, r: 0.003, c: '#8ad4ff', h0: 0.2, h1: 0.62, s0: 0.24, s1: 0.86, a: 0.85 },
    ] },
    f: { color: '#14244a', d: [{ color: '#0e2054', tip: '#16347a', pattern: 'spots', spots: 7, spotCol: '#06102a' }] },
    r: '#14203a',
  },
  'koi-carp': {
    // as photographed: a bronze-brown (chagoi-type) koi with a dark net on every scale and orange-red fins
    c: { top: '#4a3a28', side: '#8a6c4a', belly: '#d8c4a0', cs: [0.3, 0.7], metal: 0.25, rough: 0.3, layers: [
      { k: 'scaleFill', c: '#a88458', a: 0.3, r: 0.32, h0: 0.1, h1: 0.85 },
      { k: 'scaleEdge', c: '#2a1c10', a: 0.65 },
    ] },
    f: { color: '#8a5a3a', d: [{ color: '#6a4a30' }], a: [{ color: '#c0603a' }], c: { color: '#9a5a38', tip: '#b8603a' }, p: { color: '#c86a3a' }, v: { color: '#c0603a' } },
  },
  'largemouth-bass': {
    // olive-green, ragged dark lateral band of blotches, dark streaks across the cheek, pale belly
    c: { top: '#3c4a2c', side: '#7f8c5c', belly: '#e8e8d2', cs: [0.3, 0.68], rough: 0.34, layers: [
      { k: 'blotch', n: 24, r: 0.012, c: '#24301a', h0: 0.04, h1: 0.38, a: 0.55 },
      { k: 'stripe', h: 0.43, w: 0.05, c: '#1e2614', s0: 0.12, s1: 0.98, wob: 0.012, rough: 0.004, brk: 0.12, a: 0.8 },
      { k: 'line', p: [0.1, 0.4, 0.16, 0.44, 0.24, 0.46], w: 0.006, c: '#2a3420', a: 0.7 },
      { k: 'line', p: [0.12, 0.52, 0.18, 0.56, 0.24, 0.58], w: 0.004, c: '#2a3420', a: 0.5 },
      { k: 'scaleFill', c: '#2e3a22', a: 0.18, r: 0.3, h0: 0.55, h1: 0.85 },
    ] },
    f: { color: '#5a6a40', d: [{ color: '#5a6440' }, { color: '#5a6440' }], a: [{ color: '#6a7048' }], c: { color: '#56603e' }, p: { color: '#a0a07a', alpha: 0.6 }, v: { color: '#c8c8a0' } },
    e: { iris: '#c0802a' },
  },
  'leafy-seadragon': {
    // ochre-orange with pale bands on the trunk and cream spots; yellow-ochre leafy appendages
    c: { top: '#c8661e', side: '#e08a34', belly: '#f0b862', cs: [0.3, 0.72], rough: 0.35, layers: [
      { k: 'mottle', c: '#a85818', sc: 0.02, th: 0.6, soft: 0.1, a: 0.35 },
      { k: 'bars', at: seq(0.28, 0.5, 6), w: 0.008, c: '#f0d070', h0: 0.1, h1: 0.85, a: 0.5 },
      { k: 'spots', n: 80, r: 0.0045, c: '#f8ecc4', h0: 0.1, h1: 0.9, irr: 0.3 },
    ] },
    f: { color: '#e8d8b0' },
    fr: '#d89a3c',
  },
  'lined-seahorse': {
    // mottled grey-brown with fine white lines and dots, dark ring at every bony segment
    c: { top: '#6e6048', side: '#97845e', belly: '#c3ae86', rough: 0.42, layers: [
      { k: 'mottle', c: '#4a3f2c', sc: 0.025, th: 0.56, soft: 0.1, a: 0.52 },
      { k: 'bars', at: seq(0.24, 0.97, 28), w: 0.004, c: '#3c321e', a: 0.5 },
      { k: 'waves', n: 9, c: '#f6ecd6', w: 0.0035, amp: 0.12, freq: 50, h0: 0.1, h1: 0.9, s0: 0.18, s1: 0.95, a: 0.7 },
      { k: 'spots', n: 60, r: 0.0025, c: '#f4ead6', h0: 0.05, h1: 0.95, a: 0.8 },
    ] },
    f: { color: '#e8d8b0' },
  },
  'live-sharksucker': {
    // grey with a broad black mid-lateral stripe edged above and below in white; white-cornered fins
    c: { top: '#5e5f66', side: '#8e9098', belly: '#c9c6c6', cs: [0.3, 0.7], rough: 0.32, layers: [
      { k: 'stripe', h: 0.45, w: 0.026, c: '#22242a', s0: 0, s1: 1, rough: 0.001 },
      { k: 'stripe', h: 0.38, w: 0.006, c: '#ececec', s0: 0.05, s1: 1 },
      { k: 'stripe', h: 0.52, w: 0.006, c: '#ececec', s0: 0.05, s1: 1 },
      { k: 'bars', at: seq(0.03, 0.2085, 22), w: 0.0035, c: '#3a3a40', h0: 0, h1: 0.12, rough: 0.0003 },
    ] },
    f: { color: '#5a5c62', d: [{ color: '#3a3c42', tip: '#e2e2e2' }], a: [{ color: '#3a3c42', tip: '#e2e2e2' }], c: { color: '#2a2c30', tip: '#d8dade' } },
  },
  'longhorn-cowfish': {
    // lemon-yellow box with sky-blue spots and the faint hexagons of the carapace plates
    c: { top: '#e3c21e', side: '#ecd02a', belly: '#e6cf74', rough: 0.3, layers: [
      { k: 'reticulate', c: '#b48c14', n: 16, w: 0.002, s0: 0.15, s1: 0.85, h0: 0.05, h1: 0.95, a: 0.35 },
      { k: 'spots', n: 85, r: 0.0085, c: '#58aed6', h0: 0.04, h1: 0.96, irr: 0.25, ring: 'rgba(30,60,90,0.35)', rw: 1.25, even: 0.7 },
    ] },
    f: { color: '#e8d838', c: { color: '#e8cf30', pattern: 'spots', spots: 5, spotCol: '#58aed6' } },
  },
  'mahi-mahi': {
    // electric gold flanks, blue-green back, peppered with blue and black spots
    c: { top: '#16607a', side: '#d1bc2a', belly: '#f1e47a', cs: [0.24, 0.62], iri: 0.6, metal: 0.5, rough: 0.22, layers: [
      { k: 'grad', c: '#3a9a6a', s0: 0, s1: 0.98, h0: 0.16, h1: 0.32, soft: 0.06, a: 0.5 },
      { k: 'grad', c: '#f4ec9a', s0: 0, s1: 0.25, h0: 0.55, h1: 1, soft: 0.05, a: 0.4 },
      { k: 'spots', n: 150, r: 0.0045, c: '#1f5fa8', h0: 0.12, h1: 0.82, irr: 0.35, a: 0.9 },
      { k: 'spots', n: 60, r: 0.0035, c: '#151a20', h0: 0.4, h1: 0.85, s0: 0.2, s1: 0.9, a: 0.7 },
    ] },
    f: { color: '#3a7a8a', d: [{ color: '#1a4f7a', tip: '#2a6a9a' }], a: [{ color: '#c8c040' }], c: { color: '#c8b828', tip: '#d8c840' }, p: { color: '#c8b860' }, v: { color: '#e8d870' } },
  },
  'mariana-snailfish': {
    // translucent pinkish-white, viscera glowing through the body wall
    c: { top: '#e6b6b2', side: '#efc6c2', belly: '#f4d2ce', trans: 0.14, rough: 0.24, sheen: 0.55, layers: [
      { k: 'grad', c: '#c98a8a', s0: 0.05, s1: 0.4, h0: 0.4, h1: 0.95, soft: 0.08, a: 0.35 },
      { k: 'mottle', c: '#f6dcd8', sc: 0.05, th: 0.55, soft: 0.12, a: 0.35 },
    ] },
    f: { color: '#f0c8c4' },
  },
  'mexican-tetra-cave-form': {
    // unpigmented pink-flesh, red gills showing through, silvery midline
    c: { top: '#dcbcb4', side: '#ead2ce', belly: '#f0dcd8', trans: 0.1, iri: 0.45, sheen: 0.6, layers: [
      { k: 'patch', p: [0.19, 0.4, 0.25, 0.36, 0.31, 0.42, 0.32, 0.58, 0.28, 0.74, 0.21, 0.72, 0.18, 0.56], c: '#e07a7a', soft: 0.012, a: 0.45 },
      { k: 'grad', c: '#d6a0a0', s0: 0.3, s1: 0.6, h0: 0.5, h1: 0.9, soft: 0.08, a: 0.3 },
      { k: 'stripe', h: 0.48, w: 0.01, c: '#f6ece8', s0: 0.25, s1: 0.98, a: 0.6 },
    ] },
    f: { color: '#f0d8d4', alpha: 0.5 },
  },
  'nassau-grouper': {
    // tan with five dark brown bars, "tuning-fork" band from snout through the eye, black saddle on the peduncle, dots round the eye
    c: { top: '#7a6856', side: '#d6ccbe', belly: '#f0eae2', cs: [0.32, 0.72], rough: 0.38, layers: [
      { k: 'mottle', c: '#8a7460', sc: 0.03, th: 0.6, soft: 0.1, a: 0.3 },
      { k: 'bars', at: [0.32, 0.48, 0.64, 0.8], w: 0.05, c: '#543e2e', h0: 0, h1: 0.88, slant: 0.1, wob: 0.012, rough: 0.006, a: 0.86 },
      { k: 'line', p: [0, 0.36, 0.06, 0.3, 0.12, 0.26, 0.18, 0.18, 0.24, 0.06], w: 0.012, c: '#4f3a2a', a: 0.85 },
      { k: 'line', p: [0.12, 0.26, 0.18, 0.32, 0.26, 0.36, 0.33, 0.3], w: 0.01, c: '#5a4432', a: 0.7 },
      { k: 'patch', p: [0.875, 0, 0.93, 0, 0.965, 0.08, 0.955, 0.3, 0.9, 0.32, 0.87, 0.15], c: '#141414', soft: 0.004 },
      { k: 'spots', n: 10, r: 0.0028, c: '#121212', s0: 0.08, s1: 0.16, h0: 0.25, h1: 0.42 },
    ] },
    f: { color: '#8a7a68', d: [{ color: '#7a6a58' }], a: [{ color: '#8a7a68', tip: '#4a3a2a' }], c: { color: '#8a7a68', tip: '#5a4a3a' }, p: { color: '#b8a890' }, v: { color: '#7a6a58', tip: '#2a2420' } },
    e: { iris: '#c0a060' },
  },
  'neon-tetra': {
    // olive back, glowing blue-green stripe eye → adipose, scarlet lower rear half, silver-white belly
    c: { top: '#4a4632', side: '#c2c8c8', belly: '#eaecec', cs: [0.26, 0.6], iri: 0.5, rough: 0.28, layers: [
      { k: 'grad', c: '#2a2a20', s0: 0.1, s1: 0.98, h0: 0, h1: 0.22, soft: 0.04, a: 0.45 },
      { k: 'grad', c: '#e01e2e', s0: 0.46, s1: 1, h0: 0.5, h1: 0.96, soft: 0.04 },
      { k: 'stripe', h: 0.36, w: 0.034, c: '#2fd6ff', s0: 0.08, s1: 0.86, glow: true, taper: 0.25 },
    ] },
    f: { color: '#e8eaea', alpha: 0.4 },
  },
  'nile-tilapia': {
    // olive-grey with faint bars, dark-rimmed scales, black opercular spot, barred tail, reddish throat and fin margins
    c: { top: '#56645a', side: '#97a58e', belly: '#d8d8c6', cs: [0.3, 0.7], rough: 0.34, layers: [
      { k: 'bars', at: [0.33, 0.43, 0.53, 0.63, 0.73, 0.83], w: 0.03, c: '#303c30', a: 0.32, rough: 0.004 },
      { k: 'grad', c: '#c86a5a', s0: 0.12, s1: 0.35, h0: 0.72, h1: 1, soft: 0.06, a: 0.3 },
      { k: 'spots', n: 1, r: 0.007, c: '#1a201c', s0: 0.26, s1: 0.26, h0: 0.36, h1: 0.36 },
      { k: 'scaleEdge', c: '#36443a', a: 0.42 },
    ] },
    f: { color: '#7a8070', d: [{ color: '#6a7464', pattern: 'spots', spots: 6, spotCol: '#3a443a', tip: '#c86a5a' }], a: [{ color: '#6a7464', pattern: 'spots', spots: 5, spotCol: '#3a443a' }], c: { color: '#7a8070', pattern: 'bands', spots: 8, spotCol: '#3a443a' }, p: { color: '#c8b8a0', alpha: 0.5 }, v: { color: '#5a6458' } },
  },
  'northern-pike': {
    // olive-green with rows of pale bean-shaped spots, white belly; orange-red fins blotched with black
    c: { top: '#33432a', side: '#677848', belly: '#ecead6', cs: [0.32, 0.7], rough: 0.32, layers: [
      { k: 'mottle', c: '#2a3820', sc: 0.03, th: 0.6, soft: 0.1, a: 0.3, h1: 0.6 },
      { k: 'grad', c: '#e8e4c8', s0: 0, s1: 0.3, h0: 0.65, h1: 1, soft: 0.05, a: 0.5 },
      { k: 'spots', n: 230, r: 0.0062, c: '#cfcf98', h0: 0.08, h1: 0.72, s0: 0.22, s1: 0.98, irr: 0.5, el: 1.9, even: 0.6, a: 0.9 },
    ] },
    f: { color: '#b8743a', tip: '#8a5228', d: [{ color: '#a8703a', pattern: 'spots', spots: 4, spotCol: '#3a2a18' }], a: [{ color: '#b07038', pattern: 'spots', spots: 4, spotCol: '#3a2a18' }], c: { color: '#b07038', pattern: 'spots', spots: 5, spotCol: '#3a2a18' }, p: { color: '#c88a48' }, v: { color: '#c88a48' } },
    e: { iris: '#d8c060' },
  },
  'nurse-shark': {
    c: { top: '#8a7a5c', side: '#998a6c', belly: '#d8ccb2', cs: [0.42, 0.64], rough: 0.55, layers: [{ k: 'mottle', c: '#7a6a4e', sc: 0.05, th: 0.6, soft: 0.12, a: 0.3 }] },
    f: { color: '#8a7a5a' },
  },
  'ocean-sunfish': {
    // blue-grey with pale clouds, silvery-white below
    c: { top: '#566c7a', side: '#8a9ea8', belly: '#c9d4d8', cs: [0.3, 0.75], rough: 0.5, layers: [
      { k: 'mottle', c: '#d8e2e6', sc: 0.06, th: 0.58, soft: 0.12, a: 0.45, h0: 0.25, h1: 1 },
      { k: 'mottle', c: '#3e505c', sc: 0.04, th: 0.62, soft: 0.1, a: 0.3, seed: 5, h1: 0.6 },
    ] },
    f: { color: '#566c7a', tip: '#3e505c' },
  },
  'ocellaris-clownfish': {
    // Wild-type A. ocellaris: deep carotenoid orange, narrow black margins and three DIFFERENT white bands.
    // The middle band's anterior edge projects toward the gills (not a straight vertical stripe).
    c: { top: '#df3f0d', side: '#e94a0d', belly: '#d83b0e', cs: [0.24, 0.8], rough: 0.43, metal: 0.01, layers: [
      { k: 'grad', c: '#f18418', s0: 0, s1: 0.13, h0: 0.37, h1: 0.83, soft: 0.05, a: 0.42 },
      { k: 'grad', c: '#c52e0b', s0: 0.17, s1: 0.85, h0: 0, h1: 0.17, soft: 0.07, a: 0.18 },
      { k: 'band', stops: [[0, 0.22, 0.295], [0.14, 0.215, 0.3], [0.36, 0.23, 0.316], [0.56, 0.263, 0.35], [0.78, 0.285, 0.367], [1, 0.268, 0.354]], c: '#f3f0e7', shade: '#d9e7e7', edge: '#1b1210', ew: 0.007, soft: 0.0005, rough: 0.0017 },
      { k: 'band', stops: [[0, 0.49, 0.62], [0.15, 0.48, 0.645], [0.34, 0.45, 0.675], [0.49, 0.394, 0.68], [0.58, 0.38, 0.676], [0.74, 0.44, 0.645], [0.9, 0.492, 0.62], [1, 0.5, 0.609]], c: '#f5f1eb', shade: '#dce8e6', edge: '#1c1211', ew: 0.0085, soft: 0.00055, rough: 0.0024 },
      { k: 'band', stops: [[0, 0.853, 0.93], [0.26, 0.855, 0.932], [0.52, 0.863, 0.946], [0.78, 0.878, 0.948], [1, 0.891, 0.954]], c: '#f4f1e9', shade: '#dce5e5', edge: '#1b1111', ew: 0.0075, soft: 0.00055, rough: 0.0014 },
      { k: 'spots', n: 7, r: 0.001, c: '#8b2c13', s0: 0.01, s1: 0.09, h0: 0.34, h1: 0.69, a: 0.28 },
    ] },
    f: { color: '#d94312', alpha: 0.96,
      d: [
        { color: '#d84110', mid: '#e75112', tip: '#e05012', edge: '#20110c', edgeWidth: 0.135, sheath: 0.54 },
        { color: '#d94310', mid: '#e45012', tip: '#e45114', edge: '#20110c', edgeWidth: 0.125, sheath: 0.52 },
      ],
      a: [{ color: '#d83d0f', mid: '#e14b13', tip: '#e34f12', edge: '#20110c', edgeWidth: 0.13, sheath: 0.5 }],
      c: { color: '#df4611', mid: '#ea5412', tip: '#e54b10', edge: '#18100c', edgeWidth: 0.11 },
      p: { color: '#de4710', mid: '#e45416', tip: '#e65314', edge: undefined, marks: [
        { v0: 0.74, v1: 0.9, c: '#21120e' }, { v0: 0.91, v1: 1, c: '#f0eadb' },
      ] },
      v: { color: '#d9410e', mid: '#e64e13', tip: '#e64e12', edge: '#1c120d', edgeWidth: 0.12 },
    },
    e: { iris: '#a9431b', iris2: '#e27728', ring: '#943111' },
  },
  oscar: {
    // charcoal marbled with flame-orange, black ocellus ringed in orange at the tail base
    c: { top: '#33322a', side: '#4e4a40', belly: '#5e5648', cs: [0.3, 0.75], rough: 0.33, layers: [
      { k: 'grad', c: '#2a2620', s0: 0, s1: 0.2, h0: 0, h1: 0.6, soft: 0.05, a: 0.5 },
      { k: 'mottle', c: '#e8701c', sc: 0.04, th: 0.55, soft: 0.06, a: 0.92, s0: 0.2, s1: 0.95, h0: 0.2, h1: 0.98 },
      { k: 'mottle', c: '#f0902a', sc: 0.025, th: 0.62, soft: 0.06, a: 0.6, s0: 0.15, s1: 0.9, h0: 0.1, h1: 0.6, seed: 3 },
      { k: 'spots', n: 1, r: 0.022, c: '#141414', s0: 0.935, s1: 0.935, h0: 0.27, h1: 0.27, ring: '#f08020', rw: 1.35, irr: 0.15 },
    ] },
    f: { color: '#3a3a30', tip: '#2a2a22', d: [{ color: '#2e2e26' }], a: [{ color: '#2e2e26' }], c: { color: '#3a3a30' }, p: { color: '#6a6050', alpha: 0.6 } },
    e: { iris: '#e05020' },
  },
  'pacific-angelshark': {
    // sandy grey-brown peppered with dark and pale specks – sand camouflage
    c: { top: '#8a7c66', side: '#9a8c74', belly: '#e8e0d0', cs: [0.45, 0.55], rough: 0.55, layers: [
      { k: 'mottle', c: '#6e6250', sc: 0.05, th: 0.58, soft: 0.12, a: 0.35, h0: 0, h1: 0.48 },
      { k: 'spots', n: 520, r: 0.0032, c: '#4a3e30', h0: 0, h1: 0.46, irr: 0.5 },
      { k: 'spots', n: 260, r: 0.0035, c: '#e2dac8', h0: 0, h1: 0.46, irr: 0.5 },
    ] },
    f: { color: '#8a7a64', d: [{ pattern: 'spots', spots: 5, spotCol: '#4a3e30' }], p: { color: '#8a7c66', pattern: 'spots', spots: 6, spotCol: '#4a3e30' } },
  },
  'pacific-hagfish': {
    c: { top: '#8f6f78', side: '#b08e95', belly: '#ccb2b6', rough: 0.3, sheen: 0.5, layers: [
      { k: 'mottle', c: '#7a5a62', sc: 0.05, th: 0.6, soft: 0.12, a: 0.3 },
      { k: 'row', h: 0.72, n: 14, r: 0.003, c: '#e8d8d8', s0: 0.12, s1: 0.95 },
    ] },
    f: { color: '#b8949a' },
  },
  'pacific-herring': {
    c: { top: '#24504f', side: '#c2d0ce', belly: '#f2f6f8', cs: [0.32, 0.5], iri: 0.85, metal: 0.6, rough: 0.22, layers: [
      { k: 'grad', c: '#4a8a84', s0: 0.12, s1: 0.98, h0: 0.25, h1: 0.34, soft: 0.03, a: 0.4 },
      { k: 'grad', c: '#d4c48a', s0: 0.07, s1: 0.21, h0: 0.32, h1: 0.75, soft: 0.04, a: 0.2 },
    ] },
    f: { color: '#9aa8ae', d: [{ color: '#5a6a6a', tip: '#3a4a4a' }], c: { color: '#5a6a6c', tip: '#2a3a3c' }, p: { color: '#d0d8dc' } },
  },
  'pacific-sardine': {
    // blue-green back, silver flanks with one to three rows of black spots
    c: { top: '#25395f', side: '#bfc7d6', belly: '#f2f6f8', cs: [0.3, 0.5], iri: 0.85, metal: 0.6, rough: 0.22, layers: [
      { k: 'grad', c: '#3a6a8a', s0: 0.1, s1: 0.98, h0: 0.24, h1: 0.32, soft: 0.03, a: 0.4 },
      { k: 'row', h: 0.36, n: 12, r: 0.0065, c: '#141c30', s0: 0.25, s1: 0.85 },
      { k: 'row', h: 0.44, n: 8, r: 0.005, c: '#1a2236', s0: 0.35, s1: 0.8, a: 0.7 },
    ] },
    f: { color: '#b8c4c8', d: [{ color: '#6a7a8a' }], c: { color: '#5a6a7c', tip: '#2a3446' } },
  },
  'peacock-flounder': {
    // eyed side sandy blue-grey, mottled, covered in sky-blue rings; two or three dark blotches; blind side white
    c: { top: '#6e7f80', side: '#7a8a88', belly: '#6e7f80', rough: 0.38, blind: '#eeebe2', layers: [
      { k: 'mottle', c: '#55665f', sc: 0.03, th: 0.55, soft: 0.1, a: 0.5 },
      { k: 'spots', n: 70, r: 0.011, c: '#000000', ring: '#6cc4ef', rw: 1.35, hole: true, irr: 0.4, h0: 0.04, h1: 0.96 },
      { k: 'spots', n: 3, r: 0.022, c: '#1a262c', irr: 0.5, h0: 0.3, h1: 0.7, s0: 0.3, s1: 0.8 },
    ] },
    f: { color: '#6a8898', d: [{ pattern: 'spots', spots: 6, spotCol: '#6cc4ef' }], a: [{ pattern: 'spots', spots: 6, spotCol: '#6cc4ef' }] },
  },
  'pearl-gourami': {
    // brown pearled with hundreds of nacreous spots, a black zig-zag midline, flame-orange breast
    c: { top: '#7a6a4c', side: '#a69570', belly: '#e47e34', cs: [0.3, 0.72], iri: 0.4, rough: 0.3, layers: [
      { k: 'grad', c: '#e86a28', s0: 0.08, s1: 0.5, h0: 0.7, h1: 1, soft: 0.06, a: 0.85 },
      { k: 'spots', n: 620, r: 0.0042, c: '#f4f0e6', h0: 0.02, h1: 0.82, irr: 0.25, even: 0.7 },
      { k: 'stripe', h: 0.48, w: 0.012, c: '#1a1814', s0: 0.05, s1: 0.9, wob: 0.01, rough: 0.003, brk: 0.1 },
    ] },
    f: { color: '#d8c8a8', alpha: 0.55, d: [{ pattern: 'spots', spots: 6, spotCol: '#f4f0e6' }], a: [{ color: '#c8a070', tip: '#e86a28', pattern: 'spots', spots: 7, spotCol: '#f4f0e6' }], c: { pattern: 'spots', spots: 7, spotCol: '#f4f0e6' }, v: { color: '#e88a40' } },
  },
};
