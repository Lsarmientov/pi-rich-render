import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import { formatRange, normalizedHeight, scrollForKey } from "./viewport.js";

export class DiagramRendererComponent {
  private title: string;
  private source: string;
  private kind: "mermaid" | "latex";
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;
  private viewportHeight: number;
  private onCopy?: () => Promise<void>;
  private status = "";

  constructor(
    title: string,
    source: string,
    kind: "mermaid" | "latex",
    theme: Theme,
    onClose: () => void,
    viewportHeight = 20,
    onCopy?: () => Promise<void>
  ) {
    this.title = title;
    this.source = source;
    this.kind = kind;
    this.theme = theme;
    this.onClose = onClose;
    this.viewportHeight = normalizedHeight(viewportHeight);
    this.onCopy = onCopy;
  }

  handleInput(data: string): void {
    this.status = "";
    if (data === "c" && this.onCopy) {
      void this.copy();
      return;
    }
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || data.toLowerCase() === "q") {
      this.onClose();
      return;
    }
    const lines = this.source.split(/\r?\n/);
    const offset = scrollForKey(data, {
      offset: this.scrollY,
      total: lines.length,
      height: this.viewportHeight,
    });
    if (offset !== null) this.scrollY = offset;
  }

  render(width: number): string[] {
    const th = this.theme;
    const output: string[] = [];

    const icon = this.kind === "mermaid" ? "📐 Mermaid Diagram" : "∑ LaTeX Formula";
    const lines = this.source.split(/\r?\n/);
    const range = formatRange({ offset: this.scrollY, total: lines.length, height: this.viewportHeight });
    output.push(
      truncateToWidth(
        th.fg(
          "accent",
          ` ${icon}: ${this.title} ${this.status ? `${this.status} ` : ""}${range} (${this.onCopy ? "c copy, " : ""}↑/↓ to scroll, PgUp/PgDn, g/G, Esc/q to close) [Note: Terminal shows raw syntax faithfully; graphical preview requires browser sidecar]`
        ),
        width
      )
    );
    output.push("");

    const visibleLines = lines.slice(this.scrollY, this.scrollY + this.viewportHeight);

    for (const line of visibleLines) {
      output.push(truncateToWidth(th.fg("text", line), width));
    }

    return output;
  }

  private async copy(): Promise<void> {
    try {
      await this.onCopy?.();
      this.status = "Copied to clipboard";
    } catch (error) {
      this.status = `Copy failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  invalidate(): void {}
  dispose(): void {}
}
