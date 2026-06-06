import { describe, it, expect } from "vitest";
import { ACTION_GROUPS } from "./action-groups.mjs";

describe("ACTION_GROUPS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(ACTION_GROUPS)).toBe(true);
    expect(ACTION_GROUPS.length).toBeGreaterThan(0);
  });

  it("every group has a label and non-empty ids array", () => {
    for (const group of ACTION_GROUPS) {
      expect(typeof group.l).toBe("string");
      expect(group.l.length).toBeGreaterThan(0);
      expect(Array.isArray(group.ids)).toBe(true);
      expect(group.ids.length).toBeGreaterThan(0);
    }
  });

  it("all ids look like UUIDs", () => {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    for (const group of ACTION_GROUPS) {
      for (const id of group.ids) {
        expect(id).toMatch(uuidRe);
      }
    }
  });

  it("has no duplicate labels", () => {
    const labels = ACTION_GROUPS.map((g) => g.l);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
