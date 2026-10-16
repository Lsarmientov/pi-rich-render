export type BlockKind =
  | "code"
  | "table"
  | "diff"
  | "json"
  | "yaml"
  | "xml"
  | "list"
  | "mermaid"
  | "math"
  | "text";

export interface BlockCapabilities {
  copy: boolean;
  expand: boolean;
  exportFormats: string[];
  renderPreview: boolean;
}

export interface RichBlock {
  id: string;
  kind: BlockKind;
  source: string; // Original, semantic content without wrapping fences/borders
  language?: string;
  title?: string;
  sourceMessageId?: string;
  ordinal: number;
  capabilities: BlockCapabilities;
}
