const SKIP_SETS = new Set([
  "dbl", // Double Feature - B&W versions of illustrations already used in the app
]);

export function buildIndexes({ uniqueArtwork }) {
  const cardByOracleId = new Map();
  const artByIllustrationId = new Map();
  const cardImgByIllustrationId = new Map();
  const scryfallByIllustrationId = new Map();
  const altByIllustrationId = new Map();
  const illToOracle = new Map();

  for (const card of uniqueArtwork) {
    if (!card.illustration_id) continue;
    if (SKIP_SETS.has(card.set)) continue;
    if (card.oracle_id && card.name)
      cardByOracleId.set(card.oracle_id, {
        name: card.name,
        uri: card.scryfall_uri,
      });
    const artCrop =
      card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop;
    const cardImg =
      card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
    if (artCrop) artByIllustrationId.set(card.illustration_id, artCrop);
    if (cardImg) cardImgByIllustrationId.set(card.illustration_id, cardImg);
    if (card.set && card.collector_number) {
      scryfallByIllustrationId.set(
        card.illustration_id,
        `https://tagger.scryfall.com/card/${card.set}/${card.collector_number}`,
      );
      if (card.name)
        altByIllustrationId.set(
          card.illustration_id,
          `${card.name} (${card.set}/${card.collector_number})`,
        );
    }
    if (card.oracle_id) illToOracle.set(card.illustration_id, card.oracle_id);
  }

  return {
    cardByOracleId,
    artByIllustrationId,
    cardImgByIllustrationId,
    scryfallByIllustrationId,
    altByIllustrationId,
    illToOracle,
  };
}
