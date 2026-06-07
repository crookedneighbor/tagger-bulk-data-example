import { updateBackground } from "./background.js";
import { applyTransition, nextGen } from "./transitions.js";

const SLIDE_INTERVAL = 4000;

export function buildSlideshow(results) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const count = results.length;

  const hero = document.createElement("div");
  hero.className = "slide-hero";
  hero.innerHTML = `
    <a class="link-a" href="" target="_blank" rel="noopener"><img class="img-a" src="" alt="" draggable="false" style="opacity:0"></a>
    ${count > 1 ? `<a class="link-b" href="" target="_blank" rel="noopener"><img class="img-b" src="" alt="" draggable="false" style="opacity:0"></a>` : ""}
    <div class="slide-overlay">
      <span class="slide-counter" aria-live="polite" aria-atomic="true"></span>
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
  let timer = null;
  let visHandler = null;

  function animateProgress() {
    progressEl.style.transition = "none";
    progressEl.style.width = "0";
    if (reducedMotion.matches) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        progressEl.style.transition = `width ${SLIDE_INTERVAL}ms linear`;
        progressEl.style.width = "100%";
      }),
    );
  }

  function showSlide(i, instant = false) {
    const gen = nextGen();
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
      if (backImg) Object.assign(backImg.style, {
        transition: "none",
        opacity: "0",
        transform: "",
        filter: "",
        clipPath: "",
      });
      frontImg.src = r.artUrl;
      frontImg.alt = r.alt;
      frontLink.href = r.scryfall;
    } else {
      backImg.src = r.artUrl;
      backImg.alt = r.alt;
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
    clearInterval(timer);
    if (reducedMotion.matches) return;
    timer = setInterval(() => {
      if (!paused) showSlide(idx + 1);
    }, SLIDE_INTERVAL);
  }

  if (count > 1) {
    const freezeProgress = () => {
      paused = true;
      progressEl.style.transition = "none";
      progressEl.style.width =
        (progressEl.getBoundingClientRect().width /
          hero.getBoundingClientRect().width) *
          100 +
        "%";
    };
    const resumeProgress = () => {
      paused = false;
      animateProgress();
      startTimer();
    };
    hero.addEventListener("mouseenter", freezeProgress);
    hero.addEventListener("mouseleave", resumeProgress);
    hero.addEventListener("focusin", freezeProgress);
    hero.addEventListener("focusout", (e) => {
      if (!hero.contains(e.relatedTarget)) resumeProgress();
    });
    prevBtn.addEventListener("click", () => {
      showSlide(idx - 1);
      startTimer();
    });
    nextBtn.addEventListener("click", () => {
      showSlide(idx + 1);
      startTimer();
    });
    startTimer();
  }

  visHandler = () => {
    if (!document.hidden) {
      showSlide(idx, true);
      if (!paused && count > 1) startTimer();
    }
  };
  document.addEventListener("visibilitychange", visHandler);

  showSlide(0, true);

  return {
    element: hero,
    destroy() {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visHandler);
    },
  };
}
