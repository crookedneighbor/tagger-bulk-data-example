function scryfallToTagger(scryfallUri) {
  // https://scryfall.com/card/set/num/name?... → https://tagger.scryfall.com/card/set/num
  try {
    const url = new URL(scryfallUri);
    const [, , set, num] = url.pathname.split("/");
    return `https://tagger.scryfall.com/card/${set}/${num}`;
  } catch {
    return scryfallUri;
  }
}

export function buildDebugPage({ animals, actions, cards }) {
  const sections = animals.map((animal) => {
    const prints = Object.entries(animal.c).flatMap(([oid, items]) =>
      items.map((item) => ({
        name: cards[oid]?.n ?? "",
        artUrl: item.bg ?? item.a,
        taggerUrl: scryfallToTagger(item.s),
      })),
    );

    const printLinks = prints
      .map(
        (p) => `<a href="${p.taggerUrl}" target="_blank" title="${p.name}">
          <img src="${p.artUrl}" alt="${p.name}" loading="lazy" />
        </a>`,
      )
      .join("");

    return `
      <details>
        <summary>${animal.l} <span class="count">${prints.length}</span></summary>
        <div class="prints">${printLinks}</div>
      </details>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Debug — MTG Bestiary</title>
  <style>
    body { font-family: sans-serif; max-width: 1200px; margin: 0 auto; padding: 1rem 2rem; background: #111; color: #ddd; }
    h1 { color: #d4a843; }
    details { margin: 0.4rem 0; }
    summary { cursor: pointer; padding: 0.4rem 0.75rem; background: #1e1e2e; border-radius: 4px; user-select: none; font-size: 1.1rem; font-weight: bold; color: #d4a843; }
    summary:hover { background: #2a2a3e; }
    .count { color: #9a9a9a; font-size: 0.85em; margin-left: 0.5rem; }
    .prints { display: flex; flex-wrap: wrap; gap: 6px; padding: 0.75rem 0.5rem; }
    .prints a { flex-grow: 1 }
    .prints a img { height: 200px; width: 100%; object-fit: cover; border-radius: 3px; display: block; }
    .prints a:hover img { outline: 2px solid #d4a843; }
  </style>
</head>
<body>
  <h1>Debug</h1>
  <p style="color:#9a9a9a">${animals.length} animals · ${Object.keys(cards).length} cards</p>
  ${sections.join("")}
</body>
</html>`;
}
