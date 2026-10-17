import type { BlockCapabilities, BlockKind, RichBlock } from "./content-model.js";

function getCapabilities(kind: BlockKind): BlockCapabilities {
  switch (kind) {
    case "table":
      return {
        copy: true,
        expand: true,
        exportFormats: ["markdown", "tsv", "json"],
        renderPreview: true,
      };
    case "mermaid":
    case "math":
      return {
        copy: true,
        expand: true,
        exportFormats: ["source"],
        renderPreview: true,
      };
    case "json":
    case "yaml":
    case "xml":
      return {
        copy: true,
        expand: true,
        exportFormats: ["source", "formatted"],
        renderPreview: true,
      };
    default:
      return {
        copy: true,
        expand: true,
        exportFormats: ["source"],
        renderPreview: false,
      };
  }
}

function resolveKind(lang?: string): BlockKind {
  if (!lang) return "code";
  const normalized = lang.trim().toLowerCase();

  if (normalized === "diff") return "diff";
  if (normalized === "json" || normalized === "jsonc" || normalized === "json5") return "json";
  if (normalized === "yaml" || normalized === "yml") return "yaml";
  if (normalized === "xml" || normalized === "svg" || normalized === "html") return "xml";
  if (normalized === "mermaid") return "mermaid";
  if (normalized === "latex" || normalized === "tex" || normalized === "math") return "math";

  return "code";
}

interface BlockInterval {
  start: number;
  end: number;
  block: RichBlock;
}

/**
 * Parses markdown text to extract fenced code blocks and markdown tables faithfully,
 * preserving internal formatting, Unicode, indentation and empty lines.
 */
export function parseMarkdownBlocks(markdown: string, messageId?: string): RichBlock[] {
  if (!markdown) return [];

  const intervals: BlockInterval[] = [];

  // 1. Extract fenced code blocks first
  const fenceRegex = /^(?:\r?\n)?([`~]{3,})([^\r\n]*)\r?\n([\s\S]*?)\r?\n\1(?:\r?\n|$)/gm;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    const rawInfo = (match[2] ?? "").trim();
    const infoTokens = rawInfo.split(/\s+/).filter(Boolean);
    const language = infoTokens[0] || undefined;
    const title = infoTokens.slice(1).join(" ") || undefined;
    const source = match[3] ?? "";
    const kind = resolveKind(language);

    intervals.push({
      start: match.index,
      end: fenceRegex.lastIndex,
      block: {
        id: "",
        kind,
        source,
        language,
        title,
        sourceMessageId: messageId,
        ordinal: 0,
        capabilities: getCapabilities(kind),
      },
    });
  }

  // 2. Extract markdown tables outside fenced intervals
  // A table starts with a header row, followed by delimiter row (|---|:---:|---:|), followed by optional rows
  const tableRegex = /((?:^[ \t]*\|.+?\|[ \t]*(?:\r?\n|$)){2,})/gm;

  while ((match = tableRegex.exec(markdown)) !== null) {
    const start = match.index;
    const end = tableRegex.lastIndex;

    // Check if table overlaps with any fenced code block
    const isInsideFence = intervals.some(
      (inv) => (start >= inv.start && start < inv.end) || (end > inv.start && end <= inv.end)
    );
    if (isInsideFence) continue;

    const rawTable = match[0].trim();
    const lines = rawTable.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length >= 2) {
      const delimiterLine = lines[1];
      // Delimiter row verification
      if (/^\|?[\s:\-|]+\|?$/.test(delimiterLine) && delimiterLine.includes("-")) {
        intervals.push({
          start,
          end,
          block: {
            id: "",
            kind: "table",
            source: rawTable,
            language: "markdown",
            title: undefined,
            sourceMessageId: messageId,
            ordinal: 0,
            capabilities: getCapabilities("table"),
          },
        });
      }
    }
  }

  // Sort all extracted blocks by occurrence in document
  intervals.sort((a, b) => a.start - b.start);

  return intervals.map((inv, index) => {
    inv.block.id = `${messageId ?? "msg"}-${index}`;
    inv.block.ordinal = index;
    return inv.block;
  });
}
