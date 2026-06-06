// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouter } from "./router.js";

const makeAction = (label) => ({ l: label, tags: [] });
const makeAnimal = (label) => ({ l: label, c: {} });

describe("createRouter", () => {
  let actionSel, creatureSel, onNavigate, pushState;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="action-select"></select>
      <select id="creature-select"></select>
    `;
    actionSel = document.getElementById("action-select");
    creatureSel = document.getElementById("creature-select");
    onNavigate = vi.fn();
    pushState = vi.spyOn(history, "pushState");

    // Add placeholder options so value can be set by index
    for (const sel of [actionSel, creatureSel]) {
      const opt = document.createElement("option");
      opt.value = "0";
      sel.appendChild(opt);
    }
  });

  it("calls onNavigate on applyPath", () => {
    const actions = [makeAction("eating")];
    const animals = [makeAnimal("wolf")];
    const { applyPath } = createRouter({
      actions,
      animals,
      actionSel,
      creatureSel,
      onNavigate,
    });
    applyPath();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("updatePath pushes a slug-based URL when both selects have values", () => {
    const actions = [makeAction("eating")];
    const animals = [makeAnimal("gray wolf")];
    const { updatePath } = createRouter({
      actions,
      animals,
      actionSel,
      creatureSel,
      onNavigate,
    });
    actionSel.value = "0";
    creatureSel.value = "0";
    updatePath();
    expect(pushState).toHaveBeenCalledWith(
      null,
      "",
      expect.stringContaining("eating/gray-wolf"),
    );
  });

  it("updatePath pushes the base path when selects are empty", () => {
    const { updatePath } = createRouter({
      actions: [],
      animals: [],
      actionSel,
      creatureSel,
      onNavigate,
    });
    actionSel.value = "";
    creatureSel.value = "";
    updatePath();
    expect(pushState).toHaveBeenCalled();
  });

  it("wires popstate to applyPath", () => {
    const { applyPath } = createRouter({
      actions: [],
      animals: [],
      actionSel,
      creatureSel,
      onNavigate,
    });
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onNavigate).toHaveBeenCalled();
  });
});
