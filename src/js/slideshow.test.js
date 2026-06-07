// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildSlideshow } from "./slideshow.js";

const makeResult = (n) => ({
  artUrl: `https://example.com/card${n}.jpg`,
  bg: `https://example.com/bg${n}.jpg`,
  name: `Card ${n}`,
  scryfall: `https://scryfall.com/card/${n}`,
  note: "",
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("buildSlideshow", () => {
  it("returns an element and destroy function", () => {
    const { element, destroy } = buildSlideshow([makeResult(1)]);
    expect(element).toBeInstanceOf(HTMLElement);
    expect(element.className).toBe("slide-hero");
    expect(typeof destroy).toBe("function");
    destroy();
  });

  it("contains only one image slot for a single result", () => {
    const { element, destroy } = buildSlideshow([makeResult(1)]);
    expect(element.querySelector(".img-a")).not.toBeNull();
    expect(element.querySelector(".img-b")).toBeNull();
    destroy();
  });

  it("contains two image slots for multiple results", () => {
    const { element, destroy } = buildSlideshow([makeResult(1), makeResult(2)]);
    expect(element.querySelector(".img-a")).not.toBeNull();
    expect(element.querySelector(".img-b")).not.toBeNull();
    destroy();
  });

  it("omits nav buttons for a single result", () => {
    const { element, destroy } = buildSlideshow([makeResult(1)]);
    expect(element.querySelector(".slide-prev")).toBeNull();
    expect(element.querySelector(".slide-next")).toBeNull();
    destroy();
  });

  it("includes nav buttons for multiple results", () => {
    const { element, destroy } = buildSlideshow([makeResult(1), makeResult(2)]);
    expect(element.querySelector(".slide-prev")).not.toBeNull();
    expect(element.querySelector(".slide-next")).not.toBeNull();
    destroy();
  });

  it("sets the front image src to the first result", () => {
    const { element, destroy } = buildSlideshow([makeResult(1)]);
    expect(element.querySelector(".img-a").src).toBe(
      "https://example.com/card1.jpg",
    );
    destroy();
  });

  it("shows a counter for multiple results", () => {
    const { element, destroy } = buildSlideshow([makeResult(1), makeResult(2)]);
    expect(element.querySelector(".slide-counter").textContent).toBe("1 / 2");
    destroy();
  });

  it("destroy removes the visibilitychange listener", () => {
    const spy = vi.spyOn(document, "removeEventListener");
    const { destroy } = buildSlideshow([makeResult(1)]);
    destroy();
    expect(spy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});
