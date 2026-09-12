import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(here, "..");
const repoRoot = path.join(webRoot, "../..");

function findSource(...rel) {
  const candidates = [
    path.join(repoRoot, ...rel),
    path.join(process.cwd(), "../..", ...rel),
    path.join(process.cwd(), ...rel),
  ];
  return candidates.find((p) => existsSync(p));
}

function copySeed() {
  const destDir = path.join(webRoot, "data");
  const dest = path.join(destDir, "seed.json");
  const src = findSource("data", "seed.json");
  if (!src) {
    if (existsSync(dest)) {
      console.log("whoelse: using existing packages/web/data/seed.json");
      return;
    }
    throw new Error("copy-seed: could not find data/seed.json");
  }
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log(`whoelse: copied seed → ${dest}`);
}

/** Real directories only — Next/Vercel break when public/* are git symlinks. */
function copyPublicTree(name) {
  const dest = path.join(webRoot, "public", name);
  const src = findSource(name);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  if (!src) {
    throw new Error(`copy-static: could not find ${name}/ (needed under public/)`);
  }
  mkdirSync(path.join(webRoot, "public"), { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: true });
  if (lstatSync(dest).isSymbolicLink()) {
    throw new Error(`copy-static: public/${name} is still a symlink`);
  }
  console.log(`whoelse: copied ${name} → ${dest}`);
}

copySeed();
for (const name of ["brand", "landing", "pitch"]) copyPublicTree(name);
