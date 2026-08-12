import type { SourcePassage } from "@/types/source-passage";
import type { ThoughtFragment } from "@/types/thought-fragment";
import type { WriterPerspective } from "@/types/perspective";
import type {
  DistanceBand,
  InterpretationDistance,
  InterpretationLadderStep,
} from "@/types/interpretation";

function bandFromConfidence(
  confidence: ThoughtFragment["confidence"],
): DistanceBand {
  if (confidence === "high") return "low";
  if (confidence === "medium") return "medium";
  return "high";
}

export function estimateInterpretationDistance(
  fragment: ThoughtFragment,
  passage?: SourcePassage,
): InterpretationDistance {
  let sourceToFragment: DistanceBand = bandFromConfidence(fragment.confidence);
  if (passage?.verificationStatus !== "verified") sourceToFragment = "high";
  if (fragment.interpretationType === "critical-inference") {
    sourceToFragment = sourceToFragment === "low" ? "medium" : "high";
  }
  if (fragment.authorialDistance === "indirect") {
    sourceToFragment = sourceToFragment === "low" ? "medium" : sourceToFragment;
  }

  const fragmentToPerspective: DistanceBand =
    fragment.interpretationType === "direct-author-statement"
      ? "low"
      : fragment.interpretationType === "critical-inference"
        ? "high"
        : "medium";

  return {
    sourceToFragment,
    fragmentToPerspective,
    perspectiveToModernTransfer: "high",
  };
}

export function buildInterpretationLadder(args: {
  passage?: SourcePassage;
  fragment?: ThoughtFragment;
  perspective?: WriterPerspective;
  modernTransfer?: string;
  aiInference?: string;
}): InterpretationLadderStep[] {
  const { passage, fragment, perspective, modernTransfer, aiInference } = args;

  return [
    {
      layer: "source-text",
      label: "SOURCE TEXT",
      summary:
        passage?.verificationStatus === "verified" && passage.text
          ? passage.text.slice(0, 120) + (passage.text.length > 120 ? "…" : "")
          : "NO VERIFIED TEXT",
      isAuthorial: Boolean(passage?.isAuthorDirectStatement),
    },
    {
      layer: "archive-interpretation",
      label: "ARCHIVE INTERPRETATION",
      summary: fragment?.normalizedMeaning ?? "（fragment 未接続）",
      isAuthorial: false,
      caution: "原文の正規化であり、作者の現在の答えではない。",
    },
    {
      layer: "writer-perspective",
      label: "WRITER PERSPECTIVE",
      summary:
        perspective?.archiveBasedPerspective?.slice(0, 160) ??
        "（perspective 未生成）",
      isAuthorial: false,
      caution: "観測エンジンによる再構成。作者本人の発言ではない。",
    },
    {
      layer: "modern-transfer",
      label: "MODERN TRANSFER",
      summary:
        modernTransfer ??
        perspective?.interpretation?.slice(0, 160) ??
        "現代事象への接続は、距離を明示した仮説に留める。",
      isAuthorial: false,
      caution: "ここから現代問題への橋渡しが強まる。",
    },
    {
      layer: "ai-inference",
      label: "AI INFERENCE",
      summary:
        aiInference ??
        "利用者の状況への当てはめは AI 推論であり、死者の言葉ではない。",
      isAuthorial: false,
      caution: "最後の段は作者の発言ではない。",
    },
  ];
}
