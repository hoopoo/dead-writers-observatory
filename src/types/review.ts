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

export type ReviewEventAction =
  | "approved"
  | "needs-review"
  | "rejected"
  | "updated";

export type ReviewTargetType = "passage" | "fragment";

/** Future DB history shape. Not persisted yet. */
export interface ReviewEvent {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  action: ReviewEventAction;
  reviewer?: string;
  timestamp: string;
  notes?: string;
}

export interface PassageReviewUpdate {
  reviewStatus?: ReviewStatus;
  checks?: Partial<PassageReviewChecks>;
  issues?: string[];
  notes?: string;
  reviewer?: string;
}

export interface ArchiveReviewRepository {
  getPassageReview(passageId: string): Promise<PassageReview | undefined>;
  updatePassageReview(
    passageId: string,
    update: PassageReviewUpdate,
  ): Promise<PassageReview>;
  listReviewEvents?(targetId?: string): Promise<ReviewEvent[]>;
}
