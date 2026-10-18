import { describe, expect, it, vi } from "vitest";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import { GenericCodeRendererComponent } from "../src/renderers/code-renderer.js";
import { TableRendererComponent } from "../src/renderers/table-renderer.js";
import { DiffRendererComponent } from "../src/renderers/diff-renderer.js";
import { DataFormatRendererComponent } from "../src/renderers/json-yaml-xml-renderer.js";
import { DiagramRendererComponent } from "../src/renderers/diagram-renderer.js";
import { createRendererForBlock } from "../src/renderer-registry.js";

const mockTheme = {
  fg: (_color: string, text: string) => text,
  bg: (_color: string, text: string) => text,
  bold: (text: string) => text,
  style: (text: string) => text,
} as unknown as Theme;

const onClose = vi.fn();
const viewportHeight = 10;
const width = 80;
const assertWidthSafe = (lines: string[]) => {
  for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
};

const tableSource = ["| Name | Value |", "| --- | --- |", ...Array.from({ length: 30 }, (_, i) => `| row-${i + 1} | value-${i + 1} |`)].join("\n");

describe("windowed renderers", () => {
  it("windows code, keeps stable line numbers, and supports end, home, and page scrolling", () => {
    const source = Array.from({ length: 100 }, (_, i) => `code-line-${i + 1}`).join("\n");
    const renderer = new GenericCodeRendererComponent("code", source, mockTheme, onClose, viewportHeight);

    let lines = renderer.render(width);
    expect(lines.length).toBeLessThanOrEqual(viewportHeight + 2);
    expect(lines[2]).toContain("  1 │ code-line-1");
    expect(lines[2]).toMatch(/^\s{2}1 │/);
    assertWidthSafe(lines);

    renderer.handleInput("G");
    lines = renderer.render(width);
    expect(lines.some((line) => line.includes("code-line-100"))).toBe(true);
    expect(lines.some((line) => /code-line-1$/.test(line))).toBe(false);
    assertWidthSafe(lines);

    renderer.handleInput("g");
    lines = renderer.render(width);
    expect(lines.some((line) => line.includes("code-line-1"))).toBe(true);
    assertWidthSafe(lines);
    renderer.handleInput("\x1b[6~");
    lines = renderer.render(width);
    expect(lines[2]).toContain(" 11 │ code-line-11");
    assertWidthSafe(lines);
  });

  it("windows diff content and reaches the final line", () => {
    const source = Array.from({ length: 30 }, (_, i) => `+ diff-line-${i + 1}`).join("\n");
    const renderer = new DiffRendererComponent(source, mockTheme, onClose, viewportHeight);
    const initial = renderer.render(width);
    expect(initial.length).toBeLessThanOrEqual(viewportHeight + 2);
    assertWidthSafe(initial);
    renderer.handleInput("G");
    const lines = renderer.render(width);
    expect(lines.some((line) => line.includes("diff-line-30"))).toBe(true);
    expect(lines.some((line) => line.includes("diff-line-1"))).toBe(false);
    assertWidthSafe(lines);
  });

  it("windows JSON content and reaches the final field", () => {
    const source = JSON.stringify(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`field-${i + 1}`, i + 1])));
    const renderer = new DataFormatRendererComponent(source, "json", mockTheme, onClose, viewportHeight);
    renderer.handleInput("f");
    const formatted = renderer.render(width);
    expect(formatted.length).toBeLessThanOrEqual(viewportHeight + 2);
    assertWidthSafe(formatted);
    renderer.handleInput("G");
    const lines = renderer.render(width);
    expect(lines.some((line) => line.includes("field-20"))).toBe(true);
    expect(lines.some((line) => line.includes('"field-1":'))).toBe(false);
    assertWidthSafe(lines);
  });

  it("windows diagram content and reaches the final line", () => {
    const source = Array.from({ length: 30 }, (_, i) => `diagram-line-${i + 1}`).join("\n");
    const renderer = new DiagramRendererComponent("diagram", source, "mermaid", mockTheme, onClose, viewportHeight);
    const initial = renderer.render(width);
    expect(initial.length).toBeLessThanOrEqual(viewportHeight + 2);
    assertWidthSafe(initial);
    renderer.handleInput("G");
    const lines = renderer.render(width);
    expect(lines.some((line) => line.includes("diagram-line-30"))).toBe(true);
    expect(lines.some((line) => line.includes("diagram-line-1"))).toBe(false);
    assertWidthSafe(lines);
  });

  it("windows table content and preserves horizontal scrolling", () => {
    const renderer = new TableRendererComponent(tableSource, mockTheme, onClose, viewportHeight);
    const initial = renderer.render(width);
    expect(initial.length).toBeLessThanOrEqual(viewportHeight + 2);
    assertWidthSafe(initial);

    renderer.handleInput("G");
    const atEnd = renderer.render(width);
    expect(atEnd.some((line) => line.includes("row-30"))).toBe(true);
    expect(atEnd.some((line) => line.includes("row-1 "))).toBe(false);
    assertWidthSafe(atEnd);

    renderer.handleInput("g");
    const startLines = renderer.render(width);
    assertWidthSafe(startLines);
    const atStart = startLines.join("\n");
    renderer.handleInput("l");
    const rightLines = renderer.render(width);
    assertWidthSafe(rightLines);
    const scrolledRight = rightLines.join("\n");
    expect(scrolledRight).not.toBe(atStart);
    renderer.handleInput("h");
    const leftLines = renderer.render(width);
    assertWidthSafe(leftLines);
    expect(leftLines.join("\n")).toBe(atStart);
  });

  it("copies from every renderer and reports the resolved status", async () => {
    const callbacks = Array.from({ length: 5 }, () => vi.fn().mockResolvedValue(undefined));
    const renderers = [
      new GenericCodeRendererComponent("code", "line", mockTheme, onClose, viewportHeight, callbacks[0]),
      new TableRendererComponent("| A |\n| --- |\n| 1 |", mockTheme, onClose, viewportHeight, callbacks[1]),
      new DiffRendererComponent("+ line", mockTheme, onClose, viewportHeight, callbacks[2]),
      new DataFormatRendererComponent('{"a":1}', "json", mockTheme, onClose, viewportHeight, callbacks[3]),
      new DiagramRendererComponent("diagram", "line", "mermaid", mockTheme, onClose, viewportHeight, callbacks[4]),
    ];

    for (const [index, renderer] of renderers.entries()) {
      expect(renderer.render(width)[0]).toContain("c copy");
      renderer.handleInput("c");
      await Promise.resolve();
      expect(callbacks[index]).toHaveBeenCalledTimes(1);
      expect(callbacks[index].mock.calls[0]).toEqual([]);
      expect(renderer.render(width).join("\\n")).toContain("Copied to clipboard");
    }
  });

  it("reports copy failures and clears the status on the next key press", async () => {
    const onCopy = vi.fn().mockRejectedValue(new Error("boom"));
    const renderer = new GenericCodeRendererComponent("code", "line", mockTheme, onClose, viewportHeight, onCopy);

    renderer.handleInput("c");
    await Promise.resolve();
    expect(renderer.render(width).join("\\n")).toContain("Copy failed: boom");
    renderer.handleInput("j");
    expect(renderer.render(width).join("\\n")).not.toContain("Copy failed: boom");
  });

  it("calls copy without arguments and preserves the raw source supplied by the registry", async () => {
    const source = "```ts\nconst value = \"raw\";\n\u001b[31mred\u001b[0m\n```";
    const copyToClipboard = vi.fn().mockResolvedValue(undefined);
    const block = {
      id: "copy-contract",
      kind: "code" as const,
      language: "ts",
      source,
      ordinal: 1,
      capabilities: { copy: true, expand: true, exportFormats: [], renderPreview: true },
    };
    const onCopy = vi.fn(() => copyToClipboard(block.source));
    const renderer = createRendererForBlock(block, mockTheme, onClose, {
      viewportHeight,
      onCopy,
    });

    renderer.handleInput("c");
    await Promise.resolve();
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy.mock.calls[0]).toEqual([]);
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    expect(copyToClipboard.mock.calls[0]).toEqual([source]);
    expect(copyToClipboard.mock.calls[0][0]).toBe(source);
  });

  it("does not advertise or invoke copying when onCopy is absent", () => {
    const renderer = new GenericCodeRendererComponent("code", "line", mockTheme, onClose, viewportHeight);
    expect(renderer.render(width).join("\\n")).not.toContain("c copy");
    expect(() => renderer.handleInput("c")).not.toThrow();
  });

  it("preserves close keys and the formatted-data toggle", () => {
    const close = vi.fn();
    const renderer = new DataFormatRendererComponent('{"a":1}', "json", mockTheme, close, viewportHeight);
    expect(renderer.render(width)[0]).toContain("[Original]");
    renderer.handleInput("f");
    expect(renderer.render(width)[0]).toContain("[Formatted]");
    renderer.handleInput("q");
    new GenericCodeRendererComponent("code", "line", mockTheme, close, viewportHeight).handleInput("q");
    new DiffRendererComponent("diff", mockTheme, close, viewportHeight).handleInput("q");
    new TableRendererComponent("| A |\n| --- |\n| 1 |", mockTheme, close, viewportHeight).handleInput("q");
    new DiagramRendererComponent("diagram", "line", "mermaid", mockTheme, close, viewportHeight).handleInput("q");
    expect(close).toHaveBeenCalledTimes(5);
  });
});
