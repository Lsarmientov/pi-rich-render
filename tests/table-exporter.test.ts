import { describe, it, expect } from "vitest";
import { parseMarkdownBlocks } from "../src/parser.js";
import { tableToTSV, tableToJSON, parseTableData, tableToCSV, tableToMarkdown, type TableData } from "../src/exporters/table-exporter.js";

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

  const csvData = (value: string): TableData => ({
    headers: ["Value"],
    alignments: ["left"],
    rows: [[value]],
  });

  it("should leave plain CSV fields unquoted", () => {
    expect(tableToCSV(csvData("plain"))).toBe("Value\nplain");
  });

  it("should quote CSV fields containing a comma", () => {
    expect(tableToCSV(csvData("a,b"))).toBe('Value\n"a,b"');
  });

  it("should quote CSV fields containing a double quote and double the quote", () => {
    expect(tableToCSV(csvData('say "hi"'))).toBe('Value\n"say ""hi"""');
  });

  it("should quote CSV fields containing a newline or carriage return", () => {
    expect(tableToCSV(csvData("line one\nline two"))).toBe('Value\n"line one\nline two"');
    expect(tableToCSV(csvData("line one\rline two"))).toBe('Value\n"line one\rline two"');
  });

  it("should quote CSV fields with leading or trailing whitespace", () => {
    expect(tableToCSV(csvData(" leading"))).toBe('Value\n" leading"');
    expect(tableToCSV(csvData("trailing "))).toBe('Value\n"trailing "');
  });

  it("should export a header-only CSV table as just the header line", () => {
    expect(tableToCSV({ headers: ["A", "B"], alignments: ["left", "right"], rows: [] })).toBe("A,B");
  });

  it("should render each alignment variant in the Markdown delimiter row", () => {
    const data: TableData = {
      headers: ["Left", "Center", "Right"],
      alignments: ["left", "center", "right"],
      rows: [],
    };
    expect(tableToMarkdown(data)).toBe("| Left | Center | Right |\n| :--- | :---: | ---: |");
  });

  it("should escape pipes in every Markdown table cell", () => {
    const data: TableData = {
      headers: ["A|B"],
      alignments: ["left"],
      rows: [["C|D"]],
    };
    expect(tableToMarkdown(data)).toBe("| A\\|B |\n| :--- |\n| C\\|D |");
  });

  it("should replace newlines in Markdown cells with <br>", () => {
    const data: TableData = {
      headers: ["A"],
      alignments: ["left"],
      rows: [["line one\nline two"]],
    };
    expect(tableToMarkdown(data)).toBe("| A |\n| :--- |\n| line one<br>line two |");
  });

  it("should not mutate input data when exporting CSV or Markdown", () => {
    const data: TableData = {
      headers: ["A|B"],
      alignments: ["center"],
      rows: [["x,y"]],
    };
    const original = structuredClone(data);
    tableToCSV(data);
    tableToMarkdown(data);
    expect(data).toEqual(original);
  });
});
