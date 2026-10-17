import { describe, it, expect } from "vitest";
import { parseMarkdownBlocks } from "../src/parser.js";
import { tableToTSV, tableToJSON, parseTableData } from "../src/exporters/table-exporter.js";

describe("Table Detection and Exporting", () => {
  const sampleMarkdownTable = [
    "| ID | Nombre | Rol |",
    "|---|:---:|---:|",
    "| 1 | Alice | Admin |",
    "| 2 | Bob | User |",
  ].join("\n");

  it("should detect markdown tables and classify as 'table'", () => {
    const text = `Here is a table:\n\n${sampleMarkdownTable}\n\nEnd of section.`;
    const blocks = parseMarkdownBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("table");
    expect(blocks[0].capabilities.exportFormats).toContain("tsv");
    expect(blocks[0].capabilities.exportFormats).toContain("json");
    expect(blocks[0].source.trim()).toBe(sampleMarkdownTable);
  });

  it("should parse table into structured rows and headers", () => {
    const data = parseTableData(sampleMarkdownTable);
    expect(data).toBeDefined();
    expect(data?.headers).toEqual(["ID", "Nombre", "Rol"]);
    expect(data?.rows).toEqual([
      ["1", "Alice", "Admin"],
      ["2", "Bob", "User"],
    ]);
  });

  it("should convert table to clean TSV format for spreadsheets", () => {
    const tsv = tableToTSV(sampleMarkdownTable);
    expect(tsv).toBe("ID\tNombre\tRol\n1\tAlice\tAdmin\n2\tBob\tUser");
  });

  it("should convert table to clean JSON when headers and cells are well-formed", () => {
    const json = tableToJSON(sampleMarkdownTable);
    expect(json).toBeDefined();
    const parsed = JSON.parse(json!);
    expect(parsed).toEqual([
      { ID: "1", Nombre: "Alice", Rol: "Admin" },
      { ID: "2", Nombre: "Bob", Rol: "User" },
    ]);
  });

  it("should return undefined for JSON conversion when headers are ambiguous or missing", () => {
    const badTable = [
      "| | |",
      "|---|---|",
      "| val1 | val2 |",
    ].join("\n");

    const json = tableToJSON(badTable);
    expect(json).toBeUndefined();
  });

  it("should preserve escaped pipes and trim internal spacing in table cells", () => {
    const escapedTable = [
      "| Code | Description |",
      "|---|---|",
      "| a \\| b | Option with pipe |",
    ].join("\n");

    const data = parseTableData(escapedTable);
    expect(data?.rows[0][0]).toBe("a | b");
  });
});
