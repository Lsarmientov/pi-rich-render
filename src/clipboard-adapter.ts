import { spawn } from "node:child_process";

export interface ClipboardCommand {
  bin: string;
  args: string[];
  encode?: "raw" | "base64";
}

export interface ClipboardDeps {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  available?: (bin: string) => boolean | Promise<boolean>;
  run?: (command: ClipboardCommand, input: string) => Promise<number>;
  emit?: (sequence: string) => void;
}

export function selectClipboardCommand(
  platform: NodeJS.Platform,
  available: (bin: string) => boolean,
): ClipboardCommand | null {
  if (platform === "win32") {
    if (available("powershell")) {
      return {
        bin: "powershell",
        args: [
          "-NoProfile",
          "-Command",
          "$b=[Console]::In.ReadToEnd();Set-Clipboard -Value ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b.Trim())))",
        ],
        encode: "base64",
      };
    }
    return available("clip") ? { bin: "clip", args: [] } : null;
  }

  if (platform === "darwin") {
    return available("pbcopy") ? { bin: "pbcopy", args: [] } : null;
  }

  if (available("wl-copy")) return { bin: "wl-copy", args: [] };
  return available("xclip") ? { bin: "xclip", args: ["-selection", "clipboard"] } : null;
}

export function buildStdinPayload(command: ClipboardCommand, text: string): string {
  return command.encode === "base64" ? Buffer.from(text, "utf8").toString("base64") : text;
}

export function encodeOsc52(text: string): string {
  return `\u001b]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`;
}

export function shouldUseOsc52(env: NodeJS.ProcessEnv): boolean {
  const optIn = env.PI_CLIPBOARD_OSC52;
  if (optIn !== undefined) {
    const normalized = optIn.trim().toLowerCase();
    if (["", "0", "false"].includes(normalized)) return false;
    return true;
  }
  return env.SSH_TTY !== undefined || env.SSH_CONNECTION !== undefined;
}

function candidateBins(platform: NodeJS.Platform): string[] {
  if (platform === "win32") return ["powershell", "clip"];
  if (platform === "darwin") return ["pbcopy"];
  return ["wl-copy", "xclip"];
}

function probeCommand(platform: NodeJS.Platform, bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(platform === "win32" ? "where" : "which", [bin], {
      stdio: "ignore",
    });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}

function runCommand(command: ClipboardCommand, input: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command.bin, command.args, {
      stdio: ["pipe", "ignore", "ignore"],
    });
    proc.on("error", (error) => {
      reject(new Error(`Failed to run ${command.bin}: ${error.message}`));
    });
    proc.on("close", (code) => resolve(code ?? -1));
    proc.stdin.on("error", () => {});
    proc.stdin.end(input);
  });
}

/** Copies plain text without adding terminal decorations. */
export async function copyToClipboard(text: string, deps: ClipboardDeps = {}): Promise<void> {
  const platform = deps.platform ?? process.platform;
  const env = deps.env ?? process.env;
  const available = deps.available ?? ((bin: string) => probeCommand(platform, bin));
  const run = deps.run ?? ((command, input) => runCommand(command, buildStdinPayload(command, input)));
  const emit = deps.emit ?? ((sequence: string) => {
    process.stdout.write(sequence);
  });

  const availableBins = new Set<string>();
  for (const bin of candidateBins(platform)) {
    if (await available(bin)) {
      availableBins.add(bin);
      break;
    }
  }

  const command = selectClipboardCommand(platform, (bin) => availableBins.has(bin));
  if (command) {
    const exitCode = await run(command, text);
    if (exitCode !== 0) {
      throw new Error(`Clipboard command ${command.bin} exited with code ${exitCode}`);
    }
    return;
  }

  if (shouldUseOsc52(env)) {
    emit(encodeOsc52(text));
    return;
  }

  throw new Error(
    "No clipboard tool found (PowerShell/clip on Windows, pbcopy on macOS, wl-copy or xclip on Linux). " +
      "Install an appropriate tool or set PI_CLIPBOARD_OSC52=1 to copy through the terminal."
  );
}
