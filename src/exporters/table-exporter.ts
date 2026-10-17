export interface TableData {
  headers: string[];
  alignments: Array<"left" | "center" | "right">;
  rows: string[][];
}

/**
 * Splits a table row into cells, handling escaped pipes (\|).
 */
function splitRow(rowText: string): string[] {
  const trimmed = rowText.trim();
  // Remove leading and trailing pipes if present
  let content = trimmed;
  if (content.startsWith("|")) content = content.slice(1);
  if (content.endsWith("|")) content = content.slice(0, -1);

  // Split by pipe not preceded by backslash
  const rawCells: string[] = [];
  let current = "";
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === "\\" && !escaped) {
      escaped = true;
      continue;
    }

    if (char === "|" && !escaped) {
      rawCells.push(current.trim());
      current = "";
    } else {
      if (escaped) {
        if (char !== "|") {
          current += "\\";
        }
        escaped = false;
      }
      current += char;
    }
  }

  rawCells.push(current.trim());
  return rawCells;
}

/**
 * Parses markdown table text into structured headers, alignments, and rows.
 */
export function parseTableData(tableMarkdown: string): TableData | undefined {
  const lines = tableMarkdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return undefined;

  const headerLine = lines[0];
  const delimiterLine = lines[1];

  // The delimiter line must consist of dashes, colons, spaces and pipes, e.g. |---|:---:|---:|
  if (!/^\|?[\s:\-|]+\|?$/.test(delimiterLine) || !delimiterLine.includes("-")) {
    return undefined;
  }

  const headers = splitRow(headerLine);
  const delimiterCells = splitRow(delimiterLine);

  if (headers.length === 0 || headers.length !== delimiterCells.length) {
    return undefined;
  }

  const alignments = delimiterCells.map((cell) => {
    const trimmed = cell.trim();
    const starts = trimmed.startsWith(":");
    const ends = trimmed.endsWith(":");
    if (starts && ends) return "center" as const;
    if (ends) return "right" as const;
    return "left" as const;
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("|")) continue;
    const cells = splitRow(line);
    // Pad or slice row to match header count
    while (cells.length < headers.length) {
      cells.push("");
    }
    rows.push(cells.slice(0, headers.length));
  }

  return { headers, alignments, rows };
}

/**
 * Converts a markdown table to clean TSV format.
 */
export function tableToTSV(tableMarkdown: string): string {
  const data = parseTableData(tableMarkdown);
  if (!data) return tableMarkdown;

  const lines: string[] = [];
  lines.push(data.headers.join("\t"));
  for (const row of data.rows) {
    lines.push(row.join("\t"));
  }

  return lines.join("\n");
}

/**
 * Converts a markdown table to JSON array of objects.
 * Returns undefined if headers are ambiguous, empty or duplicate.
 */
export function tableToJSON(tableMarkdown: string): string | undefined {
  const data = parseTableData(tableMarkdown);
  if (!data) return undefined;

  // Check for empty or duplicate headers
  const seen = new Set<string>();
  for (const h of data.headers) {
    if (!h.trim()) return undefined; // Empty header disallowed
    if (seen.has(h)) return undefined; // Duplicate headers make object keys ambiguous
    seen.add(h);
  }

  const result = data.rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < data.headers.length; i++) {
      obj[data.headers[i]] = row[i] ?? "";
    }
    return obj;
  });

  return JSON.stringify(result, null, 2);
}
