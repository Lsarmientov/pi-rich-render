import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";
import { parseTableData, type TableData } from "../exporters/table-exporter.js";
import { clampHorizontalOffset, hscrollForKey, sliceColumns } from "./hscroll.js";
import { isCopyTargetHit, wheelLines } from "./mouse.js";
import { clampOffset, formatRange, normalizedHeight, scrollForKey } from "./viewport.js";

/**
 * Interactive TUI component for rendering structured tables with column alignment,
 * horizontal scrolling support, and clean borders.
 */
export class TableRendererComponent {
  private data: TableData;
  private theme: Theme;
  private onClose: () => void;
  private scrollX = 0;
  private scrollY = 0;
  private horizontalWidth = 1;
  private lastRenderedWidth = 0;
  private maxLineWidth = 0;
  private viewportHeight: number;
  private onCopy?: () => Promise<void>;
  private status = "";

  constructor(
    tableMarkdown: string,
    theme: Theme,
    onClose: () => void,
    viewportHeight = 20,
    onCopy?: () => Promise<void>
  ) {
    this.theme = theme;
    this.onClose = onClose;
    this.viewportHeight = normalizedHeight(viewportHeight);
    this.onCopy = onCopy;
    const parsed = parseTableData(tableMarkdown);
    this.data = parsed ?? {
      headers: ["Raw Content"],
      alignments: ["left"],
      rows: tableMarkdown.split("\n").map((l) => [l]),
    };
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
      maxLineWidth: this.maxLineWidth,
      width: this.horizontalWidth,
    });
    if (horizontalOffset !== null) {
      this.scrollX = horizontalOffset;
      return;
    }
    const offset = scrollForKey(data, {
      offset: this.scrollY,
      total: this.data.rows.length + 4,
      height: this.viewportHeight,
    });
    if (offset !== null) this.scrollY = offset;
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    if (event.type === "wheel") {
      this.scrollY = clampOffset(this.scrollY + wheelLines(event.wheelDelta), this.data.rows.length + 4, this.viewportHeight);
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
    const tableLines: string[] = [];
    const { headers, alignments, rows } = this.data;

    // 1. Calculate column widths based on content
    const colWidths: number[] = headers.map((h) => visibleWidth(h));
    for (const row of rows) {
      for (let c = 0; c < headers.length; c++) {
        const cell = row[c] ?? "";
        colWidths[c] = Math.max(colWidths[c], visibleWidth(cell));
      }
    }

    // Add padding (minimum 1 space left and right)
    const paddedWidths = colWidths.map((w) => w + 2);

    const padCell = (content: string, colIndex: number): string => {
      const targetWidth = paddedWidths[colIndex];
      const vis = visibleWidth(content);
      const remaining = Math.max(0, targetWidth - vis);
      const align = alignments[colIndex] ?? "left";

      if (align === "right") {
        return " " + " ".repeat(remaining - 1) + content;
      } else if (align === "center") {
        const leftPad = Math.floor(remaining / 2);
        const rightPad = remaining - leftPad;
        return " ".repeat(leftPad) + content + " ".repeat(rightPad);
      }
      // default: left
      return " " + content + " ".repeat(Math.max(0, remaining - 1));
    };

    // Header title
    const range = formatRange({ offset: this.scrollY, total: rows.length + 4, height: this.viewportHeight });
    const status = this.status ? `${this.status} ` : "";
    const copyHint = this.onCopy ? "c copy, " : "";
    const header = th.fg("accent", ` 📊 ${status}${range} (${copyHint}←/→/↑/↓ or h/j/k/l to scroll, PgUp/PgDn, g/G, Esc/q to close)`);
    if (this.onCopy) {
      const label = "[ copy ]";
      const headerWidth = Math.max(0, width - visibleWidth(label));
      const visibleHeader = truncateToWidth(header, headerWidth);
      output.push(`${visibleHeader}${" ".repeat(Math.max(0, headerWidth - visibleWidth(visibleHeader)))}${truncateToWidth(label, width)}`);
    } else {
      output.push(truncateToWidth(header, width));
    }
    output.push("");

    // Top border: ┌───┬───┐
    const topBorder =
      th.fg("border", "┌") +
      paddedWidths.map((w) => th.fg("border", "─".repeat(w))).join(th.fg("border", "┬")) +
      th.fg("border", "┐");
    tableLines.push(topBorder);

    // Header cells: │ col 1 │ col 2 │
    const headerRow =
      th.fg("border", "│") +
      headers
        .map((h, i) => th.bold(th.fg("accent", padCell(h, i))))
        .join(th.fg("border", "│")) +
      th.fg("border", "│");
    tableLines.push(headerRow);

    // Delimiter border: ├───┼───┤
    const midBorder =
      th.fg("border", "├") +
      paddedWidths.map((w) => th.fg("border", "─".repeat(w))).join(th.fg("border", "┼")) +
      th.fg("border", "┤");
    tableLines.push(midBorder);

    // Data rows with vertical scroll
    for (const row of rows) {
      const rowLine =
        th.fg("border", "│") +
        headers
          .map((_, i) => th.fg("text", padCell(row[i] ?? "", i)))
          .join(th.fg("border", "│")) +
        th.fg("border", "│");
      tableLines.push(rowLine);
    }

    // Bottom border: └───┴───┘
    const bottomBorder =
      th.fg("border", "└") +
      paddedWidths.map((w) => th.fg("border", "─".repeat(w))).join(th.fg("border", "┴")) +
      th.fg("border", "┘");
    tableLines.push(bottomBorder);

    this.horizontalWidth = width;
    this.maxLineWidth = Math.max(0, ...tableLines.map((line) => visibleWidth(line)));
    this.scrollX = clampHorizontalOffset(this.scrollX, this.maxLineWidth, width);
    for (const line of tableLines.slice(this.scrollY, this.scrollY + this.viewportHeight)) {
      output.push(this.applyHorizontalScroll(line, width));
    }
    return output;
  }

  private applyHorizontalScroll(line: string, width: number): string {
    const offset = clampHorizontalOffset(this.scrollX, visibleWidth(line), width);
    return truncateToWidth(this.sliceStyledColumns(line, offset, width), width);
  }

  private sliceStyledColumns(line: string, offset: number, width: number): string {
    if (offset === 0 && visibleWidth(line) <= width) return line;

    const tokens = line.match(/\u001b\[[0-?]*[ -/]*[@-~]|[^\u001b]+|\u001b/g) ?? [];
    let column = 0;
    let pendingAnsi = "";
    let output = "";
    for (const token of tokens) {
      if (token.startsWith("\u001b")) {
        pendingAnsi += token;
        continue;
      }

      const textWidth = visibleWidth(token);
      const start = Math.max(offset, column);
      const end = Math.min(offset + width, column + textWidth);
      if (end > start) {
        const visibleText = sliceColumns(token, start - column, end - start);
        if (visibleText) {
          output += pendingAnsi + visibleText;
          pendingAnsi = "";
        }
      }
      column += textWidth;
      if (column >= offset + width) break;
    }
    if (output && line.includes("\u001b[")) output += "\u001b[0m";
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
