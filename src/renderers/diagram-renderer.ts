import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";
import { clampHorizontalOffset, hscrollForKey, sliceColumns } from "./hscroll.js";
import { isCopyTargetHit, wheelLines } from "./mouse.js";
import { clampOffset, formatRange, normalizedHeight, scrollForKey } from "./viewport.js";

export class DiagramRendererComponent {
  private title: string;
  private source: string;
  private kind: "mermaid" | "latex";
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
    const horizontalOffset = hscrollForKey(data, {
      offset: this.scrollX,
      maxLineWidth: Math.max(0, ...lines.map((line) => visibleWidth(line))),
      width: this.horizontalWidth,
    });
    if (horizontalOffset !== null) {
      this.scrollX = horizontalOffset;
      return;
    }
    const offset = scrollForKey(data, {
      offset: this.scrollY,
      total: lines.length,
      height: this.viewportHeight,
    });
    if (offset !== null) this.scrollY = offset;
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    if (event.type === "wheel") {
      const lines = this.source.split(/\r?\n/);
      this.scrollY = clampOffset(this.scrollY + wheelLines(event.wheelDelta), lines.length, this.viewportHeight);
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

    const icon = this.kind === "mermaid" ? "📐 Mermaid Diagram" : "∑ LaTeX Formula";
    const lines = this.source.split(/\r?\n/);
    const range = formatRange({ offset: this.scrollY, total: lines.length, height: this.viewportHeight });
    const header = th.fg(
      "accent",
      ` ${icon}: ${this.title} ${this.status ? `${this.status} ` : ""}${range} (${this.onCopy ? "c copy, " : ""}←/→ or h/l, ↑/↓ to scroll, PgUp/PgDn, g/G, Esc/q to close) [Note: Terminal shows raw syntax faithfully; graphical preview requires browser sidecar]`
    );
    if (this.onCopy) {
      const label = "[ copy ]";
      const headerWidth = Math.max(0, width - visibleWidth(label));
      const visibleHeader = truncateToWidth(header, headerWidth);
      output.push(`${visibleHeader}${" ".repeat(Math.max(0, headerWidth - visibleWidth(visibleHeader)))}${truncateToWidth(label, width)}`);
    } else {
      output.push(truncateToWidth(header, width));
    }
    output.push("");

    const visibleLines = lines.slice(this.scrollY, this.scrollY + this.viewportHeight);
    const maxLineWidth = Math.max(0, ...lines.map((line) => visibleWidth(line)));
    this.horizontalWidth = width;
    this.scrollX = clampHorizontalOffset(this.scrollX, maxLineWidth, width);

    for (const line of visibleLines) {
      const visibleLine = sliceColumns(line, this.scrollX, width);
      output.push(truncateToWidth(th.fg("text", visibleLine), width));
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
