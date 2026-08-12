import type { ReviewStatus } from "@/types/review";

const ALLOWED: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ["approved", "needs-review", "rejected"],
  "needs-review": ["approved", "rejected", "pending"],
  approved: ["needs-review", "rejected"],
  rejected: ["needs-review", "approved"],
};

export function canTransitionReviewStatus(
  from: ReviewStatus,
  to: ReviewStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: ReviewStatus,
  to: ReviewStatus,
): void {
  if (!canTransitionReviewStatus(from, to)) {
    throw new Error(`Invalid review transition: ${from} → ${to}`);
  }
}
