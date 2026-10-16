import { spawn } from "node:child_process";

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copies plain text directly to the system clipboard on Windows using PowerShell or clip.
 * Preserves newlines and spaces, without injecting any terminal decorations.
 */
export async function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Windows Set-Clipboard handles UTF-8 characters and multi-line strings cleanly via stdin
    const isWindows = process.platform === "win32";

    if (isWindows) {
      // Use powershell Set-Clipboard with stdin to avoid command line argument length limits or escaping issues
      const proc = spawn("powershell", ["-NoProfile", "-Command", "$input | Set-Clipboard"], {
        stdio: ["pipe", "ignore", "pipe"],
      });

      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("error", (err) => {
        // Fallback to clip.exe if powershell fails to spawn
        const clipProc = spawn("clip");
        clipProc.on("error", (clipErr) => {
          reject(new Error(`Failed to copy to clipboard: ${err.message || clipErr.message}`));
        });
        clipProc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`clip.exe exited with code ${code}`));
        });
        clipProc.stdin.write(text);
        clipProc.stdin.end();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`PowerShell Set-Clipboard exited with code ${code}: ${stderr}`));
        }
      });

      proc.stdin.write(text);
      proc.stdin.end();
    } else {
      // Unix / macOS fallback (xclip / pbcopy)
      const cmd = process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard";
      const [bin, ...args] = cmd.split(" ");
      const proc = spawn(bin, args);
      proc.on("error", (err) => reject(new Error(`Clipboard error: ${err.message}`)));
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Clipboard command exited with code ${code}`));
      });
      proc.stdin.write(text);
      proc.stdin.end();
    }
  });
}
