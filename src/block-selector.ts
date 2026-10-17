import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { RichBlock } from "./content-model.js";

export function formatBlockOption(b: RichBlock, idx: number): string {
  const firstLine = b.source.trim().split("\n")[0] ?? "";
  const preview = firstLine.length > 50 ? firstLine.slice(0, 47) + "..." : firstLine;
  const kindLabel = b.language ? `[${b.kind}:${b.language}]` : `[${b.kind}]`;
  const lineCount = b.source.split(/\r?\n/).length;
  return `#${idx + 1} ${kindLabel} (${lineCount} lines) - ${preview}`;
}

/**
 * Prompts the user to pick one block among several candidates using Pi's ctx.ui.select.
 */
export async function selectBlock(
  ctx: ExtensionContext,
  blocks: RichBlock[],
  title = "Select a block to copy:"
): Promise<RichBlock | undefined> {
  if (blocks.length === 0) {
    return undefined;
  }

  if (blocks.length === 1) {
    return blocks[0];
  }

  const options = blocks.map((b, idx) => formatBlockOption(b, idx));

  const selectedStr = await ctx.ui.select(title, options);
  if (!selectedStr) {
    return undefined;
  }

  const match = selectedStr.match(/^#(\d+)/);
  if (!match) return undefined;

  const selectedIndex = parseInt(match[1], 10) - 1;
  return blocks[selectedIndex];
}
