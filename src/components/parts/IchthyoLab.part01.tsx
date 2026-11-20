'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Activity,
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  Bird,
  BookOpen,
  Box,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Database,
  Dices,
  Dna,
  Droplets,
  Eye,
  Fish,
  FishSymbol,
  FlaskConical,
  GitBranch,
  ImagePlus,
  Keyboard,
  Layers3,
  Leaf,
  Loader2,
  Minus,
  Mountain,
  Mouse,
  PanelLeft,
  Plus,
  ScanLine,
  Search,
  Shell,
  Sliders,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Sprout,
  Trash2,
  Upload,
  Wand2,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { UploadedSpecimenRow } from '../db/schema';
import { GROUPS, SPECIES } from '../data/species';
import { ensurePhotoSkinLoaded } from '../engine/skin';
import type { Species } from '../engine/types';
import { discover, rate, type Discovery } from '../gen/discover';
import {
  blind,
  census as makeCensus,
  cross,
  fromSpecies,
  generate,
  migrate,
  offspring,
  SPECIES_BY_ID,
  type GenFish,
} from '../gen/generate';
import { PLAN_NAMES, type Plan } from '../gen/genesis';
import { HABITAT, HABITATS, type HabitatId } from '../gen/habitats';
import { LINEAGES, NICHE_INFO, type LineageId } from '../gen/lineages';
import { BUILTIN_SAMPLE_PLATES, type SamplePlate } from '../vision/prompts';
import {
  reconstructFishFromImage,
  updateReconstructedGenFish,
  type ReconstructedSpecimen,
} from '../vision/reconstruct';
import AnatomyTunerDrawer from './AnatomyTunerDrawer';
import FieldGuide, { RefImg } from './FieldGuide';
import PromptArchitectModal from './PromptArchitectModal';
import Thumb from './Thumb';
import UploadStudioModal from './UploadStudioModal';
import Viewer, { type CameraAction, type ViewName } from './Viewer';

let audioCtx: AudioContext | null = null;
function chime(power: number, living: boolean) {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx ??= new AC();
    const ac = audioCtx;
    if (ac.state === 'suspended') void ac.resume();
    const t0 = ac.currentTime + 0.03;
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.12, t0 + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
    master.connect(ac.destination);
    const base = living ? 523.25 : 392 * Math.pow(2, Math.round(power * 7) / 12);
    const steps = living
      ? [0, 4, 7, 12, 16]
      : power > 0.85
        ? [0, 7, 12, 16, 19, 24, 28]
        : power > 0.6
          ? [0, 4, 7, 11, 14]
          : power > 0.4
            ? [0, 7, 12, 16]
            : [0, 7, 12];
    steps.forEach((st, i) => {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = base * Math.pow(2, st / 12);
      o.detune.value = (i % 3 - 1) * 4;
      const t = t0 + i * 0.07;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.42 / (1 + i * 0.3), t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5 + power);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 1.7 + power);
    });
  } catch {
    /* audio unavailable */
  }
}

const randSeed = () => Math.floor(Math.random() * 1e9) + 2;
const VIEWS: [ViewName, string][] = [
  ['side', 'Lateral'],
  ['three', '¾ View'],
  ['front', 'Mouth'],
  ['top', 'Dorsal'],
  ['below', 'Ventral'],
  ['portrait', 'Portrait'],
];
const NOVELTY = [
  [0, 'Real species', 'A measured atlas species native to this environment, with individual variation.'],
  [0.08, 'De-novo · typical', 'No atlas parent: body, head, fins and tail are grown from this habitat’s physics.'],
  [0.45, 'De-novo · new species', 'Every click grows a new silhouette, fin architecture, tail and head, then paints it.'],
  [0.8, 'De-novo · wild', 'Rare constructions, exaggerated display organs, streamers, horns and banners.'],
] as const;

const PRESETS: {
  id: string;
  label: string;
  focus: string;
  anchor: string;
  hab: HabitatId;
  seed: number;
  lineage?: LineageId;
  view: ViewName;
  gape?: number;
}[] = [
  { id: 'shark', label: 'Reef shark', focus: 'Dorsal foil', anchor: 'tiger-shark', hab: 'reef', seed: 23, lineage: 'sharkPelagic', view: 'three' },
  { id: 'manta', label: 'Reef manta', focus: 'Cephalic lobes', anchor: 'reef-manta-ray', hab: 'reef', seed: 308, lineage: 'manta', view: 'three' },
  { id: 'frogfish', label: 'Frogfish', focus: 'Jaw hinge', anchor: 'warty-frogfish', hab: 'reef', seed: 36, view: 'three', gape: 0.68 },
  { id: 'cowfish', label: 'Cowfish', focus: 'Horn roots', anchor: 'longhorn-cowfish', hab: 'reef', seed: 22, lineage: 'tetraodont', view: 'three' },
  { id: 'seahorse', label: 'Seahorse', focus: 'Equine armour', anchor: 'lined-seahorse', hab: 'kelp', seed: 11, lineage: 'syngnathid', view: 'side' },
  { id: 'lionfish', label: 'Lionfish', focus: 'Venom spines', anchor: 'red-lionfish', hab: 'reef', seed: 19, lineage: 'scorpion', view: 'three' },
];

const iconFor: Partial<Record<HabitatId, LucideIcon>> = {
  reef: Shell,
  kelp: Sprout,
  seagrass: Leaf,
  pelagic: Waves,
  twilight: Layers3,
  abyss: Eye,
  hadal: ArrowDown,
  sandflat: Shell,
  rocky: Mountain,
  polar: Snowflake,
  estuary: Sprout,
  stream: Mountain,
  river: Droplets,
  amazon: Leaf,
  lake: Waves,
  swamp: Leaf,
  cave: Mountain,
};
const tones: Partial<Record<HabitatId, string>> = {
  reef: '#63dfec',
  kelp: '#91c98f',
  seagrass: '#80cabc',
  pelagic: '#77bff3',
  twilight: '#ab9ce8',
  abyss: '#bd91d5',
  sandflat: '#e7bb8d',
  swamp: '#b5c67e',
  river: '#8bca93',
  polar: '#b3e3f5',
};
const mainBiomes = ['reef', 'kelp', 'seagrass', 'pelagic', 'twilight', 'abyss', 'sandflat', 'swamp'];
const photoBiomes = ['reef', 'pelagic', 'seagrass', 'sandflat', 'kelp', 'rocky'];
const depthLabel = (d: number) => (d >= 1000 ? `${+(d / 1000).toFixed(1)} km` : `${d} m`);

function loadPreset(p: (typeof PRESETS)[number]) {
  return SPECIES_BY_ID[p.anchor]
    ? fromSpecies(SPECIES_BY_ID[p.anchor])
    : generate(p.hab, p.seed, { novelty: 0.65, lineage: p.lineage });
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button className="motion-switch" type="button" role="switch" aria-checked={on} onClick={() => set(!on)}>
      <span className="switch-track" aria-hidden="true">
        <span />
      </span>
      {label}
    </button>
  );
}

function Slider({
  label,
  value,
  step,
  min = 0,
  max = 1,
  display,
  onChange,
  kind = '',
  disabled = false,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  display: string;
  onChange: (v: number) => void;
  kind?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`slider-control ${kind}`}>
      <span className="slider-head">
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <input
        type="range"
        value={value}
        aria-label={label}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(+e.currentTarget.value)}
        style={{ '--progress': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      />
    </label>
  );
}

function Help({ close }: { close: () => void }) {
  const el = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    el.current?.showModal();
  }, []);
  const keys = [
    ['U', 'Open 2D Image → 3D Fish Upload Studio'],
    ['P', 'Open Global AI Master Prompt Architect'],
    ['G', 'Generate in the selected habitat'],
    ['B', 'Generate a surprise specimen'],
    ['O', 'Produce offspring'],
    ['Space', 'Trigger a feeding strike'],
    ['R', 'Reset the current camera view'],
  ];
  return (
    <dialog
      ref={el}
      className="help-dialog"
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="help-title"
    >
      <div className="help-card">
        <button className="icon-button dialog-close" onClick={close} aria-label="Close shortcuts">
          <X size={17} />
        </button>
        <span className="section-label">
          <Keyboard size={15} /> Viewer &amp; Studio Controls
        </span>
        <h2 id="help-title">Inspect &amp; Synthesize Specimens</h2>
        <p>
          Upload any 2D fish image to synthesize a hyper-realistic 3D swimming fish, or drag to orbit and scroll to zoom.
        </p>
        {keys.map(([key, task]) => (
          <div className="key-item" key={key}>
            <span>{task}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
      </div>
    </dialog>
  );
}

export default function IchthyoLab() {
  const [fish, setFish] = useState<GenFish>(() => fromSpecies(SPECIES_BY_ID['red-lionfish'] ?? SPECIES[0]));
  const [hab, setHab] = useState<HabitatId>('reef');
  const [novelty, setNovelty] = useState(0.65);
  const [planPick, setPlanPick] = useState<Plan | ''>('');
  const [log, setLog] = useState<GenFish[]>(() => [fromSpecies(SPECIES_BY_ID['red-lionfish'] ?? SPECIES[0])]);
  const [tab, setTab] = useState<'vision' | 'gen' | 'atlas'>('vision');
  const [pending, setPending] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [crossing, setCrossing] = useState(false);
  const [censusSeed, setCensusSeed] = useState(1);
  const [allBiomes, setAllBiomes] = useState(false);
  const [allPresets, setAllPresets] = useState(false);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('All');
  const [gape, setGape] = useState(0);
  const [maxJaw, setMaxJaw] = useState(fish.species.mouth.open);
  const [autoFeed, setAutoFeed] = useState(false);
  const [swim, setSwim] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<ViewName>('three');
  const [viewNonce, setViewNonce] = useState(0);
  const [cameraAction, setCameraAction] = useState<CameraAction>();
  const [strike, setStrike] = useState(0);
  const [wire, setWire] = useState(false);
  const [panel, setPanel] = useState(false);
  const [list, setList] = useState(true);
  const [fins, setFins] = useState(true);
  const [eyes, setEyes] = useState(true);
  const [breathe, setBreathe] = useState(true);
  const [help, setHelp] = useState(false);

  // 2D → 3D Studio, Prompt Architect, Live Sculptor & PostgreSQL Vault state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [sculptOpen, setSculptOpen] = useState(false);
  const [vault, setVault] = useState<UploadedSpecimenRow[]>([]);
  const [loadingVault, setLoadingVault] = useState(true);
  const [savingDb, setSavingDb] = useState(false);
  const [quickSampleBusy, setQuickSampleBusy] = useState<string | null>(null);

  const [magic, setMagic] = useState(() => {
    const d = rate(fish);
    return { color: d.color, label: d.label, tier: d.tier, kind: d.kind, power: d.power, nonce: 0 };
  });
  const [codex, setCodex] = useState<string[]>([]);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Hydrate responsive panel state, codex, sound & PostgreSQL Vault on mount
  const fetchVault = useCallback(async () => {
    try {
      setLoadingVault(true);
      const res = await fetch('/api/specimens');
      if (res.ok) {
        const data = (await res.json()) as { specimens?: UploadedSpecimenRow[] };
        if (Array.isArray(data.specimens)) setVault(data.specimens);
      }
    } catch {
      // ignore offline
    } finally {
      setLoadingVault(false);
    }
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 1220) setPanel(true);
    if (window.innerWidth < 760) setList(false);
    try {
      setCodex(JSON.parse(localStorage.getItem('ig-codex') || '[]') as string[]);
      setSound(localStorage.getItem('ig-sound') !== '0');
    } catch {
      // ignore private mode
    }
    void fetchVault();
  }, [fetchVault]);

  const sp = fish.species;
  const H = HABITAT[fish.habitat] ?? HABITAT.reef;
  const sel = HABITAT[hab] ?? HABITAT.reef;
  const census = useMemo(
    () => makeCensus(fish.habitat, censusSeed * 7919 + fish.habitat.length, 9, fish.novelty),
    [fish.habitat, fish.novelty, censusSeed],
  );

  const run = useCallback(
    (fn: () => GenFish, pose?: { view: ViewName; gape?: number }, found?: Discovery) => {
      clearTimeout(timer.current);
      setPending(true);
      timer.current = setTimeout(() => {
        try {
          const f = fn();
          setFish(f);
          const d =
            found ??
            (f.origin === 'uploaded'
              ? {
                  tier: 'mythic' as const,
                  kind: 'novo' as const,
                  label: '2D → 3D Synthesized',
                  color: '#38e8ff',
                  power: 0.92,
                  fish: f,
                }
              : rate(f));
          setMagic((m) => ({
            color: d.color,
            label: d.label,
            tier: d.tier,
            kind: d.kind,
            power: d.power,
            nonce: m.nonce + 1,
          }));
          if (soundRef.current) chime(d.power, d.kind === 'living');
          if (f.real) {
            setCodex((c) => {
              const id = f.species.id.split('~')[0];
              if (c.includes(id)) return c;
              const n = [...c, id];
              try {
                localStorage.setItem('ig-codex', JSON.stringify(n));
              } catch {
                /* private mode */
              }
              return n;
            });
          }
          setHab(f.habitat);
          setMaxJaw(f.species.mouth.open);
          setGape(pose?.gape ?? 0);
          if (pose) {
            setView(pose.view);
            setViewNonce((n) => n + 1);
            setAutoFeed(false);
          }
          setLog((l) => [f, ...l.filter((x) => x.key !== f.key)].slice(0, 40));
          if (window.innerWidth < 760) setList(false);
          setPending(false);
        } catch (error) {
          console.error('Unable to build specimen', error);
          setPending(false);
        }
      }, 48);
    },
    [],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const persistToVault = useCallback(
    async (recFish: GenFish, bauplan: string, sourcePreview: string, metrics?: Record<string, unknown>, promptUsed?: string) => {
      try {
        setSavingDb(true);
        const res = await fetch('/api/specimens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: recFish.species.id,
            name: recFish.common,
            sciName: recFish.latin,
            bauplan,
            habitat: recFish.habitat,
            sourcePreview,
            species: recFish.species,
            genFish: recFish,
            metrics,
            promptUsed,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { specimen?: UploadedSpecimenRow };
          if (data.specimen) {
            setVault((prev) => [data.specimen!, ...prev.filter((r) => r.slug !== data.specimen!.slug)]);
          }
        }
      } catch (err) {
        console.error('Failed to persist specimen:', err);
      } finally {
        setSavingDb(false);
      }
    },
    [],
  );

  const handleAcceptReconstruction = useCallback(
    (rec: ReconstructedSpecimen, promptUsed?: string) => {
      setUploadOpen(false);
      run(() => rec.genFish, { view: 'three', gape: 0 });
      void persistToVault(
        rec.genFish,
        rec.diagnostics.bauplan,
        rec.diagnostics.sourcePreviewUrl,
        rec.diagnostics.metrics,
        promptUsed,
      );
    },
    [persistToVault, run],
  );

  const handleQuickSampleSynthesize = async (sample: SamplePlate) => {
    setQuickSampleBusy(sample.id);
    try {
      const rec = await reconstructFishFromImage(sample.url, {
        customName: sample.name,
        customSci: sample.sci,
        habitat: sample.habitat,
      });
      run(() => rec.genFish, { view: sample.id === 'sample-seahorse' ? 'side' : 'three', gape: 0 });
      void persistToVault(
        rec.genFish,
        rec.diagnostics.bauplan,
        rec.diagnostics.sourcePreviewUrl,
        rec.diagnostics.metrics,
        sample.promptSubject,
      );
    } catch (err) {
      console.error(err);
    } finally {
      setQuickSampleBusy(null);
    }
  };

  const handleLoadVaultRow = async (row: UploadedSpecimenRow) => {
    await ensurePhotoSkinLoaded(row.speciesJson);
    const loadedGen: GenFish = {
      ...row.genFishJson,
      species: row.speciesJson,
      uploadedSourceUrl: row.sourcePreview,
      origin: 'uploaded',
    };
    if (crossing && loadedGen.key !== fish.key) {
      setCrossing(false);
      const seed = randSeed();
      run(() => cross(fish, loadedGen, seed));
    } else {
      run(() => loadedGen, { view: row.bauplan === 'seahorse' ? 'side' : 'three' });
    }
  };

  const handleDeleteVaultRow = async (id: number) => {
    try {
      await fetch(`/api/specimens/${id}`, { method: 'DELETE' });
      setVault((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  };

  const handleLiveSpeciesSculpt = (nextSpecies: Species) => {
    const updated = updateReconstructedGenFish(fish, nextSpecies);
    setFish(updated);
    setMaxJaw(nextSpecies.mouth.open);
    setLog((l) => [updated, ...l.filter((x) => x.species.id !== nextSpecies.id)].slice(0, 40));
  };

  const handleSaveCurrentToVault = async () => {
    await persistToVault(
      fish,
      fish.clade ?? 'custom',
      fish.uploadedSourceUrl ?? '/samples/imperial-lionfish.png',
    );
  };

  const doGenerate = (h = hab) => {
    const recent = [fish, ...log]
      .filter((f) => f.plan)
      .slice(0, 3)
      .map((f) => f.plan);
    const plan = planPick || undefined;
    let seed = randSeed(),
      d = discover(h, seed, novelty, plan);
    for (
      let i = 0;
      !plan && i < 6 && d.fish.plan && recent.slice(0, i < 3 ? 2 : 1).includes(d.fish.plan);
      i++
    ) {
      seed = randSeed();
      d = discover(h, seed, novelty);
    }
    const made = d;
    run(() => made.fish, undefined, made);
  };

  const doBlind = () => {
    const seed = randSeed();
    run(() => blind(seed));
  };
  const doOffspring = () => {
    const seed = randSeed();
    run(() => offspring(fish, seed));
  };
  const doMigrate = (h: HabitatId) => {
    const seed = randSeed();
    setMigrating(false);
    run(() => migrate(fish, h, seed, novelty));
  };
  const doAtlas = (s: Species) => run(() => fromSpecies(s));
  const fire = () => {
    if (maxJaw > 0) {
      setGape(0);
      setStrike((n) => n + 1);
    }
  };
  const camera = (kind: CameraAction['kind']) =>
    setCameraAction((a) => ({ kind, nonce: (a?.nonce ?? 0) + 1 }));
  const pickFish = (f: GenFish) => {
    if (crossing && f.key !== fish.key) {
      setCrossing(false);
      const seed = randSeed();
      run(() => cross(fish, f, seed));
    } else if (f.key !== fish.key) {
      run(() => f);
    }
  };

  const shortcuts = useRef({ doGenerate, doBlind, doOffspring, fire, camera, help, uploadOpen, promptOpen });
  shortcuts.current = { doGenerate, doBlind, doOffspring, fire, camera, help, uploadOpen, promptOpen };

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        shortcuts.current.help ||
        shortcuts.current.uploadOpen ||
        shortcuts.current.promptOpen ||
        (e.target as HTMLElement | null)?.closest('input,select,textarea,button,[contenteditable]')
      )
        return;
      const actions = shortcuts.current;
      switch (e.key.toLowerCase()) {
        case 'u':
          setUploadOpen(true);
          break;
        case 'p':
          setPromptOpen(true);
          break;
        case 'g':
          actions.doGenerate();
          break;
        case 'b':
          actions.doBlind();
          break;
        case 'o':
          actions.doOffspring();
          break;
        case 'r':
          actions.camera('fit');
          break;
        case ' ':
          e.preventDefault();
          actions.fire();
          break;
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  const filtered = SPECIES.filter(
    (s) =>
      (group === 'All' || group === s.group) &&
      `${s.name} ${s.sci}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const biomes = allBiomes
    ? HABITATS
    : (mainBiomes.includes(hab) ? mainBiomes : [...mainBiomes.slice(0, -1), hab])
        .map((id) => HABITAT[id as HabitatId])
        .filter(Boolean);
  const stop = [...NOVELTY].reverse().find(([n]) => novelty >= n) ?? NOVELTY[0];
  const photo = photoBiomes.includes(H.id);
  const backdrop = `linear-gradient(180deg, ${H.amb.bg.join(', ')})`;
  const specLabel =
    fish.origin === 'uploaded'
      ? '2D → 3D Reconstructed'
      : fish.real
        ? 'Atlas'
        : fish.origin === 'mutated'
          ? 'Offspring'
          : fish.origin === 'crossed'
            ? 'Hybrid'
            : fish.plan && fish.origin !== 'migrated'
              ? 'De-novo species'
              : 'Procedural';

  const selectPreset = (p: (typeof PRESETS)[number]) => {
    setNovelty(0.65);
    run(() => loadPreset(p), p);
  };

  return (
    <div
      className="lab-shell"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          if (!uploadOpen) setUploadOpen(true);
        }
      }}
    >
      <header className="lab-header">
        <button
          className="brand"
          type="button"
          onClick={() => {
            setTab('vision');
            setList(true);
          }}
          title="Open 2D → 3D Procedural Lab"
        >
          <span className="brand-mark">
            <FishSymbol size={23} strokeWidth={1.75} />
          </span>
          <span>
            <strong>
              Ichthyo<span>Genesis</span>
            </strong>
            <small>2D → 3D PROCEDURAL FISH ENGINE</small>
          </span>
        </button>

        <div className="header-meta">
          <span className="divider" />
          2D Image Synthesis <i /> {SPECIES.length} Atlas Species <i /> {HABITATS.length} Biomes
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition hover:brightness-110"
          >
            <Upload size={14} />
            <span>Upload 2D → 3D Fish</span>
          </button>

          <button
            type="button"
            onClick={() => setPromptOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
          >
            <Wand2 size={14} />
            <span>Global Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => setSculptOpen((v) => !v)}
            className={`guide-button ${sculptOpen ? 'is-active' : ''}`}
            title="Live 3D Anatomy, Scale & Dermal Skin Tag Sculptor"
          >
            <Sliders size={15} />
            <span>3D Sculptor</span>
          </button>

          <div className="header-divider" />

          <button
            className={`icon-button ${list ? 'is-active' : ''}`}
            type="button"
            title={list ? 'Hide sidebar' : 'Show sidebar'}
            aria-label="Toggle sidebar"
            aria-expanded={list}
            onClick={() => {
              setList(!list);
              if (!list && window.innerWidth < 760) setPanel(false);
            }}
          >
            <PanelLeft size={17} />
          </button>

          <button
            className={`guide-button ${panel ? 'is-active' : ''}`}
            type="button"
            aria-label="Toggle field guide"
            aria-expanded={panel}
            onClick={() => {
              setPanel(!panel);
              if (!panel && window.innerWidth < 1040) setList(false);
            }}
          >
            <BookOpen size={16} />
            <span>Field Guide</span>
          </button>

          <button
            className="icon-button"
            type="button"
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={17} />
          </button>
        </div>
      </header>

      <div className="workspace">
        {(list || panel) && (
          <button
            tabIndex={-1}
            aria-label="Close side panels"
            className="drawer-scrim"
            onClick={() => {
              setList(false);
              setPanel(false);
            }}
          />
        )}

        {list && (
          <aside className="generator-panel" aria-label="Species studio">
            <div className="generator-top">
              <div className="panel-tabs" aria-label="Workspace mode" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <button
                  className={tab === 'vision' ? 'selected' : ''}
                  aria-pressed={tab === 'vision'}
                  onClick={() => setTab('vision')}
                >
                  <ScanLine size={14} /> 2D → 3D
                </button>
                <button
                  className={tab === 'gen' ? 'selected' : ''}
                  aria-pressed={tab === 'gen'}
                  onClick={() => setTab('gen')}
                >
                  <FlaskConical size={14} /> Genesis
                </button>
                <button
                  className={tab === 'atlas' ? 'selected' : ''}
                  aria-pressed={tab === 'atlas'}
                  onClick={() => setTab('atlas')}
                >
                  <BookOpen size={14} /> Atlas
                </button>
              </div>
              <button
                className="icon-button mobile-close"
                onClick={() => setList(false)}
                aria-label="Close sidebar"
              >
                <X size={17} />
              </button>
            </div>

            {tab === 'vision' ? (
              <>
                <div className="left-scroll scroll-area">
                  {/* Primary Upload Launch Card */}
                  <section className="env-section">
                    <div className="section-heading">
                      <h2 className="section-label">
                        <ImagePlus size={15} /> 2D Image Reconstruction
                      </h2>
                      <span className="mono muted">ANY TAXON</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUploadOpen(true)}
                      className="w-full rounded-xl border border-cyan-300/35 bg-gradient-to-br from-cyan-400/15 via-sky-500/10 to-emerald-400/15 p-3.5 text-left transition hover:border-cyan-300/70 hover:from-cyan-400/25"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center