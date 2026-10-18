import { describe, expect, it } from "vitest";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { overlayLayout } from "../src/overlay-layout.js";
import { GenericCodeRendererComponent } from "../src/renderers/code-renderer.js";

const mockTheme = {
  fg: (_color: string, text: string) => text,
  bg: (_color: string, text: string) => text,
  bold: (text: string) => text,
  style: (text: string) => text,
} as unknown as Theme;

describe("overlayLayout", () => {
  it.each([
    [30, 24, 22],
    [40, 34, 32],
    [10, 4, 2],
    [3, 4, 2],
  ])("sizes a %i-row terminal with maxHeight %i and viewportHeight %i", (rows, maxHeight, viewportHeight) => {
    const layout = overlayLayout(rows);

    expect(layout.overlayOptions).toEqual({ maxHeight });
    expect(layout.viewportHeight).toBe(viewportHeight);
  });

  it("keeps the overlay within terminal height from 7 through 200 rows", () => {
    for (let rows = 7; rows <= 200; rows++) {
      const { overlayOptions, viewportHeight } = overlayLayout(rows);
      const maxHeight = overlayOptions.maxHeight as number;

      expect(viewportHeight + 2).toBeLessThanOrEqual(maxHeight);
      expect(maxHeight).toBeLessThanOrEqual(rows);
    }
  });

  it("renders a 100-line code block exactly to the 30-row overlay cap", () => {
    const { overlayOptions, viewportHeight } = overlayLayout(30);
    const renderer = new GenericCodeRendererComponent(
      "code",
      Array.from({ length: 100 }, (_, index) => `line-${index + 1}`).join("\n"),
      mockTheme,
      () => {},
      viewportHeight
    );
    const lines = renderer.render(80);

    expect(lines).toHaveLength(viewportHeight + 2);
    expect(lines).toHaveLength(overlayOptions.maxHeight as number);
  });
});
