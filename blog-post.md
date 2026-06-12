# Building with Scryfall's Tagger Bulk Data

Scryfall publishes daily bulk data files that give you access to the entire card database, and as of June 6, 2026, you can now download the entirety of the `art_tags` and `oracle_tags` from [Tagger](https://tagger.scryfall.com), a community-curated system for tagging the artwork and functional pieces of each Magic card.

This post walks through how to use those files effectively, using an example app — an MTG Bestiary that pairs art of animals in Magic: The Gathering with functional tags for actions those animals might take (e.g., "Flying Bird", "Biting Wolf", "Poisonous Snake").

Each code snippet is written in [Node.js](https://nodejs.org/), but the examples should be easy to translate to any programming language. For a full example integration, check out [the example repo](https://github.com/crookedneighbor/tagger-bulk-data-example).


---

## What's in the Tagger Bulk Data

The `art_tags` file contains tags applied to individual card **illustrations** — things visible in the art itself: animals, characters, emotions, environments, objects. The `oracle_tags` file contains tags applied to **oracle cards** — things about the card's rules text.

Each tag object looks like this:

```json
{
  "object": "tag",
  "id": "d624c569-2f8b-4095-9359-4ac3c3309d64",
  "label": "wolf",
  "slug": "wolf",
  "type": "illustration",
  "uri": "https://tagger.scryfall.com/tags/artwork/wolf",
  "description": null,
  "parent_ids": ["32e84266-800f-427c-9b9e-d0138c7491db"],
  "child_ids": [
    "95f16169-8089-4335-a72c-59b907135915",
    "9b072500-572a-4020-96e0-8f295218bfde",
    "fd028b80-6dd6-4d29-aa8c-fe3df36a4281",
    "... more uuids"
  ],
  "aliases": [],
  "taggings": [
    { "illustration_id": "b49982ea-23ee-4be8-b557-3642aae049ec", "weight": "median" },
    { "illustration_id": "19569345-8743-45b1-b7fd-f5543176f7c7", "weight": "weak", "annotation": "One of the heads"  }
  ]
}
```

And an oracle tag:

```json
{
  "object": "tag",
  "id": "097bab20-06d1-4ac0-85e7-d5b9010ab7b8",
  "label": "one-sided fight",
  "slug": "one-sided-fight",
  "type": "oracle",
  "uri": "https://tagger.scryfall.com/tags/card/one-sided-fight",
  "description": "A creature deals damage equal to its power to another. Like Fight, but without the chance to fight back. See also fling which involves sacrificing the creature.",
  "parent_ids": [
    "... parent uuids"
  ],
  "child_ids": [
    "... child uuids"
  ],
  "aliases": ["bite", "removal-bite"],
  "taggings": [
    { "oracle_id": "c49362b1-99da-4e6b-b29e-2576f803e7e8", "weight": "very_strong" },
    { "oracle_id": "866c24d2-cd66-4776-bb8b-86ba479614c8", "weight": "median"}
  ]
}
```

---

## Downloading the Data

Scryfall's bulk data API has an endpoint that lists all available files with their download URLs. Since we need tag data as well as card data, we can request this endpoint, then stream each bulk data file to disk.

```js
import { createWriteStream, mkdirSync, readFileSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const HEADERS = { "User-Agent": `tagger-bulk-data-example/${version}` };

const BULK_DATA_API = "https://api.scryfall.com/bulk-data";
const OUT_DIR = "data";
const TYPES = new Set(["unique_artwork", "art_tags", "oracle_tags"]);


console.log("Fetching bulk data index…");
const index = await fetch(BULK_DATA_API, { headers: HEADERS }).then((r) =>
  r.json(),
);
console.log("Filtering out unneeded bulk data information…");
const entries = index.data.filter((e) => TYPES.has(e.type));

for (const entry of entries) {
  const { type, name, download_uri } = entry;

  console.log(`Downloading ${name}`);
  const res = await fetch(download_uri, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to download ${name}: ${res.status}`);

  // This is where you'd save the res.body somewhere for use in your application.
  // Where you save it is up to you, though the most likely thing would be to save
  // the tag information to a database, in this example app, we're just saving it to
  // disk and then building a static HTML site using it
}

console.log("Done.");
```

A few notes:
- Always set a descriptive `User-Agent` header — it's required to use the Scryfall API.
- Stream the downloads rather than loading them into memory all at once — these files are large (the default card bulk data alone is over 500 MB).
- The index response includes `download_uri` for each type; **don't hardcode** those URLs for repeated use later, as they change daily and point to fresh download locations.

The downloaded files are plain JSON arrays. Load them with a standard JSON parser:

```js
const artTagsRaw = JSON.parse(readFileSync("data/art_tags.json"));
const oracleTagsRaw = JSON.parse(readFileSync("data/oracle_tags.json"));
const uniqueArtwork = JSON.parse(readFileSync("data/unique_artwork.json"));
```

---

## Linking the Data Together

The Tagger data and the card data use two different IDs to identify cards:

| ID | Where it appears | What it identifies |
|---|---|---|
| `illustration_id` | `art_tags` taggings, card objects | Idenfities a specific piece of artwork across printings that use the same artwork |
| `oracle_id` | `oracle_tags` taggings, card objects | A card's identitifier across all printings |

In this example app, the `unique_artwork` bulk data is the bridge. Each card entry has both IDs, so you can build lookup maps in a single pass.

Two wrinkles to watch for:

- **Double-faced cards** (transform, modal DFCs): `illustration_id` is absent at the top level — each face has its own.
- **Reversible cards**: both `illustration_id` *and* `oracle_id` are on each face rather than the top-level card.

Looping over faces handles both cases:

```js
const cardByOracleId = new Map();
const artByIllustrationId = new Map();
const illToOracle = new Map();

for (const card of uniqueArtwork) {
  // For most cards, oracle_id and name are at the top level.
  if (card.oracle_id && card.name) {
    cardByOracleId.set(card.oracle_id, {
      name: card.name,
      uri: card.scryfall_uri,
    });
  }

  // For single-faced cards, illustration_id and image_uris are at the top level.
  // For double-faced and reversible cards, each face has its own.
  const faces = card.illustration_id ? [card] : (card.card_faces ?? []);

  for (const face of faces) {
    if (!face.illustration_id) continue;

    // Reversible cards have oracle_id and name on each face rather than the top-level card.
    if (!card.oracle_id && face.oracle_id && face.name) {
      cardByOracleId.set(face.oracle_id, {
        name: face.name,
        uri: card.scryfall_uri,
      });
    }

    const oracleId = card.oracle_id ?? face.oracle_id;
    const artCrop = face.image_uris?.art_crop;
    // save the art crop url to use later
    if (artCrop) artByIllustrationId.set(face.illustration_id, artCrop);
    if (oracleId) illToOracle.set(face.illustration_id, oracleId);
  }
}
```

With these maps in place, resolving a tagging is a single lookup:

```js
// Art tag tagging → art crop URL
for (const tagging of wolfTag.taggings) {
  const artCropUrl = artByIllustrationId.get(tagging.illustration_id);
}

// Oracle tag tagging → card name
for (const tagging of oneSidedFightTag.taggings) {
  const card = cardByOracleId.get(tagging.oracle_id);
}
```

The Bestiary app needs to do both at once — find art of wolves that appear on cards with the one-sided fight oracle tag. The `illToOracle` map makes that cross-reference possible:

```js
// For each wolf illustration, get the oracle ID of the card it appears on
const oracleId = illToOracle.get(tagging.illustration_id);

// Then check if that oracle ID appears in the one-sided fight tag
if (allOneSidedFightTags.has(oracleId)) {
  // This wolf illustration is on a one-sided fight card — include it in the results
}
```

---

## Always Use UUIDs, Not Labels

This is the most important thing to get right when working with Tagger data: **never use a tag's label as an identifier.** Labels are human-readable names managed by the community, and they can change. The `id` field is a stable UUID.

The Bestiary app hardcodes the UUIDs of the tags it wants to work with. It mainly wants the immediate children of the `animal` tag, so we fetch it like:

```js
const animalRoot = artTagById.get("32e84266-800f-427c-9b9e-d0138c7491db");
```

This is the root tag for all animal-related art tags. Referencing it by UUID means the code keeps working even if the community renames it to "creature" or "fauna". 

There are several direct children of `animal` that we don't want to include in our example app, so we create a blocklist using the UUIDs:

```js
const OMIT_ANIMAL_IDS = new Set([
  "16c0b648-c78b-4d16-b476-3f08196d1966", // non-fantasy animal
  "a89c01dc-f857-4ef2-a90a-af8f55ed5fc5", // undead animal
  "ef452582-c749-4fb8-b938-3c10cfaf2d40", // hybrid animal (avatar)
]);
```

Finally, there are a handful of direct child tags that we want to expand further into their tags, instead of just listing `reptile`, we want to list `snake`, `alligator/crocodile`, `turtle`. Again, we do that by UUID so they remain the same even if the tag's name changes.

```js
const EXPAND_ANIMAL_IDS = new Set([
  "da814be7-c427-44c8-8f43-2428c4c0b967", // reptile
  "174cb37c-0b89-40f2-8932-41bfb49d952a", // amphibian
]);
```

If you're using a database, You never actually have to see the UUIDs, but for this example app, where we have no database, keeping a comment beside each UUID explaining what the uuid represents is a good idea — it makes the code readable while keeping the reference stable.

### Important!

Since the tags are community managed, it's entirely possible that they can change and break the assumptions you've coded into your application for how they work.

For instance, this app has an assumption that the direct children of the `animal` tag are the animal names we want to surface. But as you can see, we already have to account for omitting some and expanding others. If the community decides to group all the mammals under a `mammal` tag, we'll have to add the `mammal` tag to the `EXPAND_ANIMAL_IDS` set, just like `reptile` and `amphibian`. If a new category of animal is added as a direct child of the `animal` tag, and that tag doesn't make sense for this app, we'll have to update our app to exclude it as well. 

---

## Navigating the Tag Hierarchy

Tags form a tree — each tag has `parent_ids` and `child_ids` arrays. This is how Tagger represents the conceptual structure of the tagging system.

For the Bestiary, "wolf" is a direct child of "animal". "Werewolf" might be a child of "wolf". If you want all wolf art, you want art tagged with "wolf" or any of its descendants.

A simple breadth-first search collects the full subtree:

```js
// Build a map of tag ID → tag object for fast lookup
const artTagById = new Map(artTagsRaw.map((tag) => [tag.id, tag]));

function collectDescendantTagIds(startIds) {
  const result = new Set();
  const queue = [...startIds];
  while (queue.length) {
    const id = queue.shift();
    if (result.has(id)) continue;
    result.add(id);
    const tag = artTagById.get(id);
    if (tag) queue.push(...tag.child_ids);
  }
  return result;
}

// Collect all IDs in the wolf subtree (wolf, werewolf, wolf-pup, etc.)
const wolfSubtreeIds = collectDescendantTagIds(["d624c569-...wolf-id"]);

// Then gather every illustration ID across the entire subtree
const illustrations = new Set();
for (const id of wolfSubtreeIds) {
  const tag = artTagById.get(id);
  if (!tag) continue;
  for (const tagging of tag.taggings) {
    illustrations.add(tagging.illustration_id);
  }
}
```

The hierarchy also lets you handle cases where direct children are too broad or too specific for your use case. "Reptile" in the animal tree is a useful grouping tag, but for the Bestiary it makes more sense to show snake, lizard, turtle, and alligator as separate selectable animals. So instead of including "reptile" as an option, we promote its children:

```js
const animalIds = [];

for (const childId of animalRoot.child_ids) {
  if (EXPAND_ANIMAL_IDS.has(childId)) {
    // Replace the parent with its children in the UI
    const childTag = artTagById.get(childId);
    if (childTag) animalIds.push(...childTag.child_ids);
  } else {
    animalIds.push(childId);
  }
}
```

For oracle tags, the same approach works in the opposite direction — you may want to roll *up* a family of related mechanic tags under one action label. The "fighting" action in the Bestiary maps to five different oracle tags (`removal-fight`, `old fight`, `mass fight`, `buttfight`, `mutiny`) that all describe creatures fighting (we omit `one-sided fight` and put that under `biting` since `bite` is a nickname for `one-sided fight`):

```js
{
  label: "fighting",
  ids: [
    "c90eca7a-ad86-43d5-902e-05db32614b6c", // removal-fight
    "57da19f9-e386-4f00-989c-b3f0dd12deee", // old fight
    "b92d03dd-5099-4cb4-9aab-3ee4aa34c39a", // mass fight
    "573d40b6-c281-459c-988f-96fee451e368", // buttfight
    "6bb015c9-72ea-4e44-bea8-37c99d6a74ff", // mutiny
  ],
}
```

One action in the UI, multiple tags in the data — the hierarchy gives you the flexibility to define what the grouping means for your application.

The takeaway is this - you may need to refine the Tagger data to meet your specific use case for your application.

---

## Tag Descriptions and Aliases

Tags can have a `description` and a list of `aliases`. Both are useful for building search and discovery features.

```json
{
  "label": "tutor-creature-giant",
  "description": "Cards that tutor Giant cards.",
  "aliases": ["tutor-giant"]
}
```

**Descriptions** are free-form text that explain what the tag means. They're great for tooltips or help text in your UI — especially for tags whose labels are abbreviated or jargon-heavy. Some tag descriptions include markdown-style links to other Tagger pages, so if you plan to render the descriptions in your app, keep that in mind.

**Aliases** are alternative labels that the community has associated with a tag. When implementing a search system, index aliases alongside the primary label:

```js
const searchIndex = new Map();
for (const tag of oracleTagsRaw) {
  const entry = { id: tag.id, label: tag.label };
  searchIndex.set(tag.label, entry);
  for (const alias of tag.aliases) {
    searchIndex.set(alias, entry);
  }
}
```

This way a user searching for "one-sided fight" or "bite" both resolve to the same canonical tag.

---

## Tagging Weight

Every art tagging has a `weight` field, the values are:

| Weight | Meaning |
|---|---|
| `very_strong` | The subject is exemplary for this particular tag |
| `strong` | The subject is very prominent |
| `median` | The subject is clearly present |
| `weak` | The subject is present but not the focus |

For oracle tags, you'll see only `median`, `strong`, and `very_strong`.

If no weight is applied at all by the community, then the default weight of `median` is applied. Weight is a quality signal in the data. For the Bestiary, we skip `weak` taggings entirely:

```js
for (const tagging of t.taggings) {
  // if the weight is weak, the animal is probably not prominent on the card
  if (tagging.weight === "weak") continue;

  // proceed with this illustration
}
```

Without this filter, a card where a wolf appears as a tiny detail in the background would show up alongside cards where a wolf is the entire subject.

It is entirely up to you which weights you want to support in your application.

---

## Tagging Annotations

Some taggings include an `annotation` field — a short string that provides additional context about why a specific card has that tag.

```json
{
  "id": "",
  "taggings": [
    {
      "illustration_id": "bb743a92-62d2-46be-b03f-2e6974978611",
      "weight": "weak",
      "annotation": "In the bottom right at Ajani's foot."
    }
  ]
}
```

This is typically used when a card has a triggered ability that references a named card or mechanic. In this example, the card is tagged with "blood artist ability" because it has an effect identical to Blood Artist's trigger, and the annotation names the card whose ability it replicates.

Annotations are most useful when you want to surface *why* a card is tagged, not just *that* it is. For example, you could display annotations as tooltips or footnotes in a card list, or use them to group cards that emulate the same named card.

---

## Tagger Data is Community-Managed

Tagger is a community-curated dataset. Thousands of contributors tag cards, and the data is maintained through an ongoing collaborative effort. This is a strength — the coverage and detail are extraordinary — but it also means the data reflects community consensus rather than an authoritative editorial voice.

In practice this has a few implications:

**Tags may not match your application's needs.** The animal tag hierarchy includes named characters (Ajani is a child of "cat"), abstract categories ("non-fantasy animal"), and transformation states ("undead animal"). These are valid tagging concerns for Tagger's purposes, but they don't make sense as selectable animals in a Bestiary. Build a blocklist by UUID:

```js
const OMIT_ANIMAL_IDS = new Set([
  "16c0b648-c78b-4d16-b476-3f08196d1966", // non-fantasy animal
  "bf1aa5f5-a353-4f1d-a4b5-e59becf38f16", // scale animal
  "a89c01dc-f857-4ef2-a90a-af8f55ed5fc5", // undead animal
  "1f766f5b-93b8-4939-ad53-4722bb8d425e", // metal animal
  "2c306ad8-b142-4722-a88f-c73340690124", // cyborg animal
  "ef452582-c749-4fb8-b938-3c10cfaf2d40", // hybrid animal (avatar)
]);

if (OMIT_ANIMAL_IDS.has(childId)) continue;
```

**Use UUIDs for blocklists and allowlists** for the same reason you use them everywhere else — the label might change, but the tag's identity won't. The fact that there's a UUID for "orca (animal) — covered by whale" reflects a real editorial decision that existed at a point in time.

**Some edge cases need dataset-level filtering.** The Bestiary skips the `dbl` set entirely — the Double Feature set contains grayscale reprints of illustrations from other sets, and including them would produce duplicate results where the only difference between two entries is that one is black-and-white:

```js
const SKIP_SETS = new Set([
  "dbl", // Double Feature - B&W versions of illustrations already used in the app
]);

for (const card of uniqueArtwork) {
  if (SKIP_SETS.has(card.set)) continue;
  // ...
}
```

## Your Turn

Our demo application is simple and contrived. We want to see what you're building with the Tagger data! Give us a shout on [Bluesky](https://bsky.app/profile/scryfall.com) and let us see what you are working on.