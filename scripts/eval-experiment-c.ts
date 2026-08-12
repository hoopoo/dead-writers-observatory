/**
 * Experiment B vs C evaluation (neural-hybrid retrieval isolation).
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import {
  analyzeCrossWriterDistinctiveness,
  analyzeWriterDiversity,
} from "../src/lib/claims/distinctiveness";
import {
  buildExperimentClaimPool,
  comparePerspectiveExperiments,
  countCOnlyTrueAddedValue,
  deathEvidenceSaturation,
} from "../src/lib/claims/experiment-c/build";
import {
  listBcThreeWriterComparisons,
  listBcWriterComparisons,
  upsertBcThreeWriterComparison,
  upsertBcWriterComparison,
} from "../src/lib/claims/experiment-c/compare-store";
import { DISTINCTIVENESS_REGRESSION_DELTA } from "../src/lib/claims/experiment-c/types";
import { listProposedClaims } from "../src/lib/claims/llm/store";
import { OpenAIClaimLLMProvider } from "../src/lib/claims/llm/provider";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";
import { closeReviewDb } from "../src/lib/review/db";
import type { ExperimentComparisonHumanVerdict } from "../src/lib/claims/experiment-c/types";
import { loadLocalEnv } from "./load-env";

function judgeWriter(args: {
  comparison: ReturnType<typeof comparePerspectiveExperiments>;
  crossDelta: number;
  deathSat: boolean;
}): {
  verdict: ExperimentComparisonHumanVerdict;
  reasons: import("../src/lib/claims/experiment-c/types").ExperimentComparisonReason[];
  notes: string;
} {
  const { comparison } = args;
  const reasons: import("../src/lib/claims/experiment-c/types").ExperimentComparisonReason[] =
    [];

  if (args.deathSat) {
    return {
      verdict: "b-better",
      reasons: ["historical-overreach"],
      notes: "DEATH-EVIDENCE SATURATION in C",
    };
  }

  if (!comparison.retrievalEvidenceChanged) {
    return {
      verdict: "same",
      reasons: [],
      notes: "Evidence packet unchanged — Same is valid.",
    };
  }

  if (comparison.addedSources.length > 0) {
    reasons.push("better-evidence");
  }
  if (comparison.internalDiversityDelta > 0.05) {
    reasons.push("better-source-diversity");
  }
  if (comparison.internalDiversityDelta < -0.08) {
    reasons.push("theme-collapse");
  }
  if (args.crossDelta < -DISTINCTIVENESS_REGRESSION_DELTA) {
    reasons.push("distinctiveness-loss");
  }
  if (comparison.addedClaims.length > comparison.removedClaims.length) {
    reasons.push("more-surprising");
  }

  if (reasons.includes("distinctiveness-loss") || reasons.includes("theme-collapse")) {
    return {
      verdict: "b-better",
      reasons,
      notes: "C regresses distinctiveness/theme structure.",
    };
  }

  if (
    reasons.includes("better-evidence") ||
    reasons.includes("more-surprising") ||
    comparison.internalDiversityDelta > 0.05
  ) {
    return {
      verdict: "c-better",
      reasons,
      notes: "C improves evidence or diversity without distinctiveness loss.",
    };
  }

  return {
    verdict: "same",
    reasons,
    notes: "Evidence shifted but perspective quality comparable.",
  };
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — Experiment C (B vs C)\n");
  console.log("Change the retrieval. Keep the perspective intact.\n");

  if (!OpenAIClaimLLMProvider.isConfigured()) {
    console.log("LLM CLAIM PROVIDER UNAVAILABLE");
    process.exitCode = 2;
    return;
  }

  await indexPassageEmbeddings({ provider: "openai", requireNeural: true });

  let cBetter = 0;
  let same = 0;
  let bBetter = 0;
  let unclear = 0;
  let highConvergenceC = 0;
  let distinctImproved = 0;
  let distinctSame = 0;
  let distinctWorse = 0;
  let trustViolations = 0;
  let deathSatWarnings = 0;
  let cOnlyValue = 0;
  let evidenceChanged = 0;
  let machineHumanDisagree = 0;

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    console.log(`\n${fixture.label.toUpperCase()}`);

    const writerRows = [];
    for (const person of people) {
      const b = await buildExperimentClaimPool({
        experimentId: "B",
        question: fixture.question,
        personId: person.id,
        fixtureId,
      });
      const c = await buildExperimentClaimPool({
        experimentId: "C",
        question: fixture.question,
        personId: person.id,
        fixtureId,
      });

      // Trust invariants on C selected claims
      for (const claim of c.skeleton.claims) {
        if (
          claim.validationIssues.includes("work-voice-misattribution") ||
          claim.validationIssues.includes("modern-concept-attributed-to-writer") ||
          claim.validationIssues.includes("external-knowledge-injection") ||
          claim.validationIssues.includes("writer-stereotype-injection")
        ) {
          trustViolations += 1;
        }
      }

      const comparison = comparePerspectiveExperiments({
        fixtureId,
        personId: person.id,
        b,
        c,
      });
      if (comparison.retrievalEvidenceChanged) evidenceChanged += 1;

      const deathSat = deathEvidenceSaturation(c.pool.packet, fixtureId);
      if (deathSat) deathSatWarnings += 1;

      const divB = analyzeWriterDiversity(person.id, b.skeleton.claims);
      const divC = analyzeWriterDiversity(person.id, c.skeleton.claims);
      console.log(
        `${person.name}\nB diversity ${divB.score} redundancy ${divB.redundancyCount}\nC diversity ${divC.score} redundancy ${divC.redundancyCount}`,
      );

      cOnlyValue += countCOnlyTrueAddedValue({
        bClaims: b.skeleton.claims,
        cClaims: listProposedClaims({
          fixtureId,
          personId: person.id,
          experimentId: "C",
          retrievalMode: "neural-hybrid",
        }),
      });

      writerRows.push({ person, b, c, comparison, deathSat });
    }

    const crossB = analyzeCrossWriterDistinctiveness({
      question: fixture.question,
      claimsByPerson: Object.fromEntries(
        writerRows.map((r) => [r.person.id, r.b.skeleton.claims]),
      ),
    });
    const crossC = analyzeCrossWriterDistinctiveness({
      question: fixture.question,
      claimsByPerson: Object.fromEntries(
        writerRows.map((r) => [r.person.id, r.c.skeleton.claims]),
      ),
    });
    if (crossC.convergenceRisk === "high") highConvergenceC += 1;

    const crossDelta =
      crossC.distinctivenessScore - crossB.distinctivenessScore;
    console.log(
      `Three-writer distinctiveness:\nB ${crossB.distinctivenessScore}\nC ${crossC.distinctivenessScore}`,
    );
    console.log(
      `Returned-question overlap:\nB ${crossB.returnedQuestionOverlap}\nC ${crossC.returnedQuestionOverlap}`,
    );
    console.log(`Convergence:\nB ${crossB.convergenceRisk}\nC ${crossC.convergenceRisk}`);

    let fixtureC = 0;
    let fixtureSame = 0;
    let fixtureB = 0;
    for (const row of writerRows) {
      const judged = judgeWriter({
        comparison: row.comparison,
        crossDelta,
        deathSat: row.deathSat,
      });
      upsertBcWriterComparison({
        fixtureId,
        personId: row.person.id,
        verdict: judged.verdict,
        reasons: judged.reasons,
        notes: judged.notes,
      });
      if (judged.verdict === "c-better") {
        cBetter += 1;
        fixtureC += 1;
      } else if (judged.verdict === "same") {
        same += 1;
        fixtureSame += 1;
      } else if (judged.verdict === "b-better") {
        bBetter += 1;
        fixtureB += 1;
      } else {
        unclear += 1;
      }

      // Machine lean: diversity/evidence change without human reasons of regression
      const machineLean =
        row.comparison.retrievalEvidenceChanged &&
        row.comparison.internalDiversityDelta >= 0 &&
        crossDelta >= -DISTINCTIVENESS_REGRESSION_DELTA
          ? "c-better"
          : !row.comparison.retrievalEvidenceChanged
            ? "same"
            : "b-better";
      if (machineLean !== judged.verdict) machineHumanDisagree += 1;
    }

    const threeVerdict: ExperimentComparisonHumanVerdict =
      fixtureB > fixtureC
        ? "b-better"
        : fixtureC > fixtureSame
          ? "c-better"
          : "same";
    const distinctiveness =
      crossDelta > 0.03
        ? "improved"
        : crossDelta < -DISTINCTIVENESS_REGRESSION_DELTA
          ? "worse"
          : "same";
    if (distinctiveness === "improved") distinctImproved += 1;
    else if (distinctiveness === "worse") distinctWorse += 1;
    else distinctSame += 1;

    upsertBcThreeWriterComparison({
      fixtureId,
      verdict: threeVerdict,
      distinctiveness,
      overallUsefulness:
        fixtureC > fixtureB ? "improved" : fixtureB > fixtureC ? "worse" : "same",
      notes: `crossDelta=${crossDelta.toFixed(3)}; rq B=${crossB.returnedQuestionOverlap} C=${crossC.returnedQuestionOverlap}`,
    });

    console.log(`Verdict:\n${threeVerdict.toUpperCase()}`);
  }

  const total = cBetter + same + bBetter + unclear;
  const betterSamePct = total
    ? Math.round(((cBetter + same) / total) * 100)
    : 0;

  console.log("\n=== GLOBAL SUMMARY ===");
  console.log(`Writer comparisons:\n${total}`);
  console.log(`C Better:\n${cBetter}`);
  console.log(`Same:\n${same}`);
  console.log(`B Better:\n${bBetter}`);
  console.log(`Unclear:\n${unclear}`);
  console.log(`C Better + Same:\n${betterSamePct}%`);
  console.log(`Evidence packets changed:\n${evidenceChanged}`);
  console.log(`C-only True Added Value:\n${cOnlyValue}`);
  console.log(`Three Writer comparisons:\n${listBcThreeWriterComparisons().length}`);
  console.log(`Distinctiveness improved:\n${distinctImproved}`);
  console.log(`Same:\n${distinctSame}`);
  console.log(`Worse:\n${distinctWorse}`);
  console.log(`High convergence C:\n${highConvergenceC}`);
  console.log(`Trust violations:\n${trustViolations}`);
  console.log(`Death evidence saturation warnings:\n${deathSatWarnings}`);
  console.log(`Machine/Human disagreements:\n${machineHumanDisagree}`);

  let classification: "C1" | "C2" | "C3" | "C4" = "C3";
  if (trustViolations > 0 || highConvergenceC > 0 || distinctWorse > 0) {
    classification = "C4";
  } else if (betterSamePct >= 85 && cBetter >= 8) {
    classification = "C1";
  } else if (betterSamePct >= 85 && cBetter >= 3) {
    classification = "C2";
  } else if (betterSamePct >= 85) {
    classification = "C3";
  } else {
    classification = "C4";
  }

  console.log(`\nClassification:\n${classification}`);
  console.log(
    classification === "C1"
      ? "CLEAR IMPROVEMENT — C staging candidate"
      : classification === "C2"
        ? "SELECTIVE IMPROVEMENT — Retrieval Router candidate (prep only)"
        : classification === "C3"
          ? "LITTLE VALUE — keep B; semantic for curator discovery"
          : "REGRESSION — do not adopt C",
  );

  const stored = listBcWriterComparisons();
  console.log(`Persisted writer comparisons: ${stored.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
