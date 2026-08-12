export type ReviewStatus =
  | "pending"
  | "approved"
  | "needs-review"
  | "rejected";

export interface PassageReviewChecks {
  textVerified: boolean;
  locatorVerified: boolean;
  voiceVerified: boolean;
  authorialDistanceVerified: boolean;
  sourceRelationshipVerified: boolean;
  fragmentMeaningVerified: boolean;
}

export interface PassageReview {
  id: string;
  passageId: string;
  reviewStatus: ReviewStatus;
  checks: PassageReviewChecks;
  issues: string[];
  reviewer?: string;
  reviewedAt?: string;
  notes?: string;
}

export type MeaningSupport =
  | "supported"
  | "partially-supported"
  | "unsupported"
  | "unclear";

export type OverclaimRisk = "low" | "medium" | "high";

export interface ThoughtFragmentReview {
  fragmentId: string;
  meaningSupportedByPassage: MeaningSupport;
  overclaimRisk: OverclaimRisk;
  notes?: string;
}
