import type { AuthorialDistance, ThemeTag } from "@/types/thought-fragment";
import type { SemanticMatchBy } from "@/types/embedding";

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
 * Not a truth probability — an evidence-set health metric (0–100).
 */
export interface RetrievalQuality {
  relevance: number;
  provenance: number;
  reviewIntegrity: number;
  sourceDiversity: number;
  themeDiversity: number;
  authorialBalance: number;
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

export interface RetrievalFunnel {
  semanticCandidates: number;
  trusted: number;
  diversityReranked: number;
  selected: number;
}

export interface EvidenceTrace {
  fragmentId: string;
  passageId: string;
  sourceTitle: string;
  semanticSimilarity?: number;
  deterministicRelevance: number;
  hybridCombined?: number;
  trustStatus: string;
  authorialDistance: AuthorialDistance;
  themeOverlap: ThemeTag[];
  finalRerankScore: number;
  matchedBy: SemanticMatchBy;
  /** Short verified passage preview for human evaluation (not full text). */
  passagePreview?: string;
  normalizedMeaning?: string;
  voiceType?: string;
  themes?: ThemeTag[];
}

export type RetrievalWarning =
  | "SINGLE SOURCE DOMINANCE"
  | "AUTHORIAL DISTANCE COLLAPSE"
  | "LOW SOURCE DIVERSITY"
  | "SEMANTIC HIGH / TRUST LOW"
  | "SEMANTIC HIGH / OVERCLAIM RISK";
