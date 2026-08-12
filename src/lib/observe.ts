import { people } from "@/data/people";
import { analyzeQuestion } from "@/lib/question-analysis";
import { type PerspectiveRetriever } from "@/lib/retrieval";
import { createRetriever } from "@/lib/retrieval-mode";
import { generatePerspective } from "@/lib/perspective-generator";
import { comparePerspectives } from "@/lib/comparison";
import { generateClaimsForQuestion } from "@/lib/claims";
import { buildPerspectiveSkeleton } from "@/lib/claims/approved";
import type { ObservationResult } from "@/types/observation";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";

const SAFETY_NOTICE =
  "この観測は文学資料に基づく視点の再接続であり、医療・法律・投資・危機介入の助言ではありません。死や自傷に関する苦痛が強い場合は、専門の相談窓口や周囲の信頼できる人につながってください。死者は答えません。言葉が残っているだけです。";

export function isEvidenceBoundedSkeletonEnabled(): boolean {
  return (
    (process.env.EVIDENCE_BOUNDED_SKELETON ?? "false").toLowerCase() === "true"
  );
}

export async function observeQuestion(
  rawQuestion: string,
  retriever: PerspectiveRetriever = createRetriever().retriever,
): Promise<ObservationResult> {
  const analysis = analyzeQuestion(rawQuestion);

  const perspectives = await Promise.all(
    people.map(async (person) => {
      const fragments = await retriever.retrieve(person.id, analysis);
      return generatePerspective(person.id, analysis, fragments);
    }),
  );

  const comparison = comparePerspectives(analysis, perspectives);

  const needsSafety =
    analysis.safetyFlags.includes("death_theme") ||
    analysis.safetyFlags.includes("self_harm_adjacent");

  return {
    analysis,
    perspectives,
    comparison,
    safetyNotice: needsSafety ? SAFETY_NOTICE : undefined,
  };
}

export async function observeQuestionWithSkeleton(
  rawQuestion: string,
): Promise<{
  observation: ObservationResult;
  skeletons: EvidenceBoundedPerspectiveSkeleton[];
}> {
  const observation = await observeQuestion(rawQuestion);
  const skeletons = await Promise.all(
    people.map(async (person) => {
      const result = await generateClaimsForQuestion({
        question: rawQuestion,
        personId: person.id,
        retrievalMode: "deterministic",
      });
      return buildPerspectiveSkeleton({
        personId: person.id,
        question: rawQuestion,
        claims: result.claims,
      });
    }),
  );
  return { observation, skeletons };
}
