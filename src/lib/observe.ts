import { people } from "@/data/people";
import { analyzeQuestion } from "@/lib/question-analysis";
import { type PerspectiveRetriever } from "@/lib/retrieval";
import { createRetriever } from "@/lib/retrieval-mode";
import { generatePerspective } from "@/lib/perspective-generator";
import { comparePerspectives } from "@/lib/comparison";
import { generateClaimsForQuestion } from "@/lib/claims";
import {
  buildPerspectiveSkeleton,
  buildStagingPerspectiveSkeleton,
} from "@/lib/claims/approved";
import { listProposedClaims } from "@/lib/claims/llm/store";
import { buildExperimentClaimPool } from "@/lib/claims/experiment-c/build";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { generateProse, isStagingProseEnabled } from "@/lib/prose";
import type { ObservationResult } from "@/types/observation";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type {
  EvidenceBoundedProseInput,
  EvidenceBoundedProseOutput,
  ProseGenerationRecord,
} from "@/types/prose";

export { isStagingProseEnabled };

const SAFETY_NOTICE =
  "この観測は文学資料に基づく視点の再接続であり、医療・法律・投資・危機介入の助言ではありません。死や自傷に関する苦痛が強い場合は、専門の相談窓口や周囲の信頼できる人につながってください。死者は答えません。言葉が残っているだけです。";

export function isEvidenceBoundedSkeletonEnabled(): boolean {
  return (
    (process.env.EVIDENCE_BOUNDED_SKELETON ?? "false").toLowerCase() === "true"
  );
}

export function isStagingClaimsEnabled(searchFlag?: string): boolean {
  if (searchFlag === "1" || searchFlag === "true") return true;
  return (process.env.STAGING_CLAIMS ?? "false").toLowerCase() === "true";
}

export function isExperimentCEnabled(args?: {
  experiment?: string;
  retrieval?: string;
}): boolean {
  if (args?.experiment === "C") return true;
  if (args?.retrieval === "neural-hybrid") return true;
  return (process.env.EXPERIMENT_C ?? "false").toLowerCase() === "true";
}

function fixtureIdForQuestion(question: string): string | undefined {
  return FIXTURE_QUESTIONS.find((f) => f.question === question)?.id;
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

/** Experiment B: deterministic retrieval + det claims + human-approved LLM claims. */
export async function observeQuestionWithStagingClaims(
  rawQuestion: string,
): Promise<{
  observation: ObservationResult;
  skeletons: EvidenceBoundedPerspectiveSkeleton[];
}> {
  const observation = await observeQuestion(rawQuestion);
  const fixtureId = fixtureIdForQuestion(rawQuestion);
  const skeletons = await Promise.all(
    people.map(async (person) => {
      const result = await generateClaimsForQuestion({
        question: rawQuestion,
        personId: person.id,
        fixtureId,
        retrievalMode: "deterministic",
      });
      const llm = listProposedClaims(
        fixtureId
          ? {
              fixtureId,
              personId: person.id,
              experimentId: "B",
              retrievalMode: "deterministic",
            }
          : { personId: person.id, experimentId: "B" },
      ).map((item) => item.claim);

      return buildStagingPerspectiveSkeleton({
        personId: person.id,
        question: rawQuestion,
        deterministicClaims: result.claims,
        llmClaims: llm,
      });
    }),
  );
  return { observation, skeletons };
}

/** Experiment C: neural-hybrid retrieval + det + human-approved LLM claims. */
export async function observeQuestionWithExperimentC(
  rawQuestion: string,
): Promise<{
  observation: ObservationResult;
  skeletons: EvidenceBoundedPerspectiveSkeleton[];
}> {
  const observation = await observeQuestion(rawQuestion);
  const fixtureId = fixtureIdForQuestion(rawQuestion) ?? "adhoc";
  const skeletons = await Promise.all(
    people.map(async (person) => {
      const built = await buildExperimentClaimPool({
        experimentId: "C",
        question: rawQuestion,
        personId: person.id,
        fixtureId,
      });
      return built.skeleton;
    }),
  );
  return { observation, skeletons };
}

/**
 * Staging prose: Experiment B skeleton → meaning-preserving editor.
 * Production default remains false (`?prose=1` or STAGING_PROSE / PUBLIC_BETA_PROSE).
 */
export async function observeQuestionWithProse(rawQuestion: string): Promise<{
  observation: ObservationResult;
  cases: Array<{
    skeleton: EvidenceBoundedPerspectiveSkeleton;
    input: EvidenceBoundedProseInput;
    record: ProseGenerationRecord;
    userFacing: EvidenceBoundedProseOutput;
  }>;
}> {
  const observation = await observeQuestion(rawQuestion);
  const fixtureId = fixtureIdForQuestion(rawQuestion) ?? "adhoc";
  const cases = await Promise.all(
    people.map(async (person) => {
      const result = await generateProse({
        question: rawQuestion,
        personId: person.id,
        fixtureId,
        allowRepair: true,
      });
      return {
        skeleton: result.input.skeleton,
        input: result.input,
        record: result.record,
        userFacing: result.userFacing,
      };
    }),
  );
  return { observation, cases };
}
