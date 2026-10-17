import type { Theme } from "@earendil-works/pi-coding-agent";
import type { RichBlock } from "./content-model.js";
import { TableRendererComponent } from "./renderers/table-renderer.js";
import { DiffRendererComponent } from "./renderers/diff-renderer.js";
import { DataFormatRendererComponent } from "./renderers/json-yaml-xml-renderer.js";
import { GenericCodeRendererComponent } from "./renderers/code-renderer.js";
import { DiagramRendererComponent } from "./renderers/diagram-renderer.js";

export interface ComponentInstance {
  handleInput(data: string): void;
  render(width: number): string[];
  invalidate(): void;
  dispose(): void;
}

/**
 * Registry mapping each RichBlock kind to its corresponding TUI visualizer component.
 */
export function createRendererForBlock(
  block: RichBlock,
  theme: Theme,
  onClose: () => void
): ComponentInstance {
  switch (block.kind) {
    case "table":
      return new TableRendererComponent(block.source, theme, onClose);

    case "diff":
      return new DiffRendererComponent(block.source, theme, onClose);

    case "json":
    case "yaml":
    case "xml":
      return new DataFormatRendererComponent(block.source, block.kind, theme, onClose);

    case "mermaid":
    case "math":
      return new DiagramRendererComponent(
        block.title || block.kind,
        block.source,
        block.kind === "mermaid" ? "mermaid" : "latex",
        theme,
        onClose
      );

    case "code":
    default:
      return new GenericCodeRendererComponent(
        block.language ? `${block.kind} (${block.language})` : block.kind,
        block.source,
        theme,
        onClose
      );
  }
}
