import fs from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { compareRetrievalEvaluationModes } from "../src/lib/retrieval-compare";
import {
  exportHumanEvaluationsJson,
  listCriticalWorseCases,
  listRetrievalHumanEvaluations,
  summarizeHumanEvaluations,
} from "../src/lib/retrieval-human-eval";
import { closeReviewDb } from "../src/lib/review/db";
import type { CandidateEvaluationMode } from "../src/types/embedding";

const PRIORITY_FIXTURES = new Set(["q3", "q4", "q5", "q6"]);

async function main() {
  console.log("Dead Writers Observatory — human retrieval evaluation summary\n");

  const evaluations = listRetrievalHumanEvaluations();
  const fixtureIds = FIXTURE_QUESTIONS.map((f) => f.id);
  const personIds = people.map((p) => p.id);
  const summaries = summarizeHumanEvaluations({
    evaluations,
    fixtureIds,
    personIds,
  });

  for (const summary of summaries) {
    const label =
      summary.mode === "local-semantic"
        ? "Local Semantic"
        : summary.mode === "neural-semantic"
          ? "Neural Semantic"
          : "Neural Hybrid";
    console.log(label);
    console.log(`Reviewed: ${summary.reviewed} / ${summary.total}`);
    console.log(`Better: ${summary.better}`);
    console.log(`Same: ${summary.same}`);
    console.log(`Worse: ${summary.worse}`);
    console.log(`Unclear: ${summary.unclear}`);
    console.log(`Not reviewed: ${summary.notReviewed}`);
    console.log(`Better + Same: ${summary.betterSameRate.toFixed(0)}%`);
    console.log("");
  }

  console.log("=== 30-CASE MATRIX ===");
  const modes: CandidateEvaluationMode[] = [
    "local-semantic",
    "neural-semantic",
    "neural-hybrid",
  ];
  for (const fixture of FIXTURE_QUESTIONS) {
    const priority = PRIORITY_FIXTURES.has(fixture.id) ? " ★ PRIORITY" : "";
    console.log(`\nFIXTURE ${fixture.id}${priority} — ${fixture.label}`);
    for (const person of people) {
      const parts = modes.map((mode) => {
        const found = evaluations.find(
          (e) =>
            e.fixtureId === fixture.id &&
            e.personId === person.id &&
            e.candidateMode === mode,
        );
        return `${mode}: ${found ? found.verdict.toUpperCase() : "NOT REVIEWED"}`;
      });
      console.log(`  ${person.name}: ${parts.join(" · ")}`);
    }
  }

  console.log("\n=== MACHINE / HUMAN DISAGREEMENT ===");
  console.log("(Machine quality high + Human WORSE)\n");
  let disagreementCount = 0;
  for (const evaluation of evaluations.filter((e) => e.verdict === "worse")) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === evaluation.fixtureId);
    if (!fixture) continue;
    const comparisons = await compareRetrievalEvaluationModes({
      question: fixture.question,
      personId: evaluation.personId,
      modes: ["deterministic", evaluation.candidateMode],
    });
    const candidate = comparisons.find(
      (c) => c.mode === evaluation.candidateMode,
    );
    if (!candidate || candidate.error) continue;
    if (candidate.quality.total >= 90) {
      disagreementCount += 1;
      console.log(
        [
          `Fixture ${evaluation.fixtureId}`,
          evaluation.personId,
          `Machine quality: ${candidate.quality.total}`,
          `Human: WORSE`,
          `Reason: ${(evaluation.reasonTags ?? []).join(", ") || "(none)"}`,
        ].join(" · "),
      );
    }
  }
  if (disagreementCount === 0) {
    console.log("(none recorded)");
  }

  const critical = listCriticalWorseCases(evaluations);
  console.log(`\n=== CRITICAL WORSE PATTERNS: ${critical.length} ===`);
  for (const item of critical) {
    console.log(
      `  ${item.fixtureId} / ${item.personId} / ${item.candidateMode}: ${(item.reasonTags ?? []).join(", ")}`,
    );
  }

  const neuralHybrid = summaries.find((s) => s.mode === "neural-hybrid");
  const stagingReady =
    !!neuralHybrid &&
    neuralHybrid.reviewed === neuralHybrid.total &&
    neuralHybrid.betterSameRate >= 80 &&
    critical.length === 0;

  console.log("\n=== STAGING CANDIDATE (neural-hybrid) ===");
  console.log(
    stagingReady
      ? "CONDITIONS MET (still requires manual AI/SNS/Aging review)"
      : "NOT READY — keep RETRIEVAL_MODE=deterministic",
  );

  const exportDir = path.join(process.cwd(), "data", "evaluations");
  fs.mkdirSync(exportDir, { recursive: true });
  const exportPath = path.join(exportDir, "retrieval-human-v1.json");
  fs.writeFileSync(
    exportPath,
    JSON.stringify(exportHumanEvaluationsJson(), null, 2),
  );
  console.log(`\nExported: ${exportPath}`);
  console.log(
    "\nMachine metrics and human verdicts remain separate — no composite score.",
  );

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
