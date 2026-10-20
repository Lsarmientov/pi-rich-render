import { describe, expect, it, vi } from "vitest";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import { GenericCodeRendererComponent } from "../src/renderers/code-renderer.js";
import { TableRendererComponent } from "../src/renderers/table-renderer.js";
import { classifyDiffLine, DiffRendererComponent } from "../src/renderers/diff-renderer.js";
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

const tableSource = ["| Name | Value |", "| --- | --- |", ...Array.from({ length: 30 }, (_, i) => `| row-${i + 1} | value-${i + 1}-${"x".repeat(100)} |`)].join("\n");

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

  it("scrolls long code lines horizontally while keeping the line number fixed", () => {
    const source = "0123456789".repeat(20);
    const renderer = new GenericCodeRendererComponent("code", source, mockTheme, onClose, viewportHeight);
    const initial = renderer.render(40);
    expect(visibleWidth(initial[2])).toBeLessThanOrEqual(40);
    expect(initial[2]).toMatch(/^\s*1 │ 0123456789/);

    renderer.handleInput("l");
    const scrolled = renderer.render(40);
    expect(scrolled[2]).toMatch(/^\s*1 │ 4567890123/);
    expect(visibleWidth(scrolled[2])).toBeLessThanOrEqual(40);

    renderer.handleInput("h");
    expect(renderer.render(40)[2]).toBe(initial[2]);
  });

  it("supports right-aligned copy clicks and vertical wheel scrolling in code", async () => {
    const source = Array.from({ length: 20 }, (_, i) => `code-line-${i + 1}`).join("\n");
    const onCopy = vi.fn().mockResolvedValue(undefined);
    const renderer = new GenericCodeRendererComponent("code", source, mockTheme, onClose, 4, onCopy);
    const event = (type: "click" | "wheel", x: number, y: number, wheelDelta?: number) => ({
      type,
      button: type === "click" ? "left" as const : "none" as const,
      x,
      y,
      screenX: x,
      screenY: y,
      width: 40,
      height: 6,
      shift: false,
      alt: false,
      ctrl: false,
      wheelDelta,
    });

    expect(renderer.render(40)[0].endsWith("[ copy ]")).toBe(true);
    expect(renderer.handleMouse(event("click", 38, 0))).toEqual({ handled: true, render: true });
    expect(onCopy).toHaveBeenCalledTimes(1);
    await Promise.resolve();

    expect(renderer.handleMouse(event("click", 2, 0))).toBeUndefined();
    expect(renderer.handleMouse(event("click", 38, 5))).toBeUndefined();
    expect(onCopy).toHaveBeenCalledTimes(1);

    expect(renderer.render(40)[2]).toMatch(/^\s*1 │ code-line-1/);
    expect(renderer.handleMouse(event("wheel", 2, 2, 3))).toEqual({ handled: true });
    expect(renderer.render(40)[2]).toMatch(/^\s*4 │ code-line-4/);
    expect(renderer.handleMouse(event("wheel", 2, 2, -3))).toEqual({ handled: true });
    expect(renderer.render(40)[2]).toMatch(/^\s*1 │ code-line-1/);
  });

  it.each([
    ["add", "+added line", "add"],
    ["remove", "-removed line", "remove"],
    ["context", " unchanged line", "context"],
    ["file", "diff --git a/file b/file", "file"],
    ["hunk", "@@ -1,2 +1,2 @@", "hunk"],
    ["meta", "index 0123456..abcdef0 100644", "meta"],
  ] as const)("classifies diff %s lines", (_name, line, expected) => {
    expect(classifyDiffLine(line)).toBe(expected);
  });

  it("renders diff file lines as headers and keeps add/remove markers", () => {
    const styledTheme = {
      ...mockTheme,
      fg: (color: string, text: string) => `${color}:${text}`,
      bold: (text: string) => `bold:${text}`,
    } as unknown as Theme;
    const renderer = new DiffRendererComponent("diff --git a/file b/file\n+added\n-removed", styledTheme, onClose);
    const lines = renderer.render(width);

    expect(lines[2]).toBe("bold:accent:diff --git a/file b/file");
    expect(lines[3]).toBe("success:+added");
    expect(lines[4]).toBe("error:-removed");
  });

  it("keeps the diff marker visible while scrolling long changed lines", () => {
    const renderer = new DiffRendererComponent("+" + "0123456789".repeat(20), mockTheme, onClose, viewportHeight);
    const initial = renderer.render(40);
    expect(visibleWidth(initial[2])).toBeLessThanOrEqual(40);
    expect(initial[2]).toMatch(/^\+0123456789/);

    renderer.handleInput("l");
    const scrolled = renderer.render(40);
    expect(scrolled[2]).toMatch(/^\+4567890123/);
    expect(visibleWidth(scrolled[2])).toBeLessThanOrEqual(40);

    renderer.handleInput("h");
    expect(renderer.render(40)[2]).toBe(initial[2]);
  });

  it("never splits a wide character across a horizontally scrolled code line", () => {
    const renderer = new GenericCodeRendererComponent("code", "日本語コード", mockTheme, onClose, viewportHeight);
    const initial = renderer.render(10)[2];
    expect(initial).toContain("日本語");
    expect(visibleWidth(initial)).toBeLessThanOrEqual(10);

    renderer.handleInput("l");
    const scrolled = renderer.render(10)[2];
    expect(scrolled).toContain("語コー");
    expect(visibleWidth(scrolled)).toBeLessThanOrEqual(10);
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

  it("shows invalid JSON source and a formatting-unavailable notice", () => {
    const source = '{"broken": }';
    const renderer = new DataFormatRendererComponent(source, "json", mockTheme, onClose, viewportHeight);

    renderer.handleInput("f");
    const lines = renderer.render(160);
    expect(lines[0]).toContain("format unavailable:");
    expect(lines[2]).toBe(source);
  });

  it("toggles valid JSON between pretty and raw and always copies the exact source", async () => {
    const source = '{"a":1,"nested":{"b":true}}';
    const copySpy = vi.fn();
    const onCopy = vi.fn(() => copySpy(source));
    const renderer = new DataFormatRendererComponent(source, "json", mockTheme, onClose, viewportHeight, onCopy);

    renderer.handleInput("f");
    expect(renderer.render(width).slice(2).join("\n")).toContain('"a": 1');
    renderer.handleInput("c");
    await Promise.resolve();
    expect(copySpy).toHaveBeenLastCalledWith(source);

    renderer.handleInput("f");
    expect(renderer.render(width)[2]).toBe(source);
    renderer.handleInput("c");
    await Promise.resolve();
    expect(copySpy).toHaveBeenCalledTimes(2);
    expect(copySpy).toHaveBeenLastCalledWith(source);
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

  it("renders Mermaid source as text without graphics", () => {
    const source = "flowchart TD\n  A[Start] --> B[End]";
    const renderer = new DiagramRendererComponent("diagram", source, "mermaid", mockTheme, onClose, viewportHeight);
    const lines = renderer.render(width);

    expect(lines.slice(2)).toEqual(["flowchart TD", "  A[Start] --> B[End]"]);
  });

  it("copies Mermaid source byte for byte, including its original newlines", async () => {
    const source = "flowchart TD\r\n  A[Start] --> B[End]\r\n";
    const copySpy = vi.fn();
    const onCopy = vi.fn(() => copySpy(source));
    const renderer = new DiagramRendererComponent("diagram", source, "mermaid", mockTheme, onClose, viewportHeight, onCopy);

    renderer.handleInput("c");
    await Promise.resolve();
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(copySpy).toHaveBeenCalledWith(source);
    expect(copySpy.mock.calls[0][0]).toBe(source);
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
    expect(renderer.render(width)[0]).not.toContain("[ copy ]");
    expect(() => renderer.handleInput("c")).not.toThrow();
    expect(() => renderer.handleMouse({
      type: "click",
      button: "left",
      x: 2,
      y: 0,
      screenX: 2,
      screenY: 0,
      width,
      height: viewportHeight + 2,
      shift: false,
      alt: false,
      ctrl: false,
    })).not.toThrow();
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
