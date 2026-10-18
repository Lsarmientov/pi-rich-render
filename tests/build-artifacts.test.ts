import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  main?: string;
  types?: string;
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("build wiring (F0.2)", () => {
  it("declares a build script that bundles with esbuild into dist", () => {
    expect(pkg.scripts?.build).toBeDefined();
    expect(pkg.scripts?.build).toContain("esbuild");
    expect(pkg.scripts?.build).toContain("--outfile=dist/index.js");
  });

  it("declares esbuild as a direct devDependency", () => {
    expect(pkg.devDependencies?.esbuild).toBeDefined();
  });

  it("points main and types at the emitted files", () => {
    expect(pkg.main).toBe("dist/index.js");
    expect(pkg.types).toBe("dist/src/extension-entrypoint.d.ts");
  });
});

describe("build artifacts (F0.2)", () => {
  const bundled = existsSync("dist/index.js");

  it.skipIf(!bundled)("emits a non-empty bundle with no dot-ts import specifiers", () => {
    const source = readFileSync("dist/index.js", "utf8");
    expect(statSync("dist/index.js").size).toBeGreaterThan(0);
    expect(source.match(/["'][^"']*\.ts["']/g) ?? []).toHaveLength(0);
  });

  it.skipIf(!bundled)("keeps @earendil-works imports external instead of inlining them", () => {
    const source = readFileSync("dist/index.js", "utf8");
    const hits = source.split("\n").filter((line) => line.includes("@earendil-works"));
    for (const line of hits) {
      expect(line).toMatch(/^\s*import\b/);
    }
  });
});

describe("ignore hygiene (F0.3)", () => {
  it("ignores node_modules and dist", () => {
    const ignored = readFileSync(".gitignore", "utf8");
    expect(ignored).toMatch(/^node_modules\/$/m);
    expect(ignored).toMatch(/^dist\/$/m);
  });
});
