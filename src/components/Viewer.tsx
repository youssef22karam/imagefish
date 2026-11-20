import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildFish, type FishBuild } from '../engine/build';
import type { Ambience } from '../gen/habitats';
import type { Species } from '../engine/types';
import { clamp, DEG } from '../engine/math';
import { BodyModel } from '../engine/model';
import Thumb from './Thumb';
export type ViewName = 'side' | 'front' | 'top' | 'three' | 'below' | 'portrait';
export type CameraAction = { kind: 'in' | 'out' | 'fit'; nonce: number };
interface Props {
  species: Species;
  seed: number;
  gape: number; // 0..1 manual
  autoFeed: boolean;
  swim: boolean;
  speed: number;
  view: ViewName;
  viewNonce: number;
  cameraAction?: CameraAction;
  strike: number;
  wire: boolean;
  fins: boolean; // articulated fin motion
  eyes: boolean; // saccadic eye movement
  breathe: boolean; // respiration: mouth + gill-cover pump
  amb?: Ambience; // habitat ambience: backdrop, fog, light rig, marine snow
  magic?: { color: string; nonce: number; power: number }; // discovery tier: colour and strength of the materialisation
  onBuilt?: (maxJaw: number) => void; // fired after the fish is (re)built and framed
}
/**
 * The light field of open water, used for image-based lighting: Snell's window (the bright disc of sky
 * straight overhead), sun glitter inside it, blue scattered light around the horizon, darkness below.
 * A silvery flank mirrors exactly this – bright above, deep blue below – which is why real fishes look
 * the way they do; a studio "room" environment makes them look like chrome ornaments.
 */
function underwaterEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 48, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 deep = vec3(0.010, 0.035, 0.055), mid = vec3(0.085, 0.24, 0.33), surf = vec3(0.34, 0.66, 0.78);
        vec3 col = mix(deep, mid, smoothstep(-0.85, 0.08, y));
        col = mix(col, surf, smoothstep(0.02, 0.72, y));
        col += vec3(1.0, 0.98, 0.92) * smoothstep(0.66, 0.92, y) * 2.4;                                   // Snell's window
        col += vec3(1.0, 0.94, 0.8) * pow(max(dot(d, normalize(vec3(0.3, 0.9, 0.3))), 0.0), 70.0) * 16.0;  // sun
        col += vec3(0.40, 0.56, 0.62) * pow(max(dot(d, normalize(vec3(0.35, 0.25, 0.9))), 0.0), 2.5);      // lit water column (key side)
        col += vec3(0.10, 0.20, 0.26) * pow(max(dot(d, normalize(vec3(-0.6, 0.1, -0.75))), 0.0), 2.0);     // back scatter
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, 0.02).texture;
  pm.dispose(); geo.dispose(); mat.dispose();
  return tex;
}
/** Habitat ambience → the scene's backdrop gradient, fog, exposure, light rig and marine snow. */
function applyAmb(s: {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene;
  hemi: THREE.HemisphereLight; key: THREE.DirectionalLight; fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight; under: THREE.DirectionalLight; snow: THREE.Points;
}, amb: Ambience) {
  s.scene.fog = new THREE.FogExp2(amb.fog, amb.fogD);
  s.renderer.toneMappingExposure = amb.exposure;
  s.scene.environmentIntensity = amb.envI;
  s.hemi.color.set(amb.hemi[0]);
  s.hemi.groundColor.set(amb.hemi[1]);
  s.hemi.intensity = amb.hemi[2];
  s.key.color.set(amb.key[0]);
  s.key.intensity = amb.key[1];
  s.fill.color.set(amb.fill[0]);
  s.fill.intensity = amb.fill[1];
  s.rim.color.set(amb.rim[0]);
  s.rim.intensity = amb.rim[1];
  s.under.color.set(amb.under[0]);
  s.under.intensity = amb.under[1];
  const sm = s.snow.material as THREE.PointsMaterial;
  sm.color.set(amb.snow[0]);
  sm.opacity = amb.snow[1];
  sm.size = amb.snow[2];
  sm.blending = amb.glow > 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
  sm.needsUpdate = true;
}
export default function Viewer(p: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const st = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls;
    fish?: FishBuild; holder: THREE.Group; props: Props; t: number; feedT: number; shadow: THREE.Mesh;
    jaw: number; manualStrike: number; ft: number; sac: number; gz: number[]; tg: number[]; clock: number; bt: number; flare: number;
    hemi: THREE.HemisphereLight; key: THREE.DirectionalLight; fill: THREE.DirectionalLight;
    rim: THREE.DirectionalLight; under: THREE.DirectionalLight; snow: THREE.Points;
  } | null>(null);
  const ambApplied = useRef<Ambience | undefined>(undefined);
  // one-time scene setup
  // ── discovery magic: a swarm of light converges onto the new body while the skin materialises ──
  const mg = useRef<{ t: number; t0: number; dur: number; c: THREE.Vector3; tmp: THREE.Vector3; pts?: THREE.Points }>({ t: 99, t0: 0, dur: 1.5, c: new THREE.Vector3(), tmp: new THREE.Vector3() });
  const conjure = (fish: FishBuild, magic: Props['magic'], px: number) => {
    const m = mg.current;
    if (m.pts) { m.pts.parent?.remove(m.pts); m.pts.geometry.dispose(); (m.pts.material as THREE.Material).dispose(); m.pts = undefined; }
    if (new URLSearchParams(location.search).has('shot')) return; // deterministic stills
    const power = magic?.power ?? 0.3, col = new THREE.Color(magic?.color ?? '#8fe3d6');
    const box = new THREE.Box3().setFromObject(fish.group);
    m.c.copy(fish.group.worldToLocal(box.getCenter(new THREE.Vector3())));
    m.t = 0; m.t0 = performance.now(); m.dur = 1.25 + 0.45 * power; // wall-clock: completes on time even at low frame rates
    const u = fish.uniforms;
    u.uReveal.value = 0; u.uRevealCol.value.copy(col); u.uRevealR.value = fish.radius * 1.08;
    const pool: number[] = [];
    for (const o of fish.group.children) {
      const me = o as THREE.Mesh;
      const P = me.isMesh ? me.geometry.getAttribute('position') : undefined;
      if (!P) continue;
      const step = Math.max(1, Math.floor(P.count / 360));
      for (let i = 0; i < P.count; i += step) { const x = P.getX(i) + me.position.x, y = P.getY(i) + me.position.y, z = P.getZ(i) + me.position.z; if (Number.isFinite(x + y + z)) pool.push(x, y, z); }
    }
    if (pool.length < 3) return;
    const N = Math.round(520 + 1100 * power), R = fish.radius;
    const end = new Float32Array(N * 3), start = new Float32Array(N * 3), delay = new Float32Array(N), size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const j = Math.floor(Math.random() * (pool.length / 3)) * 3;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), rr = R * (1.3 + Math.random() * 1.9);
      end.set([pool[j], pool[j + 1], pool[j + 2]], i * 3);
      start.set([pool[j] + rr * Math.sin(ph) * Math.cos(th), pool[j + 1] + rr * Math.cos(ph) * 0.8, pool[j + 2] + rr * Math.sin(ph) * Math.sin(th)], i * 3);
      delay[i] = Math.random() * 0.6; size[i] = 0.5 + Math.random() * Math.random() * 2.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(end, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uCol: { value: col }, uPx: { value: px }, uR: { value: R } },
      vertexShader: `attribute vec3 aStart; attribute float aDelay; attribute float aSize; uniform float uT, uPx, uR; varying float vA;
        void main() {
          float t = clamp((uT - aDelay) / 1.05, 0.0, 1.0), e = 1.0 - pow(1.0 - t, 3.0);
          vec3 p = mix(aStart, position, e);
          float ang = (1.0 - e) * (2.2 + aDelay * 3.0);
          float c = cos(ang), s = sin(ang);
          p.xz = mix(mat2(c, -s, s, c) * p.xz, p.xz, e);
          p.y += sin(uT * 3.0 + aDelay * 20.0) * 0.04 * uR * (1.0 - e);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(1.0, 2.1, uT - aDelay)) * (0.55 + 0.45 * sin(uT * 9.0 + aDelay * 40.0));
          gl_PointSize = aSize * uPx * (30.0 / max(0.3, -mv.z)) * (1.0 + (1.0 - e) * 0.8);
        }`,
      fragmentShader: `uniform vec3 uCol; varying float vA;
        void main() { float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r); a *= a; gl_FragColor = vec4(uCol * 1.5 + vec3(0.55) * a, a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 10;
    fish.group.add(pts);
    m.pts = pts;
  };
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setUnavailable(true);
      return;
    }
    renderer.setClearColor(0x06131f, 0);
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D fish specimen');
    renderer.domElement.setAttribute('role', 'img');
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
    // Neutral preserves carotenoid reds and oranges; ACES desaturates them to chalky yellow under bright water lighting.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.93;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#0a2c40', 0.04);
    const env = underwaterEnvironment(renderer);
    scene.environment = env;
    scene.environmentIntensity = 0.72;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
    camera.position.set(0, 0.2, 6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // sun through the surface, soft cool fill from the lit water, rim from behind, bounce from below
    const hemi = new THREE.HemisphereLight('#dceef5', '#18343c', 0.8);
    scene.add(hemi);
    const key = new THREE.DirectionalLight('#fff7ea', 1.45);
    key.position.set(2.5, 6, 3.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#b6d6e6', 0.6);
    fill.position.set(-3, 1.2, 4.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#95c5e0', 0.8);
    rim.position.set(-4, 2, -5);
    scene.add(rim);
    const under = new THREE.DirectionalLight('#73a2ae', 0.32);
    under.position.set(0, -5, 2);
    scene.add(under);
    // marine snow
    const N = 900;
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pts.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 16], i * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const snow = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#a8d8f0', size: 0.016, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(snow);
    // soft contact shadow / sea floor glow
    const sc = document.createElement('canvas');
    sc.width = sc.height = 256;
    const g = sc.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);
    const holder = new THREE.Group();
    scene.add(holder);
    const s: NonNullable<typeof st.current> = {
      renderer, scene, camera, controls, holder, props: p, t: 0, feedT: 1.42, shadow, fish: undefined,
      jaw: 0, manualStrike: Infinity,
      ft: 0, sac: 0, gz: [0.15, 0, 0.15, 0], tg: [0.15, 0, 0.15, 0], clock: 0, bt: 0, flare: 0,
      hemi, key, fill, rim, under, snow,
    };
    st.current = s;
    const resize = () => {
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (s.fish) frame(camera, controls, s.props.view, s.fish);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    let last = performance.now();
    let raf = 0;
    // ?shot=N renders N frames then idles (deterministic stills for documentation / testing)
    const qs = new URLSearchParams(location.search);
    const shotN = +(qs.get('shot') ?? 0);
    const causticK = qs.has('caustic') ? +qs.get('caustic')! : 0.26;
    // ?breath=0..1.5 holds the gill covers at a fixed opening, ?gaze=yaw,pitch (rad) holds the eyes (stills)
    const breathQ = qs.has('breath') ? +qs.get('breath')! : -1;
    const gazeQ = qs.has('gaze') ? qs.get('gaze')!.split(',').map(Number) : null;
    const sm = (x: number) => x * x * (3 - 2 * x);
    let frames = 0;
    const loop = () => {
      if (!shotN || frames + 1 < shotN) raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const P = s.props;
      const f = s.fish;
      if (P.swim) s.t += dt * P.speed;
      s.clock += dt;
      const mgc = mg.current;
      if (f && mgc.t < 5) {
        mgc.t = (performance.now() - mgc.t0) / 1000;
        const k = clamp((mgc.t - 0.32) / mgc.dur);
        f.uniforms.uReveal.value = k >= 1 ? 1 : 1 - Math.pow(1 - k, 1.8);
        f.uniforms.uRevealC.value.copy(f.group.localToWorld(mgc.tmp.copy(mgc.c)));
        if (mgc.pts) {
          (mgc.pts.material as THREE.ShaderMaterial).uniforms.uT.value = mgc.t;
          if (mgc.t > 3.4) { mgc.pts.parent?.remove(mgc.pts); mgc.pts.geometry.dispose(); (mgc.pts.material as THREE.Material).dispose(); mgc.pts = undefined; }
        }
      }
      if (f) {
        const u = f.uniforms;
        u.uTime.value = s.t;
        u.uClock.value = s.clock;
        u.uCaustic.value = qs.has('caustic') ? causticK : (P.amb?.caustic ?? causticK);
        let g = clamp(P.gape);
        const strikeAt = (cyc: number) => {
          const q = cyc < 0.22 ? cyc / 0.22 : cyc < 0.39 ? 1 : cyc < 1.12 ? 1 - (cyc - 0.39) / 0.73 : 0;
          return sm(clamp(q));
        };
        if (P.autoFeed) {
          s.feedT += dt * P.speed;
          g = Math.max(g, strikeAt(s.feedT % 4.5));
        }
        if (s.manualStrike < 1.12) {
          s.manualStrike += dt;
          g = Math.max(g, strikeAt(s.manualStrike));
        }
        // respiration: the buccal pump draws water in through the slightly opened mouth, then the gill
        // covers swing out to expel it (≈ 2/5 of a cycle later). A strike blows the covers wide open.
        const strike = g;
        s.bt += dt * P.speed;
        const ph = s.bt * Math.PI * 2 * 0.9;
        const inhale = P.breathe ? 0.5 + 0.5 * Math.sin(ph) : 0;
        // gill covers: quick abduction, slower elastic return; the depth of each breath wanders a little
        const cyc = ((((ph - 2.1) / (Math.PI * 2)) % 1) + 1) % 1;
        const exhale = P.breathe ? (cyc < 0.36 ? sm(cyc / 0.36) : 1 - sm((cyc - 0.36) / 0.64)) * (0.78 + 0.14 * Math.sin(s.bt * 0.37)) : 0;
        g = Math.max(g, inhale * 0.043);
        s.flare += ((strike > 0.3 ? 1 : 0) - s.flare) * Math.min(1, dt * 7);
        u.uBreath.value = breathQ >= 0 ? breathQ : Math.max(exhale, s.flare * 1.5);
        s.jaw += (g - s.jaw) * (1 - Math.exp(-dt * 31));
        if (shotN) s.jaw = g;
        u.uGape.value = s.jaw * u.uMaxGape.value;
        const body = f.model.bent || !P.swim ? 0 : f.swim.amp;
        const wing = P.swim && P.fins ? f.wing : 0;
        const ease = shotN ? 1 : 1 - Math.exp(-dt * 12);
        u.uAmp.value += (body - u.uAmp.value) * ease;
        u.uWing.value += (wing - u.uWing.value) * ease;
        // articulated fins run on their own clock so they keep sculling while hovering
        if (P.fins) s.ft += dt * P.speed;
        u.uFinT.value = s.ft;
        u.uFinAct.value += ((P.fins ? 1 : 0) - u.uFinAct.value) * Math.min(1, dt * 4);
        // eyes: saccades (fast jumps, independent-ish left/right), converge forward on the prey when striking
        if (P.eyes) {
          s.sac -= dt;
          if (s.sac <= 0) {
            s.sac = 0.6 + Math.random() * 2.2;
            const yaw = -0.3 + Math.random() * 0.8, pitch = (Math.random() - 0.5) * 0.45;
            s.tg = [yaw, pitch, yaw + (Math.random() - 0.5) * 0.3, pitch + (Math.random() - 0.5) * 0.12];
          }
        } else s.tg = [0.15, 0, 0.15, 0];
        if (strike > 0.25) s.tg = [0.45, -0.06, 0.45, -0.06];
        const kk = 1 - Math.exp(-dt * 18);
        for (let i = 0; i < 4; i++) s.gz[i] += (s.tg[i] - s.gz[i]) * kk;
        if (gazeQ) s.gz = [gazeQ[0], gazeQ[1] ?? 0, gazeQ[0], gazeQ[1] ?? 0];
        // fixational drift + tremor: a living eye is never perfectly still
        const dr = P.eyes && !gazeQ ? 1 : 0;
        const gzd = s.gz.map((v, i) => v + dr * (0.018 * Math.sin(s.clock * (0.9 + 0.23 * i) + i * 1.7) + 0.004 * Math.sin(s.clock * 31 + i * 2.3)));
        u.uGazeR.value.set(Math.sin(gzd[0]) * Math.cos(gzd[1]), Math.sin(gzd[1]), Math.cos(gzd[0]) * Math.cos(gzd[1]));
        u.uGazeL.value.set(Math.sin(gzd[2]) * Math.cos(gzd[3]), Math.sin(gzd[3]), Math.cos(gzd[2]) * Math.cos(gzd[3]));
        u.uPupil.value += ((strike > 0.25 ? 0.55 : 0.12) - u.uPupil.value) * Math.min(1, dt * 3);
        const bob = P.swim ? Math.sin(s.t * 0.8) * 0.03 : 0;
        s.holder.position.y = bob;
      }
      snow.position.y = ((s.t * 0.05) % 1) * -0.5;
      snow.rotation.y += dt * 0.01;
      controls.update();
      renderer.render(scene, camera);
      (window as unknown as { __frames: number }).__frames = ++frames;
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      s.fish?.dispose();
      env.dispose();
      pg.dispose();
      snow.material.dispose();
      shadow.geometry.dispose();
      shadow.material.map?.dispose();
      shadow.material.dispose();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      st.current = null;
      ambApplied.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // keep latest props for the loop; apply habitat ambience when it changes
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    s.props = p;
    if (p.amb && p.amb !== ambApplied.current) {
      ambApplied.current = p.amb;
      applyAmb(s, p.amb);
    }
  });
  // rebuild fish on species / seed change
  useEffect(() => {
    const s = st.current;
    if (!s) {
      p.onBuilt?.(new BodyModel(p.species).jawAngle());
      return;
    }
    if (s.fish) {
      s.holder.remove(s.fish.group);
      s.fish.dispose();
    }
    const fish = buildFish(p.species, p.seed);
    s.fish = fish;
    s.jaw = p.gape;
    s.feedT = 1.42;
    s.manualStrike = Infinity;
    s.holder.add(fish.group);
    const r = fish.radius;
    s.shadow.scale.set(r * 2.2, r * 1.2, 1);
    s.shadow.position.y = -r * 0.62 - 0.15;
    frame(s.camera, s.controls, p.view, fish);
    conjure(fish, p.magic, s.renderer.getPixelRatio());
    p.onBuilt?.(fish.model.jawAngle());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.species, p.seed]);
  useEffect(() => {
    const s = st.current;
    if (!s?.fish) return;
    s.fish.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && 'wireframe' in m) m.wireframe = p.wire;
    });
  }, [p.wire, p.species, p.seed]);
  useEffect(() => {
    const s = st.current;
    if (s?.fish) frame(s.camera, s.controls, p.view, s.fish);
  }, [p.view, p.viewNonce]);
  useEffect(() => {
    const s = st.current;
    if (s && p.strike > 0) s.manualStrike = 0;
  }, [p.strike]);
  useEffect(() => {
    const s = st.current;
    if (!s?.fish || !p.cameraAction) return;
    if (p.cameraAction.kind === 'fit') frame(s.camera, s.controls, s.props.view, s.fish);
    else {
      const delta = s.camera.position.clone().sub(s.controls.target);
      const dist = clamp(delta.length() * (p.cameraAction.kind === 'in' ? 0.76 : 1.29), s.fish.radius * 0.12, s.fish.radius * 11);
      s.camera.position.copy(s.controls.target).addScaledVector(delta.normalize(), dist);
      s.controls.update();
    }
  }, [p.cameraAction]);
  return <div ref={host} className="fish-canvas absolute inset-0">
    {unavailable && <div className="webgl-fallback"><Thumb sp={p.species} w={360} h={185} /><p>3D requires WebGL 2. The species atlas and field guide are still available.</p></div>}
  </div>;
}
function frame(cam: THREE.PerspectiveCamera, ctl: OrbitControls, view: ViewName, fish: FishBuild) {
  const r = fish.radius, model = fish.model;
  const thin = model.sp.plan === 'ray';
  const dirs: Record<ViewName, THREE.Vector3> = {
    side: new THREE.Vector3(0, 0.028, 1),
    front: new THREE.Vector3(1, 0.08, 0.16),
    top: new THREE.Vector3(0.001, 1, 0.02),
    three: thin ? new THREE.Vector3(0.43, 0.64, 0.82) : new THREE.Vector3(0.48, 0.21, 0.95),
    below: new THREE.Vector3(0.20, -0.94, 0.32),
    portrait: new THREE.Vector3(0.52, 0.16, 0.92),
  };
  const qs = new URLSearchParams(location.search);
  const dq = qs.get('dir')?.split(',').map(Number);
  const dir = (dq?.length === 3 && dq.every(Number.isFinite) && dq.some((x) => x !== 0) ? new THREE.Vector3(dq[0], dq[1], dq[2]) : dirs[view]).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
  if (right.lengthSq() < 0.1) right.set(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(dir, right).normalize();
  const tan = Math.tan(cam.fov * DEG / 2), aspect = Math.max(0.2, cam.aspect);
  const p = new THREE.Vector3();
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const scan = (fn: (x: number, y: number, depth: number) => void) => {
    for (const ch of fish.group.children as THREE.Mesh[]) {
      const a = ch.geometry.getAttribute('position');
      for (let i = 0; i < a.count; i += Math.max(1, Math.floor(a.count / 1900))) {
        p.fromBufferAttribute(a, i).add(ch.position).applyQuaternion(fish.group.quaternion);
        fn(p.dot(right), p.dot(up), p.dot(dir));
      }
    }
  };
  scan((x, y) => { bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y); bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y); });
  const cx = (bounds[0] + bounds[2]) * 0.5, cy = (bounds[1] + bounds[3]) * 0.5;
  let dist = 0;
  scan((x, y, z) => { dist = Math.max(dist, z + Math.max(Math.abs(x - cx) / (tan * aspect * 0.86), Math.abs(y - cy) / (tan * 0.64))); });
  const tgt = right.multiplyScalar(cx).addScaledVector(up, cy + r * 0.011);
  if (view === 'front' || view === 'portrait' || qs.has('focus')) {
    const s = qs.has('focus') ? Number(qs.get('focus')) : view === 'portrait' ? clamp(model.sp.HL * 0.45, 0.03, 0.4) : model.mouthTip.s;
    tgt.copy(model.local(Number.isFinite(s) ? s : model.mouthTip.s, view === 'front' ? model.mouthTip.y : 0, 0));
    if (fish.group.children[0]) tgt.add(fish.group.children[0].position);
    tgt.applyQuaternion(fish.group.quaternion);
    if (view === 'front') dist = r * (thin ? 1.46 : 1.75) * Math.max(1, 0.77 / aspect);
    if (view === 'portrait') dist = Math.min(dist, r * 0.62); // head close-up: frame the skull, not the whole fish
  }
  if (qs.has('fy') && Number.isFinite(Number(qs.get('fy')))) tgt.y = Number(qs.get('fy'));
  const zoom = clamp(Number(qs.get('zoom')) || 1, 0.2, 12);
  dist = Math.max(r * 0.13, dist / zoom);
  cam.position.copy(dir.multiplyScalar(dist)).add(tgt);
  ctl.target.copy(tgt);
  ctl.minDistance = r * 0.105;
  ctl.maxDistance = Math.max(dist * 2, r * 13);
  cam.near = Math.max(0.001, r * 0.009);
  cam.far = Math.max(35, dist * 18);
  cam.updateProjectionMatrix();
  ctl.update();
}
