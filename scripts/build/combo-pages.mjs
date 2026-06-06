import { writeFileSync, mkdirSync } from "fs";

const toTitle = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

export function buildComboPages({ animals, actions, cards }, template) {
  const comboBase = template.replace(
    /(<head[^>]*>)/i,
    '$1\n  <base href="../">',
  );
  const actionOidSets = actions.map(
    (a) => new Set(a.tags.flatMap((t) => t.oids)),
  );

  let comboCount = 0;
  for (const [ai, action] of actions.entries()) {
    for (const animal of animals) {
      const hasOverlap = Object.keys(animal.c).some((oid) =>
        actionOidSets[ai].has(oid),
      );
      if (!hasOverlap) continue;

      const label = toTitle(action.l) + " " + toTitle(animal.l);
      const pageTitle = `${label} — MTG Bestiary`;
      const pageDesc = `Browse Magic: The Gathering cards featuring a ${animal.l} that is ${action.l}.`;
      const actionOids = actionOidSets[ai];

      let firstBg = null;
      let firstImg = null;
      let firstScryfall = null;
      let firstName = null;
      for (const [oid, items] of Object.entries(animal.c)) {
        if (!actionOids.has(oid)) continue;
        if (items.length > 0) {
          firstBg = items[0].bg ?? null;
          firstImg = items[0].a ?? null;
          firstScryfall = items[0].s ?? null;
          firstName = cards[oid]?.n ?? "";
          break;
        }
      }

      const preloadTag = firstBg
        ? `\n    <link rel="preload" as="image" href="${firstBg}" />`
        : "";
      const ogImageTag = firstBg
        ? `\n    <meta property="og:image" content="${firstBg}" />\n    <meta property="og:image:alt" content="${label}" />`
        : "";
      const resultsHtml = firstImg
        ? `<div id="results">\n      <div class="slide-hero"><a href="${escAttr(firstScryfall ?? "")}" target="_blank" rel="noopener"><img src="${firstImg}" alt="${escAttr(firstName)}" draggable="false"></a></div>\n    </div>`
        : `<div id="results"></div>`;

      const htmlAttrs = firstBg
        ? `lang="en" data-state="active" style="--bg-a: url(${firstBg})"`
        : `lang="en" data-state="active"`;

      const pageHtml = comboBase
        .replace('<html lang="en" data-state="home">', `<html ${htmlAttrs}>`)
        .replace(/<div id="results">[\s\S]*?<\/div>\s*<\/div>/, resultsHtml)
        .replace("<h1>Bestiary</h1>", `<h1><span>${label}</span></h1>`)
        .replace(
          /<!-- page-meta -->[\s\S]*?<!-- \/page-meta -->/,
          `<title>${pageTitle}</title>${preloadTag}\n    <meta name="description" content="${pageDesc}" />\n    <meta property="og:title" content="${pageTitle}" />\n    <meta property="og:description" content="${pageDesc}" />\n    <meta property="og:type" content="website" />${ogImageTag}`,
        );

      mkdirSync(`dist/${action.s}`, { recursive: true });
      writeFileSync(`dist/${action.s}/${animal.s}.html`, pageHtml);
      comboCount++;
    }
  }

  return comboCount;
}
