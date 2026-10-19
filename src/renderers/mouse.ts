export interface CopyTargetState {
  readonly width: number;
  readonly labelWidth: number;
}

export function copyTargetStart(state: CopyTargetState): number {
  return Math.max(0, state.width - state.labelWidth);
}

export function isCopyTargetHit(x: number, y: number, state: CopyTargetState): boolean {
  return y === 0 && x >= copyTargetStart(state) && x < state.width;
}

export function wheelLines(delta: number | undefined, fallback = 3): number {
  if (delta !== undefined && Number.isFinite(delta) && delta !== 0) return delta;
  return Number.isFinite(fallback) && fallback !== 0 ? fallback : 3;
}
