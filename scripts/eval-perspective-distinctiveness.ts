/**
 * Cross-writer distinctiveness + Experiment A vs B machine report.
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import {
  PRIORITY_CLAIM_FIXTURES,
  buildPerspectiveSkeleton,
  buildStagingPerspectiveSkeleton,
} from "../src/lib/claims/approved";
import { generateClaimsForQuestion } from "../src/lib/claims";
import { listProposedClaims } from "../src/lib/claims/llm/store";
import {
  analyzeCrossWriterDistinctiveness,
  analyzeWriterDiversity,
} from "../src/lib/claims/distinctiveness";
import { isTrueLlmAddedValue } from "../src/lib/claims/staging";
import { getClaimHumanEvaluation } from "../src/lib/claims/human-eval";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

async function buildClaims(fixtureId: string, experiment: "A" | "B") {
  const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
  const byPerson: Record<string, Awaited<ReturnType<typeof buildPerspectiveSkeleton>>> =
    {};
  for (const person of people) {
    const det = await generateClaimsForQuestion({
      question: fixture.question,
      personId: person.id,
      fixtureId,
      retrievalMode: "deterministic",
    });
    if (experiment === "A") {
      byPerson[person.id] = buildPerspectiveSkeleton({
        personId: person.id,
        question: fixture.question,
        claims: det.claims,
      });
    } else {
      const llm = listProposedClaims({
        fixtureId,
        personId: person.id,
      }).map((i) => i.claim);
      byPerson[person.id] = buildStagingPerspectiveSkeleton({
        personId: person.id,
        question: fixture.question,
        deterministicClaims: det.claims,
        llmClaims: llm,
      });
    }
  }
  return { fixture, byPerson };
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — perspective distinctiveness\n");

  let trueValue = 0;
  for (const item of listProposedClaims()) {
    const evaluation = getClaimHumanEvaluation({ claimId: item.claim.id });
    if (isTrueLlmAddedValue(item.claim, evaluation)) trueValue += 1;
  }
  console.log(`True LLM Added Value:\n${trueValue}\n`);

  let highConvergenceB = 0;

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const a = await buildClaims(fixtureId, "A");
    const b = await buildClaims(fixtureId, "B");

    console.log(`\nFixture: ${a.fixture.label}`);
    for (const person of people) {
      const divA = analyzeWriterDiversity(
        person.id,
        a.byPerson[person.id].claims,
      );
      const divB = analyzeWriterDiversity(
        person.id,
        b.byPerson[person.id].claims,
      );
      console.log(
        `${person.name} internal diversity: A=${divA.score} B=${divB.score} redundancy A=${divA.redundancyCount} B=${divB.redundancyCount} dominant B=${divB.dominantTheme ?? "—"} ${Math.round(divB.dominantThemeRatio * 100)}%`,
      );
    }

    const crossA = analyzeCrossWriterDistinctiveness({
      question: a.fixture.question,
      claimsByPerson: Object.fromEntries(
        people.map((p) => [p.id, a.byPerson[p.id].claims]),
      ),
    });
    const crossB = analyzeCrossWriterDistinctiveness({
      question: b.fixture.question,
      claimsByPerson: Object.fromEntries(
        people.map((p) => [p.id, b.byPerson[p.id].claims]),
      ),
    });
    if (crossB.convergenceRisk === "high") highConvergenceB += 1;

    console.log(
      `Cross-writer distinctiveness: A=${crossA.distinctivenessScore} B=${crossB.distinctivenessScore}`,
    );
    console.log(
      `Returned question overlap: A=${crossA.returnedQuestionOverlap} B=${crossB.returnedQuestionOverlap}`,
    );
    console.log(`Convergence A=${crossA.convergenceRisk} B=${crossB.convergenceRisk}`);
    if (crossB.warnings.length) {
      console.log(`Warnings B: ${crossB.warnings.join(" | ")}`);
    }
  }

  console.log(`\n=== A vs B summary ===`);
  console.log(`High convergence (B): ${highConvergenceB}`);
  console.log(
    highConvergenceB === 0
      ? "Experiment B distinctiveness gate: PASS (no high convergence)"
      : "Experiment B distinctiveness gate: FAIL (high convergence present)",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
