export function buildOracleTags(oracleTagsRaw, cardByOracleId) {
  return oracleTagsRaw
    .map((t) => ({
      l: t.label,
      u: t.uri,
      c: t.taggings.flatMap((tg) => {
        const card = cardByOracleId.get(tg.oracle_id);
        return card ? [{ n: card.name, s: card.uri }] : [];
      }),
    }))
    .filter((t) => t.c.length > 0)
    .sort((a, b) => a.l.localeCompare(b.l));
}
