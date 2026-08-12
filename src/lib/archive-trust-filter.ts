import { getPassageById } from "@/data/passages";
import {
  getActiveFragmentReview,
  getActivePassageReview,
} from "@/lib/review/active";
import { isFragmentPrimaryEligible } from "@/lib/review/approve-gate";
import { detectOverclaimRisk } from "@/lib/overclaim";
import type {
  ArchiveTrustFilter,
  RetrievalCandidate,
  TrustedRetrievalCandidate,
} from "@/types/archive-trust";

/**
 * Archive Trust Filter — prep for semantic RAG.
 * Similarity alone never bypasses these rules.
 */
export class DefaultArchiveTrustFilter implements ArchiveTrustFilter {
  async filter(
    candidates: RetrievalCandidate[],
  ): Promise<TrustedRetrievalCandidate[]> {
    const trusted: TrustedRetrievalCandidate[] = [];

    for (const candidate of candidates) {
      const reasons: string[] = [];
      const passage = getPassageById(candidate.fragment.passageId);
      const review = getActivePassageReview(candidate.fragment.passageId);
      const fragReview = getActiveFragmentReview(candidate.fragment.id);
      const auto = detectOverclaimRisk(candidate.fragment, passage);
      const riskRank = { low: 0, medium: 1, high: 2 } as const;
      const reviewed = fragReview?.overclaimRisk ?? "low";
      const risk =
        riskRank[auto.risk] >= riskRank[reviewed] ? auto.risk : reviewed;

      if (!passage) {
        continue;
      }
      if (passage.verificationStatus !== "verified") {
        continue;
      }
      if (!review || review.reviewStatus !== "approved") {
        continue;
      }
      if (risk === "high") continue;
      if (!isFragmentPrimaryEligible(fragReview)) continue;
      if (!passage.voiceType) continue;
      if (!candidate.fragment.authorialDistance) continue;

      reasons.push("verified");
      reasons.push("approved");
      reasons.push(`support=${fragReview?.meaningSupportedByPassage}`);
      reasons.push(`distance=${candidate.fragment.authorialDistance}`);

      trusted.push({
        ...candidate,
        trustReasons: reasons,
      });
    }

    return trusted;
  }
}

export const defaultTrustFilter = new DefaultArchiveTrustFilter();
