import { describe, it, expect } from "vitest";
import { buildIndexes } from "./build-indexes.mjs";

const makeCard = (oracle_id, name, illustration_id, image_uris) => ({
  oracle_id,
  name,
  scryfall_uri: `https://scryfall.com/card/${oracle_id}`,
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
      uri: "https://scryfall.com/card/oid-1",
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

  it("builds scryfallByIllustrationId from the artwork's scryfall_uri", () => {
    const { scryfallByIllustrationId } = buildIndexes({ uniqueArtwork });
    expect(scryfallByIllustrationId.get("ill-1")).toBeDefined();
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

  it("falls back to card_faces image when top-level image_uris is absent", () => {
    const artwork = [
      {
        oracle_id: "oid-2",
        name: "Split Card",
        scryfall_uri: "https://scryfall.com/2",
        illustration_id: "ill-2",
        card_faces: [
          {
            image_uris: {
              art_crop: "https://img/face-art.jpg",
              normal: "https://img/face-normal.jpg",
            },
          },
        ],
      },
    ];
    const result = buildIndexes({ uniqueArtwork: artwork });
    expect(result.artByIllustrationId.get("ill-2")).toBe(
      "https://img/face-art.jpg",
    );
    expect(result.cardImgByIllustrationId.get("ill-2")).toBe(
      "https://img/face-normal.jpg",
    );
  });
});
