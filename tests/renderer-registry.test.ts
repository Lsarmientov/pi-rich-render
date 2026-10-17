import { describe, it, expect, vi } from "vitest";
import type { Theme } from "@earendil-works/pi-coding-agent";
import type { RichBlock } from "../src/content-model.js";
import { createRendererForBlock } from "../src/renderer-registry.js";
import { DiffRendererComponent } from "../src/renderers/diff-renderer.js";
import { DataFormatRendererComponent } from "../src/renderers/json-yaml-xml-renderer.js";
import { TableRendererComponent } from "../src/renderers/table-renderer.js";
import { DiagramRendererComponent } from "../src/renderers/diagram-renderer.js";
import { GenericCodeRendererComponent } from "../src/renderers/code-renderer.js";

const mockTheme = {
  fg: (_color: string, text: string) => text,
  bg: (_color: string, text: string) => text,
  bold: (text: string) => text,
  style: (text: string) => text,
} as unknown as Theme;

describe("Renderer Registry", () => {
  const onClose = vi.fn();

  it("should create TableRendererComponent for table blocks", () => {
    const block: RichBlock = {
      id: "1",
      kind: "table",
      source: "| A |\n|---|\n| 1 |",
      ordinal: 0,
      capabilities: { copy: true, expand: true, exportFormats: ["tsv"], renderPreview: true },
    };
    const renderer = createRendererForBlock(block, mockTheme, onClose);
    expect(renderer).toBeInstanceOf(TableRendererComponent);
  });

  it("should create DiffRendererComponent for diff blocks", () => {
    const block: RichBlock = {
      id: "2",
      kind: "diff",
      source: "+ added\n- removed",
      ordinal: 1,
      capabilities: { copy: true, expand: true, exportFormats: ["source"], renderPreview: true },
    };
    const renderer = createRendererForBlock(block, mockTheme, onClose);
    expect(renderer).toBeInstanceOf(DiffRendererComponent);
  });

  it("should create DataFormatRendererComponent for json/yaml/xml blocks", () => {
    const block: RichBlock = {
      id: "3",
      kind: "json",
      source: '{"a": 1}',
      ordinal: 2,
      capabilities: { copy: true, expand: true, exportFormats: ["source"], renderPreview: true },
    };
    const renderer = createRendererForBlock(block, mockTheme, onClose);
    expect(renderer).toBeInstanceOf(DataFormatRendererComponent);
  });

  it("should create DiagramRendererComponent for mermaid and math blocks", () => {
    const block: RichBlock = {
      id: "4",
      kind: "mermaid",
      source: "graph TD; A-->B;",
      ordinal: 3,
      capabilities: { copy: true, expand: true, exportFormats: ["source"], renderPreview: true },
    };
    const renderer = createRendererForBlock(block, mockTheme, onClose);
    expect(renderer).toBeInstanceOf(DiagramRendererComponent);
  });

  it("should create GenericCodeRendererComponent for standard code blocks", () => {
    const block: RichBlock = {
      id: "5",
      kind: "code",
      language: "typescript",
      source: "const x = 10;",
      ordinal: 4,
      capabilities: { copy: true, expand: true, exportFormats: ["source"], renderPreview: false },
    };
    const renderer = createRendererForBlock(block, mockTheme, onClose);
    expect(renderer).toBeInstanceOf(GenericCodeRendererComponent);
  });
});
