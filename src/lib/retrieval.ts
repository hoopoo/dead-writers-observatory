import { getFragmentsByPersonId } from "@/data/fragments";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type { ThoughtFragment, ThemeTag } from "@/types/thought-fragment";

export interface PerspectiveRetriever {
  retrieve(
    personId: string,
    analysis: QuestionAnalysis,
  ): Promise<ThoughtFragment[]>;
}

const PERSON_LENS_BONUS: Record<string, ThemeTag[]> = {
  "person-soseki": [
    "society",
    "self",
    "work",
    "money",
    "independence",
    "obligation",
    "modernization",
  ],
  "person-akutagawa": [
    "anxiety",
    "observation",
    "creativity",
    "fear",
    "fatigue",
    "self",
    "death",
  ],
  "person-dazai": [
    "shame",
    "intimacy",
    "approval",
    "loneliness",
    "love",
    "family",
    "performance",
  ],
};

const PRIORITY_THEMES: ThemeTag[] = [
  "death",
  "work",
  "money",
  "loneliness",
  "creativity",
  "happiness",
  "love",
  "aging",
];

function scoreFragment(
  fragment: ThoughtFragment,
  analysis: QuestionAnalysis,
  personId: string,
): number {
  const themeSet = new Set(analysis.relevantThemes);
  let score = 0;

  for (const theme of fragment.themes) {
    if (themeSet.has(theme)) {
      score += 3;
      if (PRIORITY_THEMES.includes(theme)) {
        score += theme === "creativity" || theme === "death" ? 3.5 : 2;
      }
    }
  }

  const lensBonus = PERSON_LENS_BONUS[personId] ?? [];
  for (const theme of fragment.themes) {
    if (lensBonus.includes(theme) && themeSet.has(theme)) {
      score += 1.5;
    } else if (lensBonus.includes(theme)) {
      score += 0.35;
    }
  }

  score += fragment.confidence;
  return score;
}

/**
 * Deterministic mock retriever.
 * Interface is designed for future swap to embeddings / pgvector / Pinecone.
 */
export class MockPerspectiveRetriever implements PerspectiveRetriever {
  async retrieve(
    personId: string,
    analysis: QuestionAnalysis,
  ): Promise<ThoughtFragment[]> {
    const pool = getFragmentsByPersonId(personId);
    const ranked = pool
      .map((fragment) => ({
        fragment,
        score: scoreFragment(fragment, analysis, personId),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.fragment.id.localeCompare(b.fragment.id);
      });

    const selected: ThoughtFragment[] = [];
    const usedThemes = new Set<ThemeTag>();
    const usedSources = new Set<string>();

    for (const item of ranked) {
      if (selected.length >= 5) break;

      const novelTheme = item.fragment.themes.some((t) => !usedThemes.has(t));
      const novelSource = !usedSources.has(item.fragment.sourceId);

      // Prefer distinct sources; allow same-source only if pool is exhausted later.
      if (!novelSource && selected.length > 0) continue;

      if (selected.length < 2 || novelTheme || item.score >= 4) {
        selected.push(item.fragment);
        item.fragment.themes.forEach((t) => usedThemes.add(t));
        usedSources.add(item.fragment.sourceId);
      }
    }

    if (selected.length < 2) {
      for (const item of ranked) {
        if (selected.some((f) => f.id === item.fragment.id)) continue;
        selected.push(item.fragment);
        if (selected.length >= 2) break;
      }
    }

    return selected.slice(0, Math.min(5, Math.max(2, selected.length)));
  }
}

export const defaultRetriever = new MockPerspectiveRetriever();
