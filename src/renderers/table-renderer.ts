import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { parseTableData, type TableData } from "../exporters/table-exporter.js";
import { formatRange, normalizedHeight, scrollForKey } from "./viewport.js";

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

    if (matchesKey(data, "left") || data === "h") {
      this.scrollX = Math.max(0, this.scrollX - 4);
    } else if (matchesKey(data, "right") || data === "l") {
      this.scrollX += 4;
    } else {
      const offset = scrollForKey(data, {
        offset: this.scrollY,
        total: this.data.rows.length + 4,
        height: this.viewportHeight,
      });
      if (offset !== null) this.scrollY = offset;
    }
  }

  render(width: number): string[] {
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
    output.push(
      truncateToWidth(
        th.fg("accent", ` 📊 ${status}${range} (${copyHint}←/→/↑/↓ or h/j/k/l to scroll, PgUp/PgDn, g/G, Esc/q to close)`),
        width
      )
    );
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

    for (const line of tableLines.slice(this.scrollY, this.scrollY + this.viewportHeight)) {
      output.push(this.applyHorizontalScroll(line, width));
    }
    return output;
  }

  private applyHorizontalScroll(line: string, width: number): string {
    // In TUI rendering, truncate to terminal width with optional scroll offset
    if (this.scrollX > 0) {
      // slice visual columns when scrolled
      return truncateToWidth(line.slice(Math.min(this.scrollX, line.length)), width);
    }
    return truncateToWidth(line, width);
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
