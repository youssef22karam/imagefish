'use client';

import { useState } from 'react';
import { Download, Save, Sliders, Sparkles, X } from 'lucide-react';
import type {
  CaudalType,
  SkinSpec,
  Species,
  SwimSpec,
  TagKind,
  TeethKind,
} from '../engine/types';
import { clone } from '../gen/morph';

interface Props {
  open: boolean;
  species: Species;
  canSaveDb: boolean;
  savingDb: boolean;
  onChangeSpecies: (next: Species) => void;
  onSaveDb: () => void;
  onClose: () => void;
}

const CAUDAL_TYPES: CaudalType[] = [
  'forked', 'lunate', 'hetero', 'rounded', 'truncate', 'emarginate',
  'pointed', 'trilobe', 'swallow', 'sword', 'crown', 'whip', 'veil',
  'halfmoon', 'lyre', 'spade', 'double', 'clavus', 'none',
];

const SKIN_KINDS: SkinSpec['kind'][] = [
  'cycloid', 'ctenoid', 'placoid', 'ganoid', 'smooth', 'warty', 'bony',
];

const SWIM_MODES: SwimSpec['mode'][] = [
  'carangiform', 'thunniform', 'anguilliform', 'selachian',
  'labriform', 'syngnathiform', 'ostraciiform', 'subcarangiform',
];

const TEETH_KINDS: TeethKind[] = [
  'none', 'fine', 'cone', 'fang', 'shark', 'beak', 'needle', 'tri',
];

export default function AnatomyTunerDrawer({
  open,
  species,
  canSaveDb,
  savingDb,
  onChangeSpecies,
  onSaveDb,
  onClose,
}: Props) {
  const [sec, setSec] = useState<'body' | 'skin' | 'fins' | 'dermis'>('body');

  if (!open) return null;

  const update = (mutator: (draft: Species) => void) => {
    const next = clone(species);
    // Preserve custom non-JSON fields across clone if present
    if (species.color.photoSkin) {
      next.color.photoSkin = species.color.photoSkin;
      next.color.photoBlend = species.color.photoBlend;
    }
    if (species.fins.dorsal && next.fins.dorsal) {
      species.fins.dorsal.forEach((d, i) => {
        if (d.customProfile && next.fins.dorsal?.[i]) next.fins.dorsal[i].customProfile = d.customProfile;
      });
    }
    if (species.fins.anal && next.fins.anal) {
      species.fins.anal.forEach((a, i) => {
        if (a.customProfile && next.fins.anal?.[i]) next.fins.anal[i].customProfile = a.customProfile;
      });
    }
    if (species.fins.caudal.customTrail) {
      next.fins.caudal.customTrail = species.fins.caudal.customTrail;
    }
    mutator(next);
    onChangeSpecies(next);
  };

  const applyDermalPreset = (kind: TagKind | 'lure' | 'clear') => {
    update((sp) => {
      if (kind === 'clear') {
        delete sp.tags;
        delete sp.barbels;
        return;
      }
      if (kind === 'lure') {
        sp.barbels = [
          ...(sp.barbels?.filter((b) => !b.bulb) ?? []),
          {
            s: 0.08,
            y: 0.92,
            len: 0.22,
            dir: [0.85, 0.92, 0],
            droop: 0.3,
            r: 0.0055,
            bulb: '#38f2ff',
            pairs: false,
          },
        ];
        return;
      }
      const defaults: Record<TagKind, NonNullable<Species['tags']>> = {
        cirrus: [
          { kind: 'cirrus', n: 24, len: 0.034, site: 'body', branch: 0.75, clump: 0.35, c: sp.color.side },
          { kind: 'cirrus', n: 4, len: 0.045, site: 'brow', sym: true, branch: 0.7, c: sp.color.top },
        ],
        flap: [
          { kind: 'flap', n: 2, len: 0.068, site: 'brow', sym: true, flat: 0.65, fringe: 0.35, band: '#f5ece2', c: sp.color.top },
          { kind: 'flap', n: 12, len: 0.024, site: 'jaw', flat: 0.7, fringe: 0.7, c: sp.color.side },
          { kind: 'flap', n: 28, len: 0.028, site: 'body', fringe: 0.7, clump: 0.5, c: sp.color.side },
        ],
        filament: [
          { kind: 'filament', n: 18, len: 0.055, site: 'body', sway: 0.9, c: sp.color.belly },
          { kind: 'filament', n: 8, len: 0.065, site: 'jaw', sway: 0.92, c: sp.color.belly },
        ],
        wart: [
          { kind: 'wart', n: 160, len: 0.011, site: 'body', clump: 0.55, jitter: 0.5 },
        ],
        tubercle: [
          { kind: 'tubercle', n: 20, len: 0.012, rows: [0.18, 0.5, 0.82], s0: 0.18, s1: 0.96, r: 0.72 },
        ],
        prickle: [
          { kind: 'prickle', n: 130, len: 0.022, site: 'body', lean: 36, c: '#f2ead8' },
        ],
      };
      sp.tags = defaults[kind];
    });
  };

  const exportGenomeJson = () => {
    const blob = new Blob([JSON.stringify(species, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${species.id || 'specimen'}-3d-genome.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const primaryTag = species.tags?.[0];
  const primaryDorsal = species.fins.dorsal?.[0];

  return (
    <div className="pointer-events-auto absolute right-3 top-14 z-30 flex w-80 max-w-[calc(100vw-24px)] max-h-[calc(100%-130px)] flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#071622]/92 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.65)] backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0a1e2e]/90 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Sliders size={15} className="text-cyan-300" />
          <span className="text-xs font-semibold tracking-wide text-white">
            3D Anatomy &amp; Dermis Sculptor
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close anatomy sculptor"
          className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-4 gap-1 border-b border-white/10 bg-[#06121c] p-1.5 text-[11px] font-medium">
        {([
          ['body', 'Anatomy'],
          ['skin', 'Skin & UV'],
          ['fins', 'Fins & Tail'],
          ['dermis', 'Skin Tags'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSec(id)}
            className={`rounded-lg py-1.5 transition ${
              sec === id
                ? 'bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-300/35'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5 text-xs">
        {sec === 'body' && (
          <>
            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>3D Girth / Lateral Width</span>
                <span className="font-mono text-cyan-300">{species.body.W.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={0.18}
                max={1.25}
                step={0.02}
                value={species.body.W}
                onChange={(e) => update((s) => { s.body.W = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Cross-Section Round → Boxy</span>
                <span className="font-mono text-cyan-300">{species.body.sq.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={1.6}
                max={4.2}
                step={0.05}
                value={species.body.sq}
                onChange={(e) => update((s) => { s.body.sq = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Eye Diameter (% SL)</span>
                <span className="font-mono text-cyan-300">{(species.eye.d * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0.008}
                max={0.09}
                step={0.002}
                value={species.eye.d}
                onChange={(e) => update((s) => { s.eye.d = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Jaw Gape (% SL)</span>
                <span className="font-mono text-cyan-300">{(species.mouth.gape * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.18}
                step={0.004}
                value={species.mouth.gape}
                onChange={(e) => update((s) => { s.mouth.gape = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-slate-300">Dentition / Teeth Type</span>
              <select
                value={species.mouth.teeth}
                onChange={(e) =>
                  update((s) => {
                    s.mouth.teeth = e.target.value as TeethKind;
                    if (s.mouth.teeth !== 'none' && s.mouth.tn === 0) {
                      s.mouth.tn = 10;
                      s.mouth.ts = 0.01;
                    }
                  })
                }
                className="rounded-lg border border-white/15 bg-[#051019] px-2.5 py-1.5 text-white"
              >
                {TEETH_KINDS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {sec === 'skin' && (
          <>
            {species.color.photoSkin && (
              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>2D Unwrapped Photo-Skin Blend</span>
                  <span className="font-mono text-emerald-300">
                    {Math.round((species.color.photoBlend ?? 0.86) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={species.color.photoBlend ?? 0.86}
                  onChange={(e) => update((s) => { s.color.photoBlend = Number(e.target.value); })}
                  className="accent-emerald-400"
                />
              </label>
            )}

            <div className="grid grid-cols-3 gap-2">
              {([
                ['top', 'Dorsal'],
                ['side', 'Flank'],
                ['belly', 'Belly'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
                  <span className="text-[10px] text-slate-400">{label}</span>
                  <input
                    type="color"
                    value={species.color[key]}
                    onChange={(e) => update((s) => { s.color[key] = e.target.value; })}
                    className="h-6 w-full cursor-pointer rounded bg-transparent"
                  />
                </label>
              ))}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-slate-300">Integument / Scale Architecture</span>
              <select
                value={species.skin.kind}
                onChange={(e) =>
                  update((s) => {
                    const k = e.target.value as SkinSpec['kind'];
                    s.skin.kind = k;
                    if ((k === 'cycloid' || k === 'ctenoid' || k === 'ganoid') && s.skin.scales === 0) {
                      s.skin.scales = 42;
                    }
                  })
                }
                className="rounded-lg border border-white/15 bg-[#051019] px-2.5 py-1.5 text-white"
              >
                {SKIN_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Lateral-Line Scale Count</span>
                <span className="font-mono text-cyan-300">{species.skin.scales}</span>
              </div>
              <input
                type="range"
                min={0}
                max={95}
                step={1}
                value={species.skin.scales}
                onChange={(e) => update((s) => { s.skin.scales = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Scale / Dermal Relief Bump</span>
                <span className="font-mono text-cyan-300">{species.skin.bump.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.8}
                step={0.05}
                value={species.skin.bump}
                onChange={(e) => update((s) => { s.skin.bump = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Iridescence &amp; Guanine Sheen</span>
                <span className="font-mono text-cyan-300">
                  {Math.round((species.color.iri ?? 0.15) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.04}
                value={species.color.iri ?? 0.15}
                onChange={(e) => update((s) => { s.color.iri = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>
          </>
        )}

        {sec === 'fins' && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-slate-300">Caudal Tail Architecture</span>
              <select
                value={species.fins.caudal.type}
                onChange={(e) =>
                  update((s) => {
                    s.fins.caudal.type = e.target.value as CaudalType;
                    delete s.fins.caudal.customTrail;
                    if (s.fins.caudal.type !== 'none' && s.fins.caudal.span < 0.08) {
                      s.fins.caudal.span = 0.26;
                      s.fins.caudal.len = 0.18;
                    }
                  })
                }
                className="rounded-lg border border-white/15 bg-[#051019] px-2.5 py-1.5 text-white"
              >
                {CAUDAL_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Caudal Tail Span (% SL)</span>
                <span className="font-mono text-cyan-300">
                  {(species.fins.caudal.span * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={0.65}
                step={0.01}
                value={species.fins.caudal.span}
                onChange={(e) => update((s) => { s.fins.caudal.span = Number(e.target.value); })}
                className="accent-cyan-400"
              />
            </label>

            {primaryDorsal && (
              <>
                <label className="flex flex-col gap-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Primary Dorsal Height (% SL)</span>
                    <span className="font-mono text-cyan-300">
                      {(primaryDorsal.h * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.02}
                    max={0.42}
                    step={0.005}
                    value={primaryDorsal.h}
                    onChange={(e) =>
                      update((s) => {
                        if (s.fins.dorsal?.[0]) s.fins.dorsal[0].h = Number(e.target.value);
                      })
                    }
                    className="accent-cyan-400"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Dorsal Spine Incision</span>
                    <span className="font-mono text-cyan-300">
                      {Math.round((primaryDorsal.incise ?? 0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.9}
                    step={0.04}
                    value={primaryDorsal.incise ?? 0}
                    onChange={(e) =>
                      update((s) => {
                        if (s.fins.dorsal?.[0]) {
                          const v = Number(e.target.value);
                          s.fins.dorsal[0].incise = v;
                          if (v > 0.25) s.fins.dorsal[0].shape = 'spiny';
                        }
                      })
                    }
                    className="accent-cyan-400"
                  />
                </label>
              </>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-slate-300">Swimming Biomechanics</span>
              <select
                value={species.swim.mode}
                onChange={(e) =>
                  update((s) => {
                    s.swim.mode = e.target.value as SwimSpec['mode'];
                  })
                }
                className="rounded-lg border border-white/15 bg-[#051019] px-2.5 py-1.5 text-white"
              >
                {SWIM_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {sec === 'dermis' && (
          <>
            <p className="text-[11px] leading-relaxed text-slate-300/85">
              Grow living dermal appendages directly from the 3D skin with concave fillets and root UV continuity:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['cirrus', 'Branched Cirri'],
                ['flap', 'Leafy Skin Flaps'],
                ['filament', 'Sensory Filaments'],
                ['wart', 'Stonefish Warts'],
                ['tubercle', 'Bony Tubercles'],
                ['prickle', 'Spiny Prickles'],
                ['lure', 'Glowing Head Lure'],
                ['clear', 'Smooth (Clear All)'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => applyDermalPreset(k)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition ${
                    primaryTag?.kind === k
                      ? 'border-emerald-300 bg-emerald-400/20 text-emerald-100'
                      : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-300/40'
                  }`}
                >
                  <Sparkles size={10} className="mr-1 inline text-cyan-300" />
                  {label}
                </button>
              ))}
            </div>

            {primaryTag && (
              <>
                <label className="flex flex-col gap-1 pt-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Outgrowth Length (% SL)</span>
                    <span className="font-mono text-emerald-300">
                      {(primaryTag.len * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.008}
                    max={0.095}
                    step={0.003}
                    value={primaryTag.len}
                    onChange={(e) =>
                      update((s) => {
                        const v = Number(e.target.value);
                        s.tags?.forEach((t) => { t.len = v; });
                      })
                    }
                    className="accent-emerald-400"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Outgrowth Density</span>
                    <span className="font-mono text-emerald-300">{primaryTag.n}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={180}
                    step={2}
                    value={primaryTag.n}
                    onChange={(e) =>
                      update((s) => {
                        if (s.tags?.[0]) s.tags[0].n = Number(e.target.value);
                      })
                    }
                    className="accent-emerald-400"
                  />
                </label>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-[#091a28] px-3.5 py-2.5">
        {canSaveDb && (
          <button
            type="button"
            disabled={savingDb}
            onClick={onSaveDb}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-400/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-300/35 hover:bg-cyan-400/30 disabled:opacity-50"
          >
            <Save size={13} /> {savingDb ? 'Saving…' : 'Save to DB Vault'}
          </button>
        )}
        <button
          type="button"
          onClick={exportGenomeJson}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
        >
          <Download size={13} /> JSON
        </button>
      </div>
    </div>
  );
}
