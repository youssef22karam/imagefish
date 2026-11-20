'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Eye,
  FlipHorizontal2,
  ImagePlus,
  Layers,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import Thumb from './Thumb';
import { HABITATS, type HabitatId } from '../gen/habitats';
import type { DetectedBauplan } from '../vision/anatomy';
import { BUILTIN_SAMPLE_PLATES, type SamplePlate } from '../vision/prompts';
import {
  reconstructFishFromImage,
  type ReconstructedSpecimen,
} from '../vision/reconstruct';

interface Props {
  open: boolean;
  onClose: () => void;
  onAccept: (result: ReconstructedSpecimen, promptUsed?: string) => void;
  onOpenPromptArchitect: () => void;
}

const BAUPLAN_OPTIONS: { value: 'auto' | DetectedBauplan; label: string }[] = [
  { value: 'auto', label: 'Auto-Detect Anatomy & Clade' },
  { value: 'teleost', label: 'Standard Teleost / Reef Fish' },
  { value: 'shark', label: 'Shark / Selachian (Gill Slits + Foil)' },
  { value: 'lionfish', label: 'Lionfish / Scorpionfish (Spines + Fans)' },
  { value: 'eel', label: 'Moray / Ribbon Eel (Anguilliform)' },
  { value: 'seahorse', label: 'Upright Seahorse / Equine Coil' },
  { value: 'alien', label: 'Alien / Abyssal Xenobiology' },
  { value: 'boxfish', label: 'Boxfish / Globe / Carapace' },
];

export default function UploadStudioModal({
  open,
  onClose,
  onAccept,
  onOpenPromptArchitect,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | File>(BUILTIN_SAMPLE_PLATES[0].url);
  const [promptUsed, setPromptUsed] = useState<string>(BUILTIN_SAMPLE_PLATES[0].promptSubject);
  const [customName, setCustomName] = useState<string>(BUILTIN_SAMPLE_PLATES[0].name);
  const [customSci, setCustomSci] = useState<string>(BUILTIN_SAMPLE_PLATES[0].sci);
  const [habitat, setHabitat] = useState<HabitatId>(BUILTIN_SAMPLE_PLATES[0].habitat);
  const [flipMode, setFlipMode] = useState<'auto' | 'none' | 'flip'>('auto');
  const [bauplanMode, setBauplanMode] = useState<'auto' | DetectedBauplan>('auto');
  const [sensitivity, setSensitivity] = useState<number>(0);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [dragging, setDragging] = useState<boolean>(false);

  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconstructedSpecimen | null>(null);

  const runAnalysis = useCallback(
    async (
      src: string | File,
      overrides?: {
        name?: string;
        sci?: string;
        hab?: HabitatId;
        flip?: 'auto' | 'none' | 'flip';
        bauplan?: 'auto' | DetectedBauplan;
        sens?: number;
      },
    ) => {
      setBusy(true);
      setError(null);
      try {
        const rec = await reconstructFishFromImage(src, {
          customName: overrides?.name ?? customName,
          customSci: overrides?.sci ?? customSci,
          habitat: overrides?.hab ?? habitat,
          flipHorizontal: overrides?.flip ?? flipMode,
          forceBauplan: overrides?.bauplan ?? bauplanMode,
          sensitivity: overrides?.sens ?? sensitivity,
        });
        setResult(rec);
        if (!overrides?.name && !customName.trim()) {
          setCustomName(rec.species.name);
        }
        if (!overrides?.sci && !customSci.trim()) {
          setCustomSci(rec.species.sci);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to analyze 2D fish image');
      } finally {
        setBusy(false);
      }
    },
    [bauplanMode, customName, customSci, flipMode, habitat, sensitivity],
  );

  // Run initial sample analysis when modal opens for the first time
  useEffect(() => {
    if (open && !result && !busy) {
      void runAnalysis(source);
    }
  }, [open, result, busy, runAnalysis, source]);

  // Support Ctrl+V image paste while modal is open
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) {
            const baseName = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
            const niceName = baseName && baseName !== 'image' ? baseName : '';
            setSource(f);
            setCustomName(niceName);
            setCustomSci('');
            setPromptUsed('');
            setFlipMode('auto');
            setBauplanMode('auto');
            void runAnalysis(f, { name: niceName, sci: '', flip: 'auto', bauplan: 'auto' });
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, runAnalysis]);

  if (!open) return null;

  const handleFilePicked = (file: File) => {
    const cleanBase = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    setSource(file);
    setCustomName(cleanBase);
    setCustomSci('');
    setPromptUsed('');
    setFlipMode('auto');
    setBauplanMode('auto');
    void runAnalysis(file, { name: cleanBase, sci: '', flip: 'auto', bauplan: 'auto' });
  };

  const handlePickSample = (sample: SamplePlate) => {
    setSource(sample.url);
    setCustomName(sample.name);
    setCustomSci(sample.sci);
    setHabitat(sample.habitat);
    setPromptUsed(sample.promptSubject);
    setFlipMode('auto');
    setBauplanMode('auto');
    setSensitivity(0);
    void runAnalysis(sample.url, {
      name: sample.name,
      sci: sample.sci,
      hab: sample.habitat,
      flip: 'auto',
      bauplan: 'auto',
      sens: 0,
    });
  };

  const handleMaterialize = () => {
    if (!result) return;
    const finalName = customName.trim() || result.species.name;
    const finalSci = customSci.trim() || result.species.sci;
    const updatedSpecies = { ...result.species, name: finalName, sci: finalSci };
    const updatedGen = {
      ...result.genFish,
      species: updatedSpecies,
      common: finalName,
      latin: finalSci,
      habitat,
    };
    onAccept(
      {
        ...result,
        species: updatedSpecies,
        genFish: updatedGen,
      },
      promptUsed || undefined,
    );
  };

  const diag = result?.diagnostics;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-6xl max-h-[93vh] overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#071521]/95 text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,0.75)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-300/15 bg-[#091c2b]/90 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/30">
              <ScanLine size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-white">
                  2D Image → 3D Procedural Fish Synthesizer
                </h2>
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                  All Taxa · Aliens · Sharks · Seahorses · Eels
                </span>
              </div>
              <p className="text-xs text-slate-300/80">
                Upload or paste any 2D fish image — extracts exact silhouette, fins, caudal lobes, cylindrical UV skin, scales &amp; living dermal skin tags.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPromptArchitect}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-400/20"
            >
              <Wand2 size={14} /> Global AI Image Prompt
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close upload studio"
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-12">
          {/* Left Column: Dropzone + Sample Plates + Vision Canvas */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* Upload Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f && f.type.startsWith('image/')) handleFilePicked(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={`group cursor-pointer rounded-xl border-2 border-dashed px-4 py-3.5 transition ${
                dragging
                  ? 'border-cyan-300 bg-cyan-400/15'
                  : 'border-cyan-300/25 bg-[#0b2133]/65 hover:border-cyan-300/55 hover:bg-[#0d283d]/80'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFilePicked(f);
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300 group-hover:bg-cyan-400/25">
                    <ImagePlus size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      Click to upload any 2D fish image, drag &amp; drop, or press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">Ctrl+V</kbd>
                    </div>
                    <div className="text-xs text-slate-300/75">
                      PNG, JPG, WebP · Transparent cutouts, studio plates (#E4EBF0), or underwater photos
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-300/35">
                  <Upload size={13} /> Browse Image
                </span>
              </div>
            </div>

            {/* Instant 1-Click Sample Plates */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-cyan-300/90">
                  Instant Test Plates (Generated with the Global Master Prompt)
                </span>
                <span className="text-slate-400">Click any plate to synthesize live</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {BUILTIN_SAMPLE_PLATES.map((sp) => {
                  const active = source === sp.url;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handlePickSample(sp)}
                      className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                        active
                          ? 'border-cyan-300 bg-cyan-400/15 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                          : 'border-white/10 bg-[#0a1d2c]/80 hover:border-cyan-300/40'
                      }`}
                    >
                      <div className="relative h-14 w-full overflow-hidden bg-[#dce4ec]">
                        <img
                          src={sp.url}
                          alt={sp.name}
                          className="h-full w-full object-contain p-1 transition group-hover:scale-105"
                        />
                      </div>
                      <div className="p-2">
                        <div className="truncate text-[11px] font-semibold text-white">{sp.name}</div>
                        <div className="truncate text-[10px] text-cyan-300/80">{sp.badge}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Computer Vision Diagnostic Canvas */}
            <div className="relative flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-xl border border-cyan-300/20 bg-[#05101a]">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#091a28] px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-medium text-slate-200">
                    Morphometric Silhouette &amp; Organ Decomposition
                  </span>
                  {diag && (
                    <span className="rounded bg-cyan-400/15 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                      {diag.bauplan.toUpperCase()} · {Math.round(diag.metrics.confidence * 100)}% LOCK
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowOverlays((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition ${
                    showOverlays
                      ? 'bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-300/35'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Eye size={12} /> {showOverlays ? 'Anatomy Vectors On' : 'Vectors Hidden'}
                </button>
              </div>

              <div
                className="relative flex flex-1 items-center justify-center p-4"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, rgba(18,58,84,0.38), rgba(4,13,22,0.95)), linear-gradient(rgba(120,200,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,200,235,0.06) 1px, transparent 1px)',
                  backgroundSize: '100% 100%, 22px 22px, 22px 22px',
                }}
              >
                {busy && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/65 backdrop-blur-xs">
                    <Loader2 size={28} className="animate-spin text-cyan-300" />
                    <span className="text-xs font-medium text-cyan-200">
                      Segmenting anatomy, fins, dermal tags &amp; unwrapping 3D UV skin…
                    </span>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-xs text-rose-200">
                    {error}
                  </div>
                )}

                {diag && (
                  <div className="relative inline-block max-h-[260px] max-w-full">
                    <img
                      src={diag.cutoutDataUrl}
                      alt="Segmented fish cutout"
                      className="max-h-[250px] w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.65)]"
                    />
                    {showOverlays && (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                      >
                        {diag.overlays.map((ov, idx) => {
                          const pts = ov.points
                            .map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
                            .join(' ');
                          if (ov.kind === 'spine') {
                            return (
                              <polyline
                                key={idx}
                                points={pts}
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="0.9"
                                strokeDasharray="1.8 1.2"
                              />
                            );
                          }
                          const stroke =
                            ov.kind === 'trunk'
                              ? '#38bdf8'
                              : ov.kind === 'dorsal'
                                ? '#fbbf24'
                                : '#34d399';
                          const fill =
                            ov.kind === 'trunk'
                              ? 'rgba(56,189,248,0.10)'
                              : ov.kind === 'dorsal'
                                ? 'rgba(251,191,36,0.14)'
                                : 'rgba(52,211,153,0.14)';
                          return (
                            <polygon
                              key={idx}
                              points={pts}
                              fill={fill}
                              stroke={stroke}
                              strokeWidth="0.65"
                            />
                          );
                        })}
                        {diag.landmarks.map((lm, idx) => (
                          <g key={idx}>
                            <circle
                              cx={lm.x * 100}
                              cy={lm.y * 100}
                              r="1.35"
                              fill={lm.color}
                              stroke="#041019"
                              strokeWidth="0.45"
                            />
                          </g>
                        ))}
                      </svg>
                    )}
                  </div>
                )}
              </div>

              {/* Landmark Legend + Unwrapped UV Strip */}
              {diag && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#081724] px-3.5 py-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {diag.landmarks.map((lm, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-slate-300">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: lm.color }}
                        />
                        {lm.name}
                      </span>
                    ))}
                  </div>
                  {diag.unwrappedSkinUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Cylindrical UV Skin:</span>
                      <img
                        src={diag.unwrappedSkinUrl}
                        alt="Unwrapped cylindrical skin albedo"
                        className="h-5 w-24 rounded border border-white/20 object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Telemetry, Calibration & Materialize */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div className="flex flex-col gap-4">
              {/* Reconstructed Blueprint & Telemetry */}
              {result && diag && (
                <div className="rounded-xl border border-cyan-300/20 bg-[#0b1f30]/80 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      3D Loft Preview &amp; Extracted Anatomy
                    </span>
                    <div className="flex items-center gap-1.5">
                      {diag.dominantPalette.map((hex, idx) => (
                        <span
                          key={idx}
                          title={hex}
                          className="h-4 w-4 rounded-full border border-white/25"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#06131f] p-2.5">
                    <Thumb sp={result.species} w={132} h={72} className="shrink-0" />
                    <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      <div className="text-slate-400">
                        Depth: <b className="text-white">{(diag.metrics.bodyDepthSL * 100).toFixed(1)}% SL</b>
                      </div>
                      <div className="text-slate-400">
                        Peduncle: <b className="text-white">{(diag.metrics.peduncleSL * 100).toFixed(1)}% SL</b>
                      </div>
                      <div className="text-slate-400">
                        Head: <b className="text-white">{(diag.metrics.headLengthSL * 100).toFixed(0)}% SL</b>
                      </div>
                      <div className="text-slate-400">
                        Tail: <b className="text-white">{result.species.fins.caudal.type}</b>
                      </div>
                      <div className="text-slate-400">
                        Skin: <b className="text-white">{result.species.skin.kind}</b>
                      </div>
                      <div className="text-slate-400">
                        Dermis Tags: <b className="text-emerald-300">{diag.metrics.tagCount}</b>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Naming & Habitat */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-[#0a1b29]/75 p-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-slate-300">Specimen Common Name</span>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Abyssal Void Leviathan"
                    className="rounded-lg border border-white/15 bg-[#06121c] px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-300"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-slate-300">Scientific Binomial</span>
                  <input
                    value={customSci}
                    onChange={(e) => setCustomSci(e.target.value)}
                    placeholder="e.g. Xenichthys cyaneus"
                    className="rounded-lg border border-white/15 bg-[#06121c] px-2.5 py-1.5 text-xs italic text-white outline-none focus:border-cyan-300"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                  <span className="font-medium text-slate-300">3D Underwater Biome</span>
                  <select
                    value={habitat}
                    onChange={(e) => setHabitat(e.target.value as HabitatId)}
                    className="rounded-lg border border-white/15 bg-[#06121c] px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-300"
                  >
                    {HABITATS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.realm})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Solver Overrides */}
              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#0a1b29]/75 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Layers size={14} className="text-cyan-300" /> Vision Calibration Controls
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAnalysis(source)}
                    className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] text-cyan-200 hover:bg-white/15"
                  >
                    <RefreshCw size={11} /> Re-Solve
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-slate-400">Anatomical Clade Solver</span>
                    <select
                      value={bauplanMode}
                      onChange={(e) => {
                        const next = e.target.value as 'auto' | DetectedBauplan;
                        setBauplanMode(next);
                        void runAnalysis(source, { bauplan: next });
                      }}
                      className="rounded-lg border border-white/15 bg-[#06121c] px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-300"
                    >
                      {BAUPLAN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <FlipHorizontal2 size={12} /> Snout / Head Direction
                    </span>
                    <select
                      value={flipMode}
                      onChange={(e) => {
                        const next = e.target.value as 'auto' | 'none' | 'flip';
                        setFlipMode(next);
                        void runAnalysis(source, { flip: next });
                      }}
                      className="rounded-lg border border-white/15 bg-[#06121c] px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-300"
                    >
                      <option value="auto">
                        Auto-Detect {diag?.flipped ? '(Flipped → Left)' : '(Head Left)'}
                      </option>
                      <option value="none">Keep Original (Head on Left)</option>
                      <option value="flip">Flip Horizontally (Head on Right)</option>
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Background Matting Sensitivity</span>
                    <span className="font-mono text-cyan-300">
                      {sensitivity > 0 ? `+${Math.round(sensitivity * 100)}%` : `${Math.round(sensitivity * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.35}
                    max={0.35}
                    step={0.05}
                    value={sensitivity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSensitivity(val);
                      void runAnalysis(source, { sens: val });
                    }}
                    className="accent-cyan-400"
                  />
                </label>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={!result || busy}
                onClick={handleMaterialize}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110 disabled:opacity-50"
              >
                <Sparkles size={17} />
                Materialize Hyper-Realistic 3D Fish &amp; Save to Vault
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
