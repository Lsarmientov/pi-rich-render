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

/**
 * Parses markdown text to extract fenced code blocks faithfully,
 * preserving internal formatting, Unicode, indentation and empty lines.
 */
export function parseMarkdownBlocks(markdown: string, messageId?: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  if (!markdown) return blocks;

  // Regex matching code blocks with variable fence length (``` or ~~~, 3 or more chars)
  // ^([`~]{3,})([^\n]*)\n([\s\S]*?)\n\1$
  const fenceRegex = /^(?:\r?\n)?([`~]{3,})([^\r\n]*)\r?\n([\s\S]*?)\r?\n\1(?:\r?\n|$)/gm;

  let match: RegExpExecArray | null;
  let ordinal = 0;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    const rawInfo = (match[2] ?? "").trim();
    // In info string, first token is often the language, followed by optional title or metadata
    const infoTokens = rawInfo.split(/\s+/).filter(Boolean);
    const language = infoTokens[0] || undefined;
    const title = infoTokens.slice(1).join(" ") || undefined;
    const source = match[3] ?? "";

    const kind = resolveKind(language);

    blocks.push({
      id: `${messageId ?? "msg"}-${ordinal}`,
      kind,
      source,
      language,
      title,
      sourceMessageId: messageId,
      ordinal,
      capabilities: getCapabilities(kind),
    });

    ordinal++;
  }

  return blocks;
}
