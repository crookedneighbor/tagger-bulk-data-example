import { readFileSync } from "fs";

export function loadData() {
  return {
    uniqueArtwork: JSON.parse(readFileSync("data/unique_artwork.json")),
    artTagsRaw: JSON.parse(readFileSync("data/art_tags.json")),
    oracleTagsRaw: JSON.parse(readFileSync("data/oracle_tags.json")),
  };
}
