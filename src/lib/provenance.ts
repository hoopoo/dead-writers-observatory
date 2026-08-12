import { PROVENANCE_DEFINITIONS, type ProvenanceLabel } from "@/types/provenance";
import type { ObservationResult } from "@/types/observation";

export function getProvenanceDefinitions() {
  return PROVENANCE_DEFINITIONS;
}

export function provenanceClassName(label: ProvenanceLabel): string {
  switch (label) {
    case "DIRECT SOURCE":
      return "provenance-direct";
    case "SOURCE REFERENCE":
      return "provenance-reference";
    case "ARCHIVE INTERPRETATION":
      return "provenance-archive";
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
    items.push({
      section: `${perspective.personName} — Archival distance`,
      label: "ARCHIVE INTERPRETATION",
      detail: perspective.archivalDistance.summaryText,
    });

    for (const evidence of perspective.evidence) {
      items.push({
        section: `${perspective.personName} — ${evidence.sourceTitle} (${evidence.authorialDistance})`,
        label: evidence.provenance,
        detail: `${evidence.roleLabelJa} / ${evidence.voiceLabelJa} / ${evidence.normalizedMeaning}`,
      });
    }
  }

  const hd = result.comparison.historicalDistance;

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
      section: "WHAT THEY CAN HELP US SEE",
      label: hd.provenanceMap.timelessHumanThemes,
      detail: hd.timelessHumanThemes.join(" / "),
    },
    {
      section: "WHAT THEY COULD NOT HAVE KNOWN",
      label: hd.provenanceMap.historicallySpecificUnknowns,
      detail: hd.historicallySpecificUnknowns.join(" / "),
    },
    {
      section: "WHERE INTERPRETATION BEGINS",
      label: hd.provenanceMap.interpretationBeginsNote,
      detail: hd.interpretationBeginsNote,
    },
    {
      section: "A QUESTION RETURNED TO YOU",
      label: result.comparison.provenanceMap.returnedQuestion,
      detail: "ユーザーへ返す再問い。断定ではない。",
    },
  );

  return items;
}
