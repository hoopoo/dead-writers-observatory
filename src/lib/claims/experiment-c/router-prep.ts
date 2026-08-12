import type {
  RetrievalRouter,
  TemporalSemanticDistance,
} from "@/lib/claims/experiment-c/types";

/**
 * Prep only — not wired to production. Do not adopt from six fixtures alone.
 */
export const retrievalRouterPrep: RetrievalRouter = {
  chooseMode(analysis) {
    const distance = estimateTemporalSemanticDistance({
      rawQuestion: analysis.rawQuestion,
      relevantThemes: analysis.relevantThemes as never,
    });
    return distance.recommendedRetrievalMode;
  },
};

export function estimateTemporalSemanticDistance(analysis: {
  rawQuestion: string;
  relevantThemes: string[];
}): TemporalSemanticDistance {
  const modernConcepts: string[] = [];
  if (/AI|人工知能|アルゴリズム|プラットフォーム|SNS/.test(analysis.rawQuestion)) {
    if (/AI|人工知能/.test(analysis.rawQuestion)) modernConcepts.push("AI");
    if (/SNS/.test(analysis.rawQuestion)) modernConcepts.push("SNS");
    if (/アルゴリズム/.test(analysis.rawQuestion)) modernConcepts.push("algorithm");
    if (/プラットフォーム/.test(analysis.rawQuestion)) {
      modernConcepts.push("platform");
    }
  }
  const score = Math.min(1, modernConcepts.length * 0.35);
  return {
    score,
    modernConcepts,
    archiveVocabularyGap: score,
    recommendedRetrievalMode:
      score >= 0.35 ? "neural-hybrid" : "deterministic",
  };
}
