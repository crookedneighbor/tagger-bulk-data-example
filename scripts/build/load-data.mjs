import { readFileSync } from "fs";

export function loadData() {
  return {
    oracleCardsRaw: JSON.parse(readFileSync("data/oracle_cards.json")),
    uniqueArtwork: JSON.parse(readFileSync("data/unique_artwork.json")),
    artTagsRaw: JSON.parse(readFileSync("data/art_tags.json")),
    oracleTagsRaw: JSON.parse(readFileSync("data/oracle_tags.json")),
  };
}
