import * as THREE from 'three';
/** Uniforms shared by every material of one fish (animation state). */
export interface FishUniforms {
  uTime: { value: number };
  uReveal: { value: number };
  uRevealR: { value: number };
  uRevealC: { value: THREE.Vector3 };
  uRevealCol: { value: THREE.Color };
  uClock: { value: number };
  uFinT: { value: number };
  uFinAct: { value: number };
  uGape: { value: number };
  uMaxGape: { value: number };
  uProtrude: { value: number };
  uGular: { value: number };
  uBreath: { value: number };
  uGillAmp: { value: number };
  uGillE: { value: THREE.Vector3 };
  uCaustic: { value: number };
  uFwd: { value: THREE.Vector2 };
  uHinge: { value: THREE.Vector2 };
  uAmp: { value: number };
  uWave: { value: number };
  uFreq: { value: number };
  uA0: { value: number };
  uPow: { value: number };
  uL: { value: number };
  uX0: { value: number };
  uFlap: { value: number };
  uFlapF: { value: number };
  uFinWave: { value: number };
  uWing: { value: number };
  uWingF: { value: number };
  uSpan: { value: number };
  uGazeR: { value: THREE.Vector3 };
  uGazeL: { value: THREE.Vector3 };
  uPupil: { value: number };
  uOrbitC: { value: THREE.Vector4[] };
  uOrbitN: { value: THREE.Vector4[] };
  uPairMap: { value: THREE.DataTexture | null };
  uPairRange: { value: THREE.Vector4 };
  uPairSize: { value: THREE.Vector3 };
}
export function makeUniforms(): FishUniforms {
  return {
    uTime: { value: 0 },
    uReveal: { value: 1 },
    uRevealR: { value: 1 },
    uRevealC: { value: new THREE.Vector3() },
    uRevealCol: { value: new THREE.Color('#8fe3d6') },
    uClock: { value: 0 },
    uFinT: { value: 0 },
    uFinAct: { value: 1 },
    uGape: { value: 0 },
    uMaxGape: { value: 0.5 },
    uProtrude: { value: 0 },
    uGular: { value: 0 },
    uBreath: { value: 0 },
    uGillAmp: { value: 0 },
    uGillE: { value: new THREE.Vector3(0, 1, 1) },
    uCaustic: { value: 0.5 },
    uFwd: { value: new THREE.Vector2(1, 0) },
    uHinge: { value: new THREE.Vector2() },
    uAmp: { value: 0 },
    uWave: { value: 7 },
    uFreq: { value: 6 },
    uA0: { value: 0.15 },
    uPow: { value: 2 },
    uL: { value: 2 },
    uX0: { value: 1 },
    uFlap: { value: 0 },
    uFlapF: { value: 4 },
    uFinWave: { value: 0 },
    uWing: { value: 0 },
    uWingF: { value: 1.5 },
    uSpan: { value: 1 },
    uGazeR: { value: new THREE.Vector3(0.25, 0, 0.97).normalize() },
    uGazeL: { value: new THREE.Vector3(0.25, 0, 0.97).normalize() },
    uPupil: { value: 0 },
    uOrbitC: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
    uOrbitN: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    uPairMap: { value: null },
    uPairRange: { value: new THREE.Vector4() },
    uPairSize: { value: new THREE.Vector3() },
  };
}
/** Articulation of one fin (per-material uniforms). kind: 1 median ribbon, 2 paired ball-joint, 3 caudal */
export interface Joint {
  kind: number;
  pivot?: THREE.Vector3;
  axis?: THREE.Vector3; // rowing axis (fin base line)
  axis2?: THREE.Vector3; // feathering axis (leading ray / span)
  amp?: number;
  amp2?: number;
  freq?: number;
  phase?: number;
}
const VERT_HEAD = /* glsl */ `
attribute float aJaw;
attribute float aFlap;
attribute float aSide;
attribute float aGill; // gill-cover weight: 0 fixed … 1 free opercular margin
attribute vec4 aPlastic;
attribute vec4 aFin;
attribute vec4 aEye;
attribute vec4 aAnc;   // xyz: anchor point on the skin, w: anchor jaw weight
attribute vec4 aAncPl; // plasticity weights at the anchor
attribute float aAncW; // 0 = own deformation … 1 = rigidly follows the anchor
uniform float uTime, uFinT, uFinAct, uGape, uMaxGape, uProtrude, uGular, uAmp, uWave, uFreq, uA0, uPow, uL, uX0, uFlap, uFlapF, uFinWave, uWing, uWingF, uSpan, uBreath, uGillAmp;
uniform vec2 uHinge, uFwd;
uniform vec3 uGillE;            // y of the head axis, 1/H², 1/W²  (outward direction of the gill covers)
uniform vec3 uGazeR, uGazeL;
uniform vec3 eC, eAx, eAy, eAz; // globe centre and orbit frame (forward, up, optical axis)
uniform vec3 eRot;              // x: 1 = this mesh turns with the globe, y: angular gain, z: handedness of the frame
uniform vec3 jP, jA, jB;
uniform float jKind, jAmp, jAmp2, jFreq, jPh;
uniform sampler2D uPairMap;
uniform vec4 uPairRange;
uniform vec3 uPairSize;
#ifdef FISH_SOCKET_CUT
varying vec3 vBindP;
#endif
varying vec2 vFin;
varying float vJaw;
varying vec4 vEye;
varying vec3 vEyeO;
varying vec2 vFishUv;
varying vec3 vFishWorld;
vec3 fishRot(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
// lower-jaw rotation about the quadrate hinge + fleshy head plasticity (shared by skin, lips, eyes)
vec3 fishSoft(vec3 p, float jw, vec4 pl, inout vec3 nrm, float openF) {
  if (jw > 0.0) {
    float ca = cos(uGape), sa = -sin(uGape);
    vec2 d = p.xy - uHinge;
    // A single rigid transform for the dentary, then blend into static tissue.
    p.xy += jw * (vec2(ca*d.x - sa*d.y, sa*d.x + ca*d.y) - d);
    nrm.xy = mix(nrm.xy, vec2(ca*nrm.x - sa*nrm.y, sa*nrm.x + ca*nrm.y), jw);
  }
  if (openF > 0.001) {
    vec2 dUp = vec2(-uFwd.y, uFwd.x);
    if (pl.x > 0.0) p.xy += (uFwd - dUp * 0.24) * (openF * uProtrude * pl.x * uL);
    if (pl.y > 0.0) p.z += (p.z >= 0.0 ? 1.0 : -1.0) * openF * uGular * 0.58 * pl.y * uL;
    if (pl.z > 0.0) p.xy -= dUp * (openF * uGular * pl.z * uL);
    if (pl.w > 0.0) {
      p.z *= 1.0 - 0.032 * openF * pl.w;
    }
  }
  return p;
}
`;
const VERT_DEFORM = /* glsl */ `
vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
vec3 fishP = position;
vFin = aFin.yz;
vJaw = aJaw;
vEye = aEye;
vFishUv = uv;
#ifdef FISH_SOCKET_CUT
vBindP = position;
#endif
float openF = clamp(uGape / max(uMaxGape, 0.05), 0.0, 1.0);
// 0. the eyeball really turns in its socket: globe, iris, lens and cornea rotate about the globe centre.
// vEyeO keeps the direction in the FIXED orbit frame (lid shadow, adipose eyelid).
vEyeO = vec3(0.0, 0.0, 1.0);
if (eRot.x > 0.5) {
  vec3 gz = aEye.w > 0.0 ? uGazeR : uGazeL;
  float yaw = atan(gz.x, max(gz.z, 1e-3)) * eRot.y;
  float pit = asin(clamp(gz.y, -1.0, 1.0)) * eRot.y;
  vec3 kY = eAy * eRot.z, kX = eAx * eRot.z;
  vec3 dE = fishRot(fishRot(fishP - eC, kY, yaw), kX, -pit);
  objectNormal = fishRot(fishRot(objectNormal, kY, yaw), kX, -pit);
  fishP = eC + dE;
  vec3 dn = normalize(dE);
  vEyeO = vec3(dot(dn, eAx), dot(dn, eAy), dot(dn, eAz));
}
// Fin articulation and clearance are measured in bind space, before soft tissue and swim.
if (jKind > 0.5 && aFin.w > 0.5) {
  float w = aFin.x * uFinAct;
  float fu = aFin.y, fv = aFin.z;
  if (jKind < 1.5) {
    float ph = uFinT * jFreq + jPh - (uX0 - fishP.x) / uL * 11.0;
    fishP.z += jAmp * uL * w * sin(ph);
  } else if (jKind < 2.5) {
    vec3 P = jP, A = jA, B = jB;
    if (aSide < 0.0) { P.z = -P.z; A = vec3(-A.x, -A.y, A.z); B = vec3(-B.x, -B.y, B.z); }
    float ph = uFinT * jFreq + jPh - 0.72 * fu - 0.8 * fv;
    float row = jAmp * w * (sin(ph) * 0.78 + 0.17);
    float fea = jAmp2 * w * fv * cos(ph);
    fishP = P + fishRot(fishRot(fishP - P, B, fea), A, row);
    objectNormal = fishRot(fishRot(objectNormal, B, fea), A, row);
    if (fv > 0.02 && uPairSize.z > 0.0) {
      vec2 uvP = vec2(((uX0 - fishP.x) / uL - uPairRange.x) * uPairRange.y, (fishP.y - uPairRange.z) * uPairRange.w);
      if (all(greaterThan(uvP, vec2(0.0))) && all(lessThan(uvP, vec2(1.0)))) {
        uvP = (uvP * (uPairSize.xy - 1.0) + 0.5) / uPairSize.xy;
        float skinZ = dot(texture2D(uPairMap, uvP).rg, vec2(1.0, 1.0 / 255.0)) * uPairSize.z;
        if (skinZ > 0.0002 * uL) {
          float sideZ = fishP.z * aSide;
          float pad = 0.0019 * uL;
          // A soft stop leaves the skin joint fixed; only the free membrane is kept outside.
          float d = skinZ + pad - sideZ;
          float h = max(pad - abs(d), 0.0) / pad;
          fishP.z += aSide * (max(0.0, d) + h*h*pad*0.25) * smoothstep(0.02, 0.18, fv);
        }
      }
    }
  } else {
    float ph = uWave - uTime * uFreq;
    float lobe = pow(abs(fu - 0.5) * 2.0, 2.0);
    fishP.z += jAmp * uL * w * (lobe * sin(ph + 1.0) - 0.45 * sin(ph - 1.4 * fv));
    fishP.y = jP.y + (fishP.y - jP.y) * (1.0 + 0.035 * w * sin(2.0 * ph));
  }
}
// 1+2. lower jaw rotation and fleshy head plasticity. Anchored parts (eyes, corneas, orbit rims)
// translate exactly with the skin at their anchor, so the eyes ride on the cheek when the head
// inflates instead of sinking into it.
if (aAncW > 0.0) {
  vec3 nA = vec3(0.0, 1.0, 0.0);
  vec3 own = fishSoft(fishP, aJaw, aPlastic, objectNormal, openF);
  vec3 anc = fishSoft(aAnc.xyz, aAnc.w, aAncPl, nA, openF) - aAnc.xyz;
  fishP = mix(own, fishP + anc, aAncW);
} else {
  fishP = fishSoft(fishP, aJaw, aPlastic, objectNormal, openF);
}
// 2b. opercular pump: the gill covers swing out from their anterior hinge with every breath
if (aGill > 0.0) {
  // outward normal of the head ellipse: lateral on the flank, downward under the throat
  vec2 gd = vec2((fishP.y - uGillE.x) * uGillE.y, fishP.z * uGillE.z);
  gd /= max(length(gd), 1e-5);
  float gOpen = aGill * uBreath * uGillAmp * uL;
  fishP.y += gd.x * gOpen * 0.85;
  fishP.z += gd.y * gOpen;
  fishP.x -= 0.22 * gOpen;   // the free margin trails back as the cover swings about its front hinge
}
// 4. flexible appendages without joints (barbels, fronds, finlets)
if (aFlap > 0.0 && aFin.w < 0.5) {
  float pf = uFinT*uFlapF - aFlap*2.35;
  float flex = pow(aFlap, 1.35) * uFinAct;
  fishP.z += aSide * flex * uFlap * uL * sin(pf);
  fishP.y += abs(aSide) * flex * uFlap * uL * 0.42 * cos(pf);
  fishP.z += (1.0-abs(aSide)) * flex * uFinWave * uL * sin(uFinT*7.0 + fishP.x*14.0/uL);
}
// 4b. dermal outgrowths (cirri, flaps, filaments): aFin = (bend weight, phase, amplitude SL, 0.3). They drift in the
// water and stream back with the swim; the root ring has zero weight, so the skin junction never opens.
if (aFin.w > 0.2 && aFin.w < 0.4) {
  float tw = aFin.x * uFinAct;
  float tph = uFinT * (1.05 + 0.55 * fract(aFin.y * 7.31)) + aFin.y * 6.2832;
  float ta = aFin.z * uL;
  fishP.z += tw * ta * (0.30 * sin(tph) + 0.09 * sin(tph * 2.3 + 1.7));
  fishP.y += tw * ta * 0.17 * cos(tph * 0.8 + 0.6);
  fishP.x -= tw * ta * (0.15 + 0.07 * sin(tph * 0.6));
}
// 5. batoid wings
if (uWing > 0.0) {
  float az = clamp(abs(fishP.z)/uSpan, 0.0, 1.0);
  float sw = (uX0 - fishP.x)/uL;
  float wp = uTime*uWingF - sw*3.5;
  fishP.y += uWing * pow(az, 1.7) * sin(wp) * uSpan;
  float dy = uWing * 1.7 * pow(max(az,1e-3), 0.7) * sin(wp);
  objectNormal = normalize(vec3(objectNormal.x, objectNormal.y, objectNormal.z - dy*sign(fishP.z)*objectNormal.y));
}
// 6. axial undulation – travelling wave continued smoothly onto integrated rostra and caudal rays
{
  float sRaw = (uX0 - fishP.x)/uL;
  float s = clamp(sRaw, 0.0, 1.0);
  float ext = clamp(sRaw - 1.0, 0.0, 1.2);
  float A = uAmp * (uA0 + (1.0-uA0)*pow(s, uPow));
  float dA = uAmp*(1.0-uA0)*uPow*pow(max(s,1e-3), uPow-1.0);
  A += dA * ext * 0.55;
  float ph = uWave*(s + ext) - uTime*uFreq;
  float slope;
  if (sRaw < 0.0) {
    // a rostrum is bone and cartilage, not muscle: it never bends with the body wave. It is a rigid lever
    // continuing the head's tangent, so it only sweeps from side to side as the head yaws.
    float ph0 = -uTime*uFreq;
    float A0 = uAmp*uA0;
    slope = A0*uWave*cos(ph0) + dA*sin(ph0);
    fishP.z += (A0*sin(ph0) + slope*sRaw)*uL;
  } else {
    fishP.z += A*sin(ph)*uL;
    slope = (ext > 0.0 ? dA * 0.55 : dA) * sin(ph) + A*uWave*cos(ph);
  }
  float th = atan(-slope);
  float c = cos(th), sn = sin(th);
  objectNormal.xz = vec2(c*objectNormal.x - sn*objectNormal.z, sn*objectNormal.x + c*objectNormal.z);
}
`;
export interface FinLook {
  rays: number;
  incise: number;
  membrane: number;
  base: THREE.Color;
  mid: THREE.Color;
  tip: THREE.Color;
  edge: THREE.Color;
  edgeW: number;
  spots: number;
  spotCol: THREE.Color;
  pattern: number; // 0 none 1 spots 2 leopard 3 bands 4 reticulate 5 rayspots
  fray: number;
  root: number; // v-extent of the body-skin blend at the fin base
  marks: { range: THREE.Vector4; color: THREE.Color }[]; // membrane pigment bands (up to three)
  ocel?: THREE.Vector4; // (u, v, r, active)
  ocelCol?: THREE.Color;
  ocelRing?: THREE.Color;
}
export interface EyeLook {
  iris: THREE.Color;
  iris2: THREE.Color;
  pupil: THREE.Color;
  globe: THREE.Color;
  /** pupil kind (0 round, 1 pear, 2 vertical slit, 3 horizontal oval, 4 crescent), pupil radius / iris radius, eyeshine, argentea metalness */
  parm: THREE.Vector4;
  /** lid aperture half-angle (rad), adipose eyelid, pattern seed, dorsal pigment cap */
  geo: THREE.Vector4;
  shine: THREE.Color;
}
/** rigid rotation of an eye part about the globe centre (per-eye uniforms) */
export interface EyeTurn { c: THREE.Vector3; ax: THREE.Vector3; ay: THREE.Vector3; az: THREE.Vector3; gain: number }
/** Integument: scale lattice, relief and optical character of the skin (evaluated per pixel) */
export interface SkinLook {
  n: number; // scales along the body
  rows: number; // scale rows dorsal → ventral
  aspect: number; // mean half girth (SL) – makes skin detail isotropic
  girth?: number[]; // half girth / span at 16 stations along u – local isotropy (globe heads, thin peduncles, long snouts)
  kind: number; // 0 naked, 1 cycloid, 2 ctenoid, 3 ganoid, 4 placoid, 5 warty / bony
  bump: number;
  head0: number; // scales fade in between these stations
  head1: number;
  edge: THREE.Color; // pigmented scale margins
  edgeA: number;
  silver: number;
  speck: number; // melanophore stippling
  mottle: number;
  texBump: number; // amplitude (SL) of the painted relief map
  bumpTex: THREE.Texture | null;
  headMap: THREE.Texture | null; // cranial map (headmap.ts): relief slopes RG, cavity tone B, integument class A
  headU0: number; headU1: number; // texture-u range the head map covers
  headK: THREE.Vector2; // world slope scale of the head map (kx along the body, ky around the girth)
  headScaleK: number; // density of head scales relative to trunk scales
}
const FRAG_HEAD = /* glsl */ `
#ifdef FISH_SOCKET_CUT
varying vec3 vBindP;
uniform vec4 uOrbitC[2], uOrbitN[2];
#endif
varying vec2 vFin;
varying float vJaw;
varying vec4 vEye;
varying vec3 vEyeO;
varying vec2 vFishUv;
varying vec3 vFishWorld;
uniform float fIsGill, uBreath;
uniform vec4 eParm, eGeo;
uniform vec3 eShineC;
uniform float fRays, fIncise, fMembrane, fEdgeW, fSpots, fIsFin, fFray, fPattern, fRoot, fIsEye, fIsGlass;
uniform vec3 fBase, fTip, fMid, fEdge, fSpotCol, fOcelCol, fOcelRing;
uniform vec4 fMark[3];
uniform vec3 fMarkCol[3];
uniform vec4 fOcel;
uniform vec3 eIris, eIris2, ePupil, eGlobe;
uniform vec3 uGazeR, uGazeL;
uniform float uPupil, uClock, uCaustic, uL;
uniform float uReveal, uRevealR;
uniform vec3 uRevealC, uRevealCol;
uniform float fIsSkin, sN, sRows, sKind, sBump, sHead0, sHead1, sEdgeA, sSilver, sSpeck, sMottle, sAspect, sTexBump;
uniform vec3 sEdge;
uniform sampler2D sBumpTex;
uniform float sHeadOn, sHeadScaleK;
uniform vec2 sHeadU, sHeadK;
uniform sampler2D sHeadTex;
uniform float sGirthA[16];
float skGirth(float u) { float x = clamp(u, 0.0, 1.0) * 15.0; float i = min(floor(x), 14.0); int k = int(i); return max(mix(sGirthA[k], sGirthA[k + 1], x - i), 0.004); }
vec2 skHeadGrad = vec2(0.0); // world height gradient of the cranial relief (per unit of head-map u / v)
vec2 skHeadUv = vec2(-1.0);  // head-map uv of this pixel (-1 outside the head map)
float skHeadCls = 1.0;       // integument class: 0 head scales · 0.25 dermal bone · 0.5 naked skin · 1 trunk
float fHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float fNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(fHash(i), fHash(i+vec2(1.0,0.0)), f.x), mix(fHash(i+vec2(0.0,1.0)), fHash(i+vec2(1.0,1.0)), f.x), f.y); }
vec3 fMapP = vec3(1.0);   // pigment sampled at this pixel
vec2 fScaleC = vec2(0.0); // lattice centre of the scale that is visible here
// organic displacement of the pigment field: no pattern edge on a living fish is ruler-straight or compass-round.
// Symmetric on both flanks and fading at the dorsal / ventral midlines, so the mirrored texture never tears.
vec2 fishWarp(vec2 uv) {
  float hN = 1.0 - abs(uv.y * 2.0 - 1.0);
  float gA = skGirth(uv.x);
  vec2 p = vec2(uv.x, hN * gA) * 34.0;
  vec2 d = (vec2(fNoise(p), fNoise(p + vec2(17.3, 9.1))) - 0.5) * 0.0062
         + (vec2(fNoise(p * 2.7 + 3.1), fNoise(p * 2.7 + vec2(8.7, 1.9))) - 0.5) * 0.0026;
  d *= smoothstep(0.0, 0.05, hN) * (1.0 - smoothstep(0.95, 1.0, hN));
  return vec2(uv.x + d.x, uv.y + (uv.y < 0.5 ? 0.5 : -0.5) * d.y / max(gA, 0.05));
}
// Imbricated scales. g = lattice coordinates (x toward the tail, y around the girth). Every scale is a
// plate tilted up toward its free posterior margin; the plate that stands highest at a point is the one
// you see, exactly like roof shingles. Returns (height, radial position in the scale, two per-scale hashes).
vec4 fishScales(vec2 g, float kind) {
  float H = 0.0, R = 1.0; vec2 hs = vec2(0.5);
  float row0 = floor(g.y);
  for (int j = -1; j <= 1; j++) {
    float row = row0 + float(j);
    float off = 0.5 * mod(row, 2.0);
    float col0 = floor(g.x - off + 0.5);
    for (int i = -1; i <= 1; i++) {
      vec2 c = vec2(col0 + float(i) + off, row + 0.5);
      vec2 q = g - c;
      float rho = kind > 2.5 ? (abs(q.x) * 0.92 + abs(q.y) * 0.98) : length(q / vec2(1.06, 1.0));
      float h = (1.0 - smoothstep(0.72, 1.02, rho)) * (0.83 + 0.17 * smoothstep(-0.7, 0.7, q.x));
      if (h > H) { H = h; R = rho; hs = vec2(fHash(c), fHash(c + 17.3)); fScaleC = c; }
    }
  }
  return vec4(H, R, hs);
}
// animated light network of the water surface projected onto the animal
float fishCaustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.2831853, 6.2831853) - 250.0;
  vec2 i = p; float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c = 1.17 - pow(c / 4.0, 1.4);
  return pow(abs(c), 8.0);
}
// height → shading normal with true world-space slopes (relief stays constant at every zoom level)
vec3 fishBump(vec3 pos, vec3 N, float h) {
  vec3 dpdx = dFdx(pos), dpdy = dFdy(pos);
  float dhdx = dFdx(h), dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, N), r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * N - grad);
}
// cranial relief: the head map stores true surface slopes, so tilt the normal by its gradient directly
// using the Mikkelsen cotangent frame + chain rule (zero UV-Jacobian singularity, zero facet seams)
vec3 fishHeadNormal(vec3 pos, vec3 N) {
  if (skHeadUv.x < 0.0) return N;
  vec3 dpdx = dFdx(pos), dpdy = dFdy(pos);
  vec2 dux = dFdx(skHeadUv), duy = dFdy(skHeadUv);
  vec3 r1 = cross(dpdy, N), r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  if (abs(det) < 1e-12) return N;
  float dhdx = dot(skHeadGrad, dux), dhdy = dot(skHeadGrad, duy);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * N - grad);
}
`;
const FRAG_MAIN = /* glsl */ `
#ifdef FISH_SOCKET_CUT
// Apertures are cut into the bind skin on each eye's own side of the midline, so the lid and skull cannot cover a moving iris.
bool bilatCut = (uOrbitC[0].z * uOrbitC[1].z) < -1e-6;
for (int k = 0; k < 2; k++) {
  if (bilatCut && vBindP.z * sign(uOrbitC[k].z) < 0.0012 * uL) continue;
  vec3 q = vBindP - uOrbitC[k].xyz;
  float h = dot(q, uOrbitN[k].xyz);
  vec3 d = q - h * uOrbitN[k].xyz;
  if (h > -uOrbitN[k].w && h < uOrbitC[k].w * 1.45 && dot(d,d) < uOrbitC[k].w * uOrbitC[k].w) discard;
}
#endif
float eyeMetal = -1.0, eyeRough = -1.0, eyeShine = 0.0, eyePup = 0.0;
vec3 finGlow = vec3(0.0);
float skH = 0.0, skBody = 0.0, skCrease = 0.0, skHN = 0.5, skMot = 0.5;
vec2 skHash = vec2(0.5);
if (fIsSkin > 0.5) {
  float s = vFishUv.x;
  float hN = 1.0 - abs(vFishUv.y * 2.0 - 1.0);
  skHN = hN;
  vec3 alb = diffuseColor.rgb;
  vec2 iso = vec2(s, hN * skGirth(s));
  // chromatophore mottling: no skin is a flat colour
  float mot = fNoise(iso * 52.0) * 0.6 + fNoise(iso * 163.0) * 0.4;
  skMot = mot;
  alb *= 1.0 + (mot - 0.5) * sMottle;
  // melanophores: fine dark stippling, densest on the back
  vec2 mg = iso * 640.0;
  float mlod = 1.0 - smoothstep(0.25, 0.75, max(fwidth(mg.x), fwidth(mg.y)));
  vec2 mi = floor(mg), mf = fract(mg) - 0.5;
  float mh = fHash(mi);
  vec2 mo = (vec2(fHash(mi + 3.7), fHash(mi + 9.1)) - 0.5) * 0.6;
  float mel = (1.0 - smoothstep(0.1, 0.22 + 0.14 * mh, length(mf - mo))) * step(0.42, mh);
  float dorsal = 0.2 + 0.8 * (1.0 - smoothstep(0.1, 0.6, hN));
  float lumA = dot(alb, vec3(0.2126, 0.7152, 0.0722));
  dorsal = max(dorsal, 0.75 * (1.0 - smoothstep(0.02, 0.22, lumA)));   // dark marks are dense melanophore fields
  alb *= 1.0 - sSpeck * dorsal * (mel * mlod * 0.55 + (1.0 - mlod) * 0.045);
  // xanthophores / erythrophores: yellow, orange and red pigment is granular – never a flat paint
  vec2 xg = iso * 1100.0;
  float xl = 1.0 - smoothstep(0.3, 0.9, max(fwidth(xg.x), fwidth(xg.y)));
  float sat = max(alb.r, max(alb.g, alb.b)) - min(alb.r, min(alb.g, alb.b));
  float xn = fNoise(xg) * 0.6 + fNoise(xg * 2.3 + 5.1) * 0.4;
  alb *= 1.0 + xl * (xn - 0.5) * (0.06 + 0.55 * sat);
  // The skull has no scale relief, but its dermis still holds pigment cells, pores and a thin mucus coat.
  float head = (1.0 - smoothstep(sHead0, sHead1, s)) * (1.0 - fIsFin);
  float ceph = fNoise(iso * vec2(98.0, 112.0)) * 0.68 + fNoise(iso * vec2(235.0, 187.0) + 3.0) * 0.32;
  alb *= 1.0 + head * (ceph - 0.5) * 0.12;
  vec2 pores = iso * 320.0;
  vec2 pc = floor(pores), pp = fract(pores) - 0.5;
  float pore = (1.0 - smoothstep(0.075, 0.19, length(pp - (vec2(fHash(pc + 4.1), fHash(pc + 7.9)) - 0.5) * 0.3)))
    * step(0.86, fHash(pc)) * head * smoothstep(0.2, 0.7, hN);
  alb *= 1.0 - pore * 0.07;
  if (sKind > 0.5 && sKind < 3.5) {
    vec2 g = vec2(s * sN, hN * sRows);
    if (fIsFin > 0.5) g += vec2(vFin.x * 3.0, vFin.y * 7.0);
    float gfw = max(fwidth(g.x), fwidth(g.y));
    float lod = 1.0 - smoothstep(0.3, 0.85, gfw);
    float sm = smoothstep(sHead0, sHead1, s) * (1.0 - smoothstep(0.985, 0.999, s));
    vec4 sc = fishScales(g, sKind);
    float body = sm * lod;
    #ifdef USE_MAP
    {
      // chromatophores lie in the dermis under each scale: up close a pigment pattern is a mosaic of scale-sized
      // tiles – bars and spots break along the scale rows instead of cutting through them
      float hc = clamp(fScaleC.y / sRows, 0.0, 1.0);
      vec2 cuv = vec2(fScaleC.x / sN, vFishUv.y < 0.5 ? hc * 0.5 : 1.0 - hc * 0.5);
      vec3 mapC = textureGrad(map, fishWarp(cuv), dFdx(vMapUv), dFdy(vMapUv)).rgb;
      // Pattern boundaries only slightly follow the scale edges. Hard snapping made pale stripes into sawteeth.
      float kLock = body * 0.075 * smoothstep(6.0, 14.0, sRows) * (1.0 - fIsFin) * smoothstep(0.2, 0.7, sc.x);
      alb = mix(alb, alb / max(fMapP, vec3(0.03)) * mapC, kLock);
    }
    #endif
    float crease = 1.0 - smoothstep(0.0, 0.45, sc.x);
    alb *= 1.0 - body * crease * 0.115;                                              // shallow overlapping scale pockets
    alb = mix(alb, sEdge, body * sEdgeA * (1.0 - smoothstep(0.06, 0.4, sc.x)));      // pigmented margins
    alb *= 1.0 + body * (sc.z - 0.5) * 0.09;                                         // subtle per-scale tone
    alb += body * sSilver * 0.05 * smoothstep(0.6, 0.76, sc.y) * (1.0 - smoothstep(0.78, 0.94, sc.y));
    alb *= 1.0 - sm * (1.0 - lod) * 0.1;
    float circuli = (0.5 + 0.5 * sin(sc.y * 44.0)) * (1.0 - smoothstep(0.08, 0.4, gfw));
    skH += body * (sc.x + 0.03 * circuli + (sc.w - 0.5) * 0.14 * sc.x) * sBump * 0.038 * uL / sN;
    skBody = body; skCrease = crease; skHash = sc.zw;
  } else {
    bool denticles = sKind > 3.5 && sKind < 4.5;
    vec2 dg = iso * (denticles ? 520.0 : 360.0);
    float dfw = max(fwidth(dg.x), fwidth(dg.y));
    float dlAlb = 1.0 - smoothstep(0.25, 0.75, dfw);
    float dlBump = 1.0 - smoothstep(0.10, 0.30, dfw);
    float dn = fNoise(dg);
    if (denticles) {
      // Placoid dermal denticles: fine diamond-staggered hydrodynamic micro-ridges (velvet shagreen, never blocky gravel)
      vec2 dDia = vec2(dg.x + dg.y, dg.x - dg.y) * 0.7071;
      float dRij = (0.5 + 0.5 * sin(dDia.x * 3.14159)) * (0.5 + 0.5 * sin(dDia.y * 3.14159));
      dn = mix(dn, dRij, 0.45);
      skH += dlBump * (dn - 0.5) * sBump * 0.00026 * uL;
      alb *= 1.0 + dlAlb * (dn - 0.5) * 0.038;
    } else {
      skH += dlBump * (dn - 0.5) * sBump * 0.00032 * uL;
      alb *= 1.0 + dlAlb * (dn - 0.5) * 0.05;
    }
  }
  skH -= pore * 0.000018 * uL;
  float bodyBumpW = 1.0;
  if (sHeadOn > 0.5 && fIsFin < 0.5) {
    // the dedicated cranial map: one flank of the head at several times the whole-body resolution
    float hu = (s - sHeadU.x) / max(sHeadU.y - sHeadU.x, 1e-4);
    if (hu > 0.001 && hu < 0.999) {
      float hv = vFishUv.y < 0.5 ? vFishUv.y * 2.0 : (1.0 - vFishUv.y) * 2.0; // girth: 0 dorsal midline … 1 ventral
      vec2 huv = vec2(hu, hv);
      vec4 hm = texture2D(sHeadTex, huv);
      float envH = smoothstep(0.0, 0.04, hu) * (1.0 - smoothstep(0.95, 1.0, hu));
      if (sKind < 4.5) bodyBumpW = 1.0 - 0.88 * envH;
      skHeadUv = huv;
      skHeadGrad = (hm.rg * 2.0 - 1.0) * 1.25 * sHeadK * envH;
      skHeadCls = hm.a;
      alb *= 1.0 - (0.5 - hm.b) * 0.44 * envH; // cavity tone: pores, sutures and grooves sit in shadow
      if (sKind > 0.5 && sKind < 3.5 && hm.a < 0.16) {
        // the head wears its own finer edition of the scale lattice where the class map says it is scaled
        vec2 g2 = vec2(s * sN * sHeadScaleK, hN * sRows * sHeadScaleK);
        float g2fw = max(fwidth(g2.x), fwidth(g2.y));
        float lod2 = 1.0 - smoothstep(0.28, 0.82, g2fw);
        vec4 sc2 = fishScales(g2, sKind);
        float hw2 = clamp((0.16 - hm.a) / 0.16, 0.0, 1.0) * envH * lod2;
        skH += hw2 * sc2.x * sBump * 0.034 * uL / (sN * sHeadScaleK);
        alb *= 1.0 - hw2 * (1.0 - smoothstep(0.0, 0.45, sc2.x)) * 0.095;
        alb = mix(alb, sEdge, hw2 * sEdgeA * (1.0 - smoothstep(0.06, 0.4, sc2.x)));
        alb *= 1.0 + hw2 * (sc2.z - 0.5) * 0.065;
      }
    }
  }
  skH += (texture2D(sBumpTex, vFishUv).x - 0.5) * sTexBump * bodyBumpW * uL;
  diffuseColor.rgb = alb;
}
if (fIsFin > 0.5) {
  float u = vFin.x;
  float v = clamp(vFin.y, 0.0, 1.0);
  vec3 skin = diffuseColor.rgb;
  vec3 col = v < 0.5 ? mix(fBase, fMid, smoothstep(0.0, 0.5, v)) : mix(fMid, fTip, smoothstep(0.5, 1.0, v));
  float rx = u * fRays;
  float rid = floor(rx);
  float ray = 0.0;
  if (fRays > 0.5) {
    float rd = abs(fract(rx) - 0.5) * 2.0;
    float ray1 = smoothstep(0.64, 0.95, rd);
    float br = abs(fract(rx * 2.0 + 0.25) - 0.5) * 2.0;
    float ray2 = smoothstep(0.7, 0.96, br) * smoothstep(0.45, 0.75, v) * (1.0 - step(0.45, fIncise));
    ray = max(ray1 * (1.0 - 0.3 * smoothstep(0.55, 0.9, v)), ray2 * 0.75);
    float joints = 0.88 + 0.12 * smoothstep(0.2, 0.8, abs(sin(v * 46.0 + fHash(vec2(rid, 3.0)) * 6.0)));
    if (fPattern > 0.5) {
      float pat = 0.0;
      if (fPattern < 2.5) {
        vec2 g = vec2(u * fSpots * 2.2, v * fSpots);
        g += (vec2(fNoise(g * 0.8), fNoise(g * 0.8 + 13.7)) - 0.5) * 0.22;
        vec2 id = floor(g); vec2 f = fract(g) - 0.5;
        float h = fHash(id);
        vec2 o = (vec2(fHash(id + 3.1), fHash(id + 7.7)) - 0.5) * 0.55;
        float dd = length(f + o) * (0.94 + 0.12 * fNoise(g * 4.0));
        float rr = 0.12 + 0.16 * h;
        pat = (1.0 - smoothstep(rr - 0.05, rr + 0.03, dd)) * step(0.28, h);
        if (fPattern > 1.5) pat *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, rr * 0.45, dd));
      } else if (fPatte