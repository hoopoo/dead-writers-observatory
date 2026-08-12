import type { AuthorialDistance, ThemeTag } from "@/types/thought-fragment";

export interface ScoreBreakdown {
  themeRelevance: number;
  lensRelevance: number;
  authorialDistance: number;
  confidence: number;
  evidenceBonus: number;
  diversityAdjustment: number;
  total: number;
}

export type RejectionReason =
  | "lower theme relevance"
  | "duplicate source"
  | "indirect when direct available"
  | "low confidence"
  | "high overclaim risk"
  | "unapproved"
  | "placeholder"
  | "rejected review"
  | "needs-review not primary"
  | "REVIEW STATUS: NEEDS REVIEW"
  | "slot filled";

export interface RetrievalCandidateAudit {
  fragmentId: string;
  passageId: string;
  sourceId: string;
  sourceTitle: string;
  matchedThemes: ThemeTag[];
  authorialDistance: AuthorialDistance;
  score: ScoreBreakdown;
  selected: boolean;
  rejectionReasons: RejectionReason[];
}

export interface PersonRetrievalAudit {
  personId: string;
  personName: string;
  question: string;
  candidates: RetrievalCandidateAudit[];
  selectedIds: string[];
  rejectedIds: string[];
}

export interface FixtureRetrievalAudit {
  fixtureId: string;
  question: string;
  people: PersonRetrievalAudit[];
}
