import { describe, it, expect, vi } from "vitest";

vi.mock("./action-groups.mjs", () => ({
  ACTION_GROUPS: [{ l: "eating", ids: ["action-tag-id"] }],
}));

const { buildBestiary } = await import("./bestiary.mjs");

const artTagsRaw = [
  {
    id: "animal-root",
    label: "animal",
    uri: "",
    child_ids: ["wolf-id"],
    taggings: [],
  },
  {
    id: "character-root",
    label: "character",
    uri: "",
    child_ids: [],
    taggings: [],
  },
  {
    id: "wolf-id",
    label: "wolf",
    uri: "https://tagger.scryfall.com/tags/wolf",
    child_ids: [],
    taggings: [{ illustration_id: "ill-1" }],
  },
];

const oracleTagsRaw = [
  {
    id: "action-tag-id",
    label: "devour",
    uri: "",
    taggings: [{ oracle_id: "oid-1" }],
  },
];

const indexes = {
  cardByOracleId: new Map([
    ["oid-1", { name: "Wolves' Pride", uri: "https://scryfall.com/1" }],
  ]),
  artByIllustrationId: new Map([["ill-1", "https://img/art.jpg"]]),
  cardImgByIllustrationId: new Map([["ill-1", "https://img/normal.jpg"]]),
  scryfallByIllustrationId: new Map([["ill-1", "https://scryfall.com/card/1"]]),
  illToOracle: new Map([["ill-1", "oid-1"]]),
};

describe("buildBestiary", () => {
  const result = buildBestiary(artTagsRaw, oracleTagsRaw, indexes);

  it("returns animals, actions, and cards", () => {
    expect(result).toHaveProperty("animals");
    expect(result).toHaveProperty("actions");
    expect(result).toHaveProperty("cards");
  });

  it("includes the wolf animal", () => {
    expect(result.animals).toHaveLength(1);
    expect(result.animals[0].l).toBe("wolf");
  });

  it("includes the eating action group", () => {
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].l).toBe("eating");
  });

  it("associates the card with the wolf", () => {
    const wolf = result.animals[0];
    expect(wolf.c["oid-1"]).toBeDefined();
    expect(wolf.c["oid-1"][0].a).toBe("https://img/normal.jpg");
  });

  it("populates the cards lookup", () => {
    expect(result.cards["oid-1"]).toEqual({
      n: "Wolves' Pride",
      s: "https://scryfall.com/1",
    });
  });

  it("excludes animals with no matching action OIDs", () => {
    const noOverlapTags = [
      ...artTagsRaw,
      {
        id: "bear-id",
        label: "bear",
        uri: "",
        child_ids: [],
        taggings: [{ illustration_id: "ill-bear" }],
      },
      { ...artTagsRaw[0], child_ids: ["wolf-id", "bear-id"] },
    ];
    // bear has no card overlapping with eating action
    const r = buildBestiary(noOverlapTags, oracleTagsRaw, {
      ...indexes,
      illToOracle: new Map([["ill-1", "oid-1"]]), // ill-bear not in map
    });
    expect(r.animals.find((a) => a.l === "bear")).toBeUndefined();
  });

  it("sorts animals alphabetically", () => {
    const artWithTwo = [
      {
        id: "animal-root",
        label: "animal",
        uri: "",
        child_ids: ["zebra-id", "wolf-id"],
        taggings: [],
      },
      {
        id: "character-root",
        label: "character",
        uri: "",
        child_ids: [],
        taggings: [],
      },
      {
        id: "wolf-id",
        label: "wolf",
        uri: "",
        child_ids: [],
        taggings: [{ illustration_id: "ill-1" }],
      },
      {
        id: "zebra-id",
        label: "zebra",
        uri: "",
        child_ids: [],
        taggings: [{ illustration_id: "ill-1" }],
      },
    ];
    const r = buildBestiary(artWithTwo, oracleTagsRaw, indexes);
    expect(r.animals[0].l).toBe("wolf");
    expect(r.animals[1].l).toBe("zebra");
  });
});
