import { describe, expect, it } from "vitest";
import { clampHorizontalOffset, hscrollForKey, maxHorizontalOffset, sliceColumns } from "../src/renderers/hscroll.js";

describe("horizontal scrolling helpers", () => {
  it("computes the maximum offset only when content exceeds the viewport", () => {
    expect(maxHorizontalOffset(20, 20)).toBe(0);
    expect(maxHorizontalOffset(10, 20)).toBe(0);
    expect(maxHorizontalOffset(30, 20)).toBe(10);
  });

  it("clamps offsets at both ends", () => {
    expect(clampHorizontalOffset(-4, 30, 20)).toBe(0);
    expect(clampHorizontalOffset(40, 30, 20)).toBe(10);
  });

  it("moves left and right by four columns with clamping", () => {
    const state = { offset: 8, maxLineWidth: 40, width: 20 };
    expect(hscrollForKey("\u001b[D", state)).toBe(4);
    expect(hscrollForKey("h", state)).toBe(4);
    expect(hscrollForKey("\u001b[C", state)).toBe(12);
    expect(hscrollForKey("l", state)).toBe(12);
    expect(hscrollForKey("h", { ...state, offset: 2 })).toBe(0);
    expect(hscrollForKey("l", { ...state, offset: 20 })).toBe(20);
  });

  it("returns null for keys unrelated to horizontal scrolling", () => {
    expect(hscrollForKey("x", { offset: 0, maxLineWidth: 40, width: 20 })).toBeNull();
  });

  it("slices ASCII text from the start and a middle column", () => {
    expect(sliceColumns("abcdefgh", 0, 8)).toBe("abcdefgh");
    expect(sliceColumns("abcdefgh", 0, 4)).toBe("abcd");
    expect(sliceColumns("abcdefgh", 3, 4)).toBe("defg");
  });

  it("counts wide characters as two columns without splitting them", () => {
    expect(sliceColumns("日本語コード", 0, 6)).toBe("日本語");
    expect(sliceColumns("日本語コード", 1, 4)).toBe("本");
    expect(sliceColumns("日本語コード", 2, 4)).toBe("本語");
  });

  it("returns an empty string when the offset is past the text", () => {
    expect(sliceColumns("short", 8, 4)).toBe("");
  });
});
