// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { setsOverlap, createDropdowns } from "./dropdowns.js";

describe("setsOverlap", () => {
  it("returns true when sets share an element", () => {
    expect(setsOverlap(new Set(["a", "b"]), new Set(["b", "c"]))).toBe(true);
  });

  it("returns false when sets are disjoint", () => {
    expect(setsOverlap(new Set(["a"]), new Set(["b"]))).toBe(false);
  });

  it("returns false for two empty sets", () => {
    expect(setsOverlap(new Set(), new Set())).toBe(false);
  });

  it("works when the smaller set is second", () => {
    expect(setsOverlap(new Set(["a", "b", "c"]), new Set(["c"]))).toBe(true);
  });
});

const makeAnimal = (label, oids) => ({
  l: label,
  c: Object.fromEntries(oids.map((oid) => [oid, []])),
});

const makeAction = (label, oids) => ({
  l: label,
  tags: [{ label, oids }],
});

describe("createDropdowns", () => {
  let creatureSel, actionSel, randomizeBtn;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="creature-select" disabled></select>
      <select id="action-select" disabled></select>
      <button id="btn-randomize" disabled></button>
    `;
    creatureSel = document.getElementById("creature-select");
    actionSel = document.getElementById("action-select");
    randomizeBtn = document.getElementById("btn-randomize");
  });

  it("populates creature options", () => {
    const animals = [
      makeAnimal("wolf", ["oid-1"]),
      makeAnimal("bear", ["oid-2"]),
    ];
    createDropdowns({
      animals,
      actions: [],
      creatureSel,
      actionSel,
      randomizeBtn,
    });
    expect(creatureSel.options).toHaveLength(2);
    expect(creatureSel.options[0].textContent).toBe("wolf");
    expect(creatureSel.options[1].textContent).toBe("bear");
  });

  it("populates action options", () => {
    const actions = [
      makeAction("eating", ["oid-1"]),
      makeAction("stalking", ["oid-2"]),
    ];
    createDropdowns({
      animals: [],
      actions,
      creatureSel,
      actionSel,
      randomizeBtn,
    });
    expect(actionSel.options).toHaveLength(2);
    expect(actionSel.options[0].textContent).toBe("eating");
  });

  it("enables all controls after population", () => {
    createDropdowns({
      animals: [],
      actions: [],
      creatureSel,
      actionSel,
      randomizeBtn,
    });
    expect(creatureSel.disabled).toBe(false);
    expect(actionSel.disabled).toBe(false);
    expect(randomizeBtn.disabled).toBe(false);
  });

  it("updateActionDisabled disables actions with no overlap", () => {
    const animals = [makeAnimal("wolf", ["oid-wolf"])];
    const actions = [
      makeAction("eating", ["oid-wolf"]),
      makeAction("flying", ["oid-bird"]),
    ];
    const { updateActionDisabled } = createDropdowns({
      animals,
      actions,
      creatureSel,
      actionSel,
      randomizeBtn,
    });
    updateActionDisabled("0"); // wolf selected (index 0)
    expect(actionSel.options[0].disabled).toBe(false); // eating overlaps
    expect(actionSel.options[1].disabled).toBe(true); // flying does not
  });

  it("updateCreatureDisabled disables creatures with no overlap", () => {
    const animals = [
      makeAnimal("wolf", ["oid-wolf"]),
      makeAnimal("bird", ["oid-bird"]),
    ];
    const actions = [makeAction("eating", ["oid-wolf"])];
    const { updateCreatureDisabled } = createDropdowns({
      animals,
      actions,
      creatureSel,
      actionSel,
      randomizeBtn,
    });
    updateCreatureDisabled("0"); // eating selected (index 0)
    expect(creatureSel.options[0].disabled).toBe(false); // wolf overlaps
    expect(creatureSel.options[1].disabled).toBe(true); // bird does not
  });
});
