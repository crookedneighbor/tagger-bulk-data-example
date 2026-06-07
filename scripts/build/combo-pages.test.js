import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildComboPages } from "./combo-pages.mjs";
import { writeFileSync, mkdirSync } from "fs";

vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const TEMPLATE = `<!doctype html>
<html lang="en" data-state="home">
  <head>
    <!-- page-meta -->
    <title>MTG Bestiary</title>
    <!-- /page-meta -->
  </head>
  <body>
    <header><h1>Bestiary</h1></header>
    <div id="results">
      <div class="placeholder">placeholder</div>
    </div>
  </body>
</html>`;

const makeBestiary = () => ({
  animals: [
    {
      l: "wolf",
      s: "wolf",
      c: {
        "oid-1": [
          {
            a: "https://img/card.jpg",
            bg: "https://img/bg.jpg",
            s: "https://tagger.scryfall.com/card/tst/1",
            alt: "Wolves' Pride (tst/1)",
          },
        ],
      },
    },
  ],
  actions: [{ l: "eating", s: "eating", tags: [{ oids: ["oid-1"] }] }],
});

describe("buildComboPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the count of generated pages", () => {
    const count = buildComboPages(makeBestiary(), TEMPLATE);
    expect(count).toBe(1);
  });

  it("creates a directory for the action", () => {
    buildComboPages(makeBestiary(), TEMPLATE);
    expect(mkdirSync).toHaveBeenCalledWith("dist/eating", { recursive: true });
  });

  it("writes an html file for the combo", () => {
    buildComboPages(makeBestiary(), TEMPLATE);
    expect(writeFileSync).toHaveBeenCalledWith(
      "dist/eating/wolf.html",
      expect.any(String),
    );
  });

  it("injects a <base href> for relative asset paths", () => {
    buildComboPages(makeBestiary(), TEMPLATE);
    const html = writeFileSync.mock.calls[0][1];
    expect(html).toContain('<base href="../">');
  });

  it("sets data-state to active", () => {
    buildComboPages(makeBestiary(), TEMPLATE);
    const html = writeFileSync.mock.calls[0][1];
    expect(html).toContain('data-state="active"');
  });

  it("injects the combo title into <h1>", () => {
    buildComboPages(makeBestiary(), TEMPLATE);
    const html = writeFileSync.mock.calls[0][1];
    expect(html).toContain("<h1><span>Eating Wolf</span></h1>");
  });

  it("skips combos with no overlapping OIDs", () => {
    const bestiary = makeBestiary();
    bestiary.actions[0].tags[0].oids = ["oid-no-match"];
    const count = buildComboPages(bestiary, TEMPLATE);
    expect(count).toBe(0);
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
