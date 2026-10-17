import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

export class DiffRendererComponent {
  private lines: string[];
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;

  constructor(diffText: string, theme: Theme, onClose: () => void) {
    this.lines = diffText.split(/\r?\n/);
    this.theme = theme;
    this.onClose = onClose;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || data.toLowerCase() === "q") {
      this.onClose();
      return;
    }
    if (matchesKey(data, "up") || data === "k") {
      this.scrollY = Math.max(0, this.scrollY - 1);
    } else if (matchesKey(data, "down") || data === "j") {
      this.scrollY = Math.min(Math.max(0, this.lines.length - 1), this.scrollY + 1);
    }
  }

  render(width: number): string[] {
    const th = this.theme;
    const output: string[] = [];

    output.push(th.fg("accent", " 🔄 Diff Preview (↑/↓ or j/k to scroll, Esc/q to close)"));
    output.push("");

    const visibleLines = this.lines.slice(this.scrollY);

    for (const rawLine of visibleLines) {
      let styled = rawLine;
      if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
        styled = th.fg("success", rawLine);
      } else if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
        styled = th.fg("error", rawLine);
      } else if (rawLine.startsWith("@@")) {
        styled = th.fg("warning", rawLine);
      } else if (rawLine.startsWith("diff ") || rawLine.startsWith("index ")) {
        styled = th.bold(th.fg("accent", rawLine));
      } else {
        styled = th.fg("dim", rawLine);
      }
      output.push(truncateToWidth(styled, width));
    }

    return output;
  }

  invalidate(): void {}
  dispose(): void {}
}
