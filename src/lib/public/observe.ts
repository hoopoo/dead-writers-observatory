import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { generateClaimsForQuestion } from "@/lib/claims";
import {
  buildStagingPerspectiveSkeleton,
  buildValidatorBoundedSkeleton,
} from "@/lib/claims/approved";
import { listProposedClaims } from "@/lib/claims/llm/store";
import { analyzeQuestion } from "@/lib/question-analysis";
import { PUBLIC_LENS_JA } from "@/lib/public/labels";
import {
  buildPublicProvenance,
  skeletonHasModernTransfer,
} from "@/lib/public/provenance";
import { buildPublicThreeWriterSummary } from "@/lib/public/summary";
import {
  lookupFrozenProse,
  lookupFrozenSkeletons,
} from "@/lib/release/freeze";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { EvidenceBoundedProseOutput } from "@/types/prose";
import type { ObservationResult } from "@/types/observation";
import type {
  PublicObservation,
  PublicPerspectiveMode,
  PublicWriterView,
} from "@/types/public";

const SAFETY_NOTICE =
  "この観測は文学資料に基づく視点の再接続であり、医療・法律・投資・危機介入の助言ではありません。死や自傷に関する苦痛が強い場合は、専門の相談窓口や周囲の信頼できる人につながってください。死者は答えません。言葉が残っているだけです。";

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

function publicObservationShell(question: string): ObservationResult {
  const analysis = analyzeQuestion(question);
  const needsSafety =
    analysis.safetyFlags.includes("death_theme") ||
    analysis.safetyFlags.includes("self_harm_adjacent");
  return {
    analysis,
    perspectives: [],
    comparison: {
      sharedConcerns: [],
      differentFocuses: [],
      tensionsBetweenVoices: [],
      blindSpots: [],
      historicalDistance: {
        timelessHumanThemes: [],
        historicallySpecificUnknowns: [],
        transferRisks: [],
        presentDayFactsRequired: [],
        interpretationBeginsNote: "",
        provenanceMap: {
          timelessHumanThemes: "AI INFERENCE",
          historicallySpecificUnknowns: "AI INFERENCE",
          transferRisks: "AI INFERENCE",
          presentDayFactsRequired: "AI INFERENCE",
          interpretationBeginsNote: "AI INFERENCE",
        },
      },
      returnedQuestion: "",
      provenanceMap: {
        sharedConcerns: "AI INFERENCE",
        differentFocuses: "AI INFERENCE",
        tensionsBetweenVoices: "AI INFERENCE",
        blindSpots: "AI INFERENCE",
        returnedQuestion: "AI INFERENCE",
      },
    },
    safetyNotice: needsSafety ? SAFETY_NOTICE : undefined,
  };
}

async function buildAdhocPublicSkeletons(
  question: string,
): Promise<EvidenceBoundedPerspectiveSkeleton[]> {
  return Promise.all(
    people.map(async (person) => {
      const result = await generateClaimsForQuestion({
        question,
        personId: person.id,
        retrievalMode: "deterministic",
      });
      return buildValidatorBoundedSkeleton({
        personId: person.id,
        question,
        claims: result.claims,
      });
    }),
  );
}

export async function observePublicBeta(
  question: string,
  mode: PublicPerspectiveMode,
): Promise<PublicObservation> {
  const observation = publicObservationShell(question);
  const frozen = lookupFrozenSkeletons(question);
  const skeletons = frozen ?? (await buildAdhocPublicSkeletons(question));
  const proseByPerson: Record<string, EvidenceBoundedProseOutput | undefined> =
    {};
  let proseErrorFallback = false;
  const fallbackByPerson = new Set<string>();

  if (mode === "prose") {
    for (const person of people) {
      const frozenProse = lookupFrozenProse(question, person.id);
      if (frozenProse) {
        proseByPerson[person.id] = frozenProse;
        continue;
      }
      fallbackByPerson.add(person.id);
      proseErrorFallback = true;
    }
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
