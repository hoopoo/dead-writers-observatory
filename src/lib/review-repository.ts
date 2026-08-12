import {
  getPassageReview as getStaticPassageReview,
  passageReviews,
} from "@/data/reviews/passages";
import type {
  ArchiveReviewRepository,
  PassageReview,
  PassageReviewUpdate,
  ReviewEvent,
  ReviewStatus,
} from "@/types/review";

/**
 * In-memory overlay over static archive reviews.
 * UI preview / future DB-backed swap point.
 */
const overlay = new Map<string, PassageReview>();
const events: ReviewEvent[] = [];

function cloneReview(review: PassageReview): PassageReview {
  return {
    ...review,
    checks: { ...review.checks },
    issues: [...review.issues],
  };
}

function baseReview(passageId: string): PassageReview {
  const existing = overlay.get(passageId) ?? getStaticPassageReview(passageId);
  if (existing) return cloneReview(existing);
  return {
    id: `review-${passageId}`,
    passageId,
    reviewStatus: "pending",
    checks: {
      textVerified: false,
      locatorVerified: false,
      voiceVerified: false,
      authorialDistanceVerified: false,
      sourceRelationshipVerified: false,
      fragmentMeaningVerified: false,
    },
    issues: ["review missing"],
  };
}

function actionForStatus(status: ReviewStatus): ReviewEvent["action"] {
  if (status === "approved") return "approved";
  if (status === "needs-review") return "needs-review";
  if (status === "rejected") return "rejected";
  return "updated";
}

export class InMemoryArchiveReviewRepository implements ArchiveReviewRepository {
  async getPassageReview(passageId: string): Promise<PassageReview | undefined> {
    const review = overlay.get(passageId) ?? getStaticPassageReview(passageId);
    return review ? cloneReview(review) : undefined;
  }

  async updatePassageReview(
    passageId: string,
    update: PassageReviewUpdate,
  ): Promise<PassageReview> {
    const current = baseReview(passageId);
    const next: PassageReview = {
      ...current,
      ...update,
      checks: {
        ...current.checks,
        ...update.checks,
      },
      issues: update.issues ?? current.issues,
      reviewedAt: new Date().toISOString().slice(0, 10),
      reviewer: update.reviewer ?? current.reviewer ?? "curator-console",
    };
    overlay.set(passageId, next);
    events.push({
      id: `evt-${events.length + 1}-${passageId}`,
      targetType: "passage",
      targetId: passageId,
      action: update.reviewStatus
        ? actionForStatus(update.reviewStatus)
        : "updated",
      reviewer: next.reviewer,
      timestamp: new Date().toISOString(),
      notes: update.notes,
    });
    return cloneReview(next);
  }

  async listReviewEvents(targetId?: string): Promise<ReviewEvent[]> {
    if (!targetId) return [...events];
    return events.filter((event) => event.targetId === targetId);
  }
}

export const defaultReviewRepository = new InMemoryArchiveReviewRepository();

/** Static snapshot used by server-side archive scripts / SSR. */
export function listStaticPassageReviews(): PassageReview[] {
  return passageReviews.map((review) => cloneReview(review));
}
