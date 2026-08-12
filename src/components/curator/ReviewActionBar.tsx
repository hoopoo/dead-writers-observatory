"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PassageReview, ReviewStatus } from "@/types/review";
import { updatePassageReviewAction } from "@/app/curator/actions";

export function ReviewActionBar({
  passageId,
  initialReview,
}: {
  passageId: string;
  initialReview?: PassageReview | null;
}) {
  const router = useRouter();
  const [review, setReview] = useState(initialReview);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("Writes to persistent review store + event log");

  function apply(status: ReviewStatus) {
    startTransition(async () => {
      const result = await updatePassageReviewAction({
        passageId,
        reviewStatus: status,
        notes: `Curator Console → ${status}`,
      });
      if (!result.ok) {
        setNote(result.error);
        return;
      }
      setReview(result.review);
      setNote(
        `Persisted: ${result.review.reviewStatus} @ ${result.review.reviewedAt}`,
      );
      router.refresh();
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
