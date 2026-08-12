export type ProvenanceLabel =
  | "DIRECT SOURCE"
  | "SOURCE REFERENCE"
  | "ARCHIVE INTERPRETATION"
  | "INTERPRETATION"
  | "AI INFERENCE";

export interface ProvenanceDefinition {
  label: ProvenanceLabel;
  definition: string;
}

export const PROVENANCE_DEFINITIONS: ProvenanceDefinition[] = [
  {
    label: "DIRECT SOURCE",
    definition:
      "検証済み原文（verified passage）に直接依拠している部分のみ。placeholder 引用には使わない。",
  },
  {
    label: "SOURCE REFERENCE",
    definition:
      "書誌・locator への参照。原文テキストは未検証、または未収録。",
  },
  {
    label: "ARCHIVE INTERPRETATION",
    definition:
      "資料を読んだ上での意味の正規化・距離判定。作者本人の断定ではない。",
  },
  {
    label: "INTERPRETATION",
    definition: "視点生成における意味解釈。",
  },
  {
    label: "AI INFERENCE",
    definition: "今回の相談との接続において AI が生成した仮説。",
  },
];
