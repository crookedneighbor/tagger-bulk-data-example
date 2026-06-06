// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { esc, toTitle, slugify } from "./utils.js";

describe("esc", () => {
  it("escapes ampersands", () => expect(esc("a & b")).toBe("a &amp; b"));
  it("escapes less-than", () => expect(esc("<tag>")).toBe("&lt;tag&gt;"));
  it("escapes quotes", () => expect(esc('"hello"')).toBe("&quot;hello&quot;"));
  it("coerces non-strings to string first", () => expect(esc(42)).toBe("42"));
  it("leaves safe strings unchanged", () =>
    expect(esc("hello world")).toBe("hello world"));
  it("escapes multiple entities in one string", () =>
    expect(esc('<a href="x">foo & bar</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;foo &amp; bar&lt;/a&gt;",
    ));
});

describe("toTitle", () => {
  it("capitalizes each word", () => expect(toTitle("foo bar")).toBe("Foo Bar"));
  it("handles a single word", () => expect(toTitle("wolf")).toBe("Wolf"));
  it("handles multi-word animal labels", () =>
    expect(toTitle("gray wolf")).toBe("Gray Wolf"));
});

describe("slugify", () => {
  it("lowercases", () => expect(slugify("Wolf")).toBe("wolf"));
  it("replaces spaces with hyphens", () =>
    expect(slugify("gray wolf")).toBe("gray-wolf"));
  it("collapses multiple spaces into one hyphen", () =>
    expect(slugify("foo  bar")).toBe("foo-bar"));
  it("strips slashes from labels like turtle/tortoise", () =>
    expect(slugify("turtle/tortoise")).toBe("turtletortoise"));
  it("strips parentheses", () =>
    expect(slugify("orca (animal)")).toBe("orca-animal"));
  it("preserves hyphens and digits", () =>
    expect(slugify("cr-720")).toBe("cr-720"));
});
