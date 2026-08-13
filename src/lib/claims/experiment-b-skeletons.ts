/**
 * Curator / freeze-script only. Do not import from public /observe.
 */
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { generateClaimsForQuestion } from "@/lib/claims";
import { buildStagingPerspectiveSkeleton } from "@/lib/claims/approved";
import { listProposedClaims } from "@/lib/claims/llm/store";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";

export async function buildExperimentBSkeletons(
  question: string,
): Promise<EvidenceBoundedPerspectiveSkeleton[]> {
  const fixtureId =
    FIXTURE_QUESTIONS.find((f) => f.question === question)?.id ?? "adhoc";
  return Promise.all(
    people.map(async (person) => {
      const result = await generateClaimsForQuestion({
        question,
        personId: person.id,
        fixtureId: fixtureId === "adhoc" ? undefined : fixtureId,
        retrievalMode: "deterministic",
      });
      const llm = listProposedClaims(
        fixtureId === "adhoc"
          ? { personId: person.id, experimentId: "B" }
          : {
              fixtureId,
              personId: person.id,
              experimentId: "B",
              retrievalMode: "deterministic",
            },
      ).map((item) => item.claim);

      return buildStagingPerspectiveSkeleton({
        personId: person.id,
        question,
        deterministicClaims: result.claims,
        llmClaims: llm,
      });
    }),
  );
}
