import { ACTION_GROUPS } from "./action-groups.mjs";

const OMIT_ANIMAL_IDS = new Set([
  "16c0b648-c78b-4d16-b476-3f08196d1966", // non-fantasy animal
  "bf1aa5f5-a353-4f1d-a4b5-e59becf38f16", // scale animal
  "a89c01dc-f857-4ef2-a90a-af8f55ed5fc5", // undead animal
  "1f766f5b-93b8-4939-ad53-4722bb8d425e", // metal animal
  "2c306ad8-b142-4722-a88f-c73340690124", // cyborg animal
  "7caff245-0520-46f2-a8d5-252ea801ace3", // orca (animal) — covered by whale
  "ef452582-c749-4fb8-b938-3c10cfaf2d40", // hybrid animal (avatar)
]);

// Tags whose children are promoted to top-level animals instead of grouping under the parent.
const EXPAND_ANIMAL_IDS = new Set([
  "da814be7-c427-44c8-8f43-2428c4c0b967", // reptile → snake, lizard, turtle/tortoise, alligator/crocodile
  "174cb37c-0b89-40f2-8932-41bfb49d952a", // amphibian → newt, frog, salamander, tadpole
]);

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

function collectChildTagIds(startIds, tagById) {
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
  {
    cardByOracleId,
    artByIllustrationId,
    cardImgByIllustrationId,
    scryfallByIllustrationId,
    altByIllustrationId,
    illToOracle,
  },
) {
  const artTagById = new Map(artTagsRaw.map((t) => [t.id, t]));
  const oracleTagById = new Map(oracleTagsRaw.map((t) => [t.id, t]));

  const animalRoot = artTagsRaw.find((t) => t.label === "animal");

  // Collect every descendant of the "character" tag so named characters
  // (e.g. Ilharg, Yorion) that also appear under an animal tag can be excluded.
  const characterRoot = artTagsRaw.find((t) => t.label === "character");

  const bestiaryActions = [];
  const allActionOids = new Set();
  for (const group of ACTION_GROUPS) {
    const tags = group.ids.flatMap((id) => {
      const tag = oracleTagById.get(id);
      if (!tag) return [];
      const subtreeIds = collectChildTagIds([id], oracleTagById);
      const oids = [
        ...new Set(
          [...subtreeIds].flatMap((sid) =>
            (oracleTagById.get(sid)?.taggings ?? []).map((tg) => tg.oracle_id),
          ),
        ),
      ];
      const children = [...subtreeIds]
        .filter((sid) => sid !== id)
        .flatMap((sid) => {
          const ct = oracleTagById.get(sid);
          return ct ? [{ label: ct.label, uri: ct.uri }] : [];
        });
      return oids.length
        ? [{ label: tag.label, uri: tag.uri, oids, children }]
        : [];
    });
    if (tags.length === 0) continue;
    tags.forEach(({ oids }) => oids.forEach((oid) => allActionOids.add(oid)));
    bestiaryActions.push({ l: group.l, s: slugify(group.l), tags });
  }

  const animalIds = [];
  for (const childId of animalRoot.child_ids) {
    if (EXPAND_ANIMAL_IDS.has(childId)) {
      const childTag = artTagById.get(childId);
      if (childTag) animalIds.push(...childTag.child_ids);
    } else {
      animalIds.push(childId);
    }
  }

  const bestiaryAnimals = [];
  for (const childId of animalIds) {
    const childTag = artTagById.get(childId);
    if (!childTag || OMIT_ANIMAL_IDS.has(childId)) continue;

    const subtreeIds = collectChildTagIds([childId], artTagById);

    const cards = {};
    const seenIlls = new Set();
    for (const id of subtreeIds) {
      const t = artTagById.get(id);
      if (!t) continue;
      for (const tg of t.taggings) {
        if (tg.weight === "weak") continue;
        if (seenIlls.has(tg.illustration_id)) continue;
        seenIlls.add(tg.illustration_id);
        const oid = illToOracle.get(tg.illustration_id);
        const cardImg = cardImgByIllustrationId.get(tg.illustration_id);
        const artCrop = artByIllustrationId.get(tg.illustration_id);
        const uri = scryfallByIllustrationId.get(tg.illustration_id);
        if (!oid || !cardImg || !uri) continue;
        if (!cards[oid]) cards[oid] = [];
        cards[oid].push({
          a: cardImg,
          bg: artCrop ?? cardImg,
          s: uri,
          alt: altByIllustrationId.get(tg.illustration_id) ?? "",
        });
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

  return {
    animals: bestiaryAnimals,
    actions: bestiaryActions,
  };
}
