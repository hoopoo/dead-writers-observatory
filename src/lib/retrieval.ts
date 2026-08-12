import { getFragmentsByPersonId } from "@/data/fragments";
import { authorialDistanceBonus } from "@/lib/archive-distance";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type {
  FragmentConfidence,
  ThemeTag,
  ThoughtFragment,
} from "@/types/thought-fragment";

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

function confidenceBonus(confidence: FragmentConfidence): number {
  switch (confidence) {
    case "high":
      return 1;
    case "medium":
      return 0.5;
    case "low":
      return 0;
  }
}

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

  score += authorialDistanceBonus(fragment.authorialDistance);
  score += confidenceBonus(fragment.confidence);

  // Keep strong thematic hits even when indirect (novels).
  const themeHits = fragment.themes.filter((theme) => themeSet.has(theme)).length;
  if (fragment.authorialDistance === "indirect" && themeHits >= 2) {
    score += 1.25;
  }

  return score;
}

/**
 * Deterministic mock retriever.
 * Scoring: theme relevance + person lens + authorialDistance + confidence.
 * Diversity: prefer 2–3 distinct sources per person.
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

    // Pass 1: distinct sources, up to 3.
    for (const item of ranked) {
      if (selected.length >= 3) break;
      if (usedSources.has(item.fragment.sourceId)) continue;

      const novelTheme = item.fragment.themes.some((t) => !usedThemes.has(t));
      if (selected.length < 2 || novelTheme || item.score >= 4) {
        selected.push(item.fragment);
        item.fragment.themes.forEach((t) => usedThemes.add(t));
        usedSources.add(item.fragment.sourceId);
      }
    }

    // Pass 2: fill remaining slots (max 5), still preferring unused sources.
    for (const item of ranked) {
      if (selected.length >= 5) break;
      if (selected.some((f) => f.id === item.fragment.id)) continue;

      const sourceUsed = usedSources.has(item.fragment.sourceId);
      if (sourceUsed && usedSources.size < 3) continue;

      selected.push(item.fragment);
      item.fragment.themes.forEach((t) => usedThemes.add(t));
      usedSources.add(item.fragment.sourceId);
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
