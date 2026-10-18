import { matchesKey } from "@earendil-works/pi-tui";

export interface ViewportState {
  readonly offset: number;
  readonly total: number;
  readonly height: number;
}

export function normalizedHeight(height: number): number {
  return Math.max(1, Math.floor(height));
}

export function maxOffset(total: number, height: number): number {
  return Math.max(0, total - normalizedHeight(height));
}

export function clampOffset(offset: number, total: number, height: number): number {
  return Math.min(maxOffset(total, height), Math.max(0, offset));
}

export function scrollForKey(data: string, state: ViewportState): number | null {
  const height = normalizedHeight(state.height);
  let offset: number;

  if (matchesKey(data, "up") || data === "k") offset = state.offset - 1;
  else if (matchesKey(data, "down") || data === "j") offset = state.offset + 1;
  else if (matchesKey(data, "pageUp")) offset = state.offset - height;
  else if (matchesKey(data, "pageDown")) offset = state.offset + height;
  else if (data === "g" || matchesKey(data, "home")) offset = 0;
  else if (data === "G" || matchesKey(data, "end")) offset = maxOffset(state.total, height);
  else return null;

  return clampOffset(offset, state.total, height);
}

export function formatRange(state: ViewportState): string {
  if (state.total === 0) return "0/0";
  const height = normalizedHeight(state.height);
  const offset = clampOffset(state.offset, state.total, height);
  const first = offset + 1;
  const last = Math.min(state.total, offset + height);
  return `${first}-${last}/${state.total}`;
}
