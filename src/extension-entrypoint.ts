import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getContextBlocks, getLastContextBlock } from "./context-reader.js";
import { selectBlock } from "./block-selector.js";
import { copyToClipboard } from "./clipboard-adapter.js";
import { tableToTSV, tableToJSON } from "./exporters/table-exporter.js";
import { TableRendererComponent } from "./renderers/table-renderer.js";

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
            ctx.ui.notify("No structured blocks found in current context.", "warning");
            return;
          }

          const target = await selectBlock(ctx, blocks, "Select block to copy:");
          if (!target) {
            ctx.ui.notify("Block selection cancelled.", "info");
            return;
          }

          let textToCopy = target.source;

          // If block is a table, ask user which format they want to export
          if (target.kind === "table") {
            const formatOptions = ["1. Markdown (Source)", "2. TSV (Spreadsheets / Excel)", "3. JSON (Structured data)"];
            const choice = await ctx.ui.select("Choose export format for table:", formatOptions);
            if (!choice) return;

            if (choice.includes("TSV")) {
              textToCopy = tableToTSV(target.source);
            } else if (choice.includes("JSON")) {
              const json = tableToJSON(target.source);
              if (!json) {
                ctx.ui.notify("Cannot export table to JSON: headers are missing, empty, or duplicate.", "error");
                return;
              }
              textToCopy = json;
            }
          }

          try {
            await copyToClipboard(textToCopy);
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

          let textToCopy = lastBlock.source;
          if (lastBlock.kind === "table") {
            const formatOptions = ["1. Markdown (Source)", "2. TSV (Spreadsheets / Excel)", "3. JSON (Structured data)"];
            const choice = await ctx.ui.select("Choose export format for table:", formatOptions);
            if (!choice) return;

            if (choice.includes("TSV")) {
              textToCopy = tableToTSV(lastBlock.source);
            } else if (choice.includes("JSON")) {
              const json = tableToJSON(lastBlock.source);
              if (!json) {
                ctx.ui.notify("Cannot export table to JSON: headers are missing, empty, or duplicate.", "error");
                return;
              }
              textToCopy = json;
            }
          }

          try {
            await copyToClipboard(textToCopy);
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

        case "view": {
          const blocks = getContextBlocks(ctx);
          if (blocks.length === 0) {
            ctx.ui.notify("No structured blocks found to preview.", "warning");
            return;
          }

          const target = await selectBlock(ctx, blocks, "Select block to view:");
          if (!target) return;

          if (ctx.mode !== "tui") {
            ctx.ui.notify("/rich view requires interactive TUI mode.", "warning");
            return;
          }

          if (target.kind === "table") {
            await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
              return new TableRendererComponent(target.source, theme, () => done());
            });
          } else {
            ctx.ui.notify(`View for ${target.kind} blocks will be enhanced in Phase 4/5.`, "info");
          }
          break;
        }

        default: {
          const help = [
            "pi-rich-renderer — available commands:",
            "  /rich copy   Select a block from conversation and copy clean code/table",
            "  /rich last   Copy the most recent block directly (with table export formats)",
            "  /rich list   List all detected blocks in context",
            "  /rich view   Open expanded interactive view of selected table or code",
          ].join("\n");
          ctx.ui.notify(help, "info");
        }
      }
    },
  });
}
