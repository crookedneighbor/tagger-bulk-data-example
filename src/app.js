function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const creatureSel = document.getElementById("creature-select");
const actionSel = document.getElementById("action-select");
const resultBar = document.getElementById("result-bar");
const resultsEl = document.getElementById("results");
const randomizeBtn = document.getElementById("btn-randomize");
const h1 = document.querySelector("h1");

function fitH1() {
  h1.style.fontSize = "";
  const cs = window.getComputedStyle(h1);
  const lineH = parseFloat(cs.lineHeight);
  const targetH = Math.round(lineH * 2);
  h1.style.height = targetH + "px";
  let fs = parseFloat(cs.fontSize);
  while (h1.scrollHeight > targetH && fs > 16) {
    fs -= 0.5;
    h1.style.fontSize = fs + "px";
  }
}

fitH1();
window.addEventListener("resize", fitH1);

let h1Ready = false;
function popH1(text) {
  const changed = h1.textContent !== text;
  const span = document.createElement("span");
  span.textContent = text;
  h1.replaceChildren(span);
  fitH1();
  if (h1Ready && changed) {
    h1.classList.remove("pop");
    void h1.offsetWidth;
    h1.classList.add("pop");
  } else {
    h1Ready = true;
  }
}

const toTitle = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const HOME_BG =
  "https://cards.scryfall.io/art_crop/front/b/c/bc4aa918-53b9-4177-a859-f5a8eff09fe5.jpg?1562812515";

let slideshowTimer = null;
let visibilityHandler = null;
let transitionGen = 0;
let bgFront = "a";

function updateBackground(url) {
  const back = bgFront === "a" ? "b" : "a";
  const root = document.documentElement;
  root.style.setProperty(`--bg-${back}`, `url(${url})`);
  root.style.setProperty(`--bg-${back}-opacity`, "1");
  root.style.setProperty(`--bg-${bgFront}-opacity`, "0");
  bgFront = back;
}

function rAF2(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function applyTransition(front, back, gen) {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reduceMotion) {
    Object.assign(back.style, {
      transition: "none",
      opacity: "0",
      transform: "",
      clipPath: "",
      filter: "",
    });
    rAF2(() => {
      if (transitionGen !== gen) return;
      back.style.transition = "opacity 0.7s ease";
      back.style.opacity = "1";
      front.style.transition = "opacity 0.7s ease";
      front.style.opacity = "0";
    });
    return;
  }

  Object.assign(back.style, {
    transition: "none",
    opacity: "1",
    transform: "translate(-50%, -50%) rotateY(-90deg)",
    clipPath: "",
    filter: "",
  });
  Object.assign(front.style, {
    transition: "none",
    clipPath: "",
    filter: "",
  });
  rAF2(() => {
    if (transitionGen !== gen) return;
    front.style.transition =
      "transform 0.3s ease-in, opacity 0.15s 0.15s ease-in";
    front.style.transform = "translate(-50%, -50%) rotateY(90deg)";
    front.style.opacity = "0";
    setTimeout(() => {
      if (transitionGen !== gen) return;
      back.style.transition = "transform 0.3s ease-out";
      back.style.transform = "translate(-50%, -50%) rotateY(0deg)";
    }, 300);
  });
}

fetch("bestiary.json")
  .then((r) => r.json())
  .then(({ animals, actions, cards }) => {
    // Populate dropdowns
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

    // Precompute Sets for fast overlap checks.
    const animalOidSets = animals.map((a) => new Set(Object.keys(a.c)));
    const actionOidSets = actions.map(
      (a) => new Set(a.tags.flatMap((t) => t.oids)),
    );

    // Slug helpers and lookup maps for URL routing.
    // BASE is derived from <base href> (combo pages) or the page URL (home).
    const BASE = new URL(document.baseURI).pathname;
    const slugify = (s) =>
      s
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    const actionBySlug = new Map(
      actions.map((a, i) => [slugify(a.l), i]),
    );
    const animalBySlug = new Map(
      animals.map((a, i) => [slugify(a.l), i]),
    );

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
      if (creatureSel.selectedOptions[0]?.disabled)
        creatureSel.value = "";
    }

    // Update the URL path from current dropdown values without triggering popstate.
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

    // Parse the current path and apply it to the dropdowns.
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

    const SLIDE_INTERVAL = 4000;

    function render() {
      clearInterval(slideshowTimer);
      slideshowTimer = null;
      if (visibilityHandler) {
        document.removeEventListener(
          "visibilitychange",
          visibilityHandler,
        );
        visibilityHandler = null;
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

      // Build slideshow
      const hero = document.createElement("div");
      hero.className = "slide-hero";
      hero.innerHTML = `
        <a class="link-a" href="" target="_blank" rel="noopener"><img class="img-a" src="" alt="" draggable="false" style="opacity:0"></a>
        <a class="link-b" href="" target="_blank" rel="noopener"><img class="img-b" src="" alt="" draggable="false" style="opacity:0"></a>
        <div class="slide-overlay">
          <span class="slide-counter"></span>
        </div>
        ${
          count > 1
            ? `
        <button class="slide-nav slide-prev" aria-label="Previous">&#x2039;</button>
        <button class="slide-nav slide-next" aria-label="Next">&#x203A;</button>
        `
            : ""
        }
        <div class="slide-progress"></div>`;

      const imgA = hero.querySelector(".img-a");
      const imgB = hero.querySelector(".img-b");
      const linkA = hero.querySelector(".link-a");
      const linkB = hero.querySelector(".link-b");
      const counterEl = hero.querySelector(".slide-counter");
      const progressEl = hero.querySelector(".slide-progress");
      const prevBtn = hero.querySelector(".slide-prev");
      const nextBtn = hero.querySelector(".slide-next");

      let idx = 0;
      let paused = false;
      let frontImg = imgA;
      let backImg = imgB;
      let frontLink = linkA;
      let backLink = linkB;

      function animateProgress() {
        progressEl.style.transition = "none";
        progressEl.style.width = "0";
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            progressEl.style.transition = `width ${SLIDE_INTERVAL}ms linear`;
            progressEl.style.width = "100%";
          }),
        );
      }

      function showSlide(i, instant = false, dir = 1) {
        const gen = ++transitionGen;
        idx = ((i % count) + count) % count;
        const r = results[idx];

        counterEl.textContent = count > 1 ? `${idx + 1} / ${count}` : "";
        updateBackground(r.bg);

        if (instant) {
          Object.assign(frontImg.style, {
            transition: "none",
            opacity: "1",
            transform: "",
            filter: "",
            clipPath: "",
          });
          Object.assign(backImg.style, {
            transition: "none",
            opacity: "0",
            transform: "",
            filter: "",
            clipPath: "",
          });
          frontImg.src = r.artUrl;
          frontImg.alt = r.name;
          frontLink.href = r.scryfall;
        } else {
          backImg.src = r.artUrl;
          backImg.alt = r.name;
          backLink.href = r.scryfall;
          backImg.style.zIndex = "2";
          frontImg.style.zIndex = "1";
          applyTransition(frontImg, backImg, gen);
          [frontImg, backImg] = [backImg, frontImg];
          [frontLink, backLink] = [backLink, frontLink];
        }

        if (count > 1) animateProgress();
      }

      function startTimer() {
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(() => {
          if (!paused) showSlide(idx + 1, false, 1);
        }, SLIDE_INTERVAL);
      }

      if (count > 1) {
        hero.addEventListener("mouseenter", () => {
          paused = true;
          progressEl.style.transition = "none";
          progressEl.style.width =
            (progressEl.getBoundingClientRect().width /
              hero.getBoundingClientRect().width) *
              100 +
            "%";
        });
        hero.addEventListener("mouseleave", () => {
          paused = false;
          animateProgress();
          startTimer();
        });
        prevBtn.addEventListener("click", () => {
          showSlide(idx - 1, false, -1);
          startTimer();
        });
        nextBtn.addEventListener("click", () => {
          showSlide(idx + 1, false, 1);
          startTimer();
        });
        startTimer();
      }

      visibilityHandler = () => {
        if (!document.hidden) {
          showSlide(idx, true);
          if (!paused && count > 1) startTimer();
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);

      showSlide(0, true);
      resultsEl.innerHTML = "";
      resultsEl.appendChild(hero);
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

    // Browser back/forward navigation.
    window.addEventListener("popstate", applyPath);

    // Initial load — apply any path already in the URL.
    applyPath();
  })
  .catch((err) => {
    resultsEl.innerHTML = `<p class="loading">Failed to load data: ${esc(err.message)}</p>`;
  });
