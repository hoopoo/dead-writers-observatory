export type RetrievalMode = "deterministic" | "semantic" | "hybrid";

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

export interface RetrievalHumanEvaluation {
  fixtureId: string;
  personId: string;
  mode: "semantic" | "hybrid";
  verdict: "better" | "same" | "worse" | "unclear";
  notes?: string;
}
