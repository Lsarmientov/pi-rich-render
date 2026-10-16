import { describe, it, expect } from "vitest";
import { parseMarkdownBlocks } from "../src/parser.js";
import type { RichBlock } from "../src/content-model.js";

describe("Markdown Block Parser", () => {
  it("should extract standard code blocks with language", () => {
    const text = "Here is some code:\n```typescript\nconst x = 1;\nconsole.log(x);\n```\nDone.";
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("code");
    expect(blocks[0].language).toBe("typescript");
    expect(blocks[0].source).toBe("const x = 1;\nconsole.log(x);");
  });

  it("should extract code blocks without language", () => {
    const text = "```\nplain text code\n```";
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("code");
    expect(blocks[0].language).toBeUndefined();
    expect(blocks[0].source).toBe("plain text code");
  });

  it("should extract code blocks delimited by tildes (~~~)", () => {
    const text = "~~~\nconst y = 2;\n~~~";
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("code");
    expect(blocks[0].source).toBe("const y = 2;");
  });

  it("should preserve exact indentation, empty lines, and Unicode characters", () => {
    const code = "  function test() {\n\n    const greeting = \"¡Hola, mundo! 🚀\";\n    return greeting;\n  }";
    const text = `\`\`\`javascript\n${code}\n\`\`\``;
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe(code);
  });

  it("should handle multiple blocks within the same text and assign correct ordinals", () => {
    const text = "First:\n```python\nprint(1)\n```\nSecond:\n```bash\necho 2\n```";
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].ordinal).toBe(0);
    expect(blocks[0].language).toBe("python");
    expect(blocks[0].source).toBe("print(1)");

    expect(blocks[1].ordinal).toBe(1);
    expect(blocks[1].language).toBe("bash");
    expect(blocks[1].source).toBe("echo 2");
  });

  it("should classify diff blocks as 'diff'", () => {
    const text = "```diff\n- old line\n+ new line\n```";
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("diff");
    expect(blocks[0].language).toBe("diff");
    expect(blocks[0].source).toBe("- old line\n+ new line");
  });

  it("should classify json, yaml, xml blocks accurately", () => {
    const text = "```json\n{\"ok\": true}\n```\n```yaml\nfoo: bar\n```";
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind).toBe("json");
    expect(blocks[1].kind).toBe("yaml");
  });

  it("should handle nested fences gracefully (e.g. 4 backticks outer fence)", () => {
    const text = "````markdown\n```python\nprint('nested')\n```\n````";
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe("```python\nprint('nested')\n```");
  });
});
