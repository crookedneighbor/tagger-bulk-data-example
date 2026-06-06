import { describe, it, expect } from "vitest";
import { buildArtTags } from "./art-tags.mjs";

const makeTag = (label, illustrationIds) => ({
  label,
  uri: `https://tagger.scryfall.com/tags/${label}`,
  taggings: illustrationIds.map((illustration_id) => ({ illustration_id })),
});

describe("buildArtTags", () => {
  it("maps tags to compact format", () => {
    const artMap = new Map([["ill-1", "https://example.com/art.jpg"]]);
    const result = buildArtTags([makeTag("wolf", ["ill-1"])], artMap);
    expect(result).toEqual([
      {
        l: "wolf",
        u: "https://tagger.scryfall.com/tags/wolf",
        a: ["https://example.com/art.jpg"],
      },
    ]);
  });

  it("excludes tags whose illustrations are all missing from the map", () => {
    const result = buildArtTags([makeTag("ghost", ["missing-ill"])], new Map());
    expect(result).toHaveLength(0);
  });

  it("skips individual taggings not in the map but keeps the tag if others match", () => {
    const artMap = new Map([["ill-a", "https://example.com/a.jpg"]]);
    const tag = makeTag("bear", ["ill-a", "missing"]);
    const result = buildArtTags([tag], artMap);
    expect(result[0].a).toEqual(["https://example.com/a.jpg"]);
  });

  it("sorts results alphabetically by label", () => {
    const artMap = new Map([
      ["ill-1", "url1"],
      ["ill-2", "url2"],
    ]);
    const result = buildArtTags(
      [makeTag("wolf", ["ill-1"]), makeTag("bear", ["ill-2"])],
      artMap,
    );
    expect(result[0].l).toBe("bear");
    expect(result[1].l).toBe("wolf");
  });
});
