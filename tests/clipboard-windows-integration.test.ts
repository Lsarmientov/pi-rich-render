import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { copyToClipboard } from "../src/clipboard-adapter.js";

const integrationEnabled = process.env.CLIPBOARD_INTEGRATION === "1" && process.platform === "win32";

describe("Windows clipboard integration", () => {
  it.skipIf(!integrationEnabled)("copies Unicode and special characters exactly", async () => {
    const payload =
      "N'Símbolos: <>& | $() {} []' AS PruebaSimbolos;\n" +
      "áéíóú ñ ü\n" +
      `<>&|$()[]{}'"\n` +
      "línea final";

    await copyToClipboard(payload);
    const stdout = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Clipboard -Raw)))"],
      { encoding: "utf8" }
    );
    const recovered = Buffer.from(stdout.trim(), "base64").toString("utf8");

    expect(recovered).toBe(payload);
  });
});
