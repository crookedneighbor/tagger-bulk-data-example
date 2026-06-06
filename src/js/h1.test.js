// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";

// h1.js queries document at module-eval time, so set up the DOM first
// via dynamic import after the DOM is ready.
let fitH1, popH1;

beforeAll(async () => {
  document.body.innerHTML = "<header><h1></h1></header>";
  ({ fitH1, popH1 } = await import("./h1.js"));
});

describe("fitH1", () => {
  it("runs without throwing", () => {
    expect(() => fitH1()).not.toThrow();
  });
});

describe("popH1", () => {
  it("sets the h1 text content", () => {
    popH1("Eating Wolf");
    expect(document.querySelector("h1").textContent).toBe("Eating Wolf");
  });

  it("wraps text in a span", () => {
    popH1("Flying Eagle");
    expect(document.querySelector("h1 > span").textContent).toBe(
      "Flying Eagle",
    );
  });

  it("replaces previous text on subsequent calls", () => {
    popH1("First");
    popH1("Second");
    expect(document.querySelector("h1").textContent).toBe("Second");
  });
});
