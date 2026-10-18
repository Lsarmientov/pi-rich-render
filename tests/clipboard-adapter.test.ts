import { describe, expect, it, vi } from "vitest";

interface ClipboardCommand {
  bin: string;
  args: string[];
}

interface ClipboardDeps {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  available?: (bin: string) => boolean | Promise<boolean>;
  run?: (command: ClipboardCommand, input: string) => Promise<number>;
  emit?: (sequence: string) => void;
}

const clipboard = (await import("../src/clipboard-adapter.js")) as unknown as {
  selectClipboardCommand: (platform: NodeJS.Platform, available: (bin: string) => boolean) => ClipboardCommand | null;
  encodeOsc52: (text: string) => string;
  shouldUseOsc52: (env: NodeJS.ProcessEnv) => boolean;
  copyToClipboard: (text: string, deps?: ClipboardDeps) => Promise<void>;
};

describe("clipboard adapter", () => {
  it("selects the PowerShell Set-Clipboard command on Windows", () => {
    const has = vi.fn((bin: string) => bin === "powershell");

    expect(clipboard.selectClipboardCommand("win32", has)).toEqual({
      bin: "powershell",
      args: ["-NoProfile", "-Command", "$input | Set-Clipboard"],
    });
    expect(has).toHaveBeenCalledWith("powershell");
  });

  it("falls back to clip on Windows when PowerShell is unavailable", () => {
    const has = vi.fn((bin: string) => bin === "clip");

    expect(clipboard.selectClipboardCommand("win32", has)).toEqual({ bin: "clip", args: [] });
    expect(has).toHaveBeenNthCalledWith(1, "powershell");
    expect(has).toHaveBeenNthCalledWith(2, "clip");
  });

  it("returns null on Windows when neither clipboard tool exists", () => {
    expect(clipboard.selectClipboardCommand("win32", () => false)).toBeNull();
  });

  it("selects pbcopy on macOS", () => {
    expect(clipboard.selectClipboardCommand("darwin", (bin) => bin === "pbcopy")).toEqual({
      bin: "pbcopy",
      args: [],
    });
  });

  it("prefers wl-copy over xclip on Linux", () => {
    const has = vi.fn((bin: string) => bin === "wl-copy" || bin === "xclip");

    expect(clipboard.selectClipboardCommand("linux", has)).toEqual({ bin: "wl-copy", args: [] });
    expect(has).toHaveBeenCalledTimes(1);
    expect(has).toHaveBeenCalledWith("wl-copy");
  });

  it("falls back to xclip with clipboard selection when wl-copy is missing", () => {
    const has = vi.fn((bin: string) => bin === "xclip");

    expect(clipboard.selectClipboardCommand("linux", has)).toEqual({
      bin: "xclip",
      args: ["-selection", "clipboard"],
    });
    expect(has).toHaveBeenNthCalledWith(1, "wl-copy");
    expect(has).toHaveBeenNthCalledWith(2, "xclip");
  });

  it("returns null on Linux when neither clipboard tool exists", () => {
    expect(clipboard.selectClipboardCommand("linux", () => false)).toBeNull();
  });

  it("wraps ASCII text in an exact OSC 52 sequence", () => {
    expect(clipboard.encodeOsc52("hello world")).toBe("\u001b]52;c;aGVsbG8gd29ybGQ=\u0007");
  });

  it("round-trips multiline and non-ASCII OSC 52 payloads byte-for-byte", () => {
    const text = "  café 雪\n\nline 3 — 🚀";
    const sequence = clipboard.encodeOsc52(text);
    const payload = sequence.slice("\u001b]52;c;".length, -1);

    expect(Buffer.from(payload, "base64")).toEqual(Buffer.from(text, "utf8"));
    expect(Buffer.from(payload, "base64").toString("utf8")).toBe(text);
  });

  it("enables OSC 52 for the opt-in value or SSH and disables it for unset and false values", () => {
    expect(clipboard.shouldUseOsc52({ PI_CLIPBOARD_OSC52: "1" })).toBe(true);
    expect(clipboard.shouldUseOsc52({ SSH_CONNECTION: "remote" })).toBe(true);
    expect(clipboard.shouldUseOsc52({})).toBe(false);
    expect(clipboard.shouldUseOsc52({ PI_CLIPBOARD_OSC52: "" })).toBe(false);
    expect(clipboard.shouldUseOsc52({ PI_CLIPBOARD_OSC52: "0" })).toBe(false);
    expect(clipboard.shouldUseOsc52({ PI_CLIPBOARD_OSC52: "false" })).toBe(false);
    expect(clipboard.shouldUseOsc52({ PI_CLIPBOARD_OSC52: "FALSE" })).toBe(false);
  });

  it("runs the selected command with exact input and resolves on exit code zero", async () => {
    const run = vi.fn(async () => 0);
    const available = vi.fn((bin: string) => bin === "pbcopy");
    const text = "raw\ntext";

    await expect(
      clipboard.copyToClipboard(text, { platform: "darwin", env: {}, available, run, emit: vi.fn() })
    ).resolves.toBeUndefined();
    expect(available).toHaveBeenCalledWith("pbcopy");
    expect(run).toHaveBeenCalledWith({ bin: "pbcopy", args: [] }, text);
  });

  it("rejects with the command exit code when the runner fails", async () => {
    const run = vi.fn(async () => 23);

    await expect(
      clipboard.copyToClipboard("content", {
        platform: "darwin",
        env: {},
        available: () => true,
        run,
        emit: vi.fn(),
      })
    ).rejects.toThrow("23");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("emits exact OSC 52 output when no tool exists and OSC 52 is indicated", async () => {
    const run = vi.fn(async () => 0);
    const emit = vi.fn();
    const text = "línea 1\n\nline 3";

    await expect(
      clipboard.copyToClipboard(text, {
        platform: "linux",
        env: { PI_CLIPBOARD_OSC52: "1" },
        available: () => false,
        run,
        emit,
      })
    ).resolves.toBeUndefined();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("\u001b]52;c;bMOtbmVhIDEKCmxpbmUgMw==\u0007");
    expect(emit).toHaveBeenCalledWith(clipboard.encodeOsc52(text));
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects an explicit OSC 52 opt-out even when SSH is detected", async () => {
    const emit = vi.fn();

    await expect(
      clipboard.copyToClipboard("content", {
        platform: "linux",
        env: { PI_CLIPBOARD_OSC52: " false ", SSH_TTY: "/dev/pts/1", SSH_CONNECTION: "remote" },
        available: () => false,
        run: vi.fn(async () => 0),
        emit,
      })
    ).rejects.toThrow(/wl-copy.*xclip.*PI_CLIPBOARD_OSC52=1/s);
    expect(emit).not.toHaveBeenCalled();
  });

  it("rejects without a tool or OSC 52 with an actionable error", async () => {
    const run = vi.fn(async () => 0);
    const emit = vi.fn();

    await expect(
      clipboard.copyToClipboard("content", {
        platform: "linux",
        env: {},
        available: () => false,
        run,
        emit,
      })
    ).rejects.toThrow(/wl-copy.*xclip.*PI_CLIPBOARD_OSC52=1/s);
    expect(run).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("preserves plain text byte-for-byte without adding terminal decoration", async () => {
    const text = "  first line\n\n雪 and café\n  last line  ";
    const run = vi.fn(async (_command: ClipboardCommand, input: string) => {
      expect(input).toBe(text);
      expect(Buffer.from(input, "utf8")).toEqual(Buffer.from(text, "utf8"));
      expect(input).not.toMatch(/[\u001b]/);
      return 0;
    });

    await expect(
      clipboard.copyToClipboard(text, {
        platform: "linux",
        env: {},
        available: () => true,
        run,
        emit: vi.fn(),
      })
    ).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledWith({ bin: "wl-copy", args: [] }, text);
  });

  it("resolves for empty text when a clipboard command is available", async () => {
    const run = vi.fn(async () => 0);

    await expect(
      clipboard.copyToClipboard("", {
        platform: "linux",
        env: {},
        available: () => true,
        run,
        emit: vi.fn(),
      })
    ).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledWith({ bin: "wl-copy", args: [] }, "");
  });
});
