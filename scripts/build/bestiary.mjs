import { ACTION_GROUPS } from "./action-groups.mjs";

const OMIT_ANIMAL_IDS = new Set([
  "16c0b648-c78b-4d16-b476-3f08196d1966", // non-fantasy animal
  "bf1aa5f5-a353-4f1d-a4b5-e59becf38f16", // scale animal
  "a89c01dc-f857-4ef2-a90a-af8f55ed5fc5", // undead animal
  "1f766f5b-93b8-4939-ad53-4722bb8d425e", // metal animal
  "2c306ad8-b142-4722-a88f-c73340690124", // cyborg animal
]);

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

function bfsIds(startIds, tagById) {
  const result = new Set();
  const queue = [...startIds];
  while (queue.length) {
    const id = queue.shift();
    if (result.has(id)) continue;
    result.add(id);
    const tag = tagById.get(id);
    if (tag) queue.push(...tag.child_ids);
  }
  return result;
}

export function buildBestiary(
  artTagsRaw,
  oracleTagsRaw,
  { cardByOracleId, artByIllustrationId, cardImgByIllustrationId, scryfallByIllustrationId, illToOracle },
) {
  const artTagById = new Map(artTagsRaw.map((t) => [t.id, t]));
  const oracleTagById = new Map(oracleTagsRaw.map((t) => [t.id, t]));

  const animalRoot = artTagsRaw.find((t) => t.label === "animal");

  // Collect every descendant of the "character" tag so named characters
  // (e.g. Ilharg, Yorion) that also appear under an animal tag can be excluded.
  const characterRoot = artTagsRaw.find((t) => t.label === "character");
  bfsIds(characterRoot.child_ids, artTagById); // result unused; kept for future filtering

  const bestiaryActions = [];
  const allActionOids = new Set();
  for (const group of ACTION_GROUPS) {
    const tags = group.ids.flatMap((id) => {
      const tag = oracleTagById.get(id);
      if (!tag) return [];
      const oids = tag.taggings.map((tg) => tg.oracle_id);
      return oids.length ? [{ label: tag.label, oids }] : [];
    });
    if (tags.length === 0) continue;
    tags.forEach(({ oids }) => oids.forEach((oid) => allActionOids.add(oid)));
    bestiaryActions.push({ l: group.l, s: slugify(group.l), tags });
  }

  const bestiaryAnimals = [];
  for (const childId of animalRoot.child_ids) {
    const childTag = artTagById.get(childId);
    if (!childTag || OMIT_ANIMAL_IDS.has(childId)) continue;

    const subtreeIds = bfsIds([childId], artTagById);

    const cards = {};
    const seenIlls = new Set();
    for (const id of subtreeIds) {
      const t = artTagById.get(id);
      if (!t) continue;
      for (const tg of t.taggings) {
        if (seenIlls.has(tg.illustration_id)) continue;
        seenIlls.add(tg.illustration_id);
        const oid = illToOracle.get(tg.illustration_id);
        const cardImg = cardImgByIllustrationId.get(tg.illustration_id);
        const artCrop = artByIllustrationId.get(tg.illustration_id);
        const uri = scryfallByIllustrationId.get(tg.illustration_id);
        if (!oid || !cardImg || !uri) continue;
        if (!cards[oid]) cards[oid] = [];
        cards[oid].push({ a: cardImg, bg: artCrop ?? cardImg, s: uri });
      }
    }

    if (Object.keys(cards).some((oid) => allActionOids.has(oid))) {
      bestiaryAnimals.push({
        l: childTag.label,
        s: slugify(childTag.label),
        u: childTag.uri,
        c: cards,
      });
    }
  }
  bestiaryAnimals.sort((a, b) => a.l.localeCompare(b.l));

  const bestiaryCards = {};
  for (const oid of allActionOids) {
    const card = cardByOracleId.get(oid);
    if (card) bestiaryCards[oid] = { n: card.name, s: card.uri };
  }

  return { animals: bestiaryAnimals, actions: bestiaryActions, cards: bestiaryCards };
}
