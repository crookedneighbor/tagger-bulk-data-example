import { describe, it, expect, vi } from "vitest";
import { buildBestiary } from "./bestiary.mjs";

vi.mock("./action-groups.mjs", () => ({
  ACTION_GROUPS: [{ l: "eating", ids: ["action-tag-id"] }],
}));

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
    child_ids: [],
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
  it("includes the child animals, but not characters or parent animal tag", () => {
    const result = buildBestiary(artTagsRaw, oracleTagsRaw, indexes);

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0].l).toBe("wolf");
  });

  it("includes the oracle tags within their group", () => {
    const result = buildBestiary(artTagsRaw, oracleTagsRaw, indexes);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].l).toBe("eating");
  });

  it("associates the illustration ids with their corresponding art tags", () => {
    const result = buildBestiary(artTagsRaw, oracleTagsRaw, indexes);
    const wolf = result.animals[0];

    expect(wolf.c["oid-1"]).toBeDefined();
    expect(wolf.c["oid-1"][0].a).toBe("https://img/normal.jpg");
  });

  it("populates the cards lookup", () => {
    const result = buildBestiary(artTagsRaw, oracleTagsRaw, indexes);

    expect(result.cards["oid-1"]).toEqual({
      n: "Wolves' Pride",
      s: "https://scryfall.com/1",
    });
  });

  it("expands EXPAND_ANIMAL_IDS tags into their children instead of the parent", () => {
    // reptile (da814be7) is in EXPAND_ANIMAL_IDS
    const artWithReptile = [
      {
        id: "animal-root",
        label: "animal",
        uri: "",
        child_ids: ["da814be7-c427-44c8-8f43-2428c4c0b967"],
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
        id: "da814be7-c427-44c8-8f43-2428c4c0b967",
        label: "reptile",
        uri: "",
        child_ids: ["snake-id", "lizard-id"],
        taggings: [],
      },
      {
        id: "snake-id",
        label: "snake",
        uri: "",
        child_ids: [],
        taggings: [{ illustration_id: "ill-1" }],
      },
      {
        id: "lizard-id",
        label: "lizard",
        uri: "",
        child_ids: [],
        taggings: [{ illustration_id: "ill-1" }],
      },
    ];
    const result = buildBestiary(artWithReptile, oracleTagsRaw, indexes);
    const labels = result.animals.map((a) => a.l);

    expect(labels).not.toContain("reptile");
    expect(labels).toContain("snake");
    expect(labels).toContain("lizard");
  });

  it("omits animals in OMIT_ANIMAL_IDS", () => {
    // non-fantasy animal (16c0b648) is in OMIT_ANIMAL_IDS
    const artWithOmitted = [
      {
        id: "animal-root",
        label: "animal",
        uri: "",
        child_ids: ["wolf-id", "16c0b648-c78b-4d16-b476-3f08196d1966"],
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
        id: "16c0b648-c78b-4d16-b476-3f08196d1966",
        label: "non-fantasy animal",
        uri: "",
        child_ids: [],
        taggings: [{ illustration_id: "ill-1" }],
      },
    ];
    const result = buildBestiary(artWithOmitted, oracleTagsRaw, indexes);
    const labels = result.animals.map((a) => a.l);

    expect(labels).not.toContain("non-fantasy animal");
    expect(labels).toContain("wolf");
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
    const result = buildBestiary(noOverlapTags, oracleTagsRaw, {
      ...indexes,
      illToOracle: new Map([["ill-1", "oid-1"]]), // ill-bear not in map
    });
    expect(result.animals.find((a) => a.l === "bear")).toBeUndefined();
  });

  it("collects OIDs from child oracle tags via BFS", () => {
    const oracleWithChild = [
      {
        id: "action-tag-id",
        label: "devour",
        uri: "https://tagger.scryfall.com/tags/card/devour",
        child_ids: ["child-tag-id"],
        taggings: [],
      },
      {
        id: "child-tag-id",
        label: "gives devour",
        uri: "https://tagger.scryfall.com/tags/card/gives-devour",
        child_ids: [],
        taggings: [{ oracle_id: "oid-child" }],
      },
    ];
    const indexesWithChild = {
      ...indexes,
      cardByOracleId: new Map([
        ...indexes.cardByOracleId,
        ["oid-child", { name: "Wolf Pack", uri: "https://scryfall.com/2" }],
      ]),
      illToOracle: new Map([["ill-1", "oid-child"]]),
    };
    const result = buildBestiary(artTagsRaw, oracleWithChild, indexesWithChild);

    expect(result.actions[0].tags[0].oids).toContain("oid-child");
    expect(result.animals).toHaveLength(1);
  });

  it("populates the children array on action tags", () => {
    const oracleWithChild = [
      {
        id: "action-tag-id",
        label: "devour",
        uri: "https://tagger.scryfall.com/tags/card/devour",
        child_ids: ["child-tag-id"],
        taggings: [{ oracle_id: "oid-1" }],
      },
      {
        id: "child-tag-id",
        label: "gives devour",
        uri: "https://tagger.scryfall.com/tags/card/gives-devour",
        child_ids: [],
        taggings: [],
      },
    ];
    const result = buildBestiary(artTagsRaw, oracleWithChild, indexes);
    const tag = result.actions[0].tags[0];

    expect(tag.children).toEqual([
      { label: "gives devour", uri: "https://tagger.scryfall.com/tags/card/gives-devour" },
    ]);
  });

  it("leaves children empty when the action tag has no child tags", () => {
    const result = buildBestiary(artTagsRaw, oracleTagsRaw, indexes);

    expect(result.actions[0].tags[0].children).toEqual([]);
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
        id: "zebra-id",
        label: "zebra",
        uri: "",
        child_ids: [],
        taggings: [{ illustration_id: "ill-1" }],
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
    ];
    const result = buildBestiary(artWithTwo, oracleTagsRaw, indexes);

    expect(result.animals[0].l).toBe("wolf");
    expect(result.animals[1].l).toBe("zebra");
  });
});
