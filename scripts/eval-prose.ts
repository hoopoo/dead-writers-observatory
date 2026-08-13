/**
 * Generate + evaluate Experiment B meaning-preserving prose for priority 18 cases.
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { generateProse } from "../src/lib/prose/generate";
import { DeterministicProseEditor } from "../src/lib/prose/provider";
import { analyzeCrossWriterProseDistinctiveness } from "../src/lib/prose/distinctiveness";
import { assertProseInputApprovedOnly } from "../src/lib/prose/validator";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const forceDet = process.argv.includes("--deterministic");
  const provider = forceDet ? new DeterministicProseEditor() : undefined;

  console.log("Dead Writers Observatory — prose eval (Experiment B)\n");

  let totalSentences = 0;
  let supported = 0;
  let unsupported = 0;
  let newMeaning = 0;
  let attribution = 0;
  let workVoice = 0;
  let modern = 0;
  let coverageSum = 0;
  let preservationSum = 0;
  let repairCount = 0;
  let cases = 0;
  const highConvergence: string[] = [];
  const byFixture: Record<string, string> = {};

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    const peer = [];
    for (const person of people) {
      const result = await generateProse({
        question: fixture.question,
        personId: person.id,
        fixtureId,
        provider,
        allowRepair: true,
        useCache: false,
      });
      assertProseInputApprovedOnly(result.input);
      if (result.input.experimentId !== "B") {
        throw new Error("Experiment C must not be used for prose");
      }
      cases += 1;
      if (result.repaired) repairCount += 1;
      const v = result.record.validation;
      totalSentences += v.totalSentences;
      supported += v.supportedSentences;
      unsupported += v.unsupportedSentences;
      newMeaning += v.newMeaningViolations;
      attribution += v.attributionViolations;
      workVoice += v.workVoiceViolations;
      modern += v.historicalTransferViolations;
      coverageSum += v.claimCoverageRate;
      preservationSum += v.semanticPreservationRate;
      peer.push(result);
      console.log(
        `${fixtureId} ${person.id}: sentences=${v.totalSentences} coverage=${v.claimCoverageRate} allowed=${v.allowed} provider=${result.record.provider}`,
      );
    }
    const cross = analyzeCrossWriterProseDistinctiveness({
      fixtureId,
      skeletons: peer.map((r) => r.input.skeleton),
      proseByPerson: Object.fromEntries(
        peer.map((r) => [r.input.personId, r.record.output]),
      ),
    });
    byFixture[fixtureId] = cross.convergenceRisk;
    if (cross.convergenceRisk === "high") highConvergence.push(fixtureId);
    console.log(
      `  cross: sk=${cross.skeletonDistinctiveness} prose=${cross.proseDistinctiveness} delta=${cross.delta} rq=${cross.returnedQuestionOverlap} risk=${cross.convergenceRisk}`,
    );
  }

  console.log("\n--- summary ---");
  console.log(`cases: ${cases}`);
  console.log(`sentences: ${totalSentences}`);
  console.log(
    `sentence support rate: ${
      totalSentences === 0 ? 1 : (supported / totalSentences).toFixed(3)
    }`,
  );
  console.log(`unsupported: ${unsupported}`);
  console.log(`new meaning: ${newMeaning}`);
  console.log(`attribution: ${attribution}`);
  console.log(`work voice: ${workVoice}`);
  console.log(`modern/historical: ${modern}`);
  console.log(`avg coverage: ${(coverageSum / cases).toFixed(3)}`);
  console.log(`avg preservation: ${(preservationSum / cases).toFixed(3)}`);
  console.log(`repair attempts (cases): ${repairCount}`);
  console.log(`high convergence fixtures: ${highConvergence.join(", ") || "0"}`);
  console.log(`convergence by fixture: ${JSON.stringify(byFixture)}`);

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
