import { describe, it, expect } from "vitest";
import { buildOracleTags } from "./oracle-tags.mjs";

const makeTag = (label, oracleIds) => ({
  label,
  uri: `https://tagger.scryfall.com/tags/${label}`,
  taggings: oracleIds.map((oracle_id) => ({ oracle_id })),
});

describe("buildOracleTags", () => {
  it("maps tags to compact format", () => {
    const cardMap = new Map([
      ["oid-1", { name: "Llanowar Elves", uri: "https://scryfall.com/card/1" }],
    ]);
    const result = buildOracleTags([makeTag("elf", ["oid-1"])], cardMap);
    expect(result).toEqual([
      {
        l: "elf",
        u: "https://tagger.scryfall.com/tags/elf",
        c: [{ n: "Llanowar Elves", s: "https://scryfall.com/card/1" }],
      },
    ]);
  });

  it("excludes tags with no matching cards", () => {
    const result = buildOracleTags(
      [makeTag("unknown", ["missing"])],
      new Map(),
    );
    expect(result).toHaveLength(0);
  });

  it("skips individual taggings not in the card map", () => {
    const cardMap = new Map([["oid-a", { name: "Card A", uri: "uri-a" }]]);
    const tag = makeTag("creature", ["oid-a", "missing"]);
    const result = buildOracleTags([tag], cardMap);
    expect(result[0].c).toHaveLength(1);
  });

  it("sorts results alphabetically by label", () => {
    const cardMap = new Map([
      ["oid-1", { name: "A", uri: "" }],
      ["oid-2", { name: "B", uri: "" }],
    ]);
    const result = buildOracleTags(
      [makeTag("zombie", ["oid-1"]), makeTag("angel", ["oid-2"])],
      cardMap,
    );
    expect(result[0].l).toBe("angel");
    expect(result[1].l).toBe("zombie");
  });
});
