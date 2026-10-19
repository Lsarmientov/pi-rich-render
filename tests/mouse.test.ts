import { describe, expect, it } from "vitest";
import { copyTargetStart, isCopyTargetHit, wheelLines } from "../src/renderers/mouse.js";

describe("mouse helpers", () => {
  it("starts the copy target at the right-aligned label boundary", () => {
    expect(copyTargetStart({ width: 40, labelWidth: 8 })).toBe(32);
    expect(copyTargetStart({ width: 8, labelWidth: 8 })).toBe(0);
    expect(copyTargetStart({ width: 0, labelWidth: 8 })).toBe(0);
  });

  it("hits only the copy label columns on header row zero", () => {
    const state = { width: 40, labelWidth: 8 };
    expect(isCopyTargetHit(32, 0, state)).toBe(true);
    expect(isCopyTargetHit(39, 0, state)).toBe(true);
    expect(isCopyTargetHit(31, 0, state)).toBe(false);
    expect(isCopyTargetHit(40, 0, state)).toBe(false);
    expect(isCopyTargetHit(33, 1, state)).toBe(false);
    expect(isCopyTargetHit(0, 0, { width: 0, labelWidth: 7 })).toBe(false);
  });

  it("uses wheel deltas and falls back for missing, zero, and non-finite deltas", () => {
    expect(wheelLines(-3)).toBe(-3);
    expect(wheelLines(3)).toBe(3);
    expect(wheelLines(0)).toBe(3);
    expect(wheelLines(Number.NaN)).toBe(3);
    expect(wheelLines(undefined)).toBe(3);
  });
});
