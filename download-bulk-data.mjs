import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

const BULK_DATA_API = "https://api.scryfall.com/bulk-data";
const OUT_DIR = "data";

const TYPES = ["oracle_cards", "unique_artwork", "art_tags", "oracle_tags"];

mkdirSync(OUT_DIR, { recursive: true });

for (const type of TYPES) {
  console.log(`Fetching metadata for: ${type}`);

  const meta = await fetch(`${BULK_DATA_API}/${type}`).then((r) => r.json());
  const { download_uri, name } = meta;

  const outPath = path.join(OUT_DIR, `${type}.json`);
  console.log(`Downloading ${name} -> ${outPath}`);

  const res = await fetch(download_uri);
  if (!res.ok) throw new Error(`Failed to download ${name}: ${res.status}`);

  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));

  console.log(`Saved ${outPath}\n`);
}

console.log("Done.");
