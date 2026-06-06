import { describe, it, expect, vi } from "vitest";
import { loadData } from "./load-data.mjs";

const mockData = {
  oracle_cards: [{ oracle_id: "oid-1", name: "Test Card" }],
  unique_artwork: [{ illustration_id: "ill-1" }],
  art_tags: [{ id: "tag-1", label: "wolf" }],
  oracle_tags: [{ id: "tag-2", label: "eating" }],
};

vi.mock("fs", () => ({
  readFileSync: vi.fn((path) => {
    if (path.includes("oracle_cards"))
      return JSON.stringify(mockData.oracle_cards);
    if (path.includes("unique_artwork"))
      return JSON.stringify(mockData.unique_artwork);
    if (path.includes("art_tags")) return JSON.stringify(mockData.art_tags);
    if (path.includes("oracle_tags"))
      return JSON.stringify(mockData.oracle_tags);
    throw new Error(`Unexpected path: ${path}`);
  }),
}));

describe("loadData", () => {
  it("returns oracleCardsRaw", () => {
    const data = loadData();
    expect(data.oracleCardsRaw).toEqual(mockData.oracle_cards);
  });

  it("returns uniqueArtwork", () => {
    const data = loadData();
    expect(data.uniqueArtwork).toEqual(mockData.unique_artwork);
  });

  it("returns artTagsRaw", () => {
    const data = loadData();
    expect(data.artTagsRaw).toEqual(mockData.art_tags);
  });

  it("returns oracleTagsRaw", () => {
    const data = loadData();
    expect(data.oracleTagsRaw).toEqual(mockData.oracle_tags);
  });
});
