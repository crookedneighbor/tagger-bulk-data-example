export function buildIndexes({ oracleCardsRaw, uniqueArtwork }) {
  const cardByOracleId = new Map(
    oracleCardsRaw.map((c) => [c.oracle_id, { name: c.name, uri: c.scryfall_uri }]),
  );

  const artByIllustrationId = new Map();
  const cardImgByIllustrationId = new Map();
  const scryfallByIllustrationId = new Map();
  const illToOracle = new Map();

  for (const card of uniqueArtwork) {
    if (!card.illustration_id) continue;
    const artCrop =
      card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop;
    const cardImg =
      card.image_uris?.normal ??
      card.card_faces?.[0]?.image_uris?.normal ??
      card.image_uris?.large ??
      card.card_faces?.[0]?.image_uris?.large ??
      card.image_uris?.png ??
      card.card_faces?.[0]?.image_uris?.png;
    if (artCrop) artByIllustrationId.set(card.illustration_id, artCrop);
    if (cardImg) cardImgByIllustrationId.set(card.illustration_id, cardImg);
    if (card.scryfall_uri)
      scryfallByIllustrationId.set(card.illustration_id, card.scryfall_uri);
    if (card.oracle_id) illToOracle.set(card.illustration_id, card.oracle_id);
  }

  return {
    cardByOracleId,
    artByIllustrationId,
    cardImgByIllustrationId,
    scryfallByIllustrationId,
    illToOracle,
  };
}
