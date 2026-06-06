import { esc, toTitle, slugify } from "./utils.js";
import { popH1 } from "./h1.js";
import { updateBackground, HOME_BG } from "./background.js";
import { buildSlideshow } from "./slideshow.js";

const creatureSel = document.getElementById("creature-select");
const actionSel = document.getElementById("action-select");
const resultBar = document.getElementById("result-bar");
const resultsEl = document.getElementById("results");
const randomizeBtn = document.getElementById("btn-randomize");

fetch("bestiary.json")
  .then((r) => r.json())
  .then(({ animals, actions, cards }) => {
    for (const [i, a] of animals.entries()) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = a.l;
      creatureSel.appendChild(opt);
    }

    for (const [i, a] of actions.entries()) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = a.l;
      actionSel.appendChild(opt);
    }

    creatureSel.disabled = false;
    actionSel.disabled = false;
    randomizeBtn.disabled = false;

    const animalOidSets = animals.map((a) => new Set(Object.keys(a.c)));
    const actionOidSets = actions.map(
      (a) => new Set(a.tags.flatMap((t) => t.oids)),
    );

    const BASE = new URL(document.baseURI).pathname;
    const actionBySlug = new Map(actions.map((a, i) => [slugify(a.l), i]));
    const animalBySlug = new Map(animals.map((a, i) => [slugify(a.l), i]));

    function setsOverlap(a, b) {
      const [small, large] = a.size <= b.size ? [a, b] : [b, a];
      for (const x of small) if (large.has(x)) return true;
      return false;
    }

    function updateActionDisabled(ci) {
      const animalSet = ci !== "" ? animalOidSets[Number(ci)] : null;
      for (const opt of actionSel.options) {
        if (!opt.value) continue;
        opt.disabled =
          animalSet !== null &&
          !setsOverlap(animalSet, actionOidSets[Number(opt.value)]);
      }
      if (actionSel.selectedOptions[0]?.disabled) actionSel.value = "";
    }

    function updateCreatureDisabled(ai) {
      const actionSet = ai !== "" ? actionOidSets[Number(ai)] : null;
      for (const opt of creatureSel.options) {
        if (!opt.value) continue;
        opt.disabled =
          actionSet !== null &&
          !setsOverlap(animalOidSets[Number(opt.value)], actionSet);
      }
      if (creatureSel.selectedOptions[0]?.disabled) creatureSel.value = "";
    }

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
      if (location.pathname !== newPath)
        history.pushState(null, "", newPath);
    }

    let currentSlideshow = null;

    function render() {
      if (currentSlideshow) {
        currentSlideshow.destroy();
        currentSlideshow = null;
      }

      const ci = creatureSel.value;
      const ai = actionSel.value;

      if (ci === "" || ai === "") {
        document.documentElement.dataset.state = "home";
        updateBackground(HOME_BG);
        popH1("Bestiary");
        document.title = "MTG Bestiary";
        resultBar.innerHTML = "";
        resultsEl.innerHTML = `
          <div class="placeholder">
            <span class="icon">🐾</span>
            <span>Select an action and animal to begin</span>
          </div>`;
        return;
      }
      document.documentElement.dataset.state = "active";

      const animal = animals[Number(ci)];
      const action = actions[Number(ai)];
      const label = toTitle(action.l) + " " + toTitle(animal.l);
      popH1(label);
      document.title = label + " — MTG Bestiary";

      const actionOids = new Set(action.tags.flatMap((t) => t.oids));
      const oidLabels = {};
      for (const t of action.tags) {
        for (const oid of t.oids) {
          if (!oidLabels[oid]) oidLabels[oid] = [];
          oidLabels[oid].push(t.label);
        }
      }

      const results = [];
      for (const [oid, items] of Object.entries(animal.c)) {
        if (!actionOids.has(oid)) continue;
        const card = cards[oid];
        if (!card) continue;
        const note = (oidLabels[oid] ?? []).join(", ");
        for (const item of items) {
          results.push({ oid, artUrl: item.a, bg: item.bg, name: card.n, scryfall: item.s, note });
        }
      }

      const count = results.length;
      if (count === 0) {
        resultBar.innerHTML = "";
        resultsEl.innerHTML = `
          <div class="empty">
            <span class="icon">🔍</span>
            <span>No cards found with <strong>${esc(animal.l)}</strong> in the art that are also tagged <strong>${esc(action.l)}</strong></span>
          </div>`;
        return;
      }

      resultBar.innerHTML =
        `<strong>${count}</strong> card${count !== 1 ? "s" : ""} ` +
        `with <strong>${esc(animal.l)}</strong> in the art that are also tagged <strong>${esc(action.l)}</strong>`;

      currentSlideshow = buildSlideshow(results);
      resultsEl.replaceChildren(currentSlideshow.element);
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
        updateCreatureDisabled(String(ai));
        updateActionDisabled(String(ci));
      } else {
        actionSel.value = "";
        creatureSel.value = "";
      }
      render();
    }

    function randomize() {
      const ai = Math.floor(Math.random() * actions.length);
      const actionSet = actionOidSets[ai];
      const valid = animals
        .map((_, i) => i)
        .filter((i) => setsOverlap(animalOidSets[i], actionSet));
      const ci = valid[Math.floor(Math.random() * valid.length)];
      actionSel.value = ai;
      creatureSel.value = ci;
      updateCreatureDisabled(String(ai));
      updateActionDisabled(String(ci));
      updatePath();
      render();
    }

    creatureSel.addEventListener("change", () => {
      updateActionDisabled(creatureSel.value);
      updatePath();
      render();
    });
    actionSel.addEventListener("change", () => {
      updateCreatureDisabled(actionSel.value);
      updatePath();
      render();
    });
    randomizeBtn.addEventListener("click", randomize);

    window.addEventListener("popstate", applyPath);
    applyPath();
  })
  .catch((err) => {
    resultsEl.innerHTML = `<p class="loading">Failed to load data: ${esc(err.message)}</p>`;
  });
