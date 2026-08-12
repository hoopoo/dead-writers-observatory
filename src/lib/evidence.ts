import type { SourcePassage } from "@/types/source-passage";
import type { PassageReview } from "@/types/review";
import type { ProvenanceLabel } from "@/types/provenance";
import type { AuthorialDistance } from "@/types/thought-fragment";
import { getPassageReview } from "@/data/reviews/passages";

const WORK_VOICES = new Set([
  "narrator",
  "fictional_character",
  "dialogue",
]);

/**
 * DIRECT SOURCE / SOURCE TEXT — WORK VOICE に使える条件。
 * verified と author-direct は別概念。
 */
export function isApprovedDirectEvidence(
  passage: SourcePassage | undefined,
  review?: PassageReview | null,
): boolean {
  if (!passage) return false;
  const resolvedReview = review ?? getPassageReview(passage.id);
  return (
    passage.verificationStatus === "verified" &&
    Boolean(passage.text && passage.text.trim()) &&
    resolvedReview?.reviewStatus === "approved"
  );
}

export function isWorkVoice(passage: SourcePassage): boolean {
  return WORK_VOICES.has(passage.voiceType) || !passage.isAuthorDirectStatement;
}

export function isDirectAuthorEvidence(
  passage: SourcePassage,
  review?: PassageReview | null,
): boolean {
  return (
    isApprovedDirectEvidence(passage, review) &&
    passage.isAuthorDirectStatement &&
    !WORK_VOICES.has(passage.voiceType)
  );
}

export function provenanceLabelForPassage(
  passage: SourcePassage | undefined,
  review?: PassageReview | null,
): ProvenanceLabel {
  if (!passage) return "SOURCE REFERENCE";

  if (isApprovedDirectEvidence(passage, review)) {
    if (isWorkVoice(passage)) {
      return "SOURCE TEXT — WORK VOICE";
    }
    return "DIRECT SOURCE";
  }

  if (passage.verificationStatus === "verified" && passage.text) {
    // verified but not approved yet
    return "SOURCE REFERENCE";
  }

  return "SOURCE REFERENCE";
}

export function relationshipLabelJa(
  distance: AuthorialDistance,
  passage: SourcePassage,
): string {
  if (isWorkVoice(passage) || distance === "indirect") {
    return "作品に現れる声";
  }
  if (distance === "direct" && passage.isAuthorDirectStatement) {
    return "作者本人の直接的記述";
  }
  if (distance === "near") {
    return "作者の自伝的・随筆的記述";
  }
  return "距離を特定できない記述";
}
