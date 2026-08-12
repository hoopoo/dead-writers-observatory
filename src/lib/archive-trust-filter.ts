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

export interface TrustFilterResult {
  trusted: TrustedRetrievalCandidate[];
  rejected: Array<RetrievalCandidate & { excludeReasons: string[] }>;
}

/**
 * Archive Trust Filter — mandatory after semantic nomination.
 * Similarity alone never bypasses these rules.
 */
export class DefaultArchiveTrustFilter implements ArchiveTrustFilter {
  async filter(
    candidates: RetrievalCandidate[],
  ): Promise<TrustedRetrievalCandidate[]> {
    const { trusted } = await this.filterWithReasons(candidates);
    return trusted;
  }

  async filterWithReasons(
    candidates: RetrievalCandidate[],
  ): Promise<TrustFilterResult> {
    const trusted: TrustedRetrievalCandidate[] = [];
    const rejected: TrustFilterResult["rejected"] = [];

    for (const candidate of candidates) {
      const excludeReasons: string[] = [];
      const passage = getPassageById(candidate.fragment.passageId);
      const review = getActivePassageReview(candidate.fragment.passageId);
      const fragReview = getActiveFragmentReview(candidate.fragment.id);
      const auto = detectOverclaimRisk(candidate.fragment, passage);
      const riskRank = { low: 0, medium: 1, high: 2 } as const;
      const reviewed = fragReview?.overclaimRisk ?? "low";
      const risk =
        riskRank[auto.risk] >= riskRank[reviewed] ? auto.risk : reviewed;

      if (!passage) excludeReasons.push("passage missing");
      if (passage && passage.verificationStatus !== "verified") {
        excludeReasons.push("not verified");
      }
      if (passage && !passage.text?.trim()) {
        excludeReasons.push("text missing");
      }
      if (!review || review.reviewStatus !== "approved") {
        if (review?.reviewStatus === "rejected") {
          excludeReasons.push("REVIEW STATUS REJECTED");
        } else if (review?.reviewStatus === "needs-review") {
          excludeReasons.push("REVIEW STATUS NEEDS REVIEW");
        } else {
          excludeReasons.push("unapproved");
        }
      }
      if (risk === "high") {
        excludeReasons.push("HIGH OVERCLAIM RISK");
      }
      if (!isFragmentPrimaryEligible(fragReview)) {
        excludeReasons.push("fragment support insufficient");
      }
      if (passage && !passage.voiceType) {
        excludeReasons.push("voice metadata incomplete");
      }
      if (!candidate.fragment.authorialDistance) {
        excludeReasons.push("authorial distance incomplete");
      }

      if (excludeReasons.length > 0) {
        rejected.push({ ...candidate, excludeReasons });
        continue;
      }

      trusted.push({
        ...candidate,
        trustReasons: [
          "verified",
          "approved",
          `support=${fragReview?.meaningSupportedByPassage}`,
          `distance=${candidate.fragment.authorialDistance}`,
        ],
      });
    }

    return { trusted, rejected };
  }
}

export const defaultTrustFilter = new DefaultArchiveTrustFilter();
