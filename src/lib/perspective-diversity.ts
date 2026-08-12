import type { ThoughtFragment } from "@/types/thought-fragment";
import type {
  PerspectiveDiversityScore,
  RetrievalQuality,
} from "@/types/retrieval-quality";

export function computePerspectiveDiversity(
  personId: string,
  selected: ThoughtFragment[],
): PerspectiveDiversityScore {
  const sources = new Set(selected.map((f) => f.sourceId));
  const distances = new Set(selected.map((f) => f.authorialDistance));
  const themes = new Set(selected.flatMap((f) => f.themes));

  let maxSourceCount = 0;
  for (const sourceId of sources) {
    const count = selected.filter((f) => f.sourceId === sourceId).length;
    maxSourceCount = Math.max(maxSourceCount, count);
  }

  const singleSourceDominance =
    selected.length >= 2 && maxSourceCount === selected.length;

  const sourceDiversity = sources.size;
  const distanceDiversity = distances.size;
  const themeDiversity = themes.size;

  const score =
    sourceDiversity * 3 +
    distanceDiversity * 2 +
    Math.min(themeDiversity, 6) * 0.5 -
    (singleSourceDominance ? 5 : 0);

  return {
    personId,
    sourceDiversity,
    distanceDiversity,
    themeDiversity,
    singleSourceDominance,
    score,
  };
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Retrieval Quality is NOT truth probability.
 * It scores evidence-set health: relevance, provenance, integrity, diversity, distance.
 */
export function computeRetrievalQuality(args: {
  relevance: number;
  selected: ThoughtFragment[];
  approvedCount: number;
  rejectedLeak: number;
  needsReviewLeak: number;
  highOverclaimLeak: number;
  /** raw relevance scale hint; deterministic totals are often 0–20 */
  relevanceScaleMax?: number;
}): RetrievalQuality {
  const diversity = computePerspectiveDiversity("tmp", args.selected);
  const scale = args.relevanceScaleMax ?? 20;
  const relevance = clamp100((args.relevance / scale) * 35);

  const provenance =
    args.selected.length === 0
      ? 0
      : clamp100((args.approvedCount / args.selected.length) * 20);

  const reviewIntegrity = clamp100(
    20 -
      args.rejectedLeak * 8 -
      args.needsReviewLeak * 8 -
      args.highOverclaimLeak * 8,
  );

  const sourceDiversity = clamp100(
    (Math.min(3, diversity.sourceDiversity) / 3) * 15,
  );
  const themeDiversity = clamp100(
    (Math.min(6, diversity.themeDiversity) / 6) * 10,
  );
  const authorialBalance = clamp100(
    (Math.min(3, diversity.distanceDiversity) / 3) * 10,
  );

  const total = clamp100(
    relevance +
      provenance +
      reviewIntegrity +
      sourceDiversity +
      themeDiversity +
      authorialBalance,
  );

  return {
    relevance,
    provenance,
    reviewIntegrity,
    sourceDiversity,
    themeDiversity,
    authorialBalance,
    total,
  };
}
