import type { ThoughtFragment } from "@/types/thought-fragment";
import type { ScoreBreakdown } from "@/types/retrieval-audit";

export interface RetrievalCandidate {
  fragment: ThoughtFragment;
  score: ScoreBreakdown;
  relevance: number;
}

export interface TrustedRetrievalCandidate extends RetrievalCandidate {
  trustReasons: string[];
}

export interface ArchiveTrustFilter {
  filter(
    candidates: RetrievalCandidate[],
  ): Promise<TrustedRetrievalCandidate[]>;
}

export interface EvidenceDiversityReranker {
  rerank(
    candidates: TrustedRetrievalCandidate[],
    targetCount: number,
  ): Promise<TrustedRetrievalCandidate[]>;
}
