import { getFragmentsByPersonId } from "@/data/fragments";
import { getPassageById } from "@/data/passages";
import { getPassageReview } from "@/data/reviews/passages";
import { getFragmentReview } from "@/data/reviews/fragments";
import { authorialDistanceBonus } from "@/lib/archive-distance";
import { isApprovedDirectEvidence } from "@/lib/evidence";
import { detectOverclaimRisk } from "@/lib/overclaim";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type { ScoreBreakdown } from "@/types/retrieval-audit";
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

export function matchedThemesFor(
  fragment: ThoughtFragment,
  analysis: QuestionAnalysis,
): ThemeTag[] {
  const themeSet = new Set(analysis.relevantThemes);
  return fragment.themes.filter((theme) => themeSet.has(theme));
}

export function scoreFragmentBreakdown(
  fragment: ThoughtFragment,
  analysis: QuestionAnalysis,
  personId: string,
): ScoreBreakdown {
  const themeSet = new Set(analysis.relevantThemes);
  let themeRelevance = 0;

  for (const theme of fragment.themes) {
    if (themeSet.has(theme)) {
      themeRelevance += 3;
      if (PRIORITY_THEMES.includes(theme)) {
        themeRelevance += theme === "creativity" || theme === "death" ? 3.5 : 2;
      }
    }
  }

  let lensRelevance = 0;
  const lensBonus = PERSON_LENS_BONUS[personId] ?? [];
  for (const theme of fragment.themes) {
    if (lensBonus.includes(theme) && themeSet.has(theme)) {
      lensRelevance += 1.5;
    } else if (lensBonus.includes(theme)) {
      lensRelevance += 0.35;
    }
  }

  const authorial = authorialDistanceBonus(fragment.authorialDistance);
  const confidence = confidenceBonus(fragment.confidence);

  const passage = getPassageById(fragment.passageId);
  const review = passage ? getPassageReview(passage.id) : undefined;
  let evidenceBonus = 0;
  if (passage && isApprovedDirectEvidence(passage, review)) {
    evidenceBonus += 2.5;
  } else if (passage?.verificationStatus === "verified") {
    evidenceBonus += 1;
  }

  const themeHits = fragment.themes.filter((theme) => themeSet.has(theme)).length;
  let diversityAdjustment = 0;
  if (fragment.authorialDistance === "indirect" && themeHits >= 2) {
    diversityAdjustment += 1.25;
  }

  const total =
    themeRelevance +
    lensRelevance +
    authorial +
    confidence +
    evidenceBonus +
    diversityAdjustment;

  return {
    themeRelevance,
    lensRelevance,
    authorialDistance: authorial,
    confidence,
    evidenceBonus,
    diversityAdjustment,
    total,
  };
}

export function isRetrievableFragment(fragment: ThoughtFragment): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const passage = getPassageById(fragment.passageId);
  const review = passage ? getPassageReview(passage.id) : undefined;
  const fragReview = getFragmentReview(fragment.id);
  const auto = detectOverclaimRisk(fragment, passage);
  // Prefer the higher risk between curator review and live detector.
  const riskRank = { low: 0, medium: 1, high: 2 } as const;
  const reviewed = fragReview?.overclaimRisk ?? "low";
  const risk =
    riskRank[auto.risk] >= riskRank[reviewed] ? auto.risk : reviewed;

  if (!passage) {
    reasons.push("missing passage");
    return { ok: false, reasons };
  }
  if (review?.reviewStatus === "rejected") {
    reasons.push("rejected review");
    return { ok: false, reasons };
  }
  if (risk === "high") {
    reasons.push("high overclaim risk");
    return { ok: false, reasons };
  }

  return { ok: true, reasons };
}

export function isPrimaryEvidenceEligible(fragment: ThoughtFragment): boolean {
  const passage = getPassageById(fragment.passageId);
  const review = passage ? getPassageReview(passage.id) : undefined;
  if (!passage || !review) return false;
  if (review.reviewStatus === "needs-review") return false;
  if (review.reviewStatus === "rejected") return false;
  if (passage.verificationStatus === "placeholder") return false;
  return true;
}

/**
 * Deterministic mock retriever.
 * Scoring: theme relevance + person lens + authorialDistance + confidence.
 * Diversity: prefer 2–3 distinct sources per person.
 * Gate: rejected / high-overclaim never enter; needs-review cannot be primary.
 */
export class MockPerspectiveRetriever implements PerspectiveRetriever {
  async retrieve(
    personId: string,
    analysis: QuestionAnalysis,
  ): Promise<ThoughtFragment[]> {
    const pool = getFragmentsByPersonId(personId).filter(
      (fragment) => isRetrievableFragment(fragment).ok,
    );
    const ranked = pool
      .map((fragment) => ({
        fragment,
        score: scoreFragmentBreakdown(fragment, analysis, personId).total,
        primary: isPrimaryEvidenceEligible(fragment),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.fragment.id.localeCompare(b.fragment.id);
      });

    const selected: ThoughtFragment[] = [];
    const usedThemes = new Set<ThemeTag>();
    const usedSources = new Set<string>();

    // Pass 1: distinct sources, primary-eligible only, up to 3.
    for (const item of ranked) {
      if (selected.length >= 3) break;
      if (!item.primary) continue;
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
      if (!item.primary) continue;

      const sourceUsed = usedSources.has(item.fragment.sourceId);
      if (sourceUsed && usedSources.size < 3) continue;

      selected.push(item.fragment);
      item.fragment.themes.forEach((t) => usedThemes.add(t));
      usedSources.add(item.fragment.sourceId);
    }

    // Pass 3: only if under-filled, allow non-primary (needs-review) as secondary.
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
