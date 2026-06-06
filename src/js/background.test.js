// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { updateBackground, HOME_BG } from "./background.js";

describe("HOME_BG", () => {
  it("is a Scryfall art_crop URL", () => {
    expect(HOME_BG).toMatch(/scryfall\.io/);
  });
});

describe("updateBackground", () => {
  it("sets the back layer URL and makes it visible", () => {
    updateBackground("https://example.com/img1.jpg");
    const style = document.documentElement.style;
    // First call: bgFront was 'a', so it writes to 'b'
    expect(style.getPropertyValue("--bg-b")).toBe(
      "url(https://example.com/img1.jpg)",
    );
    expect(style.getPropertyValue("--bg-b-opacity")).toBe("1");
    expect(style.getPropertyValue("--bg-a-opacity")).toBe("0");
  });

  it("alternates to the other layer on subsequent calls", () => {
    updateBackground("https://example.com/img2.jpg");
    const style = document.documentElement.style;
    // Second call: bgFront is now 'b', so it writes to 'a'
    expect(style.getPropertyValue("--bg-a")).toBe(
      "url(https://example.com/img2.jpg)",
    );
    expect(style.getPropertyValue("--bg-a-opacity")).toBe("1");
    expect(style.getPropertyValue("--bg-b-opacity")).toBe("0");
  });
});
