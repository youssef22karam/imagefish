rn < 3.5) {
        float band = v * fSpots + 0.04 * sin(u * 16.0) + 0.08 * (fNoise(vec2(u * 11.0, v * 8.0)) - 0.5);
        pat = 1.0 - smoothstep(0.08, 0.18, abs(fract(band) - 0.5));
      } else if (fPattern < 4.5) {
        vec2 g = vec2(u * fSpots * 2.0, v * fSpots);
        vec2 id = floor(g); vec2 f = fract(g);
        float f1 = 9.0, f2 = 9.0;
        for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) {
          vec2 o = vec2(float(xx), float(yy));
          float dd = length(o + vec2(fHash(id + o), fHash(id + o + 5.3)) * 0.85 - f);
          if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) { f2 = dd; }
        }
        pat = 1.0 - smoothstep(0.04, 0.12, f2 - f1);
      } else {
        float along = fract(v * fSpots + fHash(vec2(rid, 1.0)));
        pat = (1.0 - smoothstep(0.16, 0.3, abs(along - 0.5))) * smoothstep(0.3, 0.8, rd);
      }
      col = mix(col, fSpotCol, clamp(pat, 0.0, 1.0) * 0.92);
    }
    // Fin rays are collagenous ribs under a thin translucent membrane, not alternating dark painted stripes.
    col *= 1.0 + (fNoise(vec2(u * 118.0, v * 155.0)) - 0.5) * 0.075;
    for (int i = 0; i < 3; i++) {
      vec4 m = fMark[i];
      if (m.y > m.x) {
        float zone = smoothstep(m.x - 0.014, m.x + 0.008, v) * (1.0 - smoothstep(m.y - 0.008, m.y + 0.014, v));
        zone *= smoothstep(m.z - 0.025, m.z + 0.01, u) * (1.0 - smoothstep(m.w - 0.01, m.w + 0.025, u));
        col = mix(col, fMarkCol[i], zone * 0.95);
      }
    }
    col = mix(col, col * joints * 0.84, ray * 0.38);
    float jag = fHash(vec2(rid, 11.0));
    float jag2 = fHash(vec2(rid, 23.0));
    float effInc = max(fIncise, 0.03 + fFray * 0.08);
    float notch = effInc * (1.0 - ray1 * 0.9) * (0.6 + 0.8 * jag2) + fFray * 0.14 * jag * jag;
    if (v > 1.0 - notch * (0.45 + 0.55 * abs(sin(rx * 3.14159)))) discard;
  } else {
    col *= 0.95 + 0.05 * fNoise(vec2(u * 92.0 + 3.0, v * 140.0));
  }
  float edgeM = smoothstep(1.0 - fEdgeW, 1.0 - fEdgeW * 0.35, v) * step(0.001, fEdgeW);
  col = mix(col, fEdge, edgeM);
  float root = fRoot > 0.001 ? 1.0 - smoothstep(0.0, fRoot, v) : 0.0;
  root = pow(root, 0.85);
  col = mix(col, skin, root);
  float ocelM = 0.0;
  if (fOcel.w > 0.5) {
    vec2 do2 = vec2((u - fOcel.x) * 1.45, v - fOcel.y);
    float od = length(do2) / max(fOcel.z, 0.01);
    float halo = (1.0 - smoothstep(0.86, 1.24, od)) * smoothstep(0.55, 0.82, od);
    float core = 1.0 - smoothstep(0.68, 0.88, od);
    col = mix(col, fOcelRing, halo * 0.92);
    col = mix(col, fOcelCol * (1.0 - 0.18 * ray), core * 0.97);
    ocelM = clamp(halo + core, 0.0, 1.0);
  }
  skH *= root; skBody *= root;
  diffuseColor.rgb = col;
  float a = fRays > 0.5 ? mix(fMembrane, min(1.0, fMembrane + 0.4), ray * 0.9) : fMembrane;
  a = mix(a, 1.0, max(max(root, ocelM * 0.85), (1.0 - smoothstep(0.0, 0.1, v)) * 0.6));
  a = mix(a, 1.0, edgeM * 0.6);
  if (fRays > 0.5) a *= 1.0 - smoothstep(0.95, 1.0, v) * 0.35;
  a = clamp(a, 0.0, 1.0);
  if (a < 0.999) a = 1.0 - sqrt(1.0 - a); // two-layer membrane
  diffuseColor.a *= a;
  finGlow = col * 0.07 * (1.0 - a);
}
if (fIsGlass > 0.5 && eGeo.x > 0.02 && acos(clamp(vEyeO.z, -1.0, 1.0)) > eGeo.x * 1.015) discard;
if (fIsEye > 0.5 && abs(vEye.w) > 0.5) {
  // The eye as it is built: q = coordinates fixed to the GLOBE (|q| = 1 at the limbus) – pigment turns with
  // the eye; vEyeO = direction in the fixed ORBIT – lid shadow, adipose eyelid and socket boundary stay fixed.
  float thF = acos(clamp(vEyeO.z, -1.0, 1.0));
  if (thF > eGeo.x * 1.095) discard;
  vec2 q = vEye.xy;
  float rho = length(q);
  vec2 dir = q / max(rho, 1e-4);
  float rim = thF / max(eGeo.x, 0.05);
  vec2 fx = vEyeO.xy / max(sin(eGeo.x), 0.05);
  float lid = smoothstep(0.7, 1.02, rim);
  // pupil outline (signed distance, negative inside)
  float rp = eParm.y * mix(1.0, 1.32, uPupil);
  float pk = eParm.x, pd;
  if (pk < 0.5) pd = rho - rp;
  else if (pk < 1.5) pd = rho - rp * (1.0 + 0.2 * smoothstep(0.1, 1.0, dir.x));          // rostral aphakic space
  else if (pk < 2.5) { vec2 e2 = vec2(rp * mix(0.3, 1.0, uPupil), rp * 1.25); pd = (length(q / e2) - 1.0) * e2.x; }
  else if (pk < 3.5) { vec2 e2 = vec2(rp * 1.22, rp * mix(0.64, 0.9, uPupil)); pd = (length(q / e2) - 1.0) * e2.y; }
  else {
    // crescent: the operculum pupillare hangs into the pupil from above, its edge scalloped
    vec2 e2 = vec2(rp * 1.3, rp * 0.95);
    float el = (length(q / e2) - 1.0) * e2.y;
    float lobe = (length((q - vec2(0.0, rp * 0.8)) / vec2(rp * 0.95, rp * mix(1.3, 0.9, uPupil))) - 1.0) * rp + 0.07 * rp * cos(q.x / rp * 10.0);
    pd = max(el, -lobe);
  }
  float t = clamp((rho - rp) / max(1.0 - rp, 0.1), 0.0, 1.0);
  // argentea: a guanine mirror, faintly striated, clouded by chromatophores
  vec2 sd = dir + eGeo.z;
  float fib = fNoise(sd * 15.0 + t * 1.7) * 0.5 + fNoise(sd * 44.0 + 5.2 + t * 3.1) * 0.3 + fNoise(sd * 97.0 + 9.7 + t * 5.0) * 0.2;
  float mott = fNoise(q * 4.6 + eGeo.z * 3.0 + 7.3) * 0.6 + fNoise(q * 10.5 + 2.1) * 0.4;
  // melanophores: discrete pigment cells, crowded on the dorsal half and toward the limbus
  vec2 cg = q * 27.0 + eGeo.z;
  vec2 ci = floor(cg), cf = fract(cg) - 0.5;
  float ch = fHash(ci);
  vec2 co = (vec2(fHash(ci + 2.3), fHash(ci + 8.1)) - 0.5) * 0.7;
  float clod = 1.0 - smoothstep(0.3, 0.9, max(fwidth(cg.x), fwidth(cg.y)));
  float dens = clamp(0.2 + 1.3 * eGeo.w * smoothstep(-0.3, 0.9, q.y) + 0.3 * smoothstep(0.55, 1.0, t) + (mott - 0.5) * 0.8, 0.0, 0.96);
  float mel = (1.0 - smoothstep(0.14, 0.36 + 0.12 * ch, length(cf - co))) * step(1.0 - dens, ch);
  // guanine platelets: tiny mirrors, each tilted a little differently
  vec2 pg = q * 85.0 + eGeo.z * 2.0;
  float plod = 1.0 - smoothstep(0.3, 0.9, max(fwidth(pg.x), fwidth(pg.y)));
  float plate = fHash(floor(pg));
  float ang = atan(q.y, q.x);
  float radStroma = 0.5 + 0.5 * sin(ang * 42.0 + fib * 4.2);
  vec3 iris = mix(eIris2, eIris, smoothstep(0.04, 0.36, t));
  iris *= 0.64 + 0.18 * fib + 0.09 * radStroma * (1.0 - 0.5 * t) + 0.38 * (mott - 0.5);
  iris *= 1.0 + plod * (plate - 0.5) * 0.34;
  iris += eIris2 * 0.26 * plod * step(0.9, plate) * (1.0 - smoothstep(0.5, 1.0, t));
  iris = mix(iris, iris * 0.16, mel * clod * 0.85);
  iris *= 1.0 - (1.0 - clod) * dens * 0.22;
  iris *= 1.0 - eGeo.w * 0.88 * smoothstep(-0.05, 0.95, q.y);               // dorsal pigment cap
  iris = mix(iris, iris * 0.24, smoothstep(0.80, 1.0, rho));                // limbal ring
  float irisBright = smoothstep(0.04, 0.18, dot(eIris, vec3(0.2126, 0.7152, 0.0722)));
  float ring = exp(-pow((pd - 0.035) / 0.028, 2.0));
  iris = mix(iris, eIris2 * (1.1 + 0.2 * irisBright) + 0.025 * irisBright, ring * (0.32 + 0.42 * irisBright)); // pupillary sphincter margin
  float beyond = smoothstep(0.98, 1.07, rho);
  vec3 col = mix(iris, eGlobe * (0.75 + 0.5 * mott), beyond);               // pigmented globe beside the iris
  float veil = eGeo.y * smoothstep(0.3, 0.62, abs(fx.x) + 0.12 * fx.y * fx.y);
  float pe = smoothstep(-0.014, 0.016, pd);
  vec3 lens = ePupil + vec3(0.004, 0.012, 0.02) * (1.0 - smoothstep(0.0, rp, rho));
  col = mix(lens, col, pe);
  col = mix(col, vec3(0.6, 0.64, 0.62) * (0.8 + 0.3 * mott), veil * 0.5);   // adipose eyelid: milky fat over the eye, open over the pupil
  col *= 1.0 - 0.8 * lid * lid;                                             // contact shadow under the orbit margin
  col *= 1.0 - 0.25 * smoothstep(0.2, 1.0, fx.y);                           // overhang of the upper orbit
  diffuseColor.rgb = col;
  float isIris = pe * (1.0 - beyond);
  eyeMetal = isIris * eParm.w * (1.0 - 0.7 * mel * clod) * (1.0 - 0.6 * lid) * (1.0 - 0.6 * veil);
  eyeRough = mix(0.05, 0.22 + 0.14 * fib + 0.2 * plod * (plate - 0.5), pe) + veil * 0.3;
  eyeShine = eParm.z * (1.0 - pe) * (1.0 - veil);
  eyePup = 1.0 - pe;
}
if (fIsGill > 0.5) {
  // inside the gill chamber. vEye = (filament coordinate, base → tip, part)
  float gb = vEye.y, part = vEye.z;
  float occ = mix(0.34, 1.0, smoothstep(0.0, 0.9, uBreath));                // a closed chamber is dark
  vec3 gcol;
  if (part < 1.5) {
    // one hemibranch: bony arch with rakers at the base, then a comb of blood-red filaments
    float fxi = vEye.x, id = floor(fxi), fr = fract(fxi);
    float hsh = fHash(vec2(id, floor(part * 31.0)));
    if (gb > 0.9 + 0.1 * hsh) discard;                                      // uneven filament tips
    float lod = 1.0 - smoothstep(0.35, 1.0, fwidth(fxi));
    float gap = smoothstep(0.0, 0.2, fr) * (1.0 - smoothstep(0.8, 1.0, fr));
    float arch = 1.0 - smoothstep(0.08, 0.15, gb);
    vec3 red = mix(vec3(0.78, 0.05, 0.06), vec3(0.56, 0.02, 0.04), smoothstep(0.15, 1.0, gb));
    red *= (0.78 + 0.44 * hsh) * mix(1.0, 0.22 + 0.78 * gap, lod);
    red *= 1.0 - 0.2 * lod * (0.5 + 0.5 * sin(gb * 240.0 + id * 1.7));      // secondary lamellae
    float rake = 0.75 + 0.25 * smoothstep(0.2, 0.5, abs(fract(fxi * 0.5) - 0.5) * 2.0);
    gcol = mix(red, vec3(0.86, 0.72, 0.66) * rake, arch);
    gcol *= mix(1.0, 0.6, part) * (0.45 + 0.55 * smoothstep(0.05, 0.8, gb)); // deeper arches and bases lie in shadow
    finGlow = red * 0.22 * occ * (1.0 - arch);                               // thin blood-filled tissue glows through
  } else {
    // chamber lining / inside of the cover: pale membrane at the margin → dark vascular tissue inside
    vec3 lin = mix(vec3(0.72, 0.4, 0.38), vec3(0.2, 0.012, 0.02), smoothstep(0.0, 0.75, gb));
    lin = mix(lin, vec3(0.03, 0.0, 0.004), smoothstep(0.55, 1.0, gb));
    gcol = lin * (0.85 + 0.3 * fNoise(vec2(vEye.x * 0.6, gb * 16.0)));
  }
  diffuseColor.rgb = gcol * occ;
  eyeMetal = 0.0; eyeRough = 0.3;
}
`;
const FRAG_PBR = /* glsl */ `
if (eyeMetal >= 0.0) { metalnessFactor = eyeMetal; roughnessFactor = eyeRough; }
if (fIsSkin > 0.5) {
  // guanine: flanks and belly are mirrors, the pigmented back is matt; each scale reflects a little differently
  float flank = smoothstep(0.14, 0.5, skHN);
  float redPigment = smoothstep(0.045, 0.24, diffuseColor.r - diffuseColor.g) * (1.0 - smoothstep(0.14, 0.48, diffuseColor.b));
  metalnessFactor = clamp(metalnessFactor * mix(0.5, 1.1, flank) * (1.0 - 0.6 * redPigment) * (1.0 + skBody * (skHash.x - 0.5) * 0.26), 0.0, 1.0);
  roughnessFactor = clamp(roughnessFactor + skBody * ((skHash.y - 0.5) * 0.08 + skCrease * 0.06) + 0.045 * redPigment, 0.08, 1.0);
  if (skHeadUv.x >= 0.0) {
    // cranial integument classes: dermal bone under its thin skin is a little smoother and more specular
    float bone = 1.0 - smoothstep(0.05, 0.18, abs(skHeadCls - 0.25));
    roughnessFactor = clamp(roughnessFactor - bone * 0.09, 0.08, 1.0);
    metalnessFactor = clamp(metalnessFactor + bone * 0.05, 0.0, 1.0);
  }
}
`;
const FRAG_EMIT = /* glsl */ `
totalEmissiveRadiance += finGlow;
// tapetum lucidum: light returned through the pupil toward the observer
if (eyeShine > 0.0) totalEmissiveRadiance += eShineC * eyeShine * 0.55 * pow(max(dot(normal, normalize(vViewPosition)), 0.0), 5.0);
if (uCaustic > 0.0 && fIsGlass < 0.5 && fIsGill < 0.5) {
  vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  float cUp = smoothstep(-0.25, 0.7, nW.y);
  float ca = fishCaustic(vFishWorld.xz * 0.5 + vec2(vFishWorld.y * 0.1, 0.0), uClock * 0.65);
  totalEmissiveRadiance += diffuseColor.rgb * (uCaustic * cUp * ca) * (1.0 - 0.45 * metalnessFactor);
}
`;
const FRAG_IRID = /* glsl */ `
#ifdef USE_IRIDESCENCE
if (fIsSkin > 0.5) material.iridescenceThickness = clamp(material.iridescenceThickness * (0.8 + 0.45 * skMot) + skBody * (skHash.x - 0.5) * 90.0, 100.0, 900.0);
#endif
// the pupil is a hole onto the lens: almost no surface reflection of its own (the cornea above carries the highlights)
if (fIsEye > 0.5) material.specularColor *= 1.0 - 0.85 * eyePup;
`;
const FRAG_GLASS = /* glsl */ `
// under water the cornea hardly reflects at its rim (no bright bubble outline) – keep the facing glints
if (fIsGlass > 0.5) outgoingLight *= mix(0.12, 1.0, smoothstep(0.1, 0.55, abs(dot(normal, normalize(vViewPosition)))));
if (fIsGlass > 0.5) diffuseColor.a = clamp(max(diffuseColor.a, dot(outgoingLight, vec3(0.3, 0.5, 0.2)) * 1.3), 0.0, 1.0);
`;
const FRAG_MAP = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, fIsSkin > 0.5 ? fishWarp( vMapUv ) : vMapUv );
  fMapP = sampledDiffuseColor.rgb;
  diffuseColor *= sampledDiffuseColor;
#endif
`;
// Materialisation: the specimen is woven out of light from its centre outward along a noisy front with a glowing seam.
const FRAG_REVEAL = /* glsl */ `
if (uReveal < 0.999) {
  vec3 rq = vFishWorld - uRevealC;
  float rn = fNoise(rq.xy * 7.0 + rq.z * 2.3) * 0.62 + fNoise(rq.zy * 19.0 + 4.1) * 0.38;
  float front = uReveal * 1.45 - length(rq) / max(uRevealR, 1e-3) - rn * 0.34;
  if (front < 0.0) discard;
  float seam = 1.0 - smoothstep(0.0, 0.09, front);
  totalEmissiveRadiance += uRevealCol * seam * 3.4 + uRevealCol * 0.35 * (1.0 - smoothstep(0.0, 0.5, front)) * (1.0 - uReveal);
}
`;
const black = new THREE.Color(0, 0, 0);
/** Patch a standard/physical material with the fish deformation + integument pipeline */
export function patchMaterial(
  mat: THREE.Material, u: FishUniforms, fin?: FinLook,
  opt: { joint?: Joint; eye?: EyeLook; skin?: SkinLook; glass?: boolean; glassAp?: number; gill?: boolean; turn?: EyeTurn; cutSockets?: boolean } = {},
) {
  const j = opt.joint, e = opt.eye, k = opt.skin, tr = opt.turn;
  const hand = tr ? (new THREE.Vector3().crossVectors(tr.ax, tr.ay).dot(tr.az) >= 0 ? 1 : -1) : 1;
  const fu = {
    fRays: { value: fin?.rays ?? 0 },
    fIncise: { value: fin?.incise ?? 0 },
    fMembrane: { value: fin?.membrane ?? 1 },
    fEdgeW: { value: fin?.edgeW ?? 0 },
    fSpots: { value: fin?.spots ?? 0 },
    fFray: { value: fin?.fray ?? 0 },
    fPattern: { value: fin?.pattern ?? 0 },
    fRoot: { value: fin?.root ?? 0 },
    fOcel: { value: fin?.ocel ?? new THREE.Vector4(0, 0, 0, 0) },
    fOcelCol: { value: fin?.ocelCol ?? black },
    fOcelRing: { value: fin?.ocelRing ?? black },
    fIsFin: { value: fin ? 1 : 0 },
    fIsEye: { value: e ? 1 : 0 },
    fIsGlass: { value: opt.glass ? 1 : 0 },
    fBase: { value: fin?.base ?? black },
    fMid: { value: fin?.mid ?? black },
    fTip: { value: fin?.tip ?? black },
    fEdge: { value: fin?.edge ?? e?.globe ?? black },
    fSpotCol: { value: fin?.spotCol ?? black },
    fMark: { value: Array.from({ length: 3 }, (_, i) => fin?.marks[i]?.range ?? new THREE.Vector4(0, 0, 0, 1)) },
    fMarkCol: { value: Array.from({ length: 3 }, (_, i) => fin?.marks[i]?.color ?? black) },
    eIris: { value: e?.iris ?? black },
    eIris2: { value: e?.iris2 ?? black },
    ePupil: { value: e?.pupil ?? black },
    eGlobe: { value: e?.globe ?? black },
    eParm: { value: e?.parm ?? new THREE.Vector4(0, 0.4, 0, 0.5) },
    eGeo: { value: e?.geo ?? new THREE.Vector4(opt.glassAp ?? 0, 0, 0, 0.4) },
    eShineC: { value: e?.shine ?? black },
    fIsGill: { value: opt.gill ? 1 : 0 },
    eC: { value: tr?.c ?? new THREE.Vector3() },
    eAx: { value: tr?.ax ?? new THREE.Vector3(1, 0, 0) },
    eAy: { value: tr?.ay ?? new THREE.Vector3(0, 1, 0) },
    eAz: { value: tr?.az ?? new THREE.Vector3(0, 0, 1) },
    eRot: { value: new THREE.Vector3(tr ? 1 : 0, tr?.gain ?? 0, hand) },
    fIsSkin: { value: k ? 1 : 0 },
    sN: { value: k?.n ?? 40 },
    sRows: { value: k?.rows ?? 12 },
    sKind: { value: k?.kind ?? 0 },
    sBump: { value: k?.bump ?? 0 },
    sHead0: { value: k?.head0 ?? 0.2 },
    sHead1: { value: k?.head1 ?? 0.3 },
    sEdge: { value: k?.edge ?? black },
    sEdgeA: { value: k?.edgeA ?? 0 },
    sSilver: { value: k?.silver ?? 0 },
    sSpeck: { value: k?.speck ?? 0 },
    sMottle: { value: k?.mottle ?? 0 },
    sAspect: { value: k?.aspect ?? 0.3 },
    sGirthA: { value: k?.girth ?? new Array(16).fill(k?.aspect ?? 0.3) },
    sTexBump: { value: k?.texBump ?? 0 },
    sBumpTex: { value: k?.bumpTex ?? null },
    sHeadOn: { value: k?.headMap ? 1 : 0 },
    sHeadTex: { value: k?.headMap ?? null },
    sHeadU: { value: new THREE.Vector2(k?.headU0 ?? 0, k?.headU1 ?? 0) },
    sHeadK: { value: k?.headK ?? new THREE.Vector2(1, 1) },
    sHeadScaleK: { value: k?.headScaleK ?? 1.6 },
    jKind: { value: j?.kind ?? 0 },
    jP: { value: j?.pivot ?? new THREE.Vector3() },
    jA: { value: (j?.axis ?? new THREE.Vector3(0, 1, 0)).clone().normalize() },
    jB: { value: (j?.axis2 ?? new THREE.Vector3(1, 0, 0)).clone().normalize() },
    jAmp: { value: j?.amp ?? 0 },
    jAmp2: { value: j?.amp2 ?? 0 },
    jFreq: { value: j?.freq ?? 5 },
    jPh: { value: j?.phase ?? 0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, fu);
    const cut = opt.cutSockets ? '#define FISH_SOCKET_CUT\n' : '';
    shader.vertexShader = cut + VERT_HEAD + shader.vertexShader
      .replace('#include <beginnormal_vertex>', VERT_DEFORM)
      .replace('#include <begin_vertex>', 'vec3 transformed = fishP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFishWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = cut + FRAG_HEAD + shader.fragmentShader
      .replace('#include <map_fragment>', FRAG_MAP)
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n' + FRAG_MAIN)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + FRAG_PBR)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (fIsSkin > 0.5) { normal = fishBump(-vViewPosition, normal, skH); normal = fishHeadNormal(-vViewPosition, normal); }')
      .replace('#include <clearcoat_normal_fragment_maps>', '#include <clearcoat_normal_fragment_maps>\n#ifdef USE_CLEARCOAT\nif (fIsSkin > 0.5) clearcoatNormal = normalize(mix(clearcoatNormal, normal, 0.6));\n#endif')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + FRAG_EMIT + FRAG_REVEAL)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n' + FRAG_IRID)
      .replace('#include <opaque_fragment>', FRAG_GLASS + '#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => opt.cutSockets ? 'fish-v20-socket' : 'fish-v20';
  return mat;
}
/** make sure a geometry carries the custom attributes */
export function ensureAttrs(g: THREE.BufferGeometry, jaw = 0, flap = 0, side = 0) {
  const n = g.getAttribute('position').count;
  if (!g.getAttribute('aJaw')) g.setAttribute('aJaw', new THREE.BufferAttribute(new Float32Array(n).fill(jaw), 1));
  if (!g.getAttribute('aFlap')) g.setAttribute('aFlap', new THREE.BufferAttribute(new Float32Array(n).fill(flap), 1));
  if (!g.getAttribute('aSide')) g.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(n).fill(side), 1));
  if (!g.getAttribute('aGill')) g.setAttribute('aGill', new THREE.BufferAttribute(new Float32Array(n), 1));
  if (!g.getAttribute('aPlastic')) g.setAttribute('aPlastic', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (!g.getAttribute('aFin')) g.setAttribute('aFin', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (!g.getAttribute('aEye')) g.setAttribute('aEye', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (!g.getAttribute('aAnc')) g.setAttribute('aAnc', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (!g.getAttribute('aAncPl')) g.setAttribute('aAncPl', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (!g.getAttribute('aAncW')) g.setAttribute('aAncW', new THREE.BufferAttribute(new Float32Array(n), 1));
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
