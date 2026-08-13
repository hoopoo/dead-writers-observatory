import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { generateClaimsForQuestion } from "@/lib/claims";
import { buildStagingPerspectiveSkeleton } from "@/lib/claims/approved";
import { listProposedClaims } from "@/lib/claims/llm/store";
import { observeQuestion } from "@/lib/observe";
import { generateProse } from "@/lib/prose/generate";
import { PUBLIC_LENS_JA } from "@/lib/public/labels";
import {
  buildPublicProvenance,
  skeletonHasModernTransfer,
} from "@/lib/public/provenance";
import { buildPublicThreeWriterSummary } from "@/lib/public/summary";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { EvidenceBoundedProseOutput } from "@/types/prose";
import type {
  PublicObservation,
  PublicPerspectiveMode,
  PublicWriterView,
} from "@/types/public";

export function choosePublicSurface(args: {
  proseAllowed: boolean;
  proseHasSentences: boolean;
}): "prose" | "skeleton" {
  if (args.proseAllowed && args.proseHasSentences) return "prose";
  return "skeleton";
}

export function fixtureIdForQuestion(question: string): string {
  return FIXTURE_QUESTIONS.find((f) => f.question === question)?.id ?? "adhoc";
}

export async function buildExperimentBSkeletons(
  question: string,
): Promise<EvidenceBoundedPerspectiveSkeleton[]> {
  const fixtureId = fixtureIdForQuestion(question);
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

function paragraphsFromProse(
  output: EvidenceBoundedProseOutput,
  types: Array<EvidenceBoundedProseOutput["sections"][number]["type"]>,
): string[] {
  return output.sections
    .filter((section) => types.includes(section.type))
    .flatMap((section) => section.sentences.map((s) => s.text.trim()))
    .filter(Boolean);
}

function writerViewFromSkeleton(
  skeleton: EvidenceBoundedPerspectiveSkeleton,
  prose?: EvidenceBoundedProseOutput,
  fallback = false,
): PublicWriterView {
  const usedProse = Boolean(prose && prose.sections.length > 0 && !fallback);
  const archiveParagraphs = usedProse
    ? paragraphsFromProse(prose!, ["archive", "across-sources"])
    : [
        ...skeleton.sections.archiveObservation,
        ...skeleton.sections.acrossSources,
      ];
  const connectionParagraphs = usedProse
    ? paragraphsFromProse(prose!, ["connection"])
    : skeleton.sections.connectionToQuestion;
  const returnedFromProse = usedProse
    ? paragraphsFromProse(prose!, ["returned-question"])[0]
    : undefined;
  const returnedQuestion =
    returnedFromProse ?? skeleton.sections.returnedQuestion[0];

  const provenance = buildPublicProvenance(skeleton);

  return {
    personId: skeleton.personId,
    personName: skeleton.personName,
    lensJa: PUBLIC_LENS_JA[skeleton.personId]?.short ?? "",
    availability: skeleton.availability,
    archiveParagraphs,
    connectionParagraphs,
    returnedQuestion,
    usedProse,
    proseFallback: fallback,
    provenance,
    hasModernTransfer: skeletonHasModernTransfer(skeleton),
    sourceCount: provenance.length,
  };
}

export async function observePublicBeta(
  question: string,
  mode: PublicPerspectiveMode,
): Promise<PublicObservation> {
  const observation = await observeQuestion(question);
  const skeletons = await buildExperimentBSkeletons(question);
  const fixtureId = fixtureIdForQuestion(question);
  const proseByPerson: Record<string, EvidenceBoundedProseOutput | undefined> =
    {};
  let proseErrorFallback = false;
  const fallbackByPerson = new Set<string>();

  if (mode === "prose") {
    await Promise.all(
      people.map(async (person) => {
        try {
          const result = await generateProse({
            question,
            personId: person.id,
            fixtureId,
            allowRepair: true,
          });
          const allowed =
            result.record.validation.allowed &&
            result.userFacing.sections.some((s) => s.sentences.length > 0);
          if (allowed) {
            proseByPerson[person.id] = result.userFacing;
          } else {
            fallbackByPerson.add(person.id);
            proseErrorFallback = true;
          }
        } catch {
          fallbackByPerson.add(person.id);
          proseErrorFallback = true;
        }
      }),
    );
  }

  const writers = skeletons.map((skeleton) =>
    writerViewFromSkeleton(
      skeleton,
      proseByPerson[skeleton.personId],
      fallbackByPerson.has(skeleton.personId),
    ),
  );

  return {
    question,
    mode,
    observation,
    writers,
    summary: buildPublicThreeWriterSummary(skeletons),
    proseErrorFallback,
    skeleton: skeletons,
    proseByPerson,
  };
}
