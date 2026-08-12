import { getFragmentsByPersonId } from "@/data/fragments";
import { getPassageById } from "@/data/passages";
import { defaultTrustFilter } from "@/lib/archive-trust-filter";
import { defaultDiversityReranker } from "@/lib/evidence-diversity-reranker";
import { buildQueryEmbeddingPayload } from "@/lib/embeddings/payload";
import {
  createEmbeddingProvider,
  type EmbeddingProviderKind,
} from "@/lib/embeddings/provider";
import { minMaxNormalize } from "@/lib/embeddings/cosine";
import { defaultSemanticIndex } from "@/lib/embeddings/store";
import {
  MockPerspectiveRetriever,
  scoreFragmentBreakdown,
  type PerspectiveRetriever,
} from "@/lib/retrieval";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type { ThoughtFragment } from "@/types/thought-fragment";
import type { HybridScore, SemanticCandidate } from "@/types/embedding";
import type { ScoreBreakdown } from "@/types/retrieval-audit";

export interface SemanticRetrievalTrace {
  mode: "semantic" | "hybrid";
  provider?: string;
  model?: string;
  fallback?: string;
  semanticCandidates: SemanticCandidate[];
  trustRejected: Array<{
    passageId: string;
    fragmentId: string;
    similarity?: number;
    reasons: string[];
  }>;
  diversityExcluded: Array<{
    passageId: string;
    fragmentId: string;
    reasons: string[];
  }>;
  selectedFragmentIds: string[];
  funnel: {
    semanticCandidates: number;
    trusted: number;
    diversityReranked: number;
    selected: number;
  };
}

export interface SemanticRetrieverConfig {
  /** Embedding provider namespace used for query + index lookup. */
  providerKind?: EmbeddingProviderKind | string;
  /** When true, never silently use local-bridge as neural. */
  requireNeural?: boolean;
  /**
   * Public runtime may fall back to deterministic.
   * Evaluation must set false so provider failure surfaces.
   */
  allowDeterministicFallback?: boolean;
}

const TOP_K = 12;
const TARGET = 5;

function emptyBreakdown(): ScoreBreakdown {
  return {
    themeRelevance: 0,
    lensRelevance: 0,
    authorialDistance: 0,
    confidence: 0,
    evidenceBonus: 0,
    diversityAdjustment: 0,
    total: 0,
  };
}

function fragmentsForPassage(
  personId: string,
  passageId: string,
): ThoughtFragment[] {
  return getFragmentsByPersonId(personId).filter(
    (fragment) => fragment.passageId === passageId,
  );
}

function hybridWeights() {
  return {
    semanticWeight: Number(process.env.SEMANTIC_WEIGHT ?? 0.65),
    deterministicWeight: Number(process.env.DETERMINISTIC_WEIGHT ?? 0.35),
  };
}

function combineScores(
  similarity: number,
  deterministicRaw: number,
  mode: "semantic" | "hybrid",
): HybridScore {
  const { semanticWeight, deterministicWeight } = hybridWeights();
  const semanticSimilarity = Math.max(0, Math.min(1, similarity));
  const deterministicScore = Math.max(0, Math.min(1, deterministicRaw / 20));

  if (mode === "semantic") {
    return {
      semanticSimilarity,
      deterministicScore,
      combinedScore: semanticSimilarity,
    };
  }

  return {
    semanticSimilarity,
    deterministicScore,
    combinedScore:
      semanticSimilarity * semanticWeight +
      deterministicScore * deterministicWeight,
  };
}

export class SemanticPerspectiveRetriever implements PerspectiveRetriever {
  lastTrace: SemanticRetrievalTrace | null = null;
  protected readonly config: SemanticRetrieverConfig;

  constructor(config: SemanticRetrieverConfig = {}) {
    this.config = {
      allowDeterministicFallback: true,
      ...config,
    };
  }

  async retrieve(
    personId: string,
    analysis: QuestionAnalysis,
  ): Promise<ThoughtFragment[]> {
    try {
      return await this.retrieveSemantic(personId, analysis, "semantic");
    } catch (error) {
      if (!this.config.allowDeterministicFallback) throw error;
      const fallback = new MockPerspectiveRetriever();
      const selected = await fallback.retrieve(personId, analysis);
      this.lastTrace = {
        mode: "semantic",
        fallback:
          error instanceof Error
            ? error.message
            : "Embedding provider unavailable",
        semanticCandidates: [],
        trustRejected: [],
        diversityExcluded: [],
        selectedFragmentIds: selected.map((f) => f.id),
        funnel: {
          semanticCandidates: 0,
          trusted: 0,
          diversityReranked: selected.length,
          selected: selected.length,
        },
      };
      return selected;
    }
  }

  protected async retrieveSemantic(
    personId: string,
    analysis: QuestionAnalysis,
    mode: "semantic" | "hybrid",
  ): Promise<ThoughtFragment[]> {
    const provider = createEmbeddingProvider(this.config.providerKind, {
      requireNeural: this.config.requireNeural,
    });
    const queryPayload = buildQueryEmbeddingPayload(analysis);
    const queryVector = await provider.embedText(queryPayload);
    const semanticCandidates = await defaultSemanticIndex.search(queryVector, {
      personId,
      topK: TOP_K,
      provider: provider.providerName,
      model: provider.modelName,
    });

    const candidates = [];
    for (const semantic of semanticCandidates) {
      const linked = fragmentsForPassage(personId, semantic.passageId);
      for (const fragment of linked) {
        const breakdown = scoreFragmentBreakdown(fragment, analysis, personId);
        const hybrid = combineScores(semantic.similarity, breakdown.total, mode);
        candidates.push({
          fragment,
          score: breakdown,
          relevance: hybrid.combinedScore * 20,
          semantic,
          hybrid,
        });
      }
    }

    const bestByPassage = new Map<string, (typeof candidates)[number]>();
    for (const candidate of candidates) {
      const existing = bestByPassage.get(candidate.fragment.passageId);
      if (!existing || candidate.relevance > existing.relevance) {
        bestByPassage.set(candidate.fragment.passageId, candidate);
      }
    }
    const passageBest = Array.from(bestByPassage.values()).sort(
      (a, b) => b.relevance - a.relevance,
    );

    const trust = await defaultTrustFilter.filterWithReasons(passageBest);
    const diversity = await defaultDiversityReranker.rerankWithReasons(
      trust.trusted,
      TARGET,
    );

    const selected = diversity.selected
      .map((item) => item.fragment)
      .slice(0, TARGET);

    this.lastTrace = {
      mode,
      provider: provider.providerName,
      model: provider.modelName,
      semanticCandidates,
      trustRejected: trust.rejected.map((item) => {
        const withSem = item as typeof item & { semantic?: SemanticCandidate };
        return {
          passageId: item.fragment.passageId,
          fragmentId: item.fragment.id,
          similarity: withSem.semantic?.similarity,
          reasons: item.excludeReasons,
        };
      }),
      diversityExcluded: diversity.excluded.map((item) => ({
        passageId: item.fragment.passageId,
        fragmentId: item.fragment.id,
        reasons: item.excludeReasons,
      })),
      selectedFragmentIds: selected.map((f) => f.id),
      funnel: {
        semanticCandidates: semanticCandidates.length,
        trusted: trust.trusted.length,
        diversityReranked: diversity.selected.length,
        selected: selected.length,
      },
    };

    if (selected.length >= 2) return selected;

    if (!this.config.allowDeterministicFallback) {
      return selected;
    }

    const filler = new MockPerspectiveRetriever();
    const fallback = await filler.retrieve(personId, analysis);
    const merged = [...selected];
    for (const fragment of fallback) {
      if (merged.some((f) => f.id === fragment.id)) continue;
      merged.push(fragment);
      if (merged.length >= 2) break;
    }
    this.lastTrace.fallback = "underfilled after trust/diversity";
    this.lastTrace.selectedFragmentIds = merged.map((f) => f.id);
    this.lastTrace.funnel.selected = merged.length;
    return merged;
  }
}

export class HybridPerspectiveRetriever extends SemanticPerspectiveRetriever {
  async retrieve(
    personId: string,
    analysis: QuestionAnalysis,
  ): Promise<ThoughtFragment[]> {
    try {
      const provider = createEmbeddingProvider(this.config.providerKind, {
        requireNeural: this.config.requireNeural,
      });
      const queryVector = await provider.embedText(
        buildQueryEmbeddingPayload(analysis),
      );
      const semanticCandidates = await defaultSemanticIndex.search(queryVector, {
        personId,
        topK: TOP_K,
        provider: provider.providerName,
        model: provider.modelName,
      });

      const pool = getFragmentsByPersonId(personId);
      const detScores = pool.map((fragment) =>
        scoreFragmentBreakdown(fragment, analysis, personId).total,
      );
      const detNorm = minMaxNormalize(detScores);
      const semByPassage = new Map(
        semanticCandidates.map((c) => [c.passageId, c.similarity]),
      );
      const maxSem = Math.max(
        0.0001,
        ...semanticCandidates.map((c) => c.similarity),
        0,
      );

      const candidates = pool.map((fragment, index) => {
        const sem = (semByPassage.get(fragment.passageId) ?? 0) / maxSem;
        const det = detNorm[index] ?? 0;
        const hybrid = combineScores(sem, det * 20, "hybrid");
        const breakdown = scoreFragmentBreakdown(fragment, analysis, personId);
        return {
          fragment,
          score: breakdown,
          relevance: hybrid.combinedScore * 20,
          semantic: {
            passageId: fragment.passageId,
            personId,
            sourceId: fragment.sourceId,
            similarity: semByPassage.get(fragment.passageId) ?? 0,
            rank: 0,
            matchedBy: "hybrid" as const,
          },
          hybrid,
        };
      });

      candidates.sort((a, b) => b.relevance - a.relevance);
      const top = candidates.slice(0, TOP_K);
      const trust = await defaultTrustFilter.filterWithReasons(top);
      const diversity = await defaultDiversityReranker.rerankWithReasons(
        trust.trusted,
        TARGET,
      );
      const selected = diversity.selected
        .map((item) => item.fragment)
        .slice(0, TARGET);

      this.lastTrace = {
        mode: "hybrid",
        provider: provider.providerName,
        model: provider.modelName,
        semanticCandidates,
        trustRejected: trust.rejected.map((item) => ({
          passageId: item.fragment.passageId,
          fragmentId: item.fragment.id,
          reasons: item.excludeReasons,
        })),
        diversityExcluded: diversity.excluded.map((item) => ({
          passageId: item.fragment.passageId,
          fragmentId: item.fragment.id,
          reasons: item.excludeReasons,
        })),
        selectedFragmentIds: selected.map((f) => f.id),
        funnel: {
          semanticCandidates: semanticCandidates.length,
          trusted: trust.trusted.length,
          diversityReranked: diversity.selected.length,
          selected: selected.length,
        },
      };

      if (selected.length >= 2) return selected;
      if (!this.config.allowDeterministicFallback) return selected;

      const filler = await new MockPerspectiveRetriever().retrieve(
        personId,
        analysis,
      );
      this.lastTrace.fallback = "underfilled after hybrid trust/diversity";
      return filler;
    } catch (error) {
      if (!this.config.allowDeterministicFallback) throw error;
      const selected = await new MockPerspectiveRetriever().retrieve(
        personId,
        analysis,
      );
      this.lastTrace = {
        mode: "hybrid",
        fallback:
          error instanceof Error
            ? error.message
            : "Embedding provider unavailable",
        semanticCandidates: [],
        trustRejected: [],
        diversityExcluded: [],
        selectedFragmentIds: selected.map((f) => f.id),
        funnel: {
          semanticCandidates: 0,
          trusted: 0,
          diversityReranked: selected.length,
          selected: selected.length,
        },
      };
      return selected;
    }
  }
}

/** Factory for curator / eval modes (no silent neural→local remap). */
export function createEvaluationRetriever(
  mode: "local-semantic" | "neural-semantic" | "neural-hybrid",
): SemanticPerspectiveRetriever | HybridPerspectiveRetriever {
  if (mode === "local-semantic") {
    return new SemanticPerspectiveRetriever({
      providerKind: "local-bridge",
      requireNeural: false,
      allowDeterministicFallback: false,
    });
  }
  if (mode === "neural-semantic") {
    return new SemanticPerspectiveRetriever({
      providerKind: "openai",
      requireNeural: true,
      allowDeterministicFallback: false,
    });
  }
  return new HybridPerspectiveRetriever({
    providerKind: "openai",
    requireNeural: true,
    allowDeterministicFallback: false,
  });
}

export function passageStillExists(passageId: string): boolean {
  return Boolean(getPassageById(passageId));
}

export { emptyBreakdown, combineScores, hybridWeights };
