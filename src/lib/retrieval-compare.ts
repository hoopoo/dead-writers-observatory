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
  HybridPerspectiveRetriever,
  SemanticPerspectiveRetriever,
} from "@/lib/semantic-retrieval";
import type { RetrievalMode } from "@/types/embedding";
import type {
  EvidenceTrace,
  RetrievalFunnel,
  RetrievalQuality,
  RetrievalWarning,
} from "@/types/retrieval-quality";
import type { ThoughtFragment } from "@/types/thought-fragment";

export interface ModeComparisonResult {
  mode: RetrievalMode;
  selected: ThoughtFragment[];
  traces: EvidenceTrace[];
  quality: RetrievalQuality;
  funnel?: RetrievalFunnel;
  warnings: RetrievalWarning[];
  fallback?: string;
  singleSourceDominance: boolean;
  sourceDiversity: number;
  distanceDiversity: number;
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
      const diversity = computePerspectiveDiversity(args.personId, selected);
      const integrity = integrityCounts(selected);
      const avgRel =
        selected.reduce(
          (sum, fragment) =>
            sum + scoreFragmentBreakdown(fragment, analysis, args.personId).total,
          0,
        ) / Math.max(1, selected.length);
      const quality = computeRetrievalQuality({
        relevance: avgRel,
        selected,
        ...integrity,
      });
      results.push({
        mode,
        selected,
        traces: selected.map((fragment) => {
          const breakdown = scoreFragmentBreakdown(
            fragment,
            analysis,
            args.personId,
          );
          return {
            fragmentId: fragment.id,
            passageId: fragment.passageId,
            sourceTitle: getSourceById(fragment.sourceId)?.title ?? fragment.sourceId,
            deterministicRelevance: breakdown.total,
            trustStatus:
              getActivePassageReview(fragment.passageId)?.reviewStatus ??
              "unknown",
            authorialDistance: fragment.authorialDistance,
            themeOverlap: fragment.themes.filter((t) =>
              analysis.relevantThemes.includes(t),
            ),
            finalRerankScore: breakdown.total,
            matchedBy: "deterministic",
          };
        }),
        quality,
        warnings: warningsFor(selected, diversity),
        singleSourceDominance: diversity.singleSourceDominance,
        sourceDiversity: diversity.sourceDiversity,
        distanceDiversity: diversity.distanceDiversity,
      });
      continue;
    }

    const retriever =
      mode === "semantic"
        ? new SemanticPerspectiveRetriever()
        : new HybridPerspectiveRetriever();
    const selected = await retriever.retrieve(args.personId, analysis);
    const trace = retriever.lastTrace;
    const diversity = computePerspectiveDiversity(args.personId, selected);
    const integrity = integrityCounts(selected);
    const avgRel =
      selected.reduce(
        (sum, fragment) =>
          sum + scoreFragmentBreakdown(fragment, analysis, args.personId).total,
        0,
      ) / Math.max(1, selected.length);
    const quality = computeRetrievalQuality({
      relevance: avgRel,
      selected,
      ...integrity,
    });

    const warnings = warningsFor(selected, diversity);
    if (trace?.trustRejected.some((r) => r.reasons.includes("HIGH OVERCLAIM RISK"))) {
      warnings.push("SEMANTIC HIGH / OVERCLAIM RISK");
    }
    if (
      trace?.trustRejected.some((r) =>
        r.reasons.some((reason) => reason.includes("REVIEW STATUS")),
      )
    ) {
      warnings.push("SEMANTIC HIGH / TRUST LOW");
    }

    results.push({
      mode,
      selected,
      traces: selected.map((fragment) => {
        const breakdown = scoreFragmentBreakdown(
          fragment,
          analysis,
          args.personId,
        );
        const semantic = trace?.semanticCandidates.find(
          (c) => c.passageId === fragment.passageId,
        );
        return {
          fragmentId: fragment.id,
          passageId: fragment.passageId,
          sourceTitle: getSourceById(fragment.sourceId)?.title ?? fragment.sourceId,
          semanticSimilarity: semantic?.similarity,
          deterministicRelevance: breakdown.total,
          trustStatus:
            getActivePassageReview(fragment.passageId)?.reviewStatus ?? "unknown",
          authorialDistance: fragment.authorialDistance,
          themeOverlap: fragment.themes.filter((t) =>
            analysis.relevantThemes.includes(t),
          ),
          finalRerankScore: breakdown.total,
          matchedBy: mode === "hybrid" ? "hybrid" : "semantic",
        };
      }),
      quality,
      funnel: trace?.funnel,
      warnings: Array.from(new Set(warnings)),
      fallback: trace?.fallback,
      singleSourceDominance: diversity.singleSourceDominance,
      sourceDiversity: diversity.sourceDiversity,
      distanceDiversity: diversity.distanceDiversity,
    });
  }

  return results;
}
