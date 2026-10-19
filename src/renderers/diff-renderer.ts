import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { clampHorizontalOffset, hscrollForKey, sliceColumns } from "./hscroll.js";
import { formatRange, normalizedHeight, scrollForKey } from "./viewport.js";

export class DiffRendererComponent {
  private lines: string[];
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;
  private scrollX = 0;
  private horizontalWidth = 1;
  private viewportHeight: number;
  private onCopy?: () => Promise<void>;
  private status = "";

  constructor(diffText: string, theme: Theme, onClose: () => void, viewportHeight = 20, onCopy?: () => Promise<void>) {
    this.lines = diffText.split(/\r?\n/);
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
    const horizontalOffset = hscrollForKey(data, {
      offset: this.scrollX,
      maxLineWidth: Math.max(0, ...this.lines.map((line) => visibleWidth(line))),
      width: this.horizontalWidth,
    });
    if (horizontalOffset !== null) {
      this.scrollX = horizontalOffset;
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
    output.push(
      truncateToWidth(
        th.fg(
          "accent",
          ` 🔄 Diff ${this.status ? `${this.status} ` : ""}${range} (${this.onCopy ? "c copy, " : ""}←/→ or h/l, ↑/↓ or j/k to scroll, PgUp/PgDn, g/G, Esc/q to close)`
        ),
        width
      )
    );
    output.push("");

    const visibleLines = this.lines.slice(this.scrollY, this.scrollY + this.viewportHeight);
    const maxLineWidth = Math.max(0, ...this.lines.map((line) => visibleWidth(line)));
    this.horizontalWidth = width;
    this.scrollX = clampHorizontalOffset(this.scrollX, maxLineWidth, width);

    for (const rawLine of visibleLines) {
      const hasMarker =
        (rawLine.startsWith("+") && !rawLine.startsWith("+++")) ||
        (rawLine.startsWith("-") && !rawLine.startsWith("---")) ||
        rawLine.startsWith(" ");
      const marker = hasMarker ? rawLine[0] : "";
      const body = hasMarker ? rawLine.slice(1) : rawLine;
      const bodyWidth = Math.max(0, width - visibleWidth(marker));
      const visibleBody = sliceColumns(body, this.scrollX, bodyWidth);
      const visibleLine = marker + visibleBody;

      let styled: string;
      if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
        styled = th.fg("success", visibleLine);
      } else if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
        styled = th.fg("error", visibleLine);
      } else if (rawLine.startsWith("@@")) {
        styled = th.fg("warning", sliceColumns(rawLine, this.scrollX, width));
      } else if (rawLine.startsWith("diff ") || rawLine.startsWith("index ")) {
        styled = th.bold(th.fg("accent", sliceColumns(rawLine, this.scrollX, width)));
      } else {
        styled = th.fg("dim", visibleLine);
      }
      output.push(truncateToWidth(styled, width));
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
