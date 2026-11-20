import { seq, type Pal } from './palkit';

/** Natural colouration (a – e). Coordinates: s snout → caudal base, h 0 dorsal · 0.5 lateral midline · 1 ventral. */
export const PAL1: Record<string, Pal> = {
  'alligator-gar': {
    // olive-bronze back, sandy flanks, dark round spots on the rear body and on every vertical fin
    c: { top: '#3c4029', side: '#6f6a45', belly: '#ddd5bb', cs: [0.3, 0.66], rough: 0.36, sheen: 0.2, layers: [
      { k: 'mottle', c: '#2a2c1b', sc: 0.035, th: 0.58, soft: 0.08, a: 0.5, h0: 0, h1: 0.55 },
      { k: 'spots', n: 95, r: 0.0065, c: '#1d1a10', h0: 0.08, h1: 0.78, s0: 0.48, s1: 0.99, irr: 0.5, rv: 0.5 },
      { k: 'spots', n: 50, r: 0.0038, c: '#2a2616', h0: 0.06, h1: 0.6, s0: 0.02, s1: 0.22, irr: 0.4, a: 0.8 },
      { k: 'grad', c: '#8a5a32', s0: 0.82, s1: 1, h0: 0.15, h1: 0.85, soft: 0.06, a: 0.32 },
      { k: 'scaleEdge', c: '#2a2a18', a: 0.32 },
    ] },
    f: { color: '#6e4a2c', tip: '#3a2616', d: [{ pattern: 'spots', spots: 5, spotCol: '#1c150c' }], a: [{ pattern: 'spots', spots: 5, spotCol: '#1c150c' }], c: { color: '#7a4a28', tip: '#3a2414', pattern: 'spots', spots: 6, spotCol: '#1c150c' }, p: { color: '#7a5a38' }, v: { color: '#7a5a38' } },
    e: { iris: '#b08a3a', iris2: '#e0c070' },
  },
  'american-paddlefish': {
    // smooth slate skin, darker cloudy back, paddle stippled with ampullary pores, pale belly
    c: { top: '#38434c', side: '#66737e', belly: '#e2e5e4', cs: [0.36, 0.6], rough: 0.5, sheen: 0.25, layers: [
      { k: 'mottle', c: '#262e35', sc: 0.03, th: 0.55, soft: 0.1, a: 0.45, h0: 0, h1: 0.5 },
      { k: 'spots', n: 320, r: 0.0016, c: '#1e252b', h0: 0, h1: 0.62, s0: -0.6, s1: 0.22, irr: 0.3, a: 0.55 },
      { k: 'grad', c: '#9aa6ae', s0: 0.1, s1: 0.28, h0: 0.35, h1: 0.8, soft: 0.05, a: 0.28 },
    ] },
    f: { color: '#4b5660', tip: '#38424a' },
    r: '#3e4952',
  },
  arapaima: {
    // olive-grey front, every rear scale rimmed in blood red ("pirarucu"), red tail base; mottled bony head
    c: { top: '#33402f', side: '#6c7a62', belly: '#cfc8ad', cs: [0.32, 0.7], rough: 0.38, layers: [
      { k: 'grad', c: '#2b3628', s0: 0, s1: 0.22, h0: 0, h1: 0.62, soft: 0.05, a: 0.55 },
      { k: 'mottle', c: '#222a1f', sc: 0.02, th: 0.6, soft: 0.08, a: 0.45, s0: 0, s1: 0.22, h0: 0, h1: 0.85 },
      { k: 'scaleFill', c: '#8a977c', a: 0.32, r: 0.32, h0: 0.06, h1: 0.92 },
      { k: 'grad', c: '#b5331f', s0: 0.5, s1: 1, h0: 0.18, h1: 0.98, soft: 0.14, a: 0.55 },
      { k: 'scaleEdge', c: '#8a2414', a: 0.6 },
    ] },
    f: { color: '#3e3a2c', tip: '#8e2a1a', d: [{ color: '#3e3a2c', tip: '#9a2a18' }], a: [{ color: '#3e3a2c', tip: '#9a2a18' }], c: { color: '#4a3a2a', tip: '#a02a18' }, p: { color: '#5a5a48' }, v: { color: '#5a5a48' } },
    e: { iris: '#c9a43e' },
  },
  'atlantic-bluefin-tuna': {
    // metallic blue-black back cut sharply from silver; colourless transverse lines and dot rows on the lower flank
    c: { top: '#0a1934', side: '#8796a8', belly: '#eef1f4', cs: [0.36, 0.53], iri: 0.55, metal: 0.6, rough: 0.2, layers: [
      { k: 'grad', c: '#2f4f7a', s0: 0.12, s1: 0.95, h0: 0.3, h1: 0.4, soft: 0.03, a: 0.45 },
      { k: 'bars', at: seq(0.38, 0.9, 22), w: 0.0045, c: '#e6edf3', h0: 0.52, h1: 0.86, a: 0.38, brk: 0.35, rough: 0.0015 },
      { k: 'grad', c: '#9aa8b6', s0: 0, s1: 0.2, h0: 0.35, h1: 0.85, soft: 0.04, a: 0.32 },
    ] },
    f: { color: '#22304a', d: [{ color: '#3a4560', tip: '#c8b060' }, { color: '#6a5236', tip: '#4a3a26' }], a: [{ color: '#a8925a' }], c: { color: '#1c2840' }, p: { color: '#1a2438' }, v: { color: '#3a4558' }, fl: '#d6b42c' },
    e: { iris: '#3a3a2c', iris2: '#a8a070' },
  },
  'atlantic-cod': {
    // sandy to reddish-brown, peppered with small brown spots; bold cream lateral line; pale throat and belly
    c: { top: '#6e5a3c', side: '#b39a72', belly: '#efe9dc', cs: [0.3, 0.7], rough: 0.42, layers: [
      { k: 'mottle', c: '#5a4528', sc: 0.04, th: 0.55, soft: 0.12, a: 0.32, h0: 0, h1: 0.6 },
      { k: 'spots', n: 620, r: 0.0048, c: '#5b4326', h0: 0.02, h1: 0.68, s0: 0.02, s1: 0.99, irr: 0.55, rv: 0.6, bias: 1.3 },
      { k: 'spots', n: 200, r: 0.0028, c: '#7a5e3a', h0: 0.05, h1: 0.6, s0: 0.02, s1: 0.3, irr: 0.4 },
      { k: 'lateral', c: '#f3eddc', h: 0.3, w: 0.007 },
      { k: 'grad', c: '#f4efe4', s0: 0.05, s1: 0.3, h0: 0.72, h1: 1, soft: 0.05, a: 0.5 },
    ] },
    f: { color: '#9a8262', tip: '#7a6448', d: [{ pattern: 'spots', spots: 5, spotCol: '#5b4326' }, { pattern: 'spots', spots: 5, spotCol: '#5b4326' }, { pattern: 'spots', spots: 5, spotCol: '#5b4326' }], a: [{ color: '#c8b8a0' }, { color: '#c8b8a0' }], c: { pattern: 'spots', spots: 6, spotCol: '#5b4326' }, p: { color: '#a89070' }, v: { color: '#d8ccb4' } },
    e: { iris: '#b8a874' },
  },
  'atlantic-halibut': {
    // eyed side uniform dark slate-olive with faint paler clouding; blind side white
    c: { top: '#2e3230', side: '#3b3f3a', belly: '#2e3230', rough: 0.45, blind: '#f1efe8', layers: [
      { k: 'mottle', c: '#545a52', sc: 0.05, th: 0.6, soft: 0.12, a: 0.32 },
      { k: 'mottle', c: '#1d201e', sc: 0.03, th: 0.6, soft: 0.1, a: 0.42, seed: 7 },
    ] },
    f: { color: '#30332f', tip: '#262826' },
    e: { iris: '#7a7a5a' },
  },
  'atlantic-herring': {
    // steel-blue back with a green-blue iridescent seam, mirror-silver flanks, brassy gill cover
    c: { top: '#1f4258', side: '#c2ced5', belly: '#f3f6f8', cs: [0.32, 0.5], iri: 0.85, metal: 0.6, rough: 0.22, layers: [
      { k: 'grad', c: '#3e7a8e', s0: 0.15, s1: 0.98, h0: 0.24, h1: 0.34, soft: 0.03, a: 0.4 },
      { k: 'grad', c: '#d4c48a', s0: 0.07, s1: 0.21, h0: 0.32, h1: 0.75, soft: 0.04, a: 0.22 },
    ] },
    f: { color: '#9aa8ae', tip: '#6a7a82', d: [{ color: '#5a6a72', tip: '#3a4a52' }], c: { color: '#5a6a74', tip: '#2a3a44' }, p: { color: '#d0d8dc' }, v: { color: '#e0e4e6' } },
    e: { iris: '#e8e4d0' },
  },
  'atlantic-mackerel': {
    // iridescent green-blue back with ~28 black zig-zag bands, silver-white below, pink-gold sheen on the cheek
    c: { top: '#1a6470', side: '#c4d6d4', belly: '#f5f7f6', cs: [0.34, 0.5], iri: 0.6, metal: 0.55, rough: 0.2, layers: [
      { k: 'grad', c: '#2a7f7a', s0: 0.05, s1: 0.3, h0: 0, h1: 0.35, soft: 0.05, a: 0.4 },
      { k: 'bars', at: seq(0.26, 0.95, 27), w: 0.0095, c: '#08161c', h0: 0, h1: 0.41, wob: 0.0045, wf: 15, rough: 0.0058, slant: -0.05, taper: 0.55, brk: 0.08 },
      { k: 'grad', c: '#8fb4c8', s0: 0.2, s1: 0.95, h0: 0.38, h1: 0.48, soft: 0.03, a: 0.35 },
      { k: 'grad', c: '#d8c6a0', s0: 0.06, s1: 0.22, h0: 0.35, h1: 0.8, soft: 0.05, a: 0.25 },
    ] },
    f: { color: '#3f5f62', tip: '#2a4246', a: [{ color: '#cfd8d8' }], c: { color: '#2c4448' }, p: { color: '#2c3e44' }, v: { color: '#dfe6e6' }, fl: '#5a7c7a' },
    e: { iris: '#2a2e2c', iris2: '#b8c0b8' },
  },
  'atlantic-mudskipper': {
    // mud-brown with dark saddles and blotches, sprinkled with electric-blue iridophore dots
    c: { top: '#6a5f45', side: '#958869', belly: '#ddd5c2', cs: [0.32, 0.7], rough: 0.4, layers: [
      { k: 'mottle', c: '#3e3524', sc: 0.035, th: 0.56, soft: 0.08, a: 0.58, h0: 0, h1: 0.7 },
      { k: 'spots', n: 180, r: 0.0035, c: '#2e2618', h0: 0.04, h1: 0.7, irr: 0.5 },
      { k: 'spots', n: 160, r: 0.0026, c: '#46b2e6', h0: 0.06, h1: 0.75, s0: 0.02, s1: 0.9, irr: 0.2, a: 0.9 },
      { k: 'grad', c: '#efe8d8', s0: 0.05, s1: 0.4, h0: 0.8, h1: 1, soft: 0.05, a: 0.4 },
    ] },
    f: { color: '#8a7a58', d: [{ color: '#6a5a40', tip: '#e9e0c8', pattern: 'spots', spots: 4, spotCol: '#3aa0d8' }, { color: '#7a6a50', tip: '#d8cfb8', pattern: 'spots', spots: 5, spotCol: '#3aa0d8' }], c: { color: '#7a6a4e', pattern: 'spots', spots: 5, spotCol: '#3e3424' }, p: { color: '#8a7c5c' } },
    e: { iris: '#b89a50' },
  },
  'atlantic-salmon': {
    // blue-grey back, bright silver flanks; small black X-shaped spots above the lateral line and on the gill cover
    c: { top: '#3c5064', side: '#c8cfd5', belly: '#f4f4f2', cs: [0.33, 0.56], iri: 0.45, metal: 0.45, rough: 0.28, layers: [
      { k: 'grad', c: '#55707a', s0: 0.1, s1: 0.98, h0: 0.22, h1: 0.34, soft: 0.04, a: 0.35 },
      { k: 'spots', n: 85, r: 0.0042, c: '#15171c', h0: 0.04, h1: 0.46, s0: 0.06, s1: 0.88, irr: 0.75, bias: 1.4 },
      { k: 'spots', n: 4, r: 0.0045, c: '#15171c', h0: 0.3, h1: 0.45, s0: 0.12, s1: 0.19, irr: 0.6, seed: 3 },
    ] },
    f: { color: '#78828a', d: [{ color: '#6a747c', pattern: 'spots', spots: 3, spotCol: '#1a1c20' }, { color: '#4a5058' }], a: [{ color: '#d0d4d6' }], c: { color: '#4e5a66', tip: '#3a444e' }, p: { color: '#8a949c' }, v: { color: '#d8dcde' } },
    e: { iris: '#c8c0a0' },
  },
  'atlantic-tarpon': {
    // dark blue-green back, armour of huge mirror scales each outlined in grey, brassy head
    c: { top: '#38525c', side: '#ced6da', belly: '#f4f6f6', cs: [0.3, 0.55], iri: 0.8, metal: 0.6, rough: 0.22, layers: [
      { k: 'scaleEdge', c: '#4e5c64', a: 0.4 },
      { k: 'grad', c: '#d8c787', s0: 0.04, s1: 0.22, h0: 0.3, h1: 0.8, soft: 0.05, a: 0.28 },
    ] },
    f: { color: '#8a9298', tip: '#2e383e', d: [{ color: '#7a868e', tip: '#2a343a' }], a: [{ color: '#a8b0b4', tip: '#3a444a' }], c: { color: '#76828a', tip: '#283036' }, p: { color: '#c9c49e' }, v: { color: '#c9c49e' } },
    e: { iris: '#e0cc78' },
  },
  'atlantic-wolffish': {
    // slate blue-grey with 9–12 dark, ragged transverse bands running up into the dorsal fin; spotted head
    c: { top: '#4a5866', side: '#6b7886', belly: '#b9bfc4', cs: [0.3, 0.7], rough: 0.45, layers: [
      { k: 'mottle', c: '#38434e', sc: 0.03, th: 0.6, soft: 0.1, a: 0.3 },
      { k: 'bars', at: seq(0.2, 0.92, 10), w: 0.03, c: '#262f3a', h0: 0, h1: 0.64, rough: 0.005, wob: 0.008, a: 0.82, brk: 0.15 },
      { k: 'spots', n: 60, r: 0.004, c: '#2a323c', h0: 0.05, h1: 0.7, s0: 0.02, s1: 0.2, irr: 0.5 },
    ] },
    f: { color: '#56636f', tip: '#3e4a56', p: { color: '#5e6a76' } },
    e: { iris: '#8a8a72' },
  },
  'australian-lungfish': {
    // dark olive-brown above with sparse blotches, salmon-orange underside
    c: { top: '#3f4130', side: '#56583f', belly: '#c9a072', cs: [0.32, 0.72], rough: 0.45, layers: [
      { k: 'mottle', c: '#2a2c1f', sc: 0.04, th: 0.6, soft: 0.12, a: 0.42, h1: 0.7 },
      { k: 'spots', n: 30, r: 0.008, c: '#24261a', h0: 0.1, h1: 0.7, s0: 0.25, s1: 0.95, irr: 0.6, a: 0.6 },
      { k: 'scaleEdge', c: '#2a2c20', a: 0.35 },
    ] },
    f: { color: '#4a4a36', tip: '#5a5a44' },
    e: { iris: '#8a7a50' },
  },
  'bay-pipefish': {
    // eelgrass olive to straw, pale ring at every bony segment, fine cream flecks
    c: { top: '#6a6230', side: '#9b9048', belly: '#d6c98a', cs: [0.3, 0.72], rough: 0.35, layers: [
      { k: 'mottle', c: '#4e4720', sc: 0.02, th: 0.58, soft: 0.1, a: 0.38 },
      { k: 'bars', at: seq(0.1, 0.98, 50), w: 0.0024, c: '#d9cf8c', h0: 0.05, h1: 0.95, a: 0.32, rough: 0.0004 },
      { k: 'spots', n: 120, r: 0.0016, c: '#f2ead0', h0: 0.1, h1: 0.9, a: 0.7 },
    ] },
    f: { color: '#b8ac64' },
    e: { iris: '#c0a040' },
  },
  'beluga-sturgeon': {
    // ash-grey back, pale bony scutes in five rows, white belly
    c: { top: '#3a454d', side: '#6a7680', belly: '#e4e6e6', cs: [0.38, 0.6], rough: 0.5, layers: [
      { k: 'mottle', c: '#2a333a', sc: 0.03, th: 0.6, soft: 0.1, a: 0.32, h0: 0, h1: 0.55 },
      { k: 'row', h: 0.015, n: 13, r: 0.0055, c: '#c9cdcc', s0: 0.22, s1: 0.62 },
      { k: 'row', h: 0.42, n: 40, r: 0.0038, c: '#c3c8c8', s0: 0.2, s1: 0.95 },
      { k: 'row', h: 0.78, n: 11, r: 0.004, c: '#d6d9d8', s0: 0.25, s1: 0.6 },
    ] },
    f: { color: '#3c4650', tip: '#2e363e' },
  },
  'black-dragonfish': {
    // velvet black, rows of blue-white ventral photophores
    c: { top: '#0a0808', side: '#120e0e', belly: '#161212', rough: 0.3, sheen: 0.3, layers: [
      { k: 'row', h: 0.86, n: 46, r: 0.0022, c: '#5ab4ff', s0: 0.08, s1: 0.95, glow: true },
      { k: 'row', h: 0.72, n: 40, r: 0.0018, c: '#5ab4ff', s0: 0.1, s1: 0.92, glow: true },
    ] },
    f: { color: '#141010' },
  },
  'blue-lanternfish': {
    // blue-black, green-blue sheen, two rows of glowing photophores
    c: { top: '#0c1424', side: '#2c3a52', belly: '#454f60', cs: [0.32, 0.7], iri: 0.7, metal: 0.45, rough: 0.25, layers: [
      { k: 'grad', c: '#3e6f8a', s0: 0.05, s1: 0.98, h0: 0.25, h1: 0.45, soft: 0.05, a: 0.35 },
      { k: 'photo', h: 0.82, n: 14, c: '#9fe4ff', s0: 0.2, s1: 0.85, r: 0.006 },
      { k: 'photo', h: 0.68, n: 10, c: '#9fe4ff', s0: 0.3, s1: 0.85, r: 0.005 },
    ] },
    f: { color: '#2e3440' },
  },
  'blue-marlin': {
    // cobalt-black back, ~15 pale cobalt stripes of dots and dashes, silver-white below
    c: { top: '#0a1d42', side: '#6b85a4', belly: '#eef1f5', cs: [0.4, 0.58], iri: 0.55, metal: 0.52, rough: 0.22, layers: [
      { k: 'grad', c: '#1a3866', s0: 0, s1: 0.98, h0: 0.32, h1: 0.42, soft: 0.04, a: 0.4 },
      { k: 'bars', at: seq(0.26, 0.82, 15), w: 0.0072, c: '#8fc6f4', h0: 0.2, h1: 0.64, a: 0.8, brk: 0.35, rough: 0.0014 },
    ] },
    f: { color: '#10244a', d: [{ color: '#0e2250', tip: '#0a1a3c' }], a: [{ color: '#bcc6d2', tip: '#1a2a44' }], c: { color: '#14243e' }, p: { color: '#1a2638' } },
    e: { iris: '#1e2c3e' },
    r: '#14203a',
  },
  'blue-shark': {
    // brilliant indigo back, vivid blue flanks, snow-white belly
    c: { top: '#1f4597', side: '#3c72c6', belly: '#f4f6f8', cs: [0.42, 0.57], rough: 0.5, layers: [
      { k: 'grad', c: '#2f5fb5', s0: 0, s1: 0.98, h0: 0.42, h1: 0.56, soft: 0.03, a: 0.6 },
    ] },
    f: { color: '#2c55a8', tip: '#1d3c80', p: { color: '#2a52a2', tip: '#1a3570' } },
  },
  'blue-tang': {
    // royal blue; black "palette" from the eye along the back enclosing a blue oval; yellow tail and peduncle wedge
    c: { top: '#1d47cc', side: '#2452da', belly: '#3d78e8', cs: [0.3, 0.75], rough: 0.32, layers: [
      { k: 'patch', p: [0.1, 0.3, 0.2, 0.2, 0.35, 0.14, 0.55, 0.12, 0.75, 0.13, 0.9, 0.2, 0.97, 0.32, 0.97, 0.6, 0.92, 0.7, 0.84, 0.67, 0.74, 0.6, 0.6, 0.6, 0.46, 0.56, 0.34, 0.5, 0.22, 0.45, 0.13, 0.41], c: '#06080f', soft: 0.0018, rough: 0.003 },
      { k: 'patch', p: [0.42, 0.37, 0.5, 0.27, 0.62, 0.24, 0.74, 0.27, 0.8, 0.35, 0.76, 0.44, 0.64, 0.48, 0.5, 0.46], c: '#2a5ae0', soft: 0.0018, rough: 0.002 },
      { k: 'patch', p: [0.86, 0.5, 0.93, 0.41, 1.0, 0.35, 1.0, 0.65, 0.93, 0.59], c: '#f3d21e', soft: 0.0016 },
    ] },
    f: { color: '#2048d0', d: [{ color: '#2048d0', tip: '#0a0e2a', edge: '#05070f' }], a: [{ color: '#1f45c8', tip: '#0a0e2a', edge: '#05070f' }], c: { color: '#f3d21e', mid: '#f8de3a', tip: '#f8de3a', edge: '#0b0c14' }, p: { color: '#1d46c8', tip: '#f2cf1c' }, v: { color: '#1a3fb8' } },
    e: { iris: '#20202c' },
  },
  'bluebarred-parrotfish': {
    // salmon-orange, a turquoise spot on every scale, blue lines around the beak; fins orange with blue margins
    c: { top: '#c8683e', side: '#e98f5c', belly: '#f2b48a', cs: [0.3, 0.72], rough: 0.35, layers: [
      { k: 'grad', c: '#f0a070', s0: 0, s1: 0.25, h0: 0.2, h1: 0.9, soft: 0.05, a: 0.3 },
      { k: 'scaleFill', c: '#2f95e0', a: 0.78, r: 0.3, h0: 0.04, h1: 0.86 },
      { k: 'scaleEdge', c: '#c45a32', a: 0.3 },
      { k: 'line', p: [0.0, 0.62, 0.05, 0.6, 0.12, 0.58], w: 0.004, c: '#2a8ae0' },
      { k: 'line', p: [0.0, 0.72, 0.06, 0.74, 0.11, 0.76], w: 0.0035, c: '#2a8ae0' },
      { k: 'line', p: [0.02, 0.5, 0.06, 0.42, 0.1, 0.38], w: 0.003, c: '#2a8ae0' },
    ] },
    f: { color: '#f08a52', d: [{ color: '#f0884e', edge: '#2a90e0' }], a: [{ color: '#f0884e', edge: '#2a90e0' }], c: { color: '#f08a50', mid: '#f4a070', edge: '#2a90e0' }, p: { color: '#f4a070', tip: '#2a90e0' }, v: { color: '#f2955a', edge: '#2a90e0' } },
    e: { iris: '#e6b040' },
  },
  bluegill: {
    // olive-bronze with faint chain bars, orange breast, blue-violet cheek lines, black opercular "ear" flap
    c: { top: '#4a4f2c', side: '#8f8446', belly: '#e5a046', cs: [0.28, 0.72], rough: 0.35, layers: [
      { k: 'bars', at: [0.34, 0.43, 0.52, 0.61, 0.7, 0.79], w: 0.038, c: '#3f3a1e', h0: 0.02, h1: 0.74, a: 0.5, rough: 0.004, wob: 0.008, soft: 0.004 },
      { k: 'scaleFill', c: '#c8a040', a: 0.16, r: 0.3, h0: 0.2, h1: 0.8 },
      { k: 'grad', c: '#e88a2c', s0: 0.15, s1: 0.5, h0: 0.75, h1: 1, soft: 0.06, a: 0.7 },
      { k: 'patch', p: [0.06, 0.55, 0.14, 0.5, 0.22, 0.54, 0.24, 0.66, 0.18, 0.78, 0.09, 0.76], c: '#6a6aa8', soft: 0.012, a: 0.35 },
      { k: 'line', p: [0.03, 0.6, 0.12, 0.62, 0.2, 0.6], w: 0.004, c: '#4a5aa0', a: 0.5 },
      { k: 'patch', p: [0.235, 0.33, 0.29, 0.3, 0.315, 0.37, 0.3, 0.44, 0.245, 0.45], c: '#0d0f10', soft: 0.002 },
    ] },
    f: { color: '#6a5c36', d: [{ color: '#5a5432' }, { color: '#5e5634' }], a: [{ color: '#5a5030' }], c: { color: '#6a6038' }, p: { color: '#b8a870', alpha: 0.6 }, v: { color: '#6a5a36', tip: '#e0d0a0' } },
    e: { iris: '#2e2418' },
  },
  'bluestreak-cleaner-wrasse': {
    // cream-yellow front, black stripe widening from snout to tail, electric-blue rear back and belly
    c: { top: '#d9d6b6', side: '#f2f0e6', belly: '#fafaf6', cs: [0.3, 0.65], rough: 0.3, layers: [
      { k: 'grad', c: '#e8d97a', s0: 0, s1: 0.35, h0: 0, h1: 0.35, soft: 0.06, a: 0.45 },
      { k: 'grad', c: '#3d78dc', s0: 0.4, s1: 1, h0: 0, h1: 0.36, soft: 0.1, a: 0.85 },
      { k: 'grad', c: '#5a8ee6', s0: 0.6, s1: 1, h0: 0.6, h1: 1, soft: 0.1, a: 0.55 },
      { k: 'stripe', h: 0.43, w: 0.028, c: '#07080e', s0: 0, s1: 1, taper: -1.6, rough: 0.0015 },
    ] },
    f: { color: '#d0d4e6', tip: '#3060c0', d: [{ color: '#1a2050', tip: '#3a6ad0', edge: '#5a8af0' }], a: [{ color: '#e6e8f2', tip: '#3a6ad0' }], c: { color: '#101018', tip: '#3070e0', edge: '#4a88f0' }, p: { color: '#eef2f8' }, v: { color: '#f2f2f6' } },
  },
  bonefish: {
    // silver with faint dark longitudinal lines along the scale rows, dark snout tip, greenish back
    c: { top: '#4a5a5e', side: '#c6ced0', belly: '#f2f4f4', cs: [0.3, 0.56], iri: 0.8, metal: 0.58, rough: 0.24, layers: [
      { k: 'stripe', h: 0.18, w: 0.004, c: '#5a6870', s0: 0.25, s1: 0.98, a: 0.45 },
      { k: 'stripe', h: 0.26, w: 0.004, c: '#5a6870', s0: 0.25, s1: 0.98, a: 0.45 },
      { k: 'stripe', h: 0.34, w: 0.004, c: '#5a6870', s0: 0.25, s1: 0.98, a: 0.4 },
      { k: 'stripe', h: 0.42, w: 0.0035, c: '#6a7880', s0: 0.28, s1: 0.98, a: 0.35 },
      { k: 'stripe', h: 0.5, w: 0.0035, c: '#6a7880', s0: 0.3, s1: 0.98, a: 0.3 },
      { k: 'grad', c: '#2a3438', s0: 0, s1: 0.06, h0: 0.2, h1: 0.6, soft: 0.03, a: 0.45 },
    ] },
    f: { color: '#b8c4c8', d: [{ color: '#8a989e' }], c: { color: '#8a989e', tip: '#3a464c' }, p: { color: '#d8c890' }, v: { color: '#e0d8b0' } },
    e: { iris: '#d8d0a0' },
  },
  bowfin: {
    // olive-brown marbled with dark reticulation, dark post-orbital streak, black eye-spot ringed in orange at the tail base
    c: { top: '#4f4f2e', side: '#8a8256', belly: '#ddd6b6', cs: [0.32, 0.7], rough: 0.4, layers: [
      { k: 'mottle', c: '#35361d', sc: 0.03, th: 0.56, soft: 0.1, a: 0.52, h0: 0, h1: 0.8 },
      { k: 'reticulate', c: '#323219', n: 30, w: 0.0025, s0: 0.25, s1: 0.95, h0: 0.1, h1: 0.8, a: 0.45 },
      { k: 'grad', c: '#e8e0c4', s0: 0, s1: 0.3, h0: 0.75, h1: 1, soft: 0.05, a: 0.4 },
      { k: 'line', p: [0.02, 0.42, 0.06, 0.4, 0.12, 0.42, 0.18, 0.46], w: 0.003, c: '#2a2a18', a: 0.6 },
      { k: 'spots', n: 1, r: 0.018, c: '#121510', s0: 0.955, s1: 0.955, h0: 0.3, h1: 0.3, ring: '#e8b030', rw: 1.35, irr: 0.15 },
    ] },
    f: { color: '#6a6a3a', tip: '#4a4a2a', d: [{ color: '#5a6a3a', pattern: 'bands', spots: 4, spotCol: '#3a4224' }], a: [{ color: '#6a6a40' }], c: { color: '#7a6a3a', tip: '#8a4a2a' }, p: { color: '#8a7a4a' }, v: { color: '#8a7a4a' } },
    e: { iris: '#b8a060' },
  },
  'brown-trout': {
    // golden-brown, black spots with pale halos, scattered red spots ringed in cream, buttery belly
    c: { top: '#453c2c', side: '#91764f', belly: '#d7c6a3', cs: [0.29, 0.68], rough: 0.4, metal: 0.06, layers: [
      { k: 'mottle', c: '#59442c', sc: 0.035, th: 0.62, soft: 0.12, a: 0.2, h0: 0, h1: 0.58 },
      { k: 'grad', c: '#bba06d', s0: 0.12, s1: 0.93, h0: 0.45, h1: 0.66, soft: 0.07, a: 0.24 },
      { k: 'spots', n: 370, r: 0.0037, c: '#211a12', h0: 0.03, h1: 0.62, s0: 0.04, s1: 0.9, irr: 0.52, ring: 'rgba(220,215,199,0.22)', rw: 1.35, bias: 1.25 },
      { k: 'spots', n: 33, r: 0.0035, c: '#a63a25', h0: 0.39, h1: 0.64, s0: 0.2, s1: 0.86, ring: 'rgba(231,223,204,0.55)', rw: 1.45, irr: 0.32 },
      { k: 'spots', n: 14, r: 0.0036, c: '#231c12', h0: 0.22, h1: 0.5, s0: 0.06, s1: 0.24, irr: 0.48 },
    ] },
    f: { color: '#6d6249', d: [{ color: '#77684c', pattern: 'spots', spots: 6, spotCol: '#211a12' }, { color: '#987252', tip: '#77543b' }], a: [{ color: '#bba786', tip: '#dfd5bd' }], c: { color: '#665a42', tip: '#504432', pattern: 'spots', spots: 6, spotCol: '#2a2118' }, p: { color: '#a28c65' }, v: { color: '#aa9369', tip: '#d9ceb2' } },
    e: { iris: '#d8b860' },
  },
  'channel-catfish': {
    // slate blue-grey back, paler flanks with a few black spots, white belly
    c: { top: '#2b3036', side: '#56606a', belly: '#eceae4', cs: [0.36, 0.68], rough: 0.38, sheen: 0.3, layers: [
      { k: 'grad', c: '#6a7680', s0: 0.1, s1: 0.98, h0: 0.45, h1: 0.62, soft: 0.05, a: 0.35 },
      { k: 'spots', n: 45, r: 0.0045, c: '#15181b', h0: 0.2, h1: 0.62, s0: 0.25, s1: 0.9, irr: 0.4 },
    ] },
    f: { color: '#34383c', tip: '#22262a', a: [{ color: '#4a4e52' }], c: { color: '#2e3236', tip: '#1e2226' }, v: { color: '#8a8e90' } },
  },
  'clown-triggerfish': {
    // black; big white spots on the lower half; yellow leopard saddle on the back; orange lips; yellow bar before the eyes
    c: { top: '#111518', side: '#15191c', belly: '#171b1d', rough: 0.46, layers: [
      { k: 'patch', p: [0.3, 0.04, 0.42, 0.015, 0.59, 0.018, 0.73, 0.055, 0.78, 0.17, 0.71, 0.29, 0.56, 0.32, 0.4, 0.3, 0.32, 0.23], c: '#a69b43', soft: 0.004, rough: 0.005 },
      { k: 'spots', n: 205, r: 0.0045, c: '#1b211d', s0: 0.31, s1: 0.76, h0: 0.02, h1: 0.32, irr: 0.4, even: 0.55 },
      { k: 'spots', n: 34, r: 0.019, c: '#f0f0e8', s0: 0.18, s1: 0.87, h0: 0.44, h1: 0.89, rv: 0.4, irr: 0.35, even: 0.64 },
      { k: 'patch', p: [0, 0.32, 0.035, 0.3, 0.065, 0.4, 0.07, 0.52, 0.06, 0.62, 0.03, 0.7, 0, 0.68], c: '#f0b020', soft: 0.003 },
      { k: 'eyeband', ds: -0.03, w: 0.014, c: '#ddc541', h0: 0.02, h1: 0.42, a: 0.9 },
      { k: 'stripe', h: 0.38, w: 0.007, c: '#dfc43a', s0: 0.07, s1: 0.2 },
    ] },
    f: { color: '#d7d6cd', tip: '#201e24', d: [
      { color: '#1b2022' },
      { color: '#bcbdb7', mid: '#e0ddc8', tip: '#d9d6c8', edge: '#806583', edgeWidth: 0.04, marks: [{ v0: 0.72, v1: 0.79, c: '#1a1b22' }] },
    ], a: [{ color: '#c8c9bd', mid: '#e2ddc9', tip: '#d8d7c9', edge: '#90718a', edgeWidth: 0.05, marks: [{ v0: 0.68, v1: 0.77, c: '#1a1b22' }] }],
      c: { color: '#15181b', mid: '#25232b', tip: '#17191c', edge: '#ae79a8', edgeWidth: 0.04, marks: [
        { v0: 0.3, v1: 0.43, c: '#e6e5de' }, { v0: 0.67, v1: 0.76, c: '#e5e4dc' },
      ] }, p: { color: '#c7c7bb', alpha: 0.55 } },
  },
  'common-carp': {
    // bronze-gold, every scale rimmed dark (net pattern), reddish lower fins and tail
    c: { top: '#4f4628', side: '#b19a5c', belly: '#e9dcb0', cs: [0.3, 0.7], metal: 0.28, rough: 0.32, layers: [
      { k: 'grad', c: '#7a6a3a', s0: 0, s1: 0.25, h0: 0, h1: 0.45, soft: 0.06, a: 0.35 },
      { k: 'scaleFill', c: '#c8ac66', a: 0.3, r: 0.32, h0: 0.12, h1: 0.85 },
      { k: 'scaleEdge', c: '#3a2e14', a: 0.6 },
    ] },
    f: { color: '#7a6440', d: [{ color: '#6a5838' }], a: [{ color: '#b85a30' }], c: { color: '#8a5a34', tip: '#a84a28' }, p: { color: '#a86a3a' }, v: { color: '#b2602e' } },
    e: { iris: '#c8a040' },
  },
  'copperband-butterflyfish': {
    // Unequal copper bands curve around the eye and body; intervening silver scales glow pale aqua.
    c: { top: '#f0ede3', side: '#f3f0e8', belly: '#f6f3eb', iri: 0.22, metal: 0.1, rough: 0.4, layers: [
      { k: 'grad', c: '#ebbb4d', s0: 0.12, s1: 0.92, h0: 0, h1: 0.16, soft: 0.055, a: 0.55 },
      { k: 'flow', n: 9, c: '#69aea9', w: 0.0022, amp: 0.006, freq: 12, s0: 0.23, s1: 0.86, h0: 0.29, h1: 0.82, a: 0.31 },
      { k: 'band', stops: [[0, 0.21, 0.273], [0.24, 0.21, 0.275], [0.42, 0.218, 0.278], [0.68, 0.232, 0.297], [1, 0.247, 0.31]], c: '#df8223', edge: '#33251b', ew: 0.0038, soft: 0.0008, rough: 0.0016 },
      { k: 'band', stops: [[0, 0.36, 0.438], [0.24, 0.362, 0.444], [0.5, 0.38, 0.46], [0.74, 0.395, 0.476], [1, 0.401, 0.481]], c: '#e38a22', edge: '#312118', ew: 0.0045, soft: 0.0008, rough: 0.0014 },
      { k: 'band', stops: [[0, 0.55, 0.631], [0.28, 0.548, 0.634], [0.53, 0.558, 0.639], [0.8, 0.581, 0.651], [1, 0.593, 0.653]], c: '#e79528', edge: '#2c211b', ew: 0.004, soft: 0.0008, rough: 0.0013 },
      { k: 'band', stops: [[0, 0.746, 0.829], [0.38, 0.742, 0.833], [0.69, 0.757, 0.837], [1, 0.768, 0.851]], c: '#e79128', edge: '#3a281e', ew: 0.004, soft: 0.0008, rough: 0.0013 },
      { k: 'grad', c: '#e7a431', s0: 0.825, s1: 0.92, h0: 0, h1: 1, soft: 0.028, a: 0.55 },
      { k: 'band', stops: [[0, 0.932, 0.949], [0.5, 0.935, 0.951], [1, 0.938, 0.951]], c: '#282525', edge: '#f5f1e9', ew: 0.003, rough: 0.001 },
    ] },
    f: { color: '#f2eee2', d: [{ color: '#ebb339', mid: '#f2cd63', tip: '#e7e9dd', edge: '#d5a44f', edgeWidth: 0.025 }], a: [{ color: '#eeb846', mid: '#eec15a', tip: '#f0d87d', edge: '#3b3026', edgeWidth: 0.025 }], c: { color: '#f1eadb', tip: '#e5e4de' }, p: { color: '#edf1ef', alpha: 0.45 }, v: { color: '#edaa33' } },
    e: { iris: '#161618' },
  },
  discus: {
    // Fine continuous turquoise labyrinthine streamlines curl around the crimson eye, on an olive-umber body.
    c: { top: '#383b30', side: '#565545', belly: '#414941', rough: 0.39, iri: 0.18, layers: [
      { k: 'mottle', c: '#282e27', sc: 0.065, th: 0.6, soft: 0.15, a: 0.26 },
      { k: 'bars', at: seq(0.19, 0.9, 9), w: 0.012, c: '#23261f', a: 0.21, rough: 0.003 },
      { k: 'flow', n: 29, c: '#69c3bc', w: 0.0035, amp: 0.019, freq: 20, s0: 0.015, s1: 0.98, h0: 0.065, h1: 0.93, a: 0.85 },
      { k: 'flow', n: 10, c: '#98d8ce', w: 0.0018, amp: 0.017, freq: 22, s0: 0.02, s1: 0.32, h0: 0.11, h1: 0.88, a: 0.45, seed: 8 },
      { k: 'vermic', c: '#6ab6ad', sc: 0.041, w: 0.045, a: 0.19, s0: 0.01, s1: 0.35, h0: 0.1, h1: 0.86, seed: 12 },
      { k: 'eyeband', w: 0.015, c: '#252520', a: 0.42 },
    ] },
    f: { color: '#354944', d: [{ color: '#32433b', mid: '#37534d', tip: '#3c4a3e', edge: '#944a34', edgeWidth: 0.019, sheath: 0.39 }], a: [{ color: '#344944', mid: '#38514a', tip: '#3a4a3d', edge: '#91432e', edgeWidth: 0.02, sheath: 0.41 }], c: { color: '#497c72', tip: '#5d9d95', alpha: 0.5 }, p: { color: '#adbaa3', alpha: 0.4 }, v: { color: '#a94a2d', tip: '#bd6c48' } },
    e: { iris: '#c52619', iris2: '#f46929' },
  },
  'electric-eel': {
    // dark grey-brown, orange throat and belly stripe
    c: { top: '#3a332e', side: '#544840', belly: '#c76a32', cs: [0.36, 0.82], rough: 0.35, sheen: 0.3, layers: [
      { k: 'mottle', c: '#2a2420', sc: 0.03, th: 0.6, soft: 0.1, a: 0.28, h1: 0.7 },
      { k: 'grad', c: '#d8843a', s0: 0.02, s1: 0.25, h0: 0.72, h1: 1, soft: 0.05, a: 0.6 },
    ] },
    f: { color: '#4a3a32', tip: '#5a4a42' },
  },
  'emperor-angelfish': {
    // Parallel gold chromatophore lines bend from the sapphire body into the fin bases; the eye is in an irregular
    // midnight-blue mask with electric-blue margins, framed by a pale face and a dark shoulder saddle.
    c: { top: '#1a319e', side: '#223bb0', belly: '#17246c', cs: [0.31, 0.8], rough: 0.39, iri: 0.18, layers: [
      { k: 'flow', n: 31, c: '#f0cf26', w: 0.0067, amp: 0.007, freq: 11, s0: 0.28, s1: 0.97, h0: 0.018, h1: 0.96, slant: 0.17, a: 0.97 },
      { k: 'patch', p: [0.078, 0.07, 0.17, 0.075, 0.208, 0.2, 0.215, 0.49, 0.178, 0.69, 0.087, 0.69, 0.057, 0.54], c: '#58b8f0', soft: 0.006, rough: 0.003 },
      { k: 'patch', p: [0.095, 0.11, 0.156, 0.105, 0.181, 0.21, 0.183, 0.48, 0.159, 0.635, 0.096, 0.63, 0.077, 0.51], c: '#0a102c', soft: 0.002, rough: 0.002 },
      { k: 'patch', p: [0.227, 0.02, 0.311, 0.02, 0.344, 0.23, 0.339, 0.74, 0.296, 0.92, 0.229, 0.84], c: '#4aa5de', soft: 0.004, rough: 0.002 },
      { k: 'patch', p: [0.243, 0.03, 0.304, 0.03, 0.323, 0.27, 0.322, 0.71, 0.29, 0.865, 0.241, 0.81], c: '#0d1534', soft: 0.002, rough: 0.0015 },
      { k: 'patch', p: [0, 0.26, 0.052, 0.21, 0.095, 0.36, 0.094, 0.75, 0.062, 0.94, 0, 0.95], c: '#ecefe8', soft: 0.008, rough: 0.002 },
    ] },
    f: { d: [{ color: '#243fb5', mid: '#293fae', tip: '#2340a8', edge: '#68bce8', edgeWidth: 0.035, sheath: 0.63 }], a: [{ color: '#111a60', tip: '#1d319e', edge: '#65b5de', edgeWidth: 0.03 }], c: { color: '#e45c0e', mid: '#f07110', tip: '#f08415' }, p: { color: '#121a42', tip: '#10234e' } },
  },
  'european-eel': {
    // yellow-eel phase: olive-brown back, yellowish flanks and belly
    c: { top: '#4a4626', side: '#7a7444', belly: '#d6cc98', cs: [0.32, 0.72], rough: 0.3, sheen: 0.4, layers: [
      { k: 'mottle', c: '#3a361c', sc: 0.04, th: 0.6, soft: 0.12, a: 0.3, h1: 0.7 },
      { k: 'grad', c: '#c8b878', s0: 0.05, s1: 0.6, h0: 0.65, h1: 1, soft: 0.08, a: 0.4 },
    ] },
    f: { color: '#5a5638', tip: '#6a6640' },
  },
  'european-plaice': {
    // eyed side warm brown with bright orange spots in pale halos (also on the fins); blind side white
    c: { top: '#6a5a3e', side: '#76644a', belly: '#6a5a3e', rough: 0.4, blind: '#f2efe6', layers: [
      { k: 'mottle', c: '#4e4230', sc: 0.04, th: 0.6, soft: 0.12, a: 0.32 },
      { k: 'spots', n: 34, r: 0.011, c: '#e2732c', h0: 0.06, h1: 0.94, s0: 0.12, s1: 0.95, ring: 'rgba(250,236,210,0.4)', rw: 1.25, irr: 0.25, even: 0.75 },
    ] },
    f: { color: '#76644a', tip: '#5e5038', d: [{ pattern: 'spots', spots: 4, spotCol: '#e2732c' }], a: [{ pattern: 'spots', spots: 4, spotCol: '#e2732c' }] },
    e: { iris: '#5a4a2a' },
  },
};
