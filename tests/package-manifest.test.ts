import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version?: string;
  files?: string[];
  devDependencies?: Record<string, string>;
  pi?: { extensions?: string[] };
  peerDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
};

describe("release package manifest (F5/F6)", () => {
  it("pins the published version to 0.2.0", () => {
    // Rule protected: this release's manifest version is 0.2.0.
    expect(pkg.version).toBe("0.2.0");
  });

  it("ships only the approved package files", () => {
    // Rule protected: the files whitelist is exactly dist, index.ts, and src.
    expect(pkg.files).toEqual(["dist", "index.ts", "src"]);
  });

  it("keeps the esbuild development dependency exactly pinned", () => {
    // Rule protected: esbuild stays pinned to 0.28.2 without a range prefix.
    expect(pkg.devDependencies?.esbuild).toBe("0.28.2");
  });

  it("registers the built extension entrypoint", () => {
    // Rule protected: Pi loads the published dist entrypoint.
    expect(pkg.pi?.extensions).toEqual(["./dist/index.js"]);
  });

  it("declares host-provided packages as wildcard peers, not dependencies", () => {
    // Rule protected: Pi host packages are peer dependencies with the exact wildcard range.
    expect(pkg.peerDependencies).toEqual({
      "@earendil-works/pi-coding-agent": "*",
      "@earendil-works/pi-tui": "*",
    });
    // Rule protected: host-provided packages must not be installed as runtime dependencies.
    expect(pkg.dependencies ?? {}).not.toHaveProperty("@earendil-works/pi-coding-agent");
    expect(pkg.dependencies ?? {}).not.toHaveProperty("@earendil-works/pi-tui");
  });
});
