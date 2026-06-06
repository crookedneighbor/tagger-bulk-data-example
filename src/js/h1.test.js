// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { fitH1, popH1, resetReadyState } from "./h1.js";
import { afterEach } from "node:test";

beforeAll(async () => {
  document.body.innerHTML = "<header><h1></h1></header>";
});

afterEach(() => {
  resetReadyState();
});

describe("fitH1", () => {
  it("runs without throwing", () => {
    expect(() => fitH1()).not.toThrow();
  });

  // TODO fill in actual tests
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

  // TODO fill in more tests
});
