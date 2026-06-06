import { readFileSync, writeFileSync, mkdirSync } from "fs";

console.log("Reading data files…");
const oracleCardsRaw = JSON.parse(readFileSync("data/oracle_cards.json"));
const uniqueArtwork = JSON.parse(readFileSync("data/unique_artwork.json"));
const artTagsRaw = JSON.parse(readFileSync("data/art_tags.json"));
const oracleTagsRaw = JSON.parse(readFileSync("data/oracle_tags.json"));

// oracle_id → { name, scryfall_uri }
const cardByOracleId = new Map(
  oracleCardsRaw.map((c) => [
    c.oracle_id,
    { name: c.name, uri: c.scryfall_uri },
  ]),
);

// illustration_id → art_crop URL
// illustration_id → scryfall_uri for the specific printing
// illustration_id → oracle_id (for bestiary cross-reference)
// Fallback to card_faces[0] for double-faced / art-series cards.
const artByIllustrationId = new Map();
const scryfallByIllustrationId = new Map();
const illToOracle = new Map();
for (const card of uniqueArtwork) {
  if (!card.illustration_id) continue;
  const artCrop =
    card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop;
  if (artCrop) artByIllustrationId.set(card.illustration_id, artCrop);
  if (card.scryfall_uri)
    scryfallByIllustrationId.set(card.illustration_id, card.scryfall_uri);
  if (card.oracle_id) illToOracle.set(card.illustration_id, card.oracle_id);
}

// Art tags: label, URI, art crop URLs for each tagged illustration.
console.log("Building art tags payload…");
const artTags = artTagsRaw
  .map((t) => ({
    l: t.label,
    u: t.uri,
    a: t.taggings.flatMap((tg) => {
      const url = artByIllustrationId.get(tg.illustration_id);
      return url ? [url] : [];
    }),
  }))
  .filter((t) => t.a.length > 0)
  .sort((a, b) => a.l.localeCompare(b.l));

// Oracle tags: label, URI, card names for each tagged oracle ID.
console.log("Building oracle tags payload…");
const oracleTags = oracleTagsRaw
  .map((t) => ({
    l: t.label,
    u: t.uri,
    c: t.taggings.flatMap((tg) => {
      const card = cardByOracleId.get(tg.oracle_id);
      return card ? [{ n: card.name, s: card.uri }] : [];
    }),
  }))
  .filter((t) => t.c.length > 0)
  .sort((a, b) => a.l.localeCompare(b.l));

console.log(
  `  art tags: ${artTags.length.toLocaleString()}, ` +
    `oracle tags: ${oracleTags.length.toLocaleString()}`,
);

mkdirSync("app", { recursive: true });

console.log("Writing app/art-tags.json…");
writeFileSync("app/art-tags.json", JSON.stringify(artTags));

console.log("Writing app/oracle-tags.json…");
writeFileSync("app/oracle-tags.json", JSON.stringify(oracleTags));

console.log("Writing app/index.html…");
const template = readFileSync("src/index.html", "utf8");
writeFileSync("app/index.html", template);

for (const [name, data] of [
  ["art-tags.json", artTags],
  ["oracle-tags.json", oracleTags],
]) {
  const bytes = Buffer.byteLength(JSON.stringify(data));
  console.log(`  app/${name}: ${(bytes / 1_048_576).toFixed(1)} MB`);
}
const htmlBytes = Buffer.byteLength(readFileSync("app/index.html"));
console.log(`  app/index.html: ${(htmlBytes / 1024).toFixed(1)} KB`);
// ── Bestiary ─────────────────────────────────────────────────────────────────

console.log("Building bestiary.json…");

// Find the "animal" art tag and collect all descendants via BFS.
const artTagById = new Map(artTagsRaw.map((t) => [t.id, t]));
const animalRoot = artTagsRaw.find((t) => t.label === "animal");
const animalIds = new Set();
const bfsQueue = [...animalRoot.child_ids];
while (bfsQueue.length) {
  const id = bfsQueue.shift();
  if (animalIds.has(id)) continue;
  animalIds.add(id);
  const tag = artTagById.get(id);
  if (tag) bfsQueue.push(...tag.child_ids);
}

// Collect all descendants of the "character" tag so we can exclude named
// characters that happen to also be animals (e.g. Ilharg, Yorion, Keruga).
const characterRoot = artTagsRaw.find((t) => t.label === "character");
const characterIds = new Set();
const charQueue = [...characterRoot.child_ids];
while (charQueue.length) {
  const id = charQueue.shift();
  if (characterIds.has(id)) continue;
  characterIds.add(id);
  const tag = artTagById.get(id);
  if (tag) charQueue.push(...tag.child_ids);
}

// Curated action groups. Each entry has a human-readable adjective label and
// an array of oracle tag UUIDs whose taggings are merged into that action.
const ACTION_GROUPS = [
  {
    l: "devouring",
    ids: [
      // devour
      "b4efa2f1-c578-41ea-a43f-2e29648b2bce",
    ],
  },
  {
    l: "stalking",
    ids: [
      // stalking
      "5cbef5fa-28be-4b57-8862-1ba55d5b6af8",
    ],
  },
  {
    l: "poisonous",
    ids: [
      // poisonous
      "c5517762-1510-43b7-af3c-4616e3c802ca",
    ],
  },
  {
    l: "jumping",
    ids: [
      // jump
      "24dc19a2-7062-4282-97f8-e4b03cddfc7b",
    ],
  },
  {
    l: "fighting",
    ids: [
      // one-sided fight
      "097bab20-06d1-4ac0-85e7-d5b9010ab7b8",
      // removal-fight
      "c90eca7a-ad86-43d5-902e-05db32614b6c",
    ],
  },
  {
    l: "firebreathing",
    ids: [
      // firebreathing
      "779a5546-5668-4525-b9c2-a159ed57d9cf",
    ],
  },
  {
    l: "rampaging",
    ids: [
      // rampage
      "5068bdd1-5290-4324-839b-5e0d4218964a",
    ],
  },
  {
    l: "tunneling",
    ids: [
      // tunneling
      "0900e01f-6e2a-4b9c-920e-5fc334abe7e5",
    ],
  },
  {
    l: "enraged",
    ids: [
      // enrage
      "a37a14b4-32e4-4680-8892-8a0e9687fe49",
    ],
  },
  {
    l: "ferocious",
    ids: [
      // ferocious
      "f21a7a5b-6c7f-4aaa-aeaa-b06660647074",
    ],
  },
  {
    l: "luring",
    ids: [
      // lure
      "0d04bd05-8061-4ea9-bafb-6816e9a3077d",
    ],
  },
  {
    l: "provoking",
    ids: [
      // provoke lite
      "fce8ec5a-0879-4038-85e8-3e6486815897",
    ],
  },
  {
    l: "flying",
    ids: [
      // high flying
      "927537e5-ba1a-4daf-87c1-3703a048617e",
      // flying counter
      "acf8bf02-6505-4ec9-a1fb-14cd1ecb0d0b",
      // gains flying
      "bb1ff66b-aee3-480f-b577-701bf30cb0fe",
      // fake flying
      "a8f23d65-1ef7-4a3b-b761-64a899c6de52",
    ],
  },
];

const oracleTagById = new Map(oracleTagsRaw.map((t) => [t.id, t]));

const bestiaryActions = [];
const allActionOids = new Set();
for (const group of ACTION_GROUPS) {
  // Build per-source-tag entries so the client can show exactly which tag(s)
  // matched each result card.
  const tags = group.ids.flatMap((id) => {
    const tag = oracleTagById.get(id);
    if (!tag) return [];
    const oids = tag.taggings.map((tg) => tg.oracle_id);
    return oids.length ? [{ label: tag.label, oids }] : [];
  });
  if (tags.length === 0) continue;
  tags.forEach(({ oids }) => oids.forEach((oid) => allActionOids.add(oid)));
  bestiaryActions.push({ l: group.l, tags });
}

const OMIT_ANIMAL_IDS = new Set([
  "16c0b648-c78b-4d16-b476-3f08196d1966", // non-fantasy animal
  "bf1aa5f5-a353-4f1d-a4b5-e59becf38f16", // scale animal
  "a89c01dc-f857-4ef2-a90a-af8f55ed5fc5", // undead animal
]);

// Build bestiary entries for each direct child of "animal".
// Cards are aggregated from the entire subtree (the direct child + all its
// descendants), so e.g. "aesthir" cards roll up under "bird".
// Individual descendant tags that are named characters are skipped.
// Entries with no oracle overlap with the action tags are dropped.
const bestiaryAnimals = [];
for (const childId of animalRoot.child_ids) {
  const childTag = artTagById.get(childId);
  if (!childTag || OMIT_ANIMAL_IDS.has(childId)) continue;

  // Collect every tag id in this subtree (including the root child itself).
  const subtreeIds = new Set([childId]);
  const q = [...childTag.child_ids];
  while (q.length) {
    const id = q.shift();
    if (subtreeIds.has(id)) continue;
    subtreeIds.add(id);
    const t = artTagById.get(id);
    if (t) q.push(...t.child_ids);
  }

  // Aggregate oracle_id → [art_crop_urls] across the subtree.
  // Track illustration_ids to avoid counting the same image twice when a
  // single illustration is tagged under multiple nodes in the subtree.
  const cards = {};
  const seenIlls = new Set();
  for (const id of subtreeIds) {
    if (characterIds.has(id)) continue;
    const t = artTagById.get(id);
    if (!t) continue;
    for (const tg of t.taggings) {
      if (seenIlls.has(tg.illustration_id)) continue;
      seenIlls.add(tg.illustration_id);
      const oid = illToOracle.get(tg.illustration_id);
      const art = artByIllustrationId.get(tg.illustration_id);
      const uri = scryfallByIllustrationId.get(tg.illustration_id);
      if (!oid || !art || !uri) continue;
      if (!cards[oid]) cards[oid] = [];
      cards[oid].push({ a: art, s: uri });
    }
  }

  if (Object.keys(cards).some((oid) => allActionOids.has(oid))) {
    bestiaryAnimals.push({ l: childTag.label, u: childTag.uri, c: cards });
  }
}
bestiaryAnimals.sort((a, b) => a.l.localeCompare(b.l));

// Cards lookup: oracle_id → { n: name, s: scryfall_uri } for action-tagged cards only.
const bestiaryCards = {};
for (const oid of allActionOids) {
  const card = cardByOracleId.get(oid);
  if (card) bestiaryCards[oid] = { n: card.name, s: card.uri };
}

writeFileSync(
  "app/bestiary.json",
  JSON.stringify({
    animals: bestiaryAnimals,
    actions: bestiaryActions,
    cards: bestiaryCards,
  }),
);
console.log(
  `  animals: ${bestiaryAnimals.length}, ` +
    `actions: ${bestiaryActions.length}, ` +
    `cards: ${Object.keys(bestiaryCards).length}`,
);

console.log("Done.");
