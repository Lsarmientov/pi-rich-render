export function overlayLayout(rows: number): { overlayOptions: Record<string, unknown>; viewportHeight: number } {
  const maxHeight = Math.max(4, rows - 6);
  const viewportHeight = Math.max(2, maxHeight - 2);

  // Invariant: viewportHeight + 2 === maxHeight whenever maxHeight >= 4. Rendered lines never exceed maxHeight; maxHeight never exceeds rows for terminals of 7 rows or more. For the mandated sub-7-row minimum, maxHeight may exceed rows.
  return { overlayOptions: { maxHeight }, viewportHeight };
}
