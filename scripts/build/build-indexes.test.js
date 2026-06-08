import { describe, it, expect } from "vitest";
import { buildIndexes } from "./build-indexes.mjs";

const makeCard = (oracle_id, name, illustration_id, image_uris) => ({
  oracle_id,
  name,
  set: "tst",
  collector_number: "1",
  scryfall_uri: `https://scryfall.com/card/tst/1/${name.toLowerCase().replace(/\s/g, "-")}`,
  illustration_id,
  image_uris,
});

describe("buildIndexes", () => {
  const uniqueArtwork = [
    makeCard("oid-1", "Gray Wolf", "ill-1", {
      art_crop: "https://img/art.jpg",
      normal: "https://img/normal.jpg",
    }),
  ];

  it("builds cardByOracleId from uniqueArtwork", () => {
    const { cardByOracleId } = buildIndexes({ uniqueArtwork });
    expect(cardByOracleId.get("oid-1")).toEqual({
      name: "Gray Wolf",
      uri: "https://scryfall.com/card/tst/1/gray-wolf",
    });
  });

  it("builds artByIllustrationId from art_crop", () => {
    const { artByIllustrationId } = buildIndexes({ uniqueArtwork });
    expect(artByIllustrationId.get("ill-1")).toBe("https://img/art.jpg");
  });

  it("builds cardImgByIllustrationId from normal image", () => {
    const { cardImgByIllustrationId } = buildIndexes({ uniqueArtwork });
    expect(cardImgByIllustrationId.get("ill-1")).toBe("https://img/normal.jpg");
  });

  it("builds scryfallByIllustrationId as a tagger URL from set and collector_number", () => {
    const { scryfallByIllustrationId } = buildIndexes({ uniqueArtwork });
    expect(scryfallByIllustrationId.get("ill-1")).toBe(
      "https://tagger.scryfall.com/card/tst/1",
    );
  });

  it("builds altByIllustrationId as 'Name (set/cn)'", () => {
    const { altByIllustrationId } = buildIndexes({ uniqueArtwork });
    expect(altByIllustrationId.get("ill-1")).toBe("Gray Wolf (tst/1)");
  });

  it("builds illToOracle", () => {
    const { illToOracle } = buildIndexes({ uniqueArtwork });
    expect(illToOracle.get("ill-1")).toBe("oid-1");
  });

  it("skips cards with no illustration_id", () => {
    const result = buildIndexes({
      uniqueArtwork: [{ oracle_id: "x", name: "X", scryfall_uri: "" }],
    });
    expect(result.illToOracle.size).toBe(0);
  });

  it("skips cards from sets in SKIP_SETS (e.g. dbl)", () => {
    const result = buildIndexes({
      uniqueArtwork: [
        makeCard("oid-dbl", "Some Card", "ill-dbl", {
          art_crop: "https://img/dbl-art.jpg",
          normal: "https://img/dbl-normal.jpg",
        }),
      ].map((c) => ({ ...c, set: "dbl" })),
    });
    expect(result.illToOracle.size).toBe(0);
    expect(result.artByIllustrationId.size).toBe(0);
  });

  it("indexes each face of a double-faced card by its own illustration_id", () => {
    const artwork = [
      {
        oracle_id: "oid-dfc",
        name: "Werewolf // Wolf",
        set: "tst",
        collector_number: "2",
        scryfall_uri: "https://scryfall.com/card/tst/2/werewolf",
        // no top-level illustration_id — DFC pattern
        card_faces: [
          {
            illustration_id: "ill-front",
            image_uris: {
              art_crop: "https://img/front-art.jpg",
              normal: "https://img/front-normal.jpg",
            },
          },
          {
            illustration_id: "ill-back",
            image_uris: {
              art_crop: "https://img/back-art.jpg",
              normal: "https://img/back-normal.jpg",
            },
          },
        ],
      },
    ];
    const result = buildIndexes({ uniqueArtwork: artwork });
    expect(result.artByIllustrationId.get("ill-front")).toBe("https://img/front-art.jpg");
    expect(result.artByIllustrationId.get("ill-back")).toBe("https://img/back-art.jpg");
    expect(result.cardImgByIllustrationId.get("ill-front")).toBe("https://img/front-normal.jpg");
    expect(result.illToOracle.get("ill-front")).toBe("oid-dfc");
    expect(result.illToOracle.get("ill-back")).toBe("oid-dfc");
  });
});
