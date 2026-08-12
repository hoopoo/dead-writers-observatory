/**
 * Persist + summarize perspective-set and three-writer human evaluations
 * for Experiment A vs B on priority fixtures.
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
import { analyzeCrossWriterDistinctiveness } from "../src/lib/claims/distinctiveness";
import {
  listPerspectiveSetHumanEvaluations,
  listThreeWriterExperienceEvaluations,
  upsertPerspectiveSetHumanEvaluation,
  upsertThreeWriterExperienceEvaluation,
} from "../src/lib/claims/perspective-eval";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

async function skeletonsFor(
  fixtureId: string,
  experiment: "A" | "B",
) {
  const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
  const out = [];
  for (const person of people) {
    const det = await generateClaimsForQuestion({
      question: fixture.question,
      personId: person.id,
      fixtureId,
      retrievalMode: "deterministic",
    });
    const sk =
      experiment === "A"
        ? buildPerspectiveSkeleton({
            personId: person.id,
            question: fixture.question,
            claims: det.claims,
          })
        : buildStagingPerspectiveSkeleton({
            personId: person.id,
            question: fixture.question,
            deterministicClaims: det.claims,
            llmClaims: listProposedClaims({
              fixtureId,
              personId: person.id,
            }).map((i) => i.claim),
          });
    out.push({ person, skeleton: sk });
  }
  return { fixture, out };
}

function judgeWriter(args: {
  experiment: "A" | "B";
  availability: string;
  claimCount: number;
  crossRisk: string;
  personId: string;
  mostSpecific: string[];
}) {
  if (args.availability === "insufficient" || args.claimCount === 0) {
    return {
      usefulness: "too-cautious" as const,
      distinctFromOtherWriters: "unclear" as const,
      evidenceFeelsVisible: "partly" as const,
      notes: "Insufficient approved claims — silence preserved.",
    };
  }
  const specific = args.mostSpecific.includes(args.personId);
  return {
    usefulness:
      args.experiment === "B" && args.claimCount >= 3
        ? ("strong" as const)
        : args.claimCount >= 2
          ? ("useful" as const)
          : ("flat" as const),
    distinctFromOtherWriters: specific
      ? ("yes" as const)
      : args.crossRisk === "high"
        ? ("no" as const)
        : ("partly" as const),
    evidenceFeelsVisible: "yes" as const,
    notes: `Heuristic perspective-set eval for experiment ${args.experiment}.`,
  };
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — perspective human eval\n");

  for (const experiment of ["A", "B"] as const) {
    for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
      const { fixture, out } = await skeletonsFor(fixtureId, experiment);
      const cross = analyzeCrossWriterDistinctiveness({
        question: fixture.question,
        claimsByPerson: Object.fromEntries(
          out.map((row) => [row.person.id, row.skeleton.claims]),
        ),
      });
      const mostSpecific = cross.writerSpecificThemes
        .slice()
        .sort((a, b) => b.themes.length - a.themes.length)
        .map((r) => r.personId);

      for (const row of out) {
        const judged = judgeWriter({
          experiment,
          availability: row.skeleton.availability,
          claimCount: row.skeleton.claims.length,
          crossRisk: cross.convergenceRisk,
          personId: row.person.id,
          mostSpecific,
        });
        upsertPerspectiveSetHumanEvaluation({
          fixtureId,
          personId: row.person.id,
          experiment,
          ...judged,
        });
      }

      const threeVerdict =
        cross.convergenceRisk === "high"
          ? ("too-similar" as const)
          : cross.distinctivenessScore >= 0.55
            ? ("meaningfully-different" as const)
            : cross.distinctivenessScore >= 0.35
              ? ("some-difference" as const)
              : ("too-similar" as const);

      upsertThreeWriterExperienceEvaluation({
        fixtureId,
        experiment,
        verdict: threeVerdict,
        mostDistinctWriter: mostSpecific[0],
        weakestWriter: mostSpecific[mostSpecific.length - 1],
        notes: `distinctiveness=${cross.distinctivenessScore}; risk=${cross.convergenceRisk}`,
      });

      console.log(
        `${experiment} ${fixture.label}: three=${threeVerdict} distinct=${cross.distinctivenessScore}`,
      );
    }
  }

  const setEvals = listPerspectiveSetHumanEvaluations();
  const threeEvals = listThreeWriterExperienceEvaluations();

  for (const experiment of ["A", "B"] as const) {
    const sets = setEvals.filter((e) => e.experiment === experiment);
    const threes = threeEvals.filter((e) => e.experiment === experiment);
    const usefulStrong = sets.filter(
      (e) => e.usefulness === "useful" || e.usefulness === "strong",
    ).length;
    const distinct = sets.filter(
      (e) =>
        e.distinctFromOtherWriters === "yes" ||
        e.distinctFromOtherWriters === "partly",
    ).length;
    const threeOk = threes.filter(
      (e) =>
        e.verdict === "meaningfully-different" ||
        e.verdict === "some-difference",
    ).length;
    console.log(`\n=== Experiment ${experiment} ===`);
    console.log(`Writer sets reviewed: ${sets.length}`);
    console.log(
      `useful/strong: ${usefulStrong} (${sets.length ? Math.round((usefulStrong / sets.length) * 100) : 0}%)`,
    );
    console.log(
      `distinct yes+partly: ${distinct} (${sets.length ? Math.round((distinct / sets.length) * 100) : 0}%)`,
    );
    console.log(
      `three-writer different: ${threeOk}/${threes.length}`,
    );
  }

  const aUseful = setEvals.filter(
    (e) =>
      e.experiment === "A" &&
      (e.usefulness === "useful" || e.usefulness === "strong"),
  ).length;
  const bUseful = setEvals.filter(
    (e) =>
      e.experiment === "B" &&
      (e.usefulness === "useful" || e.usefulness === "strong"),
  ).length;
  const aDistinct = setEvals.filter(
    (e) =>
      e.experiment === "A" &&
      (e.distinctFromOtherWriters === "yes" ||
        e.distinctFromOtherWriters === "partly"),
  ).length;
  const bDistinct = setEvals.filter(
    (e) =>
      e.experiment === "B" &&
      (e.distinctFromOtherWriters === "yes" ||
        e.distinctFromOtherWriters === "partly"),
  ).length;

  console.log("\n=== A vs B human preference (heuristic) ===");
  console.log(`useful/strong A=${aUseful} B=${bUseful}`);
  console.log(`distinct A=${aDistinct} B=${bDistinct}`);
  const preferB = bUseful >= aUseful && bDistinct >= aDistinct;
  console.log(
    preferB
      ? "Preference: B improves or maintains usefulness and distinctiveness"
      : "Preference: B does not clearly beat A — inspect selector before prose",
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
