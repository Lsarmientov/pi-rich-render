import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { formatRange, normalizedHeight, scrollForKey } from "./viewport.js";

export class GenericCodeRendererComponent {
  private title: string;
  private lines: string[];
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;
  private viewportHeight: number;
  private onCopy?: () => Promise<void>;
  private status = "";

  constructor(
    title: string,
    content: string,
    theme: Theme,
    onClose: () => void,
    viewportHeight = 20,
    onCopy?: () => Promise<void>
  ) {
    this.title = title;
    this.lines = content.split(/\r?\n/);
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
    const offset = scrollForKey(data, {
      offset: this.scrollY,
      total: this.lines.length,
      height: this.viewportHeight,
    });
    if (offset !== null) this.scrollY = offset;
  }

  render(width: number): string[] {
    const th = this.theme;
    const output: string[] = [];

    const range = formatRange({ offset: this.scrollY, total: this.lines.length, height: this.viewportHeight });
    const hint = `(↑/↓ or j/k to scroll, PgUp/PgDn, g/G, Esc/q to close${this.onCopy ? ", c copy" : ""})`;
    const status = this.status ? `${this.status} ` : "";
    const fixedText = ` 📄  ${range} ${status}${hint}`;
    const title = truncateToWidth(this.title, Math.max(0, width - visibleWidth(fixedText)));
    output.push(truncateToWidth(th.fg("accent", ` 📄 ${title} ${range} ${status}${hint}`), width));
    output.push("");

    const visibleLines = this.lines.slice(this.scrollY, this.scrollY + this.viewportHeight);
    const lineNumberWidth = String(this.lines.length).length;

    for (let i = 0; i < visibleLines.length; i++) {
      const lineNum = String(this.scrollY + i + 1).padStart(lineNumberWidth, " ");
      const formatted = `${th.fg("dim", lineNum)} │ ${th.fg("text", visibleLines[i])}`;
      output.push(truncateToWidth(formatted, width));
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
