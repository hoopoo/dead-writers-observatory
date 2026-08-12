import { sqliteReviewRepository } from "@/lib/review/sqlite-repository";
import type { ArchiveReviewRepository } from "@/types/review";

/** Persistent curator review repository (SQLite). */
export const defaultReviewRepository: ArchiveReviewRepository =
  sqliteReviewRepository;

export { sqliteReviewRepository };
export {
  getActivePassageReview,
  getActiveFragmentReview,
} from "@/lib/review/active";
