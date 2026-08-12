export type ProvenanceLabel =
  | "DIRECT SOURCE"
  | "SOURCE TEXT — WORK VOICE"
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
      "verified + approved の原文。作者本人の直接発言かどうかは Voice / Distance で別表示。",
  },
  {
    label: "SOURCE TEXT — WORK VOICE",
    definition:
      "verified + approved の原文だが、語り手・登場人物など作品内の声。作者本人の直接発言ではない。",
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
    definition:
      "今回の相談との接続、および2026年への現代的転移。verified source でもここは verified にならない。",
  },
];
