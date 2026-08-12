import { sqliteReviewRepository } from "@/lib/review/sqlite-repository";
import type { PassageReview, ThoughtFragmentReview } from "@/types/review";

/**
 * Sync accessors used by retrieval / evidence / archive health.
 * Prefer persisted SQLite state; fall back to static seed data.
 */
export function getActivePassageReview(
  passageId: string,
): PassageReview | undefined {
  ensureSeeded();
  return sqliteReviewRepository.getPassageReviewSync(passageId) ?? undefined;
}

export function getActiveFragmentReview(
  fragmentId: string,
): ThoughtFragmentReview | undefined {
  ensureSeeded();
  return sqliteReviewRepository.getFragmentReviewSync(fragmentId) ?? undefined;
}

let seeded = false;

function ensureSeeded(): void {
  if (seeded) return;
  try {
    sqliteReviewRepository.seedFromStatic();
    seeded = true;
  } catch {
    // Scripts without writable FS still use static fallback via repository getters.
    seeded = true;
  }
}

export function resetReviewSeedFlag(): void {
  seeded = false;
}
