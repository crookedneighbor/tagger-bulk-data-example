import { createWriteStream, mkdirSync, readFileSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

const BULK_DATA_API = "https://api.scryfall.com/bulk-data";
const OUT_DIR = "data";
const TYPES = new Set(["unique_artwork", "art_tags", "oracle_tags"]);
const HEADERS = { "User-Agent": `tagger-bulk-data-example/${version}` };

mkdirSync(OUT_DIR, { recursive: true });

console.log("Fetching bulk data index…");
const index = await fetch(BULK_DATA_API, { headers: HEADERS }).then((r) =>
  r.json(),
);
const entries = index.data.filter((e) => TYPES.has(e.type));

if (entries.length !== TYPES.size) {
  const found = new Set(entries.map((e) => e.type));
  const missing = [...TYPES].filter((t) => !found.has(t));
  throw new Error(`Missing bulk data types: ${missing.join(", ")}`);
}

for (const { type, name, download_uri } of entries) {
  const outPath = path.join(OUT_DIR, `${type}.json`);
  console.log(`Downloading ${name} → ${outPath}`);
  const res = await fetch(download_uri, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to download ${name}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
  console.log(`  saved ${outPath}`);
}

console.log("Done.");
