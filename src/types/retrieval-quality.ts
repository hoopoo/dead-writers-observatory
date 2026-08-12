import type { AuthorialDistance, ThemeTag } from "@/types/thought-fragment";

export interface PerspectiveDiversityScore {
  personId: string;
  sourceDiversity: number;
  distanceDiversity: number;
  themeDiversity: number;
  singleSourceDominance: boolean;
  score: number;
}

/**
 * Similarity alone ≠ Retrieval Quality.
 * Semantic RAG must preserve these dimensions.
 */
export interface RetrievalQuality {
  relevance: number;
  provenance: number;
  diversity: number;
  authorialBalance: number;
  reviewIntegrity: number;
  total: number;
}

export interface WriterRetrievalSnapshot {
  personId: string;
  selectedPassageIds: string[];
  selectedFragmentIds: string[];
  selectedSourceIds: string[];
  authorialDistances: AuthorialDistance[];
  themes: ThemeTag[];
  sourceDiversity: number;
  directCount: number;
  nearCount: number;
  indirectCount: number;
  rejectedPassageIds: string[];
  diversity: PerspectiveDiversityScore;
  quality: RetrievalQuality;
}

export interface RetrievalSnapshot {
  fixtureId: string;
  question: string;
  writers: WriterRetrievalSnapshot[];
}

export interface RetrievalSnapshotBundle {
  version: string;
  generatedAt: string;
  fixtures: RetrievalSnapshot[];
}
