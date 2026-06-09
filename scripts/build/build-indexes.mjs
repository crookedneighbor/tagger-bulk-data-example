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
    if (SKIP_SETS.has(card.set)) continue;

    if (card.oracle_id && card.name)
      cardByOracleId.set(card.oracle_id, {
        name: card.name,
        uri: card.scryfall_uri,
      });

    const faces = card.illustration_id ? [card] : (card.card_faces ?? []);

    for (const face of faces) {
      if (!face.illustration_id) continue;

      const oracleId = card.oracle_id ?? face.oracle_id;

      // Reversible cards have oracle_id and name on each face rather than the top-level card.
      if (!card.oracle_id && face.oracle_id && face.name)
        cardByOracleId.set(face.oracle_id, {
          name: face.name,
          uri: card.scryfall_uri,
        });

      const artCrop = face.image_uris?.art_crop;
      const cardImg = face.image_uris?.normal;
      if (artCrop) artByIllustrationId.set(face.illustration_id, artCrop);
      if (cardImg) cardImgByIllustrationId.set(face.illustration_id, cardImg);
      if (card.set && card.collector_number) {
        scryfallByIllustrationId.set(
          face.illustration_id,
          `https://tagger.scryfall.com/card/${card.set}/${card.collector_number}`,
        );
        const name = card.name ?? face.name;
        if (name)
          altByIllustrationId.set(
            face.illustration_id,
            `${name} (${card.set}/${card.collector_number})`,
          );
      }
      if (oracleId) illToOracle.set(face.illustration_id, oracleId);
    }
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
