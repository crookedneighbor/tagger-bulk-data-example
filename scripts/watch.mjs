import { readdirSync, statSync } from "fs";
import { spawn } from "child_process";
import { join } from "path";

const WATCH_DIRS = ["src", "scripts/build"];
const POLL_MS = 500;
const buildArgs = process.argv.slice(2); // pass-through flags e.g. --debug

let timer = null;
let building = false;
let queued = false;

function runBuild(changedFile) {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  if (changedFile) console.log(`\n[watch] changed: ${changedFile}`);
  console.log("[watch] building…");

  const child = spawn("node", ["scripts/build/index.mjs", ...buildArgs], {
    stdio: "inherit",
  });

  child.on("close", (code) => {
    building = false;
    if (code !== 0) console.error(`[watch] build exited with code ${code}`);
    if (queued) {
      queued = false;
      runBuild(null);
    }
  });
}

function collectMtimes(dir, mtimes = {}) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectMtimes(full, mtimes);
    } else {
      mtimes[full] = stat.mtimeMs;
    }
  }
  return mtimes;
}

let mtimes = {};
for (const dir of WATCH_DIRS) collectMtimes(dir, mtimes);

setInterval(() => {
  if (building) return;

  const current = {};
  for (const dir of WATCH_DIRS) collectMtimes(dir, current);

  for (const [file, mtime] of Object.entries(current)) {
    if (mtimes[file] !== mtime) {
      mtimes = current;
      clearTimeout(timer);
      timer = setTimeout(() => runBuild(file), 50);
      return;
    }
  }

  mtimes = current;
}, POLL_MS);

console.log(`[watch] watching ${WATCH_DIRS.join(", ")}…`);
runBuild(null);
