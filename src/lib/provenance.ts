import { PROVENANCE_DEFINITIONS, type ProvenanceLabel } from "@/types/provenance";
import type { ObservationResult } from "@/types/observation";

export function getProvenanceDefinitions() {
  return PROVENANCE_DEFINITIONS;
}

export function provenanceClassName(label: ProvenanceLabel): string {
  switch (label) {
    case "DIRECT SOURCE":
      return "provenance-direct";
    case "INTERPRETATION":
      return "provenance-interpretation";
    case "AI INFERENCE":
      return "provenance-inference";
  }
}

export interface ProvenanceItem {
  section: string;
  label: ProvenanceLabel;
  detail: string;
}

export function collectProvenanceItems(
  result: ObservationResult,
): ProvenanceItem[] {
  const items: ProvenanceItem[] = [
    {
      section: "YOUR QUESTION / 隠れ問い",
      label: "AI INFERENCE",
      detail: `possibleHiddenQuestion: ${result.analysis.possibleHiddenQuestion}`,
    },
  ];

  for (const perspective of result.perspectives) {
    items.push({
      section: `${perspective.personName} — Archive-based perspective`,
      label: perspective.provenanceMap.perspective,
      detail: "相談との接続文。本人の発言ではない。",
    });
    items.push({
      section: `${perspective.personName} — Interpretation`,
      label: perspective.provenanceMap.interpretation,
      detail: "ThoughtFragment の意味解釈と接続理由。",
    });

    for (const fragment of perspective.sourceFragments) {
      items.push({
        section: `${perspective.personName} — ${fragment.sourceTitle}`,
        label: fragment.provenance,
        detail: fragment.fragment.normalizedMeaning,
      });
    }
  }

  items.push(
    {
      section: "WHERE THEY MEET",
      label: result.comparison.provenanceMap.sharedConcerns,
      detail: "三者比較による共有関心の仮説。",
    },
    {
      section: "WHERE THEY DISAGREE",
      label: result.comparison.provenanceMap.differentFocuses,
      detail: "観測軸の差分。",
    },
    {
      section: "WHAT NONE OF THEM CAN KNOW",
      label: result.comparison.provenanceMap.blindSpots,
      detail: "歴史的人物の認識限界の明示。",
    },
    {
      section: "A QUESTION RETURNED TO YOU",
      label: result.comparison.provenanceMap.returnedQuestion,
      detail: "ユーザーへ返す再問い。断定ではない。",
    },
  );

  return items;
}
