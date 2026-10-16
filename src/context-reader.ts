import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { RichBlock } from "./content-model.js";
import { parseMarkdownBlocks } from "./parser.js";

/**
 * Reads assistant messages from the current active branch and extracts all RichBlocks.
 */
export function getContextBlocks(ctx: ExtensionContext): RichBlock[] {
  const blocks: RichBlock[] = [];
  if (!ctx.sessionManager) {
    return blocks;
  }

  const branch = ctx.sessionManager.getBranch();

  for (const entry of branch) {
    if (entry.type !== "message") continue;
    const msg = entry.message as {
      role?: string;
      content?: string | Array<{ type: string; text?: string }>;
    };

    if (msg.role !== "assistant") continue;

    const entryId = entry.id;

    if (typeof msg.content === "string") {
      const extracted = parseMarkdownBlocks(msg.content, entryId);
      blocks.push(...extracted);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part && part.type === "text" && typeof part.text === "string") {
          const extracted = parseMarkdownBlocks(part.text, entryId);
          blocks.push(...extracted);
        }
      }
    }
  }

  return blocks;
}

/**
 * Returns the latest block found in the active context, if any.
 */
export function getLastContextBlock(ctx: ExtensionContext): RichBlock | undefined {
  const blocks = getContextBlocks(ctx);
  return blocks.length > 0 ? blocks[blocks.length - 1] : undefined;
}
