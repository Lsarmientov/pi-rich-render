import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";
import { clampHorizontalOffset, hscrollForKey, sliceColumns } from "./hscroll.js";
import { isCopyTargetHit, wheelLines } from "./mouse.js";
import { clampOffset, formatRange, normalizedHeight, scrollForKey } from "./viewport.js";

export class GenericCodeRendererComponent {
  private title: string;
  private lines: string[];
  private theme: Theme;
  private onClose: () => void;
  private scrollY = 0;
  private scrollX = 0;
  private horizontalWidth = 1;
  private lastRenderedWidth = 0;
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

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    if (event.type === "wheel") {
      this.scrollY = clampOffset(this.scrollY + wheelLines(event.wheelDelta), this.lines.length, this.viewportHeight);
      return { handled: true };
    }
    if (event.type === "click" && this.onCopy && isCopyTargetHit(event.x, event.y, {
      width: this.lastRenderedWidth,
      labelWidth: "[ copy ]".length,
    })) {
      void this.copy();
      return { handled: true, render: true };
    }
    return undefined;
  }

  render(width: number): string[] {
    this.lastRenderedWidth = width;
    const th = this.theme;
    const output: string[] = [];

    const range = formatRange({ offset: this.scrollY, total: this.lines.length, height: this.viewportHeight });
    const hint = `(${this.onCopy ? "c copy, " : ""}←/→ or h/l to scroll, ↑/↓ or j/k, PgUp/PgDn, g/G, Esc/q to close)`;
    const status = this.status ? `${this.status} ` : "";
    const fixedText = ` 📄  ${range} ${status}${hint}`;
    const title = truncateToWidth(this.title, Math.max(0, width - visibleWidth(fixedText)));
    const header = th.fg("accent", ` 📄 ${title} ${range} ${status}${hint}`);
    if (this.onCopy) {
      const label = "[ copy ]";
      const headerWidth = Math.max(0, width - visibleWidth(label));
      const visibleHeader = truncateToWidth(header, headerWidth);
      output.push(`${visibleHeader}${" ".repeat(Math.max(0, headerWidth - visibleWidth(visibleHeader)))}${truncateToWidth(label, width)}`);
    } else {
      output.push(truncateToWidth(header, width));
    }
    output.push("");

    const visibleLines = this.lines.slice(this.scrollY, this.scrollY + this.viewportHeight);
    const lineNumberWidth = String(this.lines.length).length;
    const prefixWidth = visibleWidth(`${" ".repeat(lineNumberWidth)} │ `);
    const contentWidth = Math.max(0, width - prefixWidth);
    this.horizontalWidth = contentWidth;
    this.scrollX = clampHorizontalOffset(
      this.scrollX,
      Math.max(0, ...this.lines.map((line) => visibleWidth(line))),
      contentWidth
    );

    for (let i = 0; i < visibleLines.length; i++) {
      const lineNum = String(this.scrollY + i + 1).padStart(lineNumberWidth, " ");
      const rawText = sliceColumns(visibleLines[i], this.scrollX, contentWidth);
      const formatted = `${th.fg("dim", lineNum)} │ ${th.fg("text", rawText)}`;
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
