import { analyzeCrossWriterDistinctiveness } from "@/lib/claims/distinctiveness";
import { textSimilarity } from "@/lib/claims/llm/novelty";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type {
  CrossWriterProseDistinctiveness,
  EvidenceBoundedProseOutput,
} from "@/types/prose";

function proseTexts(output: EvidenceBoundedProseOutput): string[] {
  return output.sections.flatMap((s) => s.sentences.map((x) => x.text));
}

function returnedQuestions(output: EvidenceBoundedProseOutput): string[] {
  return output.sections
    .filter((s) => s.type === "returned-question")
    .flatMap((s) => s.sentences.map((x) => x.text));
}

function avgCrossSimilarity(byPerson: Record<string, string[]>): number {
  const writers = Object.keys(byPerson);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < writers.length; i += 1) {
    for (let j = i + 1; j < writers.length; j += 1) {
      for (const a of byPerson[writers[i]]) {
        for (const b of byPerson[writers[j]]) {
          sum += textSimilarity(a, b);
          n += 1;
        }
      }
    }
  }
  return n === 0 ? 0 : sum / n;
}

function rqOverlap(byPerson: Record<string, string[]>): number {
  const writers = Object.keys(byPerson);
  if (writers.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < writers.length; i += 1) {
    for (let j = i + 1; j < writers.length; j += 1) {
      const a = byPerson[writers[i]][0] ?? "";
      const b = byPerson[writers[j]][0] ?? "";
      if (!a || !b) continue;
      sum += textSimilarity(a, b);
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

export function analyzeCrossWriterProseDistinctiveness(args: {
  fixtureId: string;
  skeletons: EvidenceBoundedPerspectiveSkeleton[];
  proseByPerson: Record<string, EvidenceBoundedProseOutput>;
}): CrossWriterProseDistinctiveness {
  const claimsByPerson: Record<string, typeof args.skeletons[0]["claims"]> = {};
  for (const sk of args.skeletons) {
    claimsByPerson[sk.personId] = sk.claims;
  }
  const skAnalysis = analyzeCrossWriterDistinctiveness({
    question: args.skeletons[0]?.question ?? "",
    claimsByPerson,
  });

  const skeletonDistinctiveness = Number(
    (1 - skAnalysis.perspectiveSemanticOverlap).toFixed(3),
  );

  const proseTextsByPerson: Record<string, string[]> = {};
  const rqByPerson: Record<string, string[]> = {};
  for (const [personId, output] of Object.entries(args.proseByPerson)) {
    proseTextsByPerson[personId] = proseTexts(output);
    rqByPerson[personId] = returnedQuestions(output);
  }

  const proseOverlap = avgCrossSimilarity(proseTextsByPerson);
  const proseDistinctiveness = Number((1 - proseOverlap).toFixed(3));
  const returnedQuestionOverlap = Number(rqOverlap(rqByPerson).toFixed(3));
  const delta = Number(
    (proseDistinctiveness - skeletonDistinctiveness).toFixed(3),
  );

  const issues: string[] = [];
  if (returnedQuestionOverlap >= 0.5) {
    issues.push("HIGH RETURNED-QUESTION CONVERGENCE");
  }
  if (proseOverlap >= 0.55) {
    issues.push("HIGH PROSE SEMANTIC CONVERGENCE");
  }
  if (delta <= -0.25) {
    issues.push("DISTINCTIVENESS REGRESSION VS SKELETON");
  }

  const convergenceRisk =
    returnedQuestionOverlap >= 0.5 || proseOverlap >= 0.55
      ? "high"
      : returnedQuestionOverlap >= 0.28 || proseOverlap >= 0.4
        ? "medium"
        : "low";

  return {
    fixtureId: args.fixtureId,
    skeletonDistinctiveness,
    proseDistinctiveness,
    delta,
    convergenceRisk,
    returnedQuestionOverlap,
    issues,
  };
}
