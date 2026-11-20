// Reassembles generated source files from their split parts.
// Every file in this repo is kept at or below 30,000 bytes for upload;
// the files below are stored as numbered parts and rebuilt here.
// Runs automatically before dev/build (npm pre-hooks) or manually:
//   node tools/reassemble.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = 30000;

const TARGETS = [
  { out: "src/engine/model.ts", partsDir: "src/engine/parts", prefix: "model", ext: ".ts" },
  { out: "src/engine/shader.ts", partsDir: "src/engine/parts", prefix: "shader", ext: ".ts" },
  { out: "src/engine/skin.ts", partsDir: "src/engine/parts", prefix: "skin", ext: ".ts" },
  { out: "src/engine/fins.ts", partsDir: "src/engine/parts", prefix: "fins", ext: ".ts" },
  { out: "src/gen/pigment.ts", partsDir: "src/gen/parts", prefix: "pigment", ext: ".ts" },
  { out: "src/gen/genesis.ts", partsDir: "src/gen/parts", prefix: "genesis", ext: ".ts" },
  { out: "src/vision/anatomy.ts", partsDir: "src/vision/parts", prefix: "anatomy", ext: ".ts" },
  { out: "src/components/IchthyoLab.tsx", partsDir: "src/components/parts", prefix: "IchthyoLab", ext: ".tsx" },
  { out: "src/app/fishes28.css", partsDir: "src/app/parts", prefix: "fishes28", ext: ".css" },
];

for (const t of TARGETS) {
  const dir = join(root, t.partsDir);
  const names = readdirSync(dir)
    .filter((n) => n.startsWith(t.prefix + ".part") && n.endsWith(t.ext))
    .sort();
  if (names.length === 0) {
    console.error(`reassemble: no parts found for ${t.out} in ${t.partsDir}`);
    process.exit(1);
  }
  const chunks = names.map((n) => {
    const buf = readFileSync(join(dir, n));
    if (buf.length > LIMIT) {
      console.error(`reassemble: ${t.partsDir}/${n} is ${buf.length} bytes, over the ${LIMIT}-byte limit. Split it further before building.`);
      process.exit(1);
    }
    return buf;
  });
  const out = Buffer.concat(chunks);
  writeFileSync(join(root, t.out), out);
  console.log(`reassemble: ${names.length} parts -> ${t.out} (${out.length} bytes)`);
}
