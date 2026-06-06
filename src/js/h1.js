let h1Ready = false;

export function fitH1() {
  const h1 = document.querySelector("h1");
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

export function popH1(text) {
  const h1 = document.querySelector("h1");
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

export function resetReadyState() {
  h1Ready = false;
}
