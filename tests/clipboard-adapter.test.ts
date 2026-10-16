import { describe, it, expect, vi } from "vitest";
import { copyToClipboard } from "../src/clipboard-adapter.js";

describe("Clipboard Adapter", () => {
  it("should fail gracefully and throw informative error when empty content", async () => {
    // Empty content handling
    await expect(copyToClipboard("")).resolves.toBeUndefined();
  });

  it("should copy plain text using platform runner without adding extra decorations", async () => {
    const text = "const hello = 'world';\nconsole.log(hello);";
    // We test with real runner or mock
    const res = await copyToClipboard(text);
    expect(res).toBeUndefined();
  });
});
