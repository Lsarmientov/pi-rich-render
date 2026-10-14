import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    // Log branch entry count to verify sessionManager access
    const entries = ctx.sessionManager.getBranch();
    ctx.ui.notify(`pi-rich-renderer loaded — ${entries.length} branch entries`, "info");
  });

  pi.registerCommand("rich", {
    description: "Rich block viewer, copier and exporter. Subcommands: copy, last, list, view",
    handler: async (args: string, ctx) => {
      const sub = args.trim().split(/\s+/)[0] ?? "";

      switch (sub) {
        case "copy":
          ctx.ui.notify("/rich copy — coming in Phase 2", "info");
          break;
        case "last":
          ctx.ui.notify("/rich last — coming in Phase 2", "info");
          break;
        case "list":
          ctx.ui.notify("/rich list — coming in Phase 5", "info");
          break;
        case "view":
          ctx.ui.notify("/rich view — coming in Phase 5", "info");
          break;
        default: {
          const help = [
            "pi-rich-renderer — available commands:",
            "  /rich copy   Select a block and copy to clipboard",
            "  /rich last   Copy the last unambiguous block",
            "  /rich list   List all detected blocks in context",
            "  /rich view   Open expanded view of selected block",
          ].join("\n");
          ctx.ui.notify(help, "info");
        }
      }
    },
  });
}
