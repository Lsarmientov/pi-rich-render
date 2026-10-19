import { matchesKey, visibleWidth } from "@earendil-works/pi-tui";

export interface HorizontalState {
  readonly offset: number;
  readonly maxLineWidth: number;
  readonly width: number;
}

export function maxHorizontalOffset(maxLineWidth: number, width: number): number {
  return Math.max(0, maxLineWidth - Math.max(1, Math.floor(width)));
}

export function clampHorizontalOffset(offset: number, maxLineWidth: number, width: number): number {
  return Math.min(maxHorizontalOffset(maxLineWidth, width), Math.max(0, offset));
}

export function hscrollForKey(data: string, state: HorizontalState): number | null {
  let offset: number;
  if (matchesKey(data, "left") || data === "h") offset = state.offset - 4;
  else if (matchesKey(data, "right") || data === "l") offset = state.offset + 4;
  else return null;

  return clampHorizontalOffset(offset, state.maxLineWidth, state.width);
}

export function sliceColumns(text: string, offset: number, width: number): string {
  const startColumn = Math.max(0, Math.floor(offset));
  const columnWidth = Math.max(0, Math.floor(width));
  const endColumn = startColumn + columnWidth;
  if (startColumn === 0 && visibleWidth(text) <= columnWidth) return text;
  if (columnWidth === 0) return "";

  let column = 0;
  let result = "";
  for (const character of text) {
    const characterWidth = visibleWidth(character);
    const nextColumn = column + characterWidth;
    if (column >= startColumn && nextColumn <= endColumn) result += character;
    column = nextColumn;
    if (column >= endColumn) break;
  }
  return result;
}
