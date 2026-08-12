import { getPassageById } from "@/data/passages";
import type {
  PassageReview,
  PassageReviewChecks,
  ThoughtFragmentReview,
} from "@/types/review";

export function evaluatePassageApproveGate(
  passageId: string,
  checks: PassageReviewChecks,
): { ok: boolean; reasons: string[] } {
  const passage = getPassageById(passageId);
  const reasons: string[] = [];

  if (!passage) {
    reasons.push("passage missing");
    return { ok: false, reasons };
  }
  if (passage.verificationStatus !== "verified" || !passage.text?.trim()) {
    reasons.push("verified text required");
  }
  if (!checks.textVerified) reasons.push("textVerified required");
  if (!checks.locatorVerified) reasons.push("locatorVerified required");
  if (!checks.voiceVerified) reasons.push("voiceVerified required");
  if (!checks.authorialDistanceVerified) {
    reasons.push("authorialDistanceVerified required");
  }
  if (!checks.sourceRelationshipVerified) {
    reasons.push("sourceRelationshipVerified required");
  }

  return { ok: reasons.length === 0, reasons };
}

export function isFragmentPrimaryEligible(
  fragmentReview: ThoughtFragmentReview | null | undefined,
): boolean {
  if (!fragmentReview) return false;
  if (fragmentReview.meaningSupportedByPassage === "unsupported") return false;
  if (fragmentReview.overclaimRisk === "high") return false;
  return (
    fragmentReview.meaningSupportedByPassage === "supported" ||
    fragmentReview.meaningSupportedByPassage === "partially-supported"
  );
}

export function summarizeReviewForEvent(review: PassageReview) {
  return {
    reviewStatus: review.reviewStatus,
    checks: review.checks,
    issues: review.issues,
    notes: review.notes,
  };
}
