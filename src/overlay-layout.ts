export function overlayLayout(rows: number, columns: number): { overlayOptions: Record<string, unknown>; viewportHeight: number } {
  const maxHeight = Math.max(4, rows - 6);
  const viewportHeight = Math.max(2, maxHeight - 2);
  const requestedWidth = Math.max(20, Math.floor(columns) - 6);
  const width = Math.max(1, Math.min(requestedWidth, Math.max(1, Math.floor(columns))));

  // Invariants: viewportHeight + 2 === maxHeight; width never exceeds columns; maxHeight never exceeds rows for terminals of 7 rows or more. For the mandated sub-7-row minimum, maxHeight may exceed rows.
  return { overlayOptions: { maxHeight, width }, viewportHeight };
}
