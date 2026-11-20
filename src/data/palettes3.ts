import { seq, type Pal } from './palkit';

/** Natural colouration (p – z). Coordinates: s snout → caudal base, h 0 dorsal · 0.5 lateral midline · 1 ventral. */
export const PAL3: Record<string, Pal> = {
  'pelican-eel': {
    c: { top: '#070708', side: '#0c0c0e', belly: '#101012', rough: 0.25, sheen: 0.3, layers: [{ k: 'mottle', c: '#1a1a1e', sc: 0.05, th: 0.62, soft: 0.12, a: 0.3 }] },
    f: { color: '#141416' },
  },
  porcupinefish: {
    // pinkish-tan with even dark brown spots over back and flanks, pale belly
    c: { top: '#a5876a', side: '#d6c0a4', belly: '#f0ece0', cs: [0.3, 0.72], rough: 0.35, layers: [
      { k: 'grad', c: '#e0a8a0', s0: 0.1, s1: 0.8, h0: 0.35, h1: 0.7, soft: 0.08, a: 0.3 },
      { k: 'spots', n: 260, r: 0.0055, c: '#3a2a1a', h0: 0, h1: 0.72, irr: 0.4, even: 0.65 },
    ] },
    f: { color: '#d8c8a8', d: [{ pattern: 'spots', spots: 5, spotCol: '#3a2a1a' }], a: [{ pattern: 'spots', spots: 4, spotCol: '#3a2a1a' }], c: { pattern: 'spots', spots: 6, spotCol: '#3a2a1a' } },
  },
  'rainbow-trout': {
    // olive back peppered black, broad pink-red band, rosy gill cover, spotted dorsal and tail
    c: { top: '#536a69', side: '#afb9b8', belly: '#e9e9e2', cs: [0.28, 0.68], metal: 0.26, iri: 0.36, rough: 0.31, layers: [
      { k: 'mottle', c: '#62775e', sc: 0.05, th: 0.62, soft: 0.15, a: 0.25, h0: 0, h1: 0.35 },
      { k: 'stripe', h: 0.44, w: 0.039, c: '#c96786', s0: 0.07, s1: 0.98, rough: 0.003, soft: 0.008, a: 0.64 },
      { k: 'grad', c: '#c67a84', s0: 0.08, s1: 0.25, h0: 0.36, h1: 0.63, soft: 0.045, a: 0.42 },
      { k: 'spots', n: 460, r: 0.0029, c: '#212326', h0: 0.02, h1: 0.64, irr: 0.58, bias: 1.28 },
    ] },
    f: { color: '#828f8a', d: [{ color: '#87958e', pattern: 'spots', spots: 7, spotCol: '#232627' }, { pattern: 'spots', spots: 3, spotCol: '#262926' }], a: [{ color: '#b9bdb0', tip: '#e9e8da' }], c: { color: '#818c87', pattern: 'spots', spots: 9, spotCol: '#222628' }, p: { color: '#b2b4a9' }, v: { color: '#b5b7aa', tip: '#e0ded2' } },
  },
  'red-lionfish': {
    // Dense wine-red head bars continue onto translucent pectorals, anal and fan tail as fine dotted rays.
    set: { top: '#7a2a1a', side: '#f2e4d6', belly: '#f6eee6' },
    add: [
      { k: 'eyeband', ds: -0.009, w: 0.016, c: '#732a1e', h0: 0.06, h1: 0.86, a: 0.87 },
      { k: 'line', p: [0.015, 0.54, 0.07, 0.51, 0.12, 0.59, 0.19, 0.65], w: 0.004, c: '#782c21', a: 0.65 },
      { k: 'line', p: [0.04, 0.3, 0.09, 0.36, 0.16, 0.39, 0.22, 0.48], w: 0.004, c: '#9b4731', a: 0.54 },
      { k: 'spots', n: 38, r: 0.002, c: '#f8f1df', s0: 0.03, s1: 0.32, h0: 0.05, h1: 0.72, a: 0.63 },
    ],
    f: { color: '#e9dfd0', alpha: 0.62,
      d: [{ color: '#c38a78', mid: '#e9d8c9', tip: '#a14532', pattern: 'rayspots', spots: 8, spotCol: '#7a3023' }, { color: '#ddc8b5', tip: '#efe5d6', pattern: 'rayspots', spots: 8, spotCol: '#74281f' }],
      a: [{ color: '#e4d3bf', tip: '#f0e7d8', pattern: 'rayspots', spots: 9, spotCol: '#713023' }],
      c: { color: '#ead9c8', tip: '#efe5d8', pattern: 'rayspots', spots: 10, spotCol: '#762b21', alpha: 0.6 },
      p: { color: '#eee1d2', mid: '#ead3c1', tip: '#eee2d2', pattern: 'rayspots', spots: 11, spotCol: '#873426', alpha: 0.5 },
      v: { color: '#e5cfbc', tip: '#7c2e21', pattern: 'bands', spots: 6, spotCol: '#7a2d20' },
    },
    e: { iris: '#a03020' },
  },
  'red-bellied-piranha': {
    // steel-grey glittering with silver flecks, blood-red throat and belly, red anal fin, black-edged tail
    c: { top: '#55574a', side: '#a6a088', belly: '#d6381c', cs: [0.3, 0.66], iri: 0.35, metal: 0.25, rough: 0.3, layers: [
      { k: 'grad', c: '#8a8a7a', s0: 0.05, s1: 0.25, h0: 0.3, h1: 0.6, soft: 0.05, a: 0.3 },
      { k: 'grad', c: '#c84a28', s0: 0.05, s1: 0.6, h0: 0.62, h1: 1, soft: 0.08, a: 0.6 },
      { k: 'spots', n: 240, r: 0.0035, c: '#ece8d6', h0: 0.08, h1: 0.55, a: 0.75 },
    ] },
    f: { color: '#5a5a48', a: [{ color: '#c83a1c' }], c: { color: '#3a3a30', tip: '#1a1a1a' }, v: { color: '#c83a1c' } },
  },
  'reef-manta-ray': {
    // Mobula alfredi: black back with diffuse pale shoulder patches; white belly, grey trailing wing margins,
    // a few dark spots between the gill slits (unique to each individual)
    c: { top: '#121416', side: '#24272b', belly: '#f1f1ee', cs: [0.47, 0.52], rough: 0.5, layers: [
      { k: 'patch', p: [0.1, 0.05, 0.16, 0.035, 0.26, 0.07, 0.36, 0.16, 0.4, 0.26, 0.33, 0.27, 0.22, 0.19, 0.13, 0.13], c: '#c8cccd', soft: 0.025, a: 0.55 },
      { k: 'grad', c: '#5a5e62', s0: 0.38, s1: 0.66, h0: 0.52, h1: 0.64, soft: 0.06, a: 0.65 },
      { k: 'spots', n: 14, r: 0.012, c: '#2a2c2e', s0: 0.2, s1: 0.4, h0: 0.9, h1: 0.99, irr: 0.6 },
    ] },
    f: { color: '#131517', d: [{ color: '#131517' }] },
  },
  'reef-stonefish': {
    // rust and brick-red warty crust, dark pits, paler encrustation
    c: { top: '#6e3418', side: '#8c4420', belly: '#ae6438', rough: 0.85, layers: [
      { k: 'mottle', c: '#3e1c0c', sc: 0.03, th: 0.55, soft: 0.1, a: 0.6 },
      { k: 'mottle', c: '#c87a44', sc: 0.02, th: 0.62, soft: 0.08, a: 0.5, seed: 4 },
      { k: 'spots', n: 60, r: 0.004, c: '#2a1408', irr: 0.6 },
    ] },
    f: { color: '#6e3418', tip: '#8c4a26' },
  },
  'round-goby': {
    // olive-brown, blotched and freckled; black spot at the rear of the first dorsal fin
    c: { top: '#5f5838', side: '#958758', belly: '#ddd5b6', cs: [0.32, 0.7], rough: 0.36, layers: [
      { k: 'mottle', c: '#3e3820', sc: 0.025, th: 0.58, soft: 0.1, a: 0.45, h1: 0.7 },
      { k: 'blotch', n: 22, r: 0.012, c: '#383018', h0: 0.05, h1: 0.62, a: 0.65 },
      { k: 'spots', n: 120, r: 0.0025, c: '#2e2a18', h0: 0.05, h1: 0.7, a: 0.7 },
    ] },
    f: { d: [{ color: '#a09060', ocellus: { u: 0.82, v: 0.35, r: 0.22, col: '#0e0e0c', ring: '#d8d0a0' } }, { color: '#a89868', pattern: 'spots', spots: 5, spotCol: '#5a4a2a' }], c: { color: '#b8a46a', pattern: 'spots', spots: 6, spotCol: '#5a4a2a' } },
  },
  'roundnose-grenadier': {
    c: { top: '#5e5e64', side: '#85858c', belly: '#56566a', iri: 0.3, rough: 0.4, layers: [{ k: 'mottle', c: '#48484e', sc: 0.05, th: 0.6, soft: 0.12, a: 0.3 }] },
  },
  'scalloped-hammerhead': {
    // bronze-tinged grey-brown above, white below; dusky pectoral tips
    c: { top: '#5d6468', side: '#7c868a', belly: '#f0f2f0', cs: [0.45, 0.55], rough: 0.52, layers: [
      { k: 'grad', c: '#7a705a', s0: 0, s1: 0.98, h0: 0, h1: 0.4, soft: 0.08, a: 0.25 },
    ] },
    f: { color: '#5a6670', p: { color: '#5a6670', tip: '#2a3036' } },
  },
  'sea-lamprey': {
    // olive-grey heavily marbled with dark brown, pale belly; seven gill pores
    c: { top: '#5a5848', side: '#8a8876', belly: '#d6d2c2', cs: [0.32, 0.72], rough: 0.3, sheen: 0.35, layers: [
      { k: 'mottle', c: '#33322a', sc: 0.035, th: 0.52, soft: 0.08, a: 0.72, h0: 0, h1: 0.75 },
      { k: 'row', h: 0.5, n: 7, r: 0.0035, c: '#2a2a22', s0: 0.08, s1: 0.13 },
    ] },
    f: { color: '#7a7a68' },
  },
  'sergeant-major': {
    // yellow back, silvery-white sides, five sharp black bars
    c: { top: '#ddc92c', side: '#e6eada', belly: '#f4f6f2', cs: [0.26, 0.5], iri: 0.3, rough: 0.3, layers: [
      { k: 'grad', c: '#e8d43a', s0: 0.05, s1: 0.95, h0: 0, h1: 0.3, soft: 0.06, a: 0.5 },
      { k: 'grad', c: '#c8d0d8', s0: 0.05, s1: 0.3, h0: 0.4, h1: 0.9, soft: 0.05, a: 0.2 },
      { k: 'bars', at: [0.24, 0.38, 0.52, 0.66, 0.8], w: 0.046, c: '#141414', h0: 0, h1: 0.88, rough: 0.003, taper: 0.4 },
    ] },
    f: { color: '#d8dcc8', d: [{ color: '#c8c8a8' }], a: [{ color: '#c8ccc0' }], c: { color: '#d0d4c4', tip: '#a0a49a' }, p: { color: '#e8ece4', alpha: 0.5 }, v: { color: '#d8dcd0' } },
  },
  'shortfin-mako': {
    // metallic indigo back, sharply white belly
    c: { top: '#2b3c86', side: '#4a5caa', belly: '#f4f4f6', cs: [0.45, 0.55], rough: 0.45, iri: 0.3, metal: 0.25, layers: [
      { k: 'grad', c: '#3a4ea0', s0: 0, s1: 0.98, h0: 0.44, h1: 0.54, soft: 0.02, a: 0.5 },
    ] },
    f: { color: '#2a3a8a', p: { color: '#2a3a8a', tip: '#1a2460' } },
  },
  'siamese-fighting-fish': {
    // deep red body with iridescent scales, flame-red veil fins
    c: { top: '#9e1810', side: '#d02a18', belly: '#e0441f', cs: [0.3, 0.72], iri: 0.55, rough: 0.28, layers: [
      { k: 'grad', c: '#7a1008', s0: 0, s1: 0.2, h0: 0, h1: 0.6, soft: 0.05, a: 0.35 },
      { k: 'scaleFill', c: '#e85a3a', a: 0.3, r: 0.32 },
    ] },
    f: { color: '#d02a18', tip: '#f04a2a', alpha: 0.85, d: [{ color: '#c02418', tip: '#ff5a3a' }], a: [{ color: '#c82418', tip: '#ff5a3a' }], c: { color: '#d02a18', mid: '#e83a20', tip: '#ff6a3a' } },
  },
  'silver-arowana': {
    // golden-silver mosaic of huge scales on an olive back
    c: { top: '#73805e', side: '#d4cfae', belly: '#ece6d4', cs: [0.3, 0.7], iri: 0.55, metal: 0.42, rough: 0.24, layers: [
      { k: 'grad', c: '#c8b878', s0: 0, s1: 0.25, h0: 0.3, h1: 0.85, soft: 0.05, a: 0.3 },
      { k: 'scaleFill', c: '#e8ddb0', a: 0.25, r: 0.32 },
      { k: 'scaleEdge', c: '#9a8c5c', a: 0.5 },
    ] },
    f: { color: '#c8c098', d: [{ color: '#8a8a6a' }], a: [{ color: '#a8a07a' }], c: { color: '#a8a07a' } },
  },
  'skipjack-tuna': {
    // violet-blue back, silver belly with four to six dark longitudinal stripes
    c: { top: '#13224c', side: '#a7b3c4', belly: '#eceff2', cs: [0.36, 0.55], iri: 0.5, metal: 0.55, rough: 0.22, layers: [
      { k: 'grad', c: '#4a4a8a', s0: 0.1, s1: 0.95, h0: 0.3, h1: 0.4, soft: 0.04, a: 0.35 },
      { k: 'stripe', h: 0.6, w: 0.01, c: '#2a3448', s0: 0.3, s1: 0.95, rough: 0.002 },
      { k: 'stripe', h: 0.68, w: 0.01, c: '#2a3448', s0: 0.3, s1: 0.92, rough: 0.002 },
      { k: 'stripe', h: 0.76, w: 0.01, c: '#2a3448', s0: 0.32, s1: 0.85, rough: 0.002 },
      { k: 'stripe', h: 0.84, w: 0.01, c: '#2a3448', s0: 0.35, s1: 0.8, rough: 0.002 },
    ] },
    f: { color: '#2a3550' },
  },
  'sloane-s-viperfish': {
    // dark silvery green-blue, black back, photophore rows
    c: { top: '#16262c', side: '#36505a', belly: '#28383e', iri: 0.6, metal: 0.4, layers: [
      { k: 'photo', h: 0.85, n: 30, c: '#80d8ff', s0: 0.1, s1: 0.9, r: 0.003 },
      { k: 'photo', h: 0.7, n: 26, c: '#80d8ff', s0: 0.12, s1: 0.85, r: 0.0025 },
    ] },
  },
  'smalltooth-sawfish': {
    // olive-grey to brownish above (saw the same), white below
    c: { top: '#5a5848', side: '#6c6a58', belly: '#ecece6', cs: [0.47, 0.53], rough: 0.55, layers: [
      { k: 'mottle', c: '#4a4838', sc: 0.05, th: 0.6, soft: 0.12, a: 0.3, h0: 0, h1: 0.5 },
    ] },
    f: { color: '#5a5848' },
    r: '#5a5848',
  },
  'sockeye-salmon': {
    // spawning male: crimson body, olive-green head, white jaws
    c: { top: '#a8121e', side: '#d42634', belly: '#de4244', cs: [0.3, 0.72], rough: 0.3, layers: [
      { k: 'grad', c: '#8a0e1a', s0: 0.22, s1: 0.98, h0: 0, h1: 0.25, soft: 0.06, a: 0.4 },
      { k: 'grad', c: '#4e6a38', s0: 0, s1: 0.22, h0: 0, h1: 1, soft: 0.03 },
      { k: 'grad', c: '#eeeee4', s0: 0.02, s1: 0.18, h0: 0.72, h1: 1, soft: 0.04 },
    ] },
    f: { color: '#4a6a3a', alpha: 0.95, d: [{ color: '#a01a20' }, { color: '#a01a20' }], a: [{ color: '#8a1a20' }], c: { color: '#4a5a3a' } },
  },
  'southern-stingray': {
    // olive-brown to grey-brown disc above, paler snout; white below with a grey disc margin
    c: { top: '#6e6250', side: '#7c705c', belly: '#ecebe6', cs: [0.47, 0.53], rough: 0.5, layers: [
      { k: 'mottle', c: '#5a4f3e', sc: 0.05, th: 0.58, soft: 0.12, a: 0.35, h0: 0, h1: 0.5 },
      { k: 'grad', c: '#8a8070', s0: 0.02, s1: 0.12, h0: 0, h1: 0.2, soft: 0.04, a: 0.3 },
      { k: 'grad', c: '#7a7064', s0: 0.05, s1: 0.5, h0: 0.5, h1: 0.6, soft: 0.04, a: 0.5 },
    ] },
  },
  'spotted-ratfish': {
    // iridescent bronze with white spots
    c: { top: '#7e5f42', side: '#a5845e', belly: '#d8d0c0', iri: 0.55, metal: 0.32, rough: 0.3, layers: [
      { k: 'grad', c: '#c0a07a', s0: 0.05, s1: 0.3, h0: 0.3, h1: 0.8, soft: 0.06, a: 0.3 },
      { k: 'spots', n: 180, r: 0.0055, c: '#f4f0e8', h0: 0.02, h1: 0.62, irr: 0.3, even: 0.65 },
    ] },
  },
  swordfish: {
    // dark bronze-brown back fading to grey-silver sides and a pale belly
    c: { top: '#2b2522', side: '#6e6560', belly: '#e8e4e0', cs: [0.36, 0.6], iri: 0.35, metal: 0.35, rough: 0.3, layers: [
      { k: 'grad', c: '#4a3a34', s0: 0, s1: 0.98, h0: 0.3, h1: 0.45, soft: 0.06, a: 0.35 },
    ] },
    r: '#2c2422',
  },
  'thornback-skate': {
    // sandy marbled disc with pale and dark spots, a few ocellated blotches; white underside
    c: { top: '#9a8460', side: '#a68e6c', belly: '#f0ece4', cs: [0.47, 0.53], rough: 0.5, layers: [
      { k: 'mottle', c: '#7a6648', sc: 0.03, th: 0.56, soft: 0.1, a: 0.45, h0: 0, h1: 0.5 },
      { k: 'spots', n: 180, r: 0.0065, c: '#e2d6ba', h0: 0, h1: 0.46, irr: 0.35 },
      { k: 'spots', n: 110, r: 0.0045, c: '#4a3e2a', h0: 0, h1: 0.46, irr: 0.4 },
      { k: 'spots', n: 6, r: 0.01, c: '#3a3020', ring: '#e8dcc0', rw: 1.4, h0: 0.06, h1: 0.25, s0: 0.15, s1: 0.4 },
    ] },
  },
  'tiger-shark': {
    // grey with fading dark vertical bars and blotches on the back and upper flank
    c: { top: '#5a6068', side: '#788088', belly: '#ecece8', cs: [0.45, 0.56], rough: 0.52, layers: [
      { k: 'bars', at: seq(0.3, 0.975, 16), w: 0.011, c: '#282c32', h0: 0, h1: 0.46, wob: 0.01, rough: 0.004, brk: 0.3, a: 0.55 },
      { k: 'spots', n: 60, r: 0.005, c: '#282c32', h0: 0.05, h1: 0.45, s0: 0.15, s1: 0.4, irr: 0.5, a: 0.45 },
    ] },
  },
  'tompot-blenny': {
    // brown-orange with five dark bars, rusty head freckled pale
    c: { top: '#6a5236', side: '#8f7652', belly: '#c9b48a', rough: 0.35, layers: [
      { k: 'mottle', c: '#a8683a', sc: 0.025, th: 0.6, soft: 0.1, a: 0.4 },
      { k: 'grad', c: '#9a4a2a', s0: 0, s1: 0.2, h0: 0, h1: 0.8, soft: 0.04, a: 0.45 },
      { k: 'bars', at: [0.3, 0.43, 0.56, 0.69, 0.82], w: 0.06, c: '#3a2818', h0: 0, h1: 0.72, rough: 0.006, a: 0.75 },
      { k: 'spots', n: 40, r: 0.0035, c: '#e8d0a0', h0: 0.3, h1: 0.8, s0: 0, s1: 0.25, a: 0.6 },
    ] },
    f: { color: '#7a6a50', d: [{ color: '#8a6a48', pattern: 'spots', spots: 5, spotCol: '#4a3420' }] },
  },
  'tropical-two-wing-flyingfish': {
    // dark blue back, silver below; large grey glassy pectoral wings
    c: { top: '#18375f', side: '#98aec4', belly: '#eef2f4', cs: [0.32, 0.55], iri: 0.8, metal: 0.58, rough: 0.22, layers: [
      { k: 'grad', c: '#3a6a9a', s0: 0.1, s1: 0.98, h0: 0.28, h1: 0.38, soft: 0.03, a: 0.35 },
    ] },
    f: { color: '#4a5a7a', p: { color: '#5a6a84', alpha: 0.6 } },
  },
  walleye: {
    // olive-gold with dark saddles and fine mottling, brassy scales, white-tipped lower fins
    c: { top: '#555228', side: '#a6984c', belly: '#e8e4d0', cs: [0.3, 0.7], rough: 0.32, metal: 0.15, layers: [
      { k: 'mottle', c: '#3e3c1c', sc: 0.025, th: 0.58, soft: 0.1, a: 0.45, h0: 0, h1: 0.6 },
      { k: 'bars', at: [0.36, 0.48, 0.6, 0.72, 0.84], w: 0.05, c: '#302e14', h0: 0, h1: 0.42, rough: 0.006, taper: 0.6, a: 0.55 },
      { k: 'scaleFill', c: '#c8b860', a: 0.22, r: 0.3, h0: 0.3, h1: 0.7 },
    ] },
    f: { color: '#8a7a40', d: [{ color: '#7a6c3a', pattern: 'spots', spots: 5, spotCol: '#2e2a14' }, { color: '#8a7c44', pattern: 'spots', spots: 5, spotCol: '#3e3a1c' }], a: [{ color: '#a89a60', tip: '#ece8dc' }], c: { color: '#8a7c44', pattern: 'spots', spots: 5, spotCol: '#3e3a1c' }, v: { color: '#b0a068', tip: '#ece8dc' } },
    e: { iris: '#e8e8c0' },
  },
  'warty-frogfish': {
    // chalk-white skin with irregular blood-red patches and freckles
    c: { top: '#f0ece8', side: '#f4f0ec', belly: '#f8f4f0', rough: 0.8, layers: [
      { k: 'mottle', c: '#c0301c', sc: 0.05, th: 0.6, soft: 0.06, a: 0.9, h0: 0, h1: 0.6, seed: 2 },
      { k: 'spots', n: 60, r: 0.006, c: '#d04a2a', h0: 0, h1: 0.9, irr: 0.5 },
    ] },
  },
  'weedy-seadragon': {
    // red-orange body, yellow spots, violet-blue bars across the chest, ochre appendages
    c: { top: '#b8452a', side: '#d6702c', belly: '#ecc444', cs: [0.3, 0.75], rough: 0.4, layers: [
      { k: 'grad', c: '#e8b83a', s0: 0.5, s1: 1, h0: 0.4, h1: 1, soft: 0.1, a: 0.4 },
      { k: 'bars', at: [0.27, 0.31, 0.35, 0.39, 0.43, 0.47], w: 0.011, c: '#5a3aa0', h0: 0.12, h1: 0.78, rough: 0.002 },
      { k: 'spots', n: 120, r: 0.0042, c: '#f8ecb0', h0: 0.05, h1: 0.9, irr: 0.3 },
    ] },
    fr: '#e0a83a',
  },
  'wels-catfish': {
    // dark olive-brown marbled black, paler mottled flanks, cream belly
    c: { top: '#383d2e', side: '#676d56', belly: '#c9c8b2', cs: [0.32, 0.72], rough: 0.36, sheen: 0.3, layers: [
      { k: 'mottle', c: '#262a1e', sc: 0.035, th: 0.52, soft: 0.1, a: 0.62, h0: 0, h1: 0.8 },
      { k: 'mottle', c: '#8a8c70', sc: 0.025, th: 0.65, soft: 0.08, a: 0.3, seed: 9, h0: 0.4, h1: 0.9 },
    ] },
    f: { color: '#4a5040' },
  },
  'west-indian-ocean-coelacanth': {
    // deep steel-blue with irregular white blotches (unique to each fish)
    c: { top: '#283a4e', side: '#32455b', belly: '#3c4e64', rough: 0.4, layers: [
      { k: 'blotch', n: 42, r: 0.016, c: '#dfe4e8', seed: 5, a: 0.9 },
      { k: 'spots', n: 60, r: 0.005, c: '#c8d0d8', a: 0.7 },
    ] },
    f: { color: '#34465c', d: [{ color: '#34465c', pattern: 'spots', spots: 3, spotCol: '#c8d0d8' }] },
  },
  'whale-shark': {
    // blue-grey checkerboard: pale spots between pale vertical and horizontal lines; white belly
    c: { top: '#263a49', side: '#354d5c', belly: '#dbe3e4', cs: [0.44, 0.6], rough: 0.55, layers: [
      { k: 'mottle', c: '#1b3342', sc: 0.04, th: 0.61, soft: 0.12, a: 0.2, h0: 0, h1: 0.5 },
      { k: 'stripe', h: 0.11, w: 0.003, c: '#94a9b3', s0: 0.23, s1: 0.93, a: 0.46 },
      { k: 'stripe', h: 0.21, w: 0.003, c: '#94a9b3', s0: 0.23, s1: 0.93, a: 0.46 },
      { k: 'stripe', h: 0.31, w: 0.003, c: '#94a9b3', s0: 0.23, s1: 0.93, a: 0.44 },
      { k: 'stripe', h: 0.41, w: 0.003, c: '#94a9b3', s0: 0.24, s1: 0.93, a: 0.4 },
      { k: 'bars', at: seq(0.25, 0.92, 17), w: 0.003, c: '#9fb1b8', h0: 0, h1: 0.48, a: 0.42, rough: 0.0012 },
      { k: 'lattice', cols: 37, rows: 9, r: 0.004, c: '#d9e3e4', s0: 0.22, s1: 0.94, h0: 0.025, h1: 0.53, jitter: 0.25, skip: 0.09, a: 0.86 },
      { k: 'spots', n: 115, r: 0.0026, c: '#d4dedf', h0: 0, h1: 0.52, s0: 0.015, s1: 0.26, even: 0.55, a: 0.86 },
      { k: 'gills', at: [0.17, 0.185, 0.2, 0.215, 0.23], c: '#1a2530' },
    ] },
    f: { color: '#2c4352', d: [{ color: '#2c4352', pattern: 'spots', spots: 10, spotCol: '#a8b9c0' }], p: { color: '#2c4352', pattern: 'spots', spots: 9, spotCol: '#a8b9c0' }, c: { color: '#2c4352', pattern: 'spots', spots: 9, spotCol: '#a8b9c0' } },
  },
  'yellow-perch': {
    // golden yellow with six to eight dark saddle bars, olive back, orange lower fins
    c: { top: '#4a4f20', side: '#cdb43e', belly: '#f0e8c6', cs: [0.28, 0.7], rough: 0.32, layers: [
      { k: 'grad', c: '#e2c64a', s0: 0.05, s1: 0.95, h0: 0.4, h1: 0.75, soft: 0.08, a: 0.35 },
      { k: 'bars', at: [0.32, 0.41, 0.5, 0.59, 0.68, 0.77, 0.86], w: 0.036, c: '#2e2e12', h0: 0, h1: 0.66, rough: 0.005, taper: 0.5, brk: 0.08, a: 0.78 },
      { k: 'scaleEdge', c: '#6a5a20', a: 0.25 },
    ] },
    f: { color: '#a89a50', d: [{ color: '#6a6430' }, { color: '#a89a50' }], a: [{ color: '#e88a30' }], c: { color: '#a89a50' }, p: { color: '#d8b860', alpha: 0.55 }, v: { color: '#f08a2a' } },
  },
  'yellowfin-tuna': {
    // dark blue back, golden-yellow lateral band, yellow second dorsal, anal and finlets
    c: { top: '#0d2143', side: '#a0acbc', belly: '#f0f2f4', cs: [0.36, 0.55], iri: 0.5, metal: 0.55, rough: 0.22, layers: [
      { k: 'stripe', h: 0.38, w: 0.022, c: '#f4cc2c', s0: 0.08, s1: 0.92, rough: 0.003, soft: 0.004, a: 0.85 },
      { k: 'bars', at: seq(0.4, 0.9, 20), w: 0.004, c: '#e6edf3', h0: 0.55, h1: 0.85, a: 0.35, brk: 0.4 },
    ] },
    f: { color: '#2a3550', d: [{ color: '#2a3550', tip: '#c8a828' }, { color: '#f0c020', tip: '#f4cc30' }], a: [{ color: '#f0c020' }], c: { color: '#1c2840' }, p: { color: '#1a2438' }, fl: '#f2c81e' },
  },
  zebrafish: {
    // five blue-black stripes on a gold-silver ground, continued onto the anal fin
    c: { top: '#5e5e48', side: '#d8cfa8', belly: '#f0eee4', cs: [0.26, 0.72], iri: 0.55, rough: 0.28, layers: [
      { k: 'stripe', h: 0.3, w: 0.024, c: '#26458f', s0: 0.22, s1: 1, rough: 0.0015 },
      { k: 'stripe', h: 0.41, w: 0.024, c: '#26458f', s0: 0.2, s1: 1, rough: 0.0015 },
      { k: 'stripe', h: 0.52, w: 0.024, c: '#26458f', s0: 0.2, s1: 1, rough: 0.0015 },
      { k: 'stripe', h: 0.63, w: 0.024, c: '#26458f', s0: 0.22, s1: 1, rough: 0.0015 },
      { k: 'stripe', h: 0.74, w: 0.022, c: '#26458f', s0: 0.3, s1: 0.98, rough: 0.0015 },
    ] },
    f: { color: '#d8d0b0', a: [{ color: '#d8c890', pattern: 'bands', spots: 4, spotCol: '#2a4a90' }], c: { color: '#9aa6c0' } },
  },
};
