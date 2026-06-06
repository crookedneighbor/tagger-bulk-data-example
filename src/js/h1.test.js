// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fitH1, popH1, resetReadyState } from "./h1.js";

beforeEach(() => {
  document.body.innerHTML = "<header><h1></h1></header>";
  resetReadyState();
});

describe("fitH1", () => {
  it("runs without throwing", () => {
    expect(() => fitH1()).not.toThrow();
  });

  it("resets the font size before measuring", () => {
    const h1 = document.querySelector("h1");
    h1.style.fontSize = "10px";
    fitH1();
    // fontSize is reset to "" before the computed value is read
    // jsdom will then have re-applied the computed value
    expect(h1.style.fontSize).not.toBe("10px");
  });

  it("sets height to twice the line height", () => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      lineHeight: "24px",
      fontSize: "32px",
    });
    fitH1();
    expect(document.querySelector("h1").style.height).toBe("48px");
    vi.restoreAllMocks();
  });
});

describe("popH1", () => {
  it("sets the h1 text content", () => {
    popH1("Eating Wolf");
    expect(document.querySelector("h1").textContent).toBe("Eating Wolf");
  });

  it("wraps the text in a single child span", () => {
    popH1("Flying Eagle");
    const h1 = document.querySelector("h1");
    expect(h1.children).toHaveLength(1);
    expect(h1.querySelector("span").textContent).toBe("Flying Eagle");
  });

  it("replaces previous content on subsequent calls", () => {
    popH1("First");
    popH1("Second");
    expect(document.querySelector("h1").textContent).toBe("Second");
  });

  it("does not add the pop class on the first call", () => {
    popH1("Bestiary");
    expect(document.querySelector("h1").classList.contains("pop")).toBe(false);
  });

  it("adds the pop class when text changes after the first call", () => {
    popH1("Bestiary");
    popH1("Eating Wolf");
    expect(document.querySelector("h1").classList.contains("pop")).toBe(true);
  });

  it("does not add the pop class when the text is unchanged", () => {
    popH1("Bestiary");
    popH1("Bestiary");
    expect(document.querySelector("h1").classList.contains("pop")).toBe(false);
  });

  it("re-triggers the pop animation on each new text value", () => {
    popH1("Bestiary");
    popH1("Eating Wolf");
    popH1("Flying Bear");
    expect(document.querySelector("h1").classList.contains("pop")).toBe(true);
  });
});
