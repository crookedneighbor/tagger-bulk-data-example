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
  const oracleCardsRaw = [
    {
      oracle_id: "oid-1",
      name: "Gray Wolf",
      scryfall_uri: "https://scryfall.com/1",
    },
  ];

  const uniqueArtwork = [
    makeCard("oid-1", "Gray Wolf", "ill-1", {
      art_crop: "https://img/art.jpg",
      normal: "https://img/normal.jpg",
    }),
  ];

  it("builds cardByOracleId", () => {
    const { cardByOracleId } = buildIndexes({ oracleCardsRaw, uniqueArtwork });
    expect(cardByOracleId.get("oid-1")).toEqual({
      name: "Gray Wolf",
      uri: "https://scryfall.com/1",
    });
  });

  it("builds artByIllustrationId from art_crop", () => {
    const { artByIllustrationId } = buildIndexes({
      oracleCardsRaw,
      uniqueArtwork,
    });
    expect(artByIllustrationId.get("ill-1")).toBe("https://img/art.jpg");
  });

  it("builds cardImgByIllustrationId from normal image", () => {
    const { cardImgByIllustrationId } = buildIndexes({
      oracleCardsRaw,
      uniqueArtwork,
    });
    expect(cardImgByIllustrationId.get("ill-1")).toBe("https://img/normal.jpg");
  });

  it("builds scryfallByIllustrationId from the artwork's scryfall_uri", () => {
    const { scryfallByIllustrationId } = buildIndexes({
      oracleCardsRaw,
      uniqueArtwork,
    });
    // scryfall_uri comes from uniqueArtwork, not oracleCardsRaw
    expect(scryfallByIllustrationId.get("ill-1")).toBeDefined();
  });

  it("builds illToOracle", () => {
    const { illToOracle } = buildIndexes({ oracleCardsRaw, uniqueArtwork });
    expect(illToOracle.get("ill-1")).toBe("oid-1");
  });

  it("skips cards with no illustration_id", () => {
    const result = buildIndexes({
      oracleCardsRaw: [],
      uniqueArtwork: [{ oracle_id: "x", name: "X", scryfall_uri: "" }],
    });
    expect(result.illToOracle.size).toBe(0);
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
    const result = buildIndexes({ oracleCardsRaw: [], uniqueArtwork: artwork });
    expect(result.artByIllustrationId.get("ill-2")).toBe(
      "https://img/face-art.jpg",
    );
    expect(result.cardImgByIllustrationId.get("ill-2")).toBe(
      "https://img/face-normal.jpg",
    );
  });
});
