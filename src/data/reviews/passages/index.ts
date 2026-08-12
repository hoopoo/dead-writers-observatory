import type { PassageReview } from "@/types/review";
import { passages } from "@/data/passages";

const approvedIds = new Set([
  "pass-soseki-ind-01",
  "pass-soseki-ind-02",
  "pass-soseki-ind-03",
  "pass-soseki-gara-01",
  "pass-soseki-kokoro-01",
  "pass-akutagawa-shuju-01",
  "pass-akutagawa-shuju-02",
  "pass-akutagawa-shuju-03",
  "pass-akutagawa-ahou-01",
  "pass-akutagawa-hagu-01",
  "pass-dazai-tsugaru-01",
  "pass-dazai-tsugaru-02",
  "pass-dazai-fugaku-01",
  "pass-dazai-ningen-01",
  "pass-dazai-ningen-02",
]);

function buildReview(passageId: string): PassageReview {
  const approved = approvedIds.has(passageId);
  return {
    id: `review-${passageId}`,
    passageId,
    reviewStatus: approved ? "approved" : "pending",
    checks: {
      textVerified: approved,
      locatorVerified: approved,
      voiceVerified: approved,
      authorialDistanceVerified: approved,
      sourceRelationshipVerified: approved,
      fragmentMeaningVerified: approved,
    },
    issues: approved
      ? []
      : ["verified text 未投入、または curator 未承認"],
    reviewer: approved ? "archive-curator" : undefined,
    reviewedAt: approved ? "2026-08-12" : undefined,
    notes: approved
      ? "青空文庫本文と照合済み。verified ≠ authorial を確認。"
      : "placeholder。原文照合後に承認する。",
  };
}

export const passageReviews: PassageReview[] = passages.map((passage) =>
  buildReview(passage.id),
);

export function getPassageReview(passageId: string): PassageReview | undefined {
  return passageReviews.find((review) => review.passageId === passageId);
}
