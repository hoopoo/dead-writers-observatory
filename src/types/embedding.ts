import type { ReviewActor } from "@/types/review";

/** Public observe path modes (env RETRIEVAL_MODE). */
export type RetrievalMode = "deterministic" | "semantic" | "hybrid";

/** Curator / eval comparison modes. */
export type RetrievalEvaluationMode =
  | "deterministic"
  | "local-semantic"
  | "neural-semantic"
  | "neural-hybrid";

export type CandidateEvaluationMode =
  | "local-semantic"
  | "neural-semantic"
  | "neural-hybrid";

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions?: number;
  providerName: string;
  modelName?: string;
}

export interface PassageEmbeddingRecord {
  passageId: string;
  sourceId: string;
  personId: string;
  embedding: number[];
  provider: string;
  model?: string;
  dimensions: number;
  contentHash: string;
  embeddedAt: string;
  archiveReviewVersion?: string;
}

export interface SemanticSearchOptions {
  personId: string;
  topK: number;
  provider: string;
  model?: string;
}

export type SemanticMatchBy = "semantic" | "deterministic" | "hybrid";

export interface SemanticCandidate {
  passageId: string;
  personId: string;
  sourceId: string;
  similarity: number;
  rank: number;
  matchedBy: SemanticMatchBy;
}

export interface SemanticIndex {
  upsert(records: PassageEmbeddingRecord[]): Promise<void>;
  remove(passageIds: string[]): Promise<void>;
  search(
    queryVector: number[],
    options: SemanticSearchOptions,
  ): Promise<SemanticCandidate[]>;
}

export interface HybridScore {
  semanticSimilarity: number;
  deterministicScore: number;
  combinedScore: number;
}

export type RetrievalHumanVerdict = "better" | "same" | "worse" | "unclear";

export type RetrievalHumanReasonTag =
  | "more-relevant"
  | "better-modern-connection"
  | "better-source-diversity"
  | "better-authorial-balance"
  | "better-historical-fit"
  | "better-context"
  | "too-literal"
  | "too-associative"
  | "wrong-context"
  | "source-collapse"
  | "distance-collapse"
  | "less-relevant"
  | "other";

export interface RetrievalHumanEvaluation {
  id: string;
  fixtureId: string;
  personId: string;
  baselineMode: "deterministic";
  candidateMode: CandidateEvaluationMode;
  verdict: RetrievalHumanVerdict;
  preferredPassageIds?: string[];
  reasonTags?: RetrievalHumanReasonTag[];
  notes?: string;
  reviewer: ReviewActor;
  createdAt: string;
  updatedAt?: string;
  /** Blind UI mapping metadata (optional). */
  blindLeftMode?: "deterministic" | CandidateEvaluationMode;
  blindRightMode?: "deterministic" | CandidateEvaluationMode;
}

export interface RetrievalHumanEvaluationInput {
  fixtureId: string;
  personId: string;
  candidateMode: CandidateEvaluationMode;
  verdict: RetrievalHumanVerdict;
  preferredPassageIds?: string[];
  reasonTags?: RetrievalHumanReasonTag[];
  notes?: string;
  reviewer?: ReviewActor;
  blindLeftMode?: "deterministic" | CandidateEvaluationMode;
  blindRightMode?: "deterministic" | CandidateEvaluationMode;
}
