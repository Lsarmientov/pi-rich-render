import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getContextBlocks, getLastContextBlock } from "./context-reader.js";
import { selectBlock } from "./block-selector.js";
import { copyToClipboard } from "./clipboard-adapter.js";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const entries = ctx.sessionManager.getBranch();
    ctx.ui.notify(`pi-rich-renderer ready (${entries.length} history entries)`, "info");
  });

  pi.registerCommand("rich", {
    description: "Rich block viewer, copier and exporter. Subcommands: copy, last, list, view",
    handler: async (args: string, ctx) => {
      const sub = args.trim().split(/\s+/)[0] ?? "";

      switch (sub) {
        case "copy": {
          const blocks = getContextBlocks(ctx);
          if (blocks.length === 0) {
            ctx.ui.notify("No structured code blocks found in current context.", "warning");
            return;
          }

          const target = await selectBlock(ctx, blocks, "Select block to copy to clipboard:");
          if (!target) {
            ctx.ui.notify("Block selection cancelled.", "info");
            return;
          }

          try {
            await copyToClipboard(target.source);
            const lang = target.language ? ` (${target.language})` : "";
            ctx.ui.notify(`Copied ${target.kind}${lang} to clipboard without decoration!`, "info");
          } catch (err: any) {
            ctx.ui.notify(`Clipboard error: ${err?.message || String(err)}`, "error");
          }
          break;
        }

        case "last": {
          const lastBlock = getLastContextBlock(ctx);
          if (!lastBlock) {
            ctx.ui.notify("No blocks found in current conversation.", "warning");
            return;
          }

          try {
            await copyToClipboard(lastBlock.source);
            const lang = lastBlock.language ? ` (${lastBlock.language})` : "";
            ctx.ui.notify(`Copied last block [${lastBlock.kind}${lang}] to clipboard!`, "info");
          } catch (err: any) {
            ctx.ui.notify(`Clipboard error: ${err?.message || String(err)}`, "error");
          }
          break;
        }

        case "list":
          ctx.ui.notify("/rich list — coming in Phase 5", "info");
          break;

        case "view":
          ctx.ui.notify("/rich view — coming in Phase 5", "info");
          break;

        default: {
          const help = [
            "pi-rich-renderer — available commands:",
            "  /rich copy   Select a block from conversation and copy clean code",
            "  /rich last   Copy the most recent code block directly",
            "  /rich list   List all detected blocks in context",
            "  /rich view   Open expanded view of selected block",
          ].join("\n");
          ctx.ui.notify(help, "info");
        }
      }
    },
  });
}
