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

export function computeRetrievalQuality(args: {
  relevance: number;
  selected: ThoughtFragment[];
  approvedCount: number;
  rejectedLeak: number;
  needsReviewLeak: number;
  highOverclaimLeak: number;
}): RetrievalQuality {
  const diversity = computePerspectiveDiversity("tmp", args.selected);
  const provenance =
    args.selected.length === 0
      ? 0
      : (args.approvedCount / args.selected.length) * 5;
  const reviewIntegrity =
    5 -
    args.rejectedLeak * 2 -
    args.needsReviewLeak * 2 -
    args.highOverclaimLeak * 2;
  const authorialBalance = Math.min(5, diversity.distanceDiversity * 2);
  const diversityScore = Math.min(5, diversity.sourceDiversity * 2);

  const total =
    args.relevance +
    provenance +
    diversityScore +
    authorialBalance +
    Math.max(0, reviewIntegrity);

  return {
    relevance: args.relevance,
    provenance,
    diversity: diversityScore,
    authorialBalance,
    reviewIntegrity: Math.max(0, reviewIntegrity),
    total,
  };
}
