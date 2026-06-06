let transitionGen = 0;

export function nextGen() {
  return ++transitionGen;
}

function rAF2(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

export function applyTransition(front, back, gen) {
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
