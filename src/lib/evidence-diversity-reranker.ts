import { authorialDistanceBonus } from "@/lib/archive-distance-labels";
import type {
  EvidenceDiversityReranker,
  TrustedRetrievalCandidate,
} from "@/types/archive-trust";
import type { ThemeTag } from "@/types/thought-fragment";

/**
 * Evidence Diversity Reranker — prep for semantic RAG.
 * Penalizes single-source collapse after trust filtering.
 */
export class DefaultEvidenceDiversityReranker
  implements EvidenceDiversityReranker
{
  async rerank(
    candidates: TrustedRetrievalCandidate[],
    targetCount: number,
  ): Promise<TrustedRetrievalCandidate[]> {
    const ranked = [...candidates].sort((a, b) => {
      const scoreA = diversityAwareScore(a, new Set(), new Set());
      const scoreB = diversityAwareScore(b, new Set(), new Set());
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.fragment.id.localeCompare(b.fragment.id);
    });

    const selected: TrustedRetrievalCandidate[] = [];
    const usedSources = new Set<string>();
    const usedThemes = new Set<ThemeTag>();

    // Prefer new sources first.
    for (const candidate of ranked) {
      if (selected.length >= targetCount) break;
      if (usedSources.has(candidate.fragment.sourceId)) continue;
      selected.push(candidate);
      usedSources.add(candidate.fragment.sourceId);
      candidate.fragment.themes.forEach((t) => usedThemes.add(t));
    }

    for (const candidate of ranked) {
      if (selected.length >= targetCount) break;
      if (selected.some((s) => s.fragment.id === candidate.fragment.id)) continue;
      const score = diversityAwareScore(candidate, usedSources, usedThemes);
      if (score < 0 && selected.length >= Math.min(2, targetCount)) continue;
      selected.push(candidate);
      usedSources.add(candidate.fragment.sourceId);
      candidate.fragment.themes.forEach((t) => usedThemes.add(t));
    }

    return selected;
  }
}

function diversityAwareScore(
  candidate: TrustedRetrievalCandidate,
  usedSources: Set<string>,
  usedThemes: Set<ThemeTag>,
): number {
  let score = candidate.relevance;
  score += authorialDistanceBonus(candidate.fragment.authorialDistance);
  score +=
    candidate.fragment.confidence === "high"
      ? 1
      : candidate.fragment.confidence === "medium"
        ? 0.5
        : 0;

  if (!usedSources.has(candidate.fragment.sourceId)) score += 2.5;
  else score -= 2;

  const novelThemes = candidate.fragment.themes.filter((t) => !usedThemes.has(t));
  score += novelThemes.length * 0.75;

  return score;
}

export const defaultDiversityReranker = new DefaultEvidenceDiversityReranker();
