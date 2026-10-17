import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

export class DataFormatRendererComponent {
  private rawSource: string;
  private formattedSource: string;
  private kind: "json" | "yaml" | "xml";
  private showFormatted = false;
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;

  constructor(source: string, kind: "json" | "yaml" | "xml", theme: Theme, onClose: () => void) {
    this.rawSource = source;
    this.kind = kind;
    this.theme = theme;
    this.onClose = onClose;

    this.formattedSource = this.tryFormat(source, kind);
  }

  private tryFormat(text: string, kind: string): string {
    if (kind === "json") {
      try {
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return text;
      }
    }
    // For YAML/XML, return original or normalized indentation
    return text;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || data.toLowerCase() === "q") {
      this.onClose();
      return;
    }
    if (data.toLowerCase() === "f") {
      this.showFormatted = !this.showFormatted;
      return;
    }
    const currentLines = (this.showFormatted ? this.formattedSource : this.rawSource).split(/\r?\n/);
    if (matchesKey(data, "up") || data === "k") {
      this.scrollY = Math.max(0, this.scrollY - 1);
    } else if (matchesKey(data, "down") || data === "j") {
      this.scrollY = Math.min(Math.max(0, currentLines.length - 1), this.scrollY + 1);
    }
  }

  render(width: number): string[] {
    const th = this.theme;
    const output: string[] = [];
    const modeLabel = this.showFormatted ? "[Formatted]" : "[Original]";

    output.push(
      th.fg(
        "accent",
        ` 📦 ${this.kind.toUpperCase()} Preview ${modeLabel} ('f' toggle format, ↑/↓ scroll, Esc/q close)`
      )
    );
    output.push("");

    const activeText = this.showFormatted ? this.formattedSource : this.rawSource;
    const lines = activeText.split(/\r?\n/).slice(this.scrollY);

    for (const line of lines) {
      output.push(truncateToWidth(th.fg("text", line), width));
    }

    return output;
  }

  invalidate(): void {}
  dispose(): void {}
}
