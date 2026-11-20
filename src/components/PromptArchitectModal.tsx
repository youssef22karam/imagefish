'use client';

import { useState } from 'react';
import { Check, Copy, Sparkles, Wand2, X } from 'lucide-react';
import {
  buildGlobalFishPrompt,
  FISH_SLOT_PLACEHOLDER,
  GLOBAL_MASTER_PROMPT_TEMPLATE,
  PROMPT_IDEA_PRESETS,
} from '../vision/prompts';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToUpload: () => void;
}

export default function PromptArchitectModal({
  open,
  onClose,
  onSwitchToUpload,
}: Props) {
  const [fishText, setFishText] = useState<string>(PROMPT_IDEA_PRESETS[0].fishText);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  if (!open) return null;

  const fullPrompt = buildGlobalFishPrompt(fishText);

  const copyText = async (txt: string, kind: 'full' | 'raw') => {
    try {
      await navigator.clipboard.writeText(txt);
      if (kind === 'full') {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2200);
      } else {
        setCopiedRaw(true);
        setTimeout(() => setCopiedRaw(false), 2200);
      }
    } catch {
      // clipboard fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-4xl max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-amber-300/30 bg-[#081521]/95 text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,0.75)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1d2d] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/35">
              <Wand2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Global Master Prompt Architect (2D → 3D Calibrated)
              </h2>
              <p className="text-xs text-slate-300/80">
                Paste this prompt into Midjourney, Flux, GPT-Image, Imagen, or Leonardo to generate 2D plates that reconstruct with 100% anatomical precision.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt architect"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          {/* Quick Presets */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-amber-300">
                1. Pick an Archetype or Write Any Never-Seen-Before Creature Below
              </span>
              <button
                type="button"
                onClick={() => setFishText('')}
                className="text-slate-400 hover:text-white"
              >
                Clear slot
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_IDEA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFishText(p.fishText)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                    fishText === p.fishText
                      ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-300/40'
                  }`}
                >
                  <span className="font-medium">{p.label}</span>{' '}
                  <span className="text-[10px] opacity-70">· {p.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Fish Slot */}
          <div className="rounded-xl border border-amber-300/35 bg-amber-400/5 p-4">
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-amber-200">
              <span>2. THE PART WHERE YOU WRITE THE FISH YOU WANT:</span>
              <span className="font-mono text-[11px] text-amber-300/80">{FISH_SLOT_PLACEHOLDER}</span>
            </label>
            <textarea
              rows={3}
              value={fishText}
              onChange={(e) => setFishText(e.target.value)}
              placeholder="Describe shape, colors, patterns (bars, spots, photophores), scales/armor, fins, tail type, jaws/teeth, and dermal skin tags/appendages…"
              className="w-full rounded-lg border border-amber-300/30 bg-[#051019] p-3 text-xs leading-relaxed text-white outline-none focus:border-amber-300"
            />
          </div>

          {/* Assembled Global Master Prompt */}
          <div className="rounded-xl border border-cyan-300/25 bg-[#06121d] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                3. Ready-to-Use Global Master Prompt
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(GLOBAL_MASTER_PROMPT_TEMPLATE, 'raw')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                >
                  {copiedRaw ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                  {copiedRaw ? 'Template Copied' : 'Copy Blank Template'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(fullPrompt, 'full')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
                >
                  {copiedFull ? <Check size={14} /> : <Copy size={14} />}
                  {copiedFull ? 'Copied Full Prompt!' : 'Copy Complete Prompt'}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#040c14] p-3.5 font-mono text-xs leading-relaxed text-slate-200">
              Hyper-realistic ichthyological scientific lateral profile photograph of a single{' '}
              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-semibold text-amber-200 ring-1 ring-amber-300/40">
                {fishText.trim() || FISH_SLOT_PLACEHOLDER}
              </span>
              , strict 90-degree orthographic side view facing left, full uncropped body from snout tip to caudal tail tip centered with 12% margin on all sides, all dorsal, anal, pelvic, pectoral, and caudal fins naturally unfolded and clearly separated, crisp anatomical detail of scales or skin texture, dermal skin tags/appendages if present, gill operculum or slits, lateral line, mouth cleft, and glossy eye iris, even diffused scientific studio lighting with zero harsh specular glare and zero cast shadow, isolated on a completely flat uniform solid cool-light-grey studio background (#E4EBF0), no water bubbles, no seabed, no rocks, no text, no watermarks, 8k photorealistic macro biological plate.
            </div>
          </div>

          {/* Why This Prompt Works Grid */}
          <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <strong className="block text-cyan-300">90° Orthographic Profile</strong>
              <span className="text-slate-300/80">
                Eliminates perspective distortion so snout, trunk depth, fin bases, and caudal fork measure at 1:1 true Standard Length.
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <strong className="block text-amber-300">#E4EBF0 Studio Isolation</strong>
              <span className="text-slate-300/80">
                Gives clean CIELAB separation for dark sharks, black abyssal aliens, bright reef fishes, and delicate fin spines alike.
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <strong className="block text-emerald-300">Diffused Macro Lighting</strong>
              <span className="text-slate-300/80">
                Captures pure chromatophore patterns, scale relief, and skin tags without blown-out glare for seamless 3D UV unwrapping.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0b1d2d] px-5 py-3">
          <span className="text-xs text-slate-400">
            Generate your image with any AI model, then drop it straight into the 2D → 3D Synthesizer!
          </span>
          <button
            type="button"
            onClick={onSwitchToUpload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400/20 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-300/35 hover:bg-cyan-400/30"
          >
            <Sparkles size={14} /> Open 2D → 3D Upload Studio
          </button>
        </div>
      </div>
    </div>
  );
}
