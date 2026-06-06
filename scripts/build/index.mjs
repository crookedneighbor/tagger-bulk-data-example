import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from "fs";
import { loadData } from "./load-data.mjs";
import { buildIndexes } from "./build-indexes.mjs";
import { buildArtTags } from "./art-tags.mjs";
import { buildOracleTags } from "./oracle-tags.mjs";
import { buildBestiary } from "./bestiary.mjs";
import { buildComboPages } from "./combo-pages.mjs";

console.log("Reading data files…");
const raw = loadData();

console.log("Building indexes…");
const indexes = buildIndexes(raw);

console.log("Building art tags payload…");
const artTags = buildArtTags(raw.artTagsRaw, indexes.artByIllustrationId);

console.log("Building oracle tags payload…");
const oracleTags = buildOracleTags(raw.oracleTagsRaw, indexes.cardByOracleId);
console.log(
  `  art tags: ${artTags.length.toLocaleString()}, ` +
    `oracle tags: ${oracleTags.length.toLocaleString()}`,
);

mkdirSync("dist", { recursive: true });

console.log("Writing dist/art-tags.json…");
writeFileSync("dist/art-tags.json", JSON.stringify(artTags));

console.log("Writing dist/oracle-tags.json…");
writeFileSync("dist/oracle-tags.json", JSON.stringify(oracleTags));

const template = readFileSync("src/index.html", "utf8");
console.log("Writing dist/index.html…");
writeFileSync("dist/index.html", template);

for (const file of readdirSync("src").filter((f) => f.endsWith(".js"))) {
  console.log(`Writing dist/${file}…`);
  copyFileSync(`src/${file}`, `dist/${file}`);
}

for (const [name, payload] of [
  ["art-tags.json", artTags],
  ["oracle-tags.json", oracleTags],
]) {
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  console.log(`  dist/${name}: ${(bytes / 1_048_576).toFixed(1)} MB`);
}
const htmlBytes = Buffer.byteLength(readFileSync("dist/index.html"));
console.log(`  dist/index.html: ${(htmlBytes / 1024).toFixed(1)} KB`);

console.log("Building bestiary.json…");
const bestiary = buildBestiary(raw.artTagsRaw, raw.oracleTagsRaw, indexes);
console.log(
  `  animals: ${bestiary.animals.length}, ` +
    `actions: ${bestiary.actions.length}, ` +
    `cards: ${Object.keys(bestiary.cards).length}`,
);

writeFileSync("dist/bestiary.json", JSON.stringify(bestiary));

console.log("Generating combo pages…");
const comboCount = buildComboPages(bestiary, template);
console.log(`  combo pages: ${comboCount}`);

console.log("Done.");
