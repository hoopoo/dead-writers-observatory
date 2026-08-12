import { people } from "@/data/people";
import { analyzeQuestion } from "@/lib/question-analysis";
import {
  defaultRetriever,
  type PerspectiveRetriever,
} from "@/lib/retrieval";
import { generatePerspective } from "@/lib/perspective-generator";
import { comparePerspectives } from "@/lib/comparison";
import type { ObservationResult } from "@/types/observation";

const SAFETY_NOTICE =
  "この観測は文学資料に基づく視点の再接続であり、医療・法律・投資・危機介入の助言ではありません。死や自傷に関する苦痛が強い場合は、専門の相談窓口や周囲の信頼できる人につながってください。死者は答えません。言葉が残っているだけです。";

export async function observeQuestion(
  rawQuestion: string,
  retriever: PerspectiveRetriever = defaultRetriever,
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
