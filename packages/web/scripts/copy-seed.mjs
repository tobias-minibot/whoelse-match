import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const destDir = path.join(here, "..", "data");
const dest = path.join(destDir, "seed.json");
const candidates = [
  path.join(here, "..", "..", "..", "data", "seed.json"),
  path.join(process.cwd(), "..", "..", "data", "seed.json"),
  path.join(process.cwd(), "data", "seed.json"),
];

const src = candidates.find((p) => existsSync(p));
if (!src) {
  if (existsSync(dest)) {
    console.log("whoelse: using existing packages/web/data/seed.json");
    process.exit(0);
  }
  throw new Error("copy-seed: could not find data/seed.json");
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`whoelse: copied seed → ${dest}`);
