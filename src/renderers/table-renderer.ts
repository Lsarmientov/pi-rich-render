import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { parseTableData, type TableData } from "../exporters/table-exporter.js";

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

  constructor(tableMarkdown: string, theme: Theme, onClose: () => void) {
    this.theme = theme;
    this.onClose = onClose;
    const parsed = parseTableData(tableMarkdown);
    this.data = parsed ?? {
      headers: ["Raw Content"],
      alignments: ["left"],
      rows: tableMarkdown.split("\n").map((l) => [l]),
    };
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || data.toLowerCase() === "q") {
      this.onClose();
      return;
    }

    if (matchesKey(data, "left") || data === "h") {
      this.scrollX = Math.max(0, this.scrollX - 4);
    } else if (matchesKey(data, "right") || data === "l") {
      this.scrollX += 4;
    } else if (matchesKey(data, "up") || data === "k") {
      this.scrollY = Math.max(0, this.scrollY - 1);
    } else if (matchesKey(data, "down") || data === "j") {
      this.scrollY += 1;
    }
  }

  render(width: number): string[] {
    const th = this.theme;
    const lines: string[] = [];
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
    lines.push(th.fg("accent", " 📊 Table Preview (←/→/↑/↓ or h/j/k/l to scroll, Esc/q to close)"));
    lines.push("");

    // Top border: ┌───┬───┐
    const topBorder =
      th.fg("border", "┌") +
      paddedWidths.map((w) => th.fg("border", "─".repeat(w))).join(th.fg("border", "┬")) +
      th.fg("border", "┐");
    lines.push(this.applyHorizontalScroll(topBorder, width));

    // Header cells: │ col 1 │ col 2 │
    const headerRow =
      th.fg("border", "│") +
      headers
        .map((h, i) => th.bold(th.fg("accent", padCell(h, i))))
        .join(th.fg("border", "│")) +
      th.fg("border", "│");
    lines.push(this.applyHorizontalScroll(headerRow, width));

    // Delimiter border: ├───┼───┤
    const midBorder =
      th.fg("border", "├") +
      paddedWidths.map((w) => th.fg("border", "─".repeat(w))).join(th.fg("border", "┼")) +
      th.fg("border", "┤");
    lines.push(this.applyHorizontalScroll(midBorder, width));

    // Data rows with vertical scroll
    const visibleRows = rows.slice(this.scrollY);
    for (const row of visibleRows) {
      const rowLine =
        th.fg("border", "│") +
        headers
          .map((_, i) => th.fg("text", padCell(row[i] ?? "", i)))
          .join(th.fg("border", "│")) +
        th.fg("border", "│");
      lines.push(this.applyHorizontalScroll(rowLine, width));
    }

    // Bottom border: └───┴───┘
    const bottomBorder =
      th.fg("border", "└") +
      paddedWidths.map((w) => th.fg("border", "─".repeat(w))).join(th.fg("border", "┴")) +
      th.fg("border", "┘");
    lines.push(this.applyHorizontalScroll(bottomBorder, width));

    return lines;
  }

  private applyHorizontalScroll(line: string, width: number): string {
    // In TUI rendering, truncate to terminal width with optional scroll offset
    if (this.scrollX > 0) {
      // slice visual columns when scrolled
      return truncateToWidth(line.slice(Math.min(this.scrollX, line.length)), width);
    }
    return truncateToWidth(line, width);
  }

  invalidate(): void {}
  dispose(): void {}
}
