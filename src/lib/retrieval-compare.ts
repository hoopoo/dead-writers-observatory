import { getSourceById } from "@/data/sources";
import { getPassageById } from "@/data/passages";
import { analyzeQuestion } from "@/lib/question-analysis";
import {
  computePerspectiveDiversity,
  computeRetrievalQuality,
} from "@/lib/perspective-diversity";
import {
  getActiveFragmentReview,
  getActivePassageReview,
} from "@/lib/review/active";
import { detectOverclaimRisk } from "@/lib/overclaim";
import { MockPerspectiveRetriever, scoreFragmentBreakdown } from "@/lib/retrieval";
import {
  createEvaluationRetriever,
  HybridPerspectiveRetriever,
  SemanticPerspectiveRetriever,
} from "@/lib/semantic-retrieval";
import type {
  RetrievalEvaluationMode,
  RetrievalMode,
} from "@/types/embedding";
import type {
  EvidenceTrace,
  RetrievalFunnel,
  RetrievalQuality,
  RetrievalWarning,
} from "@/types/retrieval-quality";
import type { ThoughtFragment } from "@/types/thought-fragment";

export interface ModeComparisonResult {
  mode: RetrievalMode | RetrievalEvaluationMode;
  selected: ThoughtFragment[];
  traces: EvidenceTrace[];
  quality: RetrievalQuality;
  funnel?: RetrievalFunnel;
  warnings: RetrievalWarning[];
  fallback?: string;
  error?: string;
  singleSourceDominance: boolean;
  sourceDiversity: number;
  distanceDiversity: number;
  themeDiversity: number;
  provider?: string;
  model?: string;
}

function integrityCounts(selected: ThoughtFragment[]) {
  let approvedCount = 0;
  let rejectedLeak = 0;
  let needsReviewLeak = 0;
  let highOverclaimLeak = 0;
  for (const fragment of selected) {
    const review = getActivePassageReview(fragment.passageId);
    const fragReview = getActiveFragmentReview(fragment.id);
    const passage = getPassageById(fragment.passageId);
    const auto = detectOverclaimRisk(fragment, passage);
    const risk = fragReview?.overclaimRisk ?? auto.risk;
    if (review?.reviewStatus === "approved") approvedCount += 1;
    if (review?.reviewStatus === "rejected") rejectedLeak += 1;
    if (review?.reviewStatus === "needs-review") needsReviewLeak += 1;
    if (risk === "high") highOverclaimLeak += 1;
  }
  return { approvedCount, rejectedLeak, needsReviewLeak, highOverclaimLeak };
}

function themeDiversityOf(selected: ThoughtFragment[]): number {
  return new Set(selected.flatMap((f) => f.themes)).size;
}

function warningsFor(
  selected: ThoughtFragment[],
  diversity: ReturnType<typeof computePerspectiveDiversity>,
): RetrievalWarning[] {
  const warnings: RetrievalWarning[] = [];
  if (diversity.singleSourceDominance) warnings.push("SINGLE SOURCE DOMINANCE");
  if (diversity.sourceDiversity < 2 && selected.length >= 3) {
    warnings.push("LOW SOURCE DIVERSITY");
  }
  if (diversity.distanceDiversity <= 1 && selected.length >= 3) {
    warnings.push("AUTHORIAL DISTANCE COLLAPSE");
  }
  return warnings;
}

function buildTraces(
  selected: ThoughtFragment[],
  analysis: ReturnType<typeof analyzeQuestion>,
  personId: string,
  matchedBy: EvidenceTrace["matchedBy"],
  semanticByPassage?: Map<string, number>,
): EvidenceTrace[] {
  return selected.map((fragment) => {
    const breakdown = scoreFragmentBreakdown(fragment, analysis, personId);
    const passage = getPassageById(fragment.passageId);
    return {
      fragmentId: fragment.id,
      passageId: fragment.passageId,
      sourceTitle: getSourceById(fragment.sourceId)?.title ?? fragment.sourceId,
      semanticSimilarity: semanticByPassage?.get(fragment.passageId),
      deterministicRelevance: breakdown.total,
      trustStatus:
        getActivePassageReview(fragment.passageId)?.reviewStatus ?? "unknown",
      authorialDistance: fragment.authorialDistance,
      themeOverlap: fragment.themes.filter((t) =>
        analysis.relevantThemes.includes(t),
      ),
      finalRerankScore: breakdown.total,
      matchedBy,
      passagePreview: passage?.text?.trim().slice(0, 180),
      normalizedMeaning: fragment.normalizedMeaning,
      voiceType: passage?.voiceType,
      themes: fragment.themes,
    };
  });
}

async function evaluateSelected(args: {
  mode: RetrievalMode | RetrievalEvaluationMode;
  personId: string;
  analysis: ReturnType<typeof analyzeQuestion>;
  selected: ThoughtFragment[];
  matchedBy: EvidenceTrace["matchedBy"];
  funnel?: RetrievalFunnel;
  fallback?: string;
  error?: string;
  provider?: string;
  model?: string;
  semanticByPassage?: Map<string, number>;
  extraWarnings?: RetrievalWarning[];
}): Promise<ModeComparisonResult> {
  const diversity = computePerspectiveDiversity(args.personId, args.selected);
  const integrity = integrityCounts(args.selected);
  const avgRel =
    args.selected.reduce(
      (sum, fragment) =>
        sum +
        scoreFragmentBreakdown(fragment, args.analysis, args.personId).total,
      0,
    ) / Math.max(1, args.selected.length);
  const quality = computeRetrievalQuality({
    relevance: avgRel,
    selected: args.selected,
    ...integrity,
  });
  const warnings = [
    ...warningsFor(args.selected, diversity),
    ...(args.extraWarnings ?? []),
  ];
  return {
    mode: args.mode,
    selected: args.selected,
    traces: buildTraces(
      args.selected,
      args.analysis,
      args.personId,
      args.matchedBy,
      args.semanticByPassage,
    ),
    quality,
    funnel: args.funnel,
    warnings: Array.from(new Set(warnings)),
    fallback: args.fallback,
    error: args.error,
    singleSourceDominance: diversity.singleSourceDominance,
    sourceDiversity: diversity.sourceDiversity,
    distanceDiversity: diversity.distanceDiversity,
    themeDiversity: themeDiversityOf(args.selected),
    provider: args.provider,
    model: args.model,
  };
}

/** Public production modes (deterministic / semantic / hybrid via env provider). */
export async function compareRetrievalModes(args: {
  question: string;
  personId: string;
  modes?: RetrievalMode[];
}): Promise<ModeComparisonResult[]> {
  const modes = args.modes ?? ["deterministic", "semantic", "hybrid"];
  const analysis = analyzeQuestion(args.question);
  const results: ModeComparisonResult[] = [];

  for (const mode of modes) {
    if (mode === "deterministic") {
      const retriever = new MockPerspectiveRetriever();
      const selected = await retriever.retrieve(args.personId, analysis);
      results.push(
        await evaluateSelected({
          mode,
          personId: args.personId,
          analysis,
          selected,
          matchedBy: "deterministic",
        }),
      );
      continue;
    }

    const retriever =
      mode === "semantic"
        ? new SemanticPerspectiveRetriever()
        : new HybridPerspectiveRetriever();
    const selected = await retriever.retrieve(args.personId, analysis);
    const trace = retriever.lastTrace;
    const extra: RetrievalWarning[] = [];
    if (trace?.trustRejected.some((r) => r.reasons.includes("HIGH OVERCLAIM RISK"))) {
      extra.push("SEMANTIC HIGH / OVERCLAIM RISK");
    }
    if (
      trace?.trustRejected.some((r) =>
        r.reasons.some((reason) => reason.includes("REVIEW STATUS")),
      )
    ) {
      extra.push("SEMANTIC HIGH / TRUST LOW");
    }
    results.push(
      await evaluateSelected({
        mode,
        personId: args.personId,
        analysis,
        selected,
        matchedBy: mode === "hybrid" ? "hybrid" : "semantic",
        funnel: trace?.funnel,
        fallback: trace?.fallback,
        provider: trace?.provider,
        model: trace?.model,
        semanticByPassage: new Map(
          (trace?.semanticCandidates ?? []).map((c) => [
            c.passageId,
            c.similarity,
          ]),
        ),
        extraWarnings: extra,
      }),
    );
  }

  return results;
}

/**
 * Curator / machine-eval modes.
 * Neural modes never silently remap to local-bridge.
 */
export async function compareRetrievalEvaluationModes(args: {
  question: string;
  personId: string;
  modes?: RetrievalEvaluationMode[];
}): Promise<ModeComparisonResult[]> {
  const modes: RetrievalEvaluationMode[] = args.modes ?? [
    "deterministic",
    "local-semantic",
    "neural-semantic",
    "neural-hybrid",
  ];
  const analysis = analyzeQuestion(args.question);
  const results: ModeComparisonResult[] = [];

  for (const mode of modes) {
    if (mode === "deterministic") {
      const selected = await new MockPerspectiveRetriever().retrieve(
        args.personId,
        analysis,
      );
      results.push(
        await evaluateSelected({
          mode,
          personId: args.personId,
          analysis,
          selected,
          matchedBy: "deterministic",
        }),
      );
      continue;
    }

    try {
      const retriever = createEvaluationRetriever(mode);
      const selected = await retriever.retrieve(args.personId, analysis);
      const trace = retriever.lastTrace;
      results.push(
        await evaluateSelected({
          mode,
          personId: args.personId,
          analysis,
          selected,
          matchedBy: mode.includes("hybrid") ? "hybrid" : "semantic",
          funnel: trace?.funnel,
          fallback: trace?.fallback,
          provider: trace?.provider,
          model: trace?.model,
          semanticByPassage: new Map(
            (trace?.semanticCandidates ?? []).map((c) => [
              c.passageId,
              c.similarity,
            ]),
          ),
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "NEURAL PROVIDER UNAVAILABLE";
      results.push({
        mode,
        selected: [],
        traces: [],
        quality: {
          total: 0,
          relevance: 0,
          provenance: 0,
          reviewIntegrity: 0,
          sourceDiversity: 0,
          themeDiversity: 0,
          authorialBalance: 0,
        },
        warnings: [],
        error: message.includes("NEURAL PROVIDER UNAVAILABLE")
          ? "NEURAL PROVIDER UNAVAILABLE"
          : message,
        singleSourceDominance: false,
        sourceDiversity: 0,
        distanceDiversity: 0,
        themeDiversity: 0,
      });
    }
  }

  return results;
}
