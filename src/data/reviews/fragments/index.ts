import type { ThoughtFragmentReview } from "@/types/review";
import { fragments } from "@/data/fragments";
import { getPassageById } from "@/data/passages";
import { detectOverclaimRisk } from "@/lib/overclaim";

function supportFor(fragmentId: string): ThoughtFragmentReview["meaningSupportedByPassage"] {
  // Verified-linked fragments are treated as supported/partial; placeholders unclear.
  const fragment = fragments.find((f) => f.id === fragmentId);
  if (!fragment) return "unclear";
  const passage = getPassageById(fragment.passageId);
  if (!passage) return "unclear";
  if (passage.verificationStatus !== "verified") return "unclear";
  if (fragment.confidence === "low") return "partially-supported";
  return "supported";
}

export const fragmentReviews: ThoughtFragmentReview[] = fragments.map(
  (fragment) => {
    const passage = getPassageById(fragment.passageId);
    const auto = detectOverclaimRisk(fragment, passage);
    return {
      fragmentId: fragment.id,
      meaningSupportedByPassage: supportFor(fragment.id),
      overclaimRisk: auto.risk,
      notes:
        auto.reasons.length > 0
          ? auto.reasons.join("; ")
          : "SourcePassage からの距離は許容範囲。",
    };
  },
);

export function getFragmentReview(
  fragmentId: string,
): ThoughtFragmentReview | undefined {
  return fragmentReviews.find((review) => review.fragmentId === fragmentId);
}
