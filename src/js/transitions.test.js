// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextGen, applyTransition } from "./transitions.js";

describe("nextGen", () => {
  it("returns incrementing values", () => {
    const g1 = nextGen();
    const g2 = nextGen();
    expect(g2).toBe(g1 + 1);
  });
});

describe("applyTransition", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  it("sets initial transform on the back element for the flip animation", () => {
    const front = { style: {} };
    const back = { style: {} };
    const gen = nextGen();
    applyTransition(front, back, gen);
    expect(back.style.transform).toContain("rotateY(-90deg)");
  });

  it("clears clip-path and filter on both elements", () => {
    const front = { style: { clipPath: "inset(0)", filter: "blur(4px)" } };
    const back = { style: {} };
    applyTransition(front, back, nextGen());
    expect(front.style.clipPath).toBe("");
    expect(front.style.filter).toBe("");
  });

  it("uses a fade when prefers-reduced-motion is set", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const front = { style: {} };
    const back = { style: {} };
    applyTransition(front, back, nextGen());
    expect(back.style.opacity).toBe("0");
  });
});
