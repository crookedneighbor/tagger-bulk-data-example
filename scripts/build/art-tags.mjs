export function buildArtTags(artTagsRaw, artByIllustrationId) {
  return artTagsRaw
    .map((t) => ({
      l: t.label,
      u: t.uri,
      a: t.taggings.flatMap((tg) => {
        const url = artByIllustrationId.get(tg.illustration_id);
        return url ? [url] : [];
      }),
    }))
    .filter((t) => t.a.length > 0)
    .sort((a, b) => a.l.localeCompare(b.l));
}
