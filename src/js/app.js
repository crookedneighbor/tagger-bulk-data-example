import { esc, toTitle } from "./utils.js";
import { popH1 } from "./h1.js";
import { updateBackground, HOME_BG } from "./background.js";
import { buildSlideshow } from "./slideshow.js";
import { setsOverlap, createDropdowns } from "./dropdowns.js";
import { createRouter } from "./router.js";

const creatureSel = document.getElementById("creature-select");
const actionSel = document.getElementById("action-select");
const resultBar = document.getElementById("result-bar");
const resultsEl = document.getElementById("results");
const randomizeBtn = document.getElementById("btn-randomize");

fetch("bestiary.json")
  .then((r) => r.json())
  .then(({ animals, actions, cards }) => {
    const {
      animalOidSets,
      actionOidSets,
      updateActionDisabled,
      updateCreatureDisabled,
    } = createDropdowns({
      animals,
      actions,
      creatureSel,
      actionSel,
      randomizeBtn,
    });

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
          results.push({
            oid,
            artUrl: item.a,
            bg: item.bg,
            name: card.n,
            scryfall: item.s,
            note,
          });
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

    const { updatePath, applyPath } = createRouter({
      actions,
      animals,
      actionSel,
      creatureSel,
      onNavigate() {
        if (actionSel.value) updateCreatureDisabled(actionSel.value);
        if (creatureSel.value) updateActionDisabled(creatureSel.value);
        render();
      },
    });

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

    applyPath();
  })
  .catch((err) => {
    resultsEl.innerHTML = `<p class="loading">Failed to load data: ${esc(err.message)}</p>`;
  });
