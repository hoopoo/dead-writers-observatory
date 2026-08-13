/**
 * Release QA gate: FAIL > 0 blocks deploy.
 * Insufficient archive on non-priority fixtures is non-blocking NEEDS REVIEW.
 */
import fs from "node:fs";
import path from "node:path";
import { RELEASE_QA_FIXTURES } from "../src/data/fixtures/release-qa";
import { analyzeQuestion } from "../src/lib/question-analysis";
import { analyzeCrossWriterDistinctiveness } from "../src/lib/claims/distinctiveness";
import { observePublicBeta } from "../src/lib/public/observe";
import { getPublicPerspectiveMode } from "../src/lib/public/mode";
import { lookupFrozenSkeletons } from "../src/lib/release/freeze";
import type { ReleaseQACase } from "../src/types/public";
import type { ReleaseBlockerType } from "../src/types/release";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — release QA\n");
  const mode = getPublicPerspectiveMode();
  const results: Array<
    ReleaseQACase & {
      blocker: boolean;
      blockerType?: ReleaseBlockerType;
      categoryGroup: string;
    }
  > = [];

  for (const fixture of RELEASE_QA_FIXTURES) {
    const issues: string[] = [];
    let blockerType: ReleaseBlockerType | undefined;
    const analysis = analyzeQuestion(fixture.question);
    if (
      fixture.expectedSafetyLevel &&
      !analysis.safetyFlags.includes(fixture.expectedSafetyLevel)
    ) {
      issues.push(`safety missing: ${fixture.expectedSafetyLevel}`);
      blockerType = "safety";
    }

    const result = await observePublicBeta(fixture.question, mode);
    const writersLoaded = result.writers.length === 3;
    if (!writersLoaded) {
      issues.push("writers did not all load");
      blockerType = "broken-public-ui";
    }

    const rendered = result.writers.some(
      (w) =>
        w.archiveParagraphs.length > 0 ||
        Boolean(w.returnedQuestion) ||
        w.availability === "insufficient",
    );
    if (!rendered) {
      issues.push("result did not render");
      blockerType = "broken-public-ui";
    }

    const claimsByPerson = Object.fromEntries(
      result.skeleton.map((s) => [s.personId, s.claims]),
    );
    const cross = analyzeCrossWriterDistinctiveness({
      question: fixture.question,
      claimsByPerson,
    });
    const frozen = Boolean(lookupFrozenSkeletons(fixture.question));
    if (cross.convergenceRisk === "high") {
      issues.push("writer-collapse / high convergence");
      if (frozen) blockerType = "writer-collapse";
    }

    for (const writer of result.writers) {
      if (
        writer.returnedQuestion &&
        /^[「『"].+[」』"]$/.test(writer.returnedQuestion.trim())
      ) {
        issues.push(`${writer.personId} fake quote`);
        blockerType = "fake-quote";
      }
      if (
        writer.provenance.some((p) =>
          /DIRECT AUTHOR|WORK LEVEL|WORK-LEVEL/i.test(p.voiceLabel),
        )
      ) {
        issues.push(`${writer.personId} internal attribution leaked`);
        blockerType = "false-attribution";
      }
      if (
        writer.availability !== "insufficient" &&
        writer.archiveParagraphs.length + writer.connectionParagraphs.length > 0 &&
        writer.provenance.length === 0
      ) {
        issues.push(`${writer.personId} broken provenance`);
        blockerType = "broken-provenance";
      }
    }

    const allInsufficient = result.writers.every(
      (w) => w.availability === "insufficient",
    );
    if (allInsufficient) {
      issues.push("all writers insufficient");
    }

    const isBlocker = Boolean(
      blockerType && blockerType !== undefined && !allInsufficient,
    );
    const status: ReleaseQACase["result"] =
      issues.length === 0
        ? "pass"
        : blockerType && !allInsufficient
          ? "fail"
          : "needs-review";

    results.push({
      id: fixture.id,
      question: fixture.question,
      category: fixture.category,
      expectedSafetyLevel: fixture.expectedSafetyLevel,
      result: allInsufficient && !blockerType ? "needs-review" : status,
      issues,
      blocker: Boolean(blockerType) && !allInsufficient,
      blockerType: allInsufficient ? undefined : blockerType,
      categoryGroup: fixture.messy ? "messy-input" : fixture.category,
    });

    console.log(
      `${fixture.id} [${fixture.category}] ${
        allInsufficient && !blockerType ? "needs-review" : status
      }${issues.length ? ` — ${issues.join("; ")}` : ""}`,
    );
  }

  const pass = results.filter((r) => r.result === "pass").length;
  const needsReview = results.filter((r) => r.result === "needs-review").length;
  const fail = results.filter((r) => r.result === "fail").length;
  const messy = results.filter((r) => r.categoryGroup === "messy-input");

  console.log("\n--- by group ---");
  const groups = new Map<string, number>();
  for (const row of results) {
    groups.set(row.categoryGroup, (groups.get(row.categoryGroup) ?? 0) + 1);
  }
  for (const [group, n] of groups) console.log(`${group}: ${n}`);

  console.log("\n--- summary ---");
  console.log(`total: ${results.length}`);
  console.log(`PASS: ${pass}`);
  console.log(`NEEDS REVIEW: ${needsReview} (non-blocking insufficient archive)`);
  console.log(`FAIL: ${fail}`);
  console.log(`messy: ${messy.map((m) => m.result).join(",")}`);

  const out = path.join(
    process.cwd(),
    "src",
    "data",
    "release",
    "release-qa-v0.1.json",
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    `${JSON.stringify(
      {
        total: results.length,
        pass,
        needsReview,
        fail,
        messy: messy.map((m) => ({ id: m.id, result: m.result })),
        byGroup: Object.fromEntries(groups),
        cases: results.map((r) => ({
          id: r.id,
          category: r.category,
          result: r.result,
          blocker: r.blocker,
          blockerType: r.blockerType,
          issues: r.issues,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  assert(fail === 0, `Release QA FAIL=${fail}`);
  console.log("\nRELEASE QA GATE PASSED");
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
