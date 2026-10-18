import { describe, expect, it } from "vitest";
import { clampOffset, formatRange, maxOffset, normalizedHeight, scrollForKey } from "../src/renderers/viewport.js";

describe("viewport", () => {
  it("normalizes zero, negative, fractional, and normal heights", () => {
    expect(normalizedHeight(0)).toBe(1);
    expect(normalizedHeight(-3)).toBe(1);
    expect(normalizedHeight(2.8)).toBe(2);
    expect(normalizedHeight(10)).toBe(10);
  });

  it("calculates the maximum offset for smaller and larger content", () => {
    expect(maxOffset(3, 5)).toBe(0);
    expect(maxOffset(12, 5)).toBe(7);
  });

  it("clamps offsets at both ends", () => {
    expect(clampOffset(-4, 12, 5)).toBe(0);
    expect(clampOffset(20, 12, 5)).toBe(7);
  });

  it("scrolls up and down with arrows and vim keys", () => {
    const state = { offset: 5, total: 20, height: 4 };
    expect(scrollForKey("\x1b[A", state)).toBe(4);
    expect(scrollForKey("k", state)).toBe(4);
    expect(scrollForKey("\x1b[B", state)).toBe(6);
    expect(scrollForKey("j", state)).toBe(6);
  });

  it("scrolls pages by exactly the viewport height", () => {
    const state = { offset: 5, total: 20, height: 4 };
    expect(scrollForKey("\x1b[5~", state)).toBe(1);
    expect(scrollForKey("\x1b[6~", state)).toBe(9);
  });

  it("jumps to the beginning and end", () => {
    const state = { offset: 5, total: 20, height: 4 };
    expect(scrollForKey("g", state)).toBe(0);
    expect(scrollForKey("\x1b[H", state)).toBe(0);
    expect(scrollForKey("G", state)).toBe(16);
    expect(scrollForKey("\x1b[F", state)).toBe(16);
  });

  it("clamps every returned offset and ignores unrelated keys", () => {
    expect(scrollForKey("\x1b[A", { offset: 0, total: 20, height: 4 })).toBe(0);
    expect(scrollForKey("\x1b[B", { offset: 16, total: 20, height: 4 })).toBe(16);
    expect(scrollForKey("x", { offset: 5, total: 20, height: 4 })).toBeNull();
  });

  it("formats full, middle, and empty ranges", () => {
    expect(formatRange({ offset: 0, total: 4, height: 4 })).toBe("1-4/4");
    expect(formatRange({ offset: 5, total: 20, height: 4 })).toBe("6-9/20");
    expect(formatRange({ offset: 0, total: 0, height: 4 })).toBe("0/0");
  });
});
