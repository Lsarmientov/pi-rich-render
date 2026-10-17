import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

export class DiagramRendererComponent {
  private title: string;
  private source: string;
  private kind: "mermaid" | "latex";
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;

  constructor(title: string, source: string, kind: "mermaid" | "latex", theme: Theme, onClose: () => void) {
    this.title = title;
    this.source = source;
    this.kind = kind;
    this.theme = theme;
    this.onClose = onClose;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || data.toLowerCase() === "q") {
      this.onClose();
      return;
    }
    const lines = this.source.split(/\r?\n/);
    if (matchesKey(data, "up") || data === "k") {
      this.scrollY = Math.max(0, this.scrollY - 1);
    } else if (matchesKey(data, "down") || data === "j") {
      this.scrollY = Math.min(Math.max(0, lines.length - 1), this.scrollY + 1);
    }
  }

  render(width: number): string[] {
    const th = this.theme;
    const output: string[] = [];

    const icon = this.kind === "mermaid" ? "📐 Mermaid Diagram" : "∑ LaTeX Formula";
    output.push(th.fg("accent", ` ${icon}: ${this.title} (↑/↓ to scroll, Esc/q to close)`));
    output.push(th.fg("dim", " [Note: Terminal shows raw syntax faithfully; graphical preview requires browser sidecar]"));
    output.push("");

    const lines = this.source.split(/\r?\n/).slice(this.scrollY);

    for (const line of lines) {
      output.push(truncateToWidth(th.fg("text", line), width));
    }

    return output;
  }

  invalidate(): void {}
  dispose(): void {}
}
