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

export type ReviewActorType = "human" | "system" | "migration";

export interface ReviewActor {
  id: string;
  displayName: string;
  type: ReviewActorType;
}

export type ReviewEventAction =
  | "created"
  | "approved"
  | "needs-review"
  | "rejected"
  | "updated"
  | "restored";

export type ReviewTargetType = "passage" | "fragment";

export interface ReviewEvent {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  action: ReviewEventAction;
  actor: ReviewActor;
  previousState?: unknown;
  nextState?: unknown;
  timestamp: string;
  notes?: string;
}

export interface ReviewEventInput {
  targetType: ReviewTargetType;
  targetId: string;
  action: ReviewEventAction;
  actor: ReviewActor;
  previousState?: unknown;
  nextState?: unknown;
  timestamp?: string;
  notes?: string;
}

export interface PassageReviewUpdate {
  reviewStatus?: ReviewStatus;
  checks?: Partial<PassageReviewChecks>;
  issues?: string[];
  notes?: string;
  reviewer?: string;
}

export interface ThoughtFragmentReviewUpdate {
  meaningSupportedByPassage?: MeaningSupport;
  overclaimRisk?: OverclaimRisk;
  notes?: string;
}

export interface ArchiveReviewRepository {
  getPassageReview(passageId: string): Promise<PassageReview | null>;
  getFragmentReview(fragmentId: string): Promise<ThoughtFragmentReview | null>;
  updatePassageReview(
    passageId: string,
    update: PassageReviewUpdate,
    actor?: ReviewActor,
  ): Promise<PassageReview>;
  updateFragmentReview(
    fragmentId: string,
    update: ThoughtFragmentReviewUpdate,
    actor?: ReviewActor,
  ): Promise<ThoughtFragmentReview>;
  getReviewEvents(
    targetType: ReviewTargetType,
    targetId: string,
  ): Promise<ReviewEvent[]>;
  appendReviewEvent(event: ReviewEventInput): Promise<ReviewEvent>;
}

export const DEFAULT_REVIEW_ACTOR: ReviewActor = {
  id: "local-curator",
  displayName: "Curator",
  type: "human",
};

export const MIGRATION_ACTOR: ReviewActor = {
  id: "migration",
  displayName: "Migration",
  type: "migration",
};
