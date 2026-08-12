export type ProvenanceLabel =
  | "DIRECT SOURCE"
  | "INTERPRETATION"
  | "AI INFERENCE";

export interface ProvenanceDefinition {
  label: ProvenanceLabel;
  definition: string;
}

export const PROVENANCE_DEFINITIONS: ProvenanceDefinition[] = [
  {
    label: "DIRECT SOURCE",
    definition: "原資料に直接依拠している部分",
  },
  {
    label: "INTERPRETATION",
    definition: "資料を読んだ上での意味解釈",
  },
  {
    label: "AI INFERENCE",
    definition: "今回の相談との接続において AI が生成した仮説",
  },
];
