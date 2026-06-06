import { slugify } from "./utils.js";

export function createRouter({
  actions,
  animals,
  actionSel,
  creatureSel,
  onNavigate,
}) {
  const BASE = new URL(document.baseURI).pathname;
  const actionBySlug = new Map(actions.map((a, i) => [slugify(a.l), i]));
  const animalBySlug = new Map(animals.map((a, i) => [slugify(a.l), i]));

  function updatePath() {
    const ai = actionSel.value;
    const ci = creatureSel.value;
    const newPath =
      ai !== "" && ci !== ""
        ? BASE +
          slugify(actions[Number(ai)].l) +
          "/" +
          slugify(animals[Number(ci)].l)
        : BASE;
    if (location.pathname !== newPath) history.pushState(null, "", newPath);
  }

  function applyPath() {
    const parts = location.pathname
      .slice(BASE.length)
      .split("/")
      .filter(Boolean);
    const ai = actionBySlug.get(parts[0]);
    const ci = animalBySlug.get(parts[1]);
    if (ai !== undefined && ci !== undefined) {
      actionSel.value = ai;
      creatureSel.value = ci;
    } else {
      actionSel.value = "";
      creatureSel.value = "";
    }
    onNavigate();
  }

  window.addEventListener("popstate", applyPath);

  return { updatePath, applyPath };
}
