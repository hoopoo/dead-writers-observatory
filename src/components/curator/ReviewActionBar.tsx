"use client";

import { useState, useTransition } from "react";
import type { PassageReview, ReviewStatus } from "@/types/review";
import { defaultReviewRepository } from "@/lib/review-repository";

export function ReviewActionBar({
  passageId,
  initialReview,
}: {
  passageId: string;
  initialReview?: PassageReview;
}) {
  const [review, setReview] = useState(initialReview);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("UI preview — not persisted to disk");

  function apply(status: ReviewStatus) {
    startTransition(async () => {
      const next = await defaultReviewRepository.updatePassageReview(passageId, {
        reviewStatus: status,
        notes: `Curator Console preview → ${status}`,
        checks:
          status === "approved"
            ? {
                textVerified: true,
                locatorVerified: true,
                voiceVerified: true,
                authorialDistanceVerified: true,
                sourceRelationshipVerified: true,
                fragmentMeaningVerified: true,
              }
            : undefined,
      });
      setReview(next);
      setNote(`Preview state: ${next.reviewStatus} @ ${next.reviewedAt}`);
    });
  }

  return (
    <section className="review-actions">
      <p className="eyebrow">REVIEW ACTIONS</p>
      <p className="review-actions__status">
        Current: {(review?.reviewStatus ?? "pending").toUpperCase()}
      </p>
      <div className="review-actions__buttons">
        <button
          type="button"
          className="button-primary"
          disabled={pending}
          onClick={() => apply("approved")}
        >
          APPROVE
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={pending}
          onClick={() => apply("needs-review")}
        >
          NEEDS REVIEW
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={pending}
          onClick={() => apply("rejected")}
        >
          REJECT
        </button>
      </div>
      <p className="review-actions__note">{note}</p>
    </section>
  );
}
