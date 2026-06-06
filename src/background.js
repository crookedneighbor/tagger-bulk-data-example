export const HOME_BG =
  "https://cards.scryfall.io/art_crop/front/b/c/bc4aa918-53b9-4177-a859-f5a8eff09fe5.jpg?1562812515";

let bgFront = "a";

export function updateBackground(url) {
  const back = bgFront === "a" ? "b" : "a";
  const root = document.documentElement;
  root.style.setProperty(`--bg-${back}`, `url(${url})`);
  root.style.setProperty(`--bg-${back}-opacity`, "1");
  root.style.setProperty(`--bg-${bgFront}-opacity`, "0");
  bgFront = back;
}
