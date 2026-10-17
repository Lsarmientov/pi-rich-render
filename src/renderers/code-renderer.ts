import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

export class GenericCodeRendererComponent {
  private title: string;
  private lines: string[];
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;

  constructor(title: string, content: string, theme: Theme, onClose: () => void) {
    this.title = title;
    this.lines = content.split(/\r?\n/);
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

    output.push(th.fg("accent", ` 📄 ${this.title} (↑/↓ or j/k to scroll, Esc/q to close)`));
    output.push("");

    const visibleLines = this.lines.slice(this.scrollY);

    for (let i = 0; i < visibleLines.length; i++) {
      const lineNum = String(this.scrollY + i + 1).padStart(3, " ");
      const formatted = `${th.fg("dim", lineNum)} │ ${th.fg("text", visibleLines[i])}`;
      output.push(truncateToWidth(formatted, width));
    }

    return output;
  }

  invalidate(): void {}
  dispose(): void {}
}
