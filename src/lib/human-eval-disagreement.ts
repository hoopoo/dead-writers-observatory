import { compareRetrievalEvaluationModes } from "@/lib/retrieval-compare";
import type {
  CandidateEvaluationMode,
  RetrievalHumanEvaluation,
} from "@/types/embedding";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";

export interface MachineHumanDisagreement {
  evaluation: RetrievalHumanEvaluation;
  machineQuality: number;
  reasonTags: string[];
}

/** High machine quality + human WORSE — keep metrics separate; surface for learning. */
export async function findMachineHumanDisagreements(
  evaluations: RetrievalHumanEvaluation[],
  qualityThreshold = 90,
): Promise<MachineHumanDisagreement[]> {
  const worse = evaluations.filter((e) => e.verdict === "worse");
  const out: MachineHumanDisagreement[] = [];

  for (const evaluation of worse) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === evaluation.fixtureId);
    if (!fixture) continue;
    const comparisons = await compareRetrievalEvaluationModes({
      question: fixture.question,
      personId: evaluation.personId,
      modes: [
        "deterministic",
        evaluation.candidateMode as CandidateEvaluationMode,
      ],
    });
    const candidate = comparisons.find(
      (c) => c.mode === evaluation.candidateMode,
    );
    if (!candidate || candidate.error) continue;
    if (candidate.quality.total >= qualityThreshold) {
      out.push({
        evaluation,
        machineQuality: candidate.quality.total,
        reasonTags: evaluation.reasonTags ?? [],
      });
    }
  }
  return out;
}
