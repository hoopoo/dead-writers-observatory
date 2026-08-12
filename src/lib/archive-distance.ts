import type { ArchivalDistanceSummary } from "@/types/evidence";
import type { ThoughtFragment } from "@/types/thought-fragment";
import { getPassageById } from "@/data/passages";
import { getActivePassageReview } from "@/lib/review/active";
import {
  isApprovedDirectEvidence,
  isWorkVoice,
} from "@/lib/evidence";
import {
  AUTHORIAL_DISTANCE_LABELS,
  authorialDistanceBonus,
} from "@/lib/archive-distance-labels";

export { AUTHORIAL_DISTANCE_LABELS, authorialDistanceBonus };

export function summarizeArchivalDistance(
  fragments: ThoughtFragment[],
): ArchivalDistanceSummary {
  const counts = {
    direct: 0,
    near: 0,
    indirect: 0,
    unknown: 0,
  };
  let verifiedCount = 0;
  let approvedCount = 0;
  let workVoiceCount = 0;

  for (const fragment of fragments) {
    counts[fragment.authorialDistance] += 1;
    const passage = getPassageById(fragment.passageId);
    const review = passage ? getActivePassageReview(passage.id) : undefined;
    if (passage?.verificationStatus === "verified") verifiedCount += 1;
    if (passage && isApprovedDirectEvidence(passage, review)) {
      approvedCount += 1;
      if (isWorkVoice(passage)) workVoiceCount += 1;
    }
  }

  const parts: string[] = [];
  if (counts.direct > 0) {
    parts.push(`${counts.direct}件: 作者本人の直接的な記述`);
  }
  if (counts.near > 0) {
    parts.push(`${counts.near}件: 自伝的・随筆的記述`);
  }
  if (counts.indirect > 0) {
    parts.push(`${counts.indirect}件: 作品に現れる間接的な視点`);
  }
  if (counts.unknown > 0) {
    parts.push(`${counts.unknown}件: 距離を特定できない資料`);
  }

  const summaryText =
    parts.length > 0
      ? `この回答では、${parts.join("、")}を参照しています（verified ${verifiedCount} / approved ${approvedCount} / work voice ${workVoiceCount}）。`
      : "参照資料の作者距離を特定できませんでした。";

  return {
    directCount: counts.direct,
    nearCount: counts.near,
    indirectCount: counts.indirect,
    unknownCount: counts.unknown,
    verifiedCount,
    approvedCount,
    workVoiceCount,
    summaryText,
  };
}

export function distanceAwareSourcePhrase(
  sourceTitle: string,
  distance: import("@/types/thought-fragment").AuthorialDistance,
): string {
  switch (distance) {
    case "direct":
      return `『${sourceTitle}』で、作者本人が直接論じています`;
    case "near":
      return `『${sourceTitle}』には、作者の自伝的・随筆的記述が残っています`;
    case "indirect":
      return `『${sourceTitle}』には、作品内の語り・人物を通じた視点が現れます`;
    case "unknown":
      return `『${sourceTitle}』への参照がありますが、作者との距離は特定できません`;
  }
}
