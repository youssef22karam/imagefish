// Inverse of reassemble.mjs: after editing one of the reassembled files, write it back into
// numbered parts (each ≤ 28 kB, cut on line boundaries where possible) so
// `node tools/reassemble.mjs` reproduces it exactly.
//   node tools/split.mjs
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 28000;

const TARGETS = [
  { out: 'src/engine/model.ts', partsDir: 'src/engine/parts', prefix: 'model', ext: '.ts' },
  { out: 'src/engine/shader.ts', partsDir: 'src/engine/parts', prefix: 'shader', ext: '.ts' },
  { out: 'src/engine/skin.ts', partsDir: 'src/engine/parts', prefix: 'skin', ext: '.ts' },
  { out: 'src/engine/fins.ts', partsDir: 'src/engine/parts', prefix: 'fins', ext: '.ts' },
  { out: 'src/gen/pigment.ts', partsDir: 'src/gen/parts', prefix: 'pigment', ext: '.ts' },
  { out: 'src/gen/genesis.ts', partsDir: 'src/gen/parts', prefix: 'genesis', ext: '.ts' },
  { out: 'src/vision/anatomy.ts', partsDir: 'src/vision/parts', prefix: 'anatomy', ext: '.ts' },
  { out: 'src/components/IchthyoLab.tsx', partsDir: 'src/components/parts', prefix: 'IchthyoLab', ext: '.tsx' },
  { out: 'src/app/fishes28.css', partsDir: 'src/app/parts', prefix: 'fishes28', ext: '.css' },
];

for (const t of TARGETS) {
  const src = readFileSync(join(root, t.out));
  const dir = join(root, t.partsDir);
  for (const f of readdirSync(dir)) if (f.startsWith(`${t.prefix}.part`)) unlinkSync(join(dir, f));
  let at = 0, n = 0;
  while (at < src.length) {
    let end = Math.min(src.length, at + LIMIT);
    if (end < src.length) { const nl = src.lastIndexOf(10, end - 1); if (nl > at) end = nl + 1; }
    writeFileSync(join(dir, `${t.prefix}.part${String(++n).padStart(2, '0')}${t.ext}`), src.subarray(at, end));
    at = end;
  }
  console.log(`split: ${t.out} (${src.length} bytes) -> ${n} parts`);
}
