import { authorialDistanceBonus } from "@/lib/archive-distance-labels";
import type {
  EvidenceDiversityReranker,
  TrustedRetrievalCandidate,
} from "@/types/archive-trust";
import type { AuthorialDistance, ThemeTag } from "@/types/thought-fragment";

export interface DiversityRerankResult {
  selected: TrustedRetrievalCandidate[];
  excluded: Array<
    TrustedRetrievalCandidate & { excludeReasons: string[] }
  >;
}

/**
 * Evidence Diversity Reranker — mandatory after Trust Filter.
 * Prevents semantic single-source / single-distance collapse.
 * Does NOT treat DIRECT as always superior to INDIRECT.
 */
export class DefaultEvidenceDiversityReranker
  implements EvidenceDiversityReranker
{
  async rerank(
    candidates: TrustedRetrievalCandidate[],
    targetCount: number,
  ): Promise<TrustedRetrievalCandidate[]> {
    const { selected } = await this.rerankWithReasons(candidates, targetCount);
    return selected;
  }

  async rerankWithReasons(
    candidates: TrustedRetrievalCandidate[],
    targetCount: number,
  ): Promise<DiversityRerankResult> {
    const selected: TrustedRetrievalCandidate[] = [];
    const excluded: DiversityRerankResult["excluded"] = [];
    const usedSources = new Set<string>();
    const usedThemes = new Set<ThemeTag>();
    const usedDistances = new Set<AuthorialDistance>();

    const scored = [...candidates].sort((a, b) => {
      const scoreA = diversityAwareScore(a, usedSources, usedThemes, usedDistances);
      const scoreB = diversityAwareScore(b, usedSources, usedThemes, usedDistances);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.fragment.id.localeCompare(b.fragment.id);
    });

    // Pass 1: prefer new sources.
    for (const candidate of scored) {
      if (selected.length >= targetCount) break;
      if (usedSources.has(candidate.fragment.sourceId)) continue;
      selected.push(candidate);
      usedSources.add(candidate.fragment.sourceId);
      usedDistances.add(candidate.fragment.authorialDistance);
      candidate.fragment.themes.forEach((t) => usedThemes.add(t));
    }

    // Pass 2: fill remaining with diversity-aware score.
    for (const candidate of scored) {
      if (selected.length >= targetCount) break;
      if (selected.some((s) => s.fragment.id === candidate.fragment.id)) continue;
      const score = diversityAwareScore(
        candidate,
        usedSources,
        usedThemes,
        usedDistances,
      );
      if (score < 0 && selected.length >= Math.min(2, targetCount)) {
        excluded.push({
          ...candidate,
          excludeReasons: [
            "SOURCE REPETITION",
            "Higher-value evidence from same source already selected.",
          ],
        });
        continue;
      }
      selected.push(candidate);
      usedSources.add(candidate.fragment.sourceId);
      usedDistances.add(candidate.fragment.authorialDistance);
      candidate.fragment.themes.forEach((t) => usedThemes.add(t));
    }

    for (const candidate of candidates) {
      if (selected.some((s) => s.fragment.id === candidate.fragment.id)) continue;
      if (excluded.some((e) => e.fragment.id === candidate.fragment.id)) continue;
      excluded.push({
        ...candidate,
        excludeReasons: ["slot filled after diversity rerank"],
      });
    }

    return { selected, excluded };
  }
}

function diversityAwareScore(
  candidate: TrustedRetrievalCandidate,
  usedSources: Set<string>,
  usedThemes: Set<ThemeTag>,
  usedDistances: Set<AuthorialDistance>,
): number {
  let score = candidate.relevance;
  // Mild distance signal — not a hierarchy that always prefers DIRECT.
  score += authorialDistanceBonus(candidate.fragment.authorialDistance) * 0.35;
  score +=
    candidate.fragment.confidence === "high"
      ? 1
      : candidate.fragment.confidence === "medium"
        ? 0.5
        : 0;

  if (!usedSources.has(candidate.fragment.sourceId)) score += 2.5;
  else score -= 2.25;

  if (!usedDistances.has(candidate.fragment.authorialDistance)) score += 1.1;
  else score -= 0.35;

  const novelThemes = candidate.fragment.themes.filter((t) => !usedThemes.has(t));
  score += novelThemes.length * 0.75;

  return score;
}

export const defaultDiversityReranker = new DefaultEvidenceDiversityReranker();
