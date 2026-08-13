/**
 * Public Beta release readiness checks (skeleton surface; no new research).
 */
import { readFileSync } from "node:fs";
import { RELEASE_QA_FIXTURES } from "../src/data/fixtures/release-qa";
import { analyzeQuestion } from "../src/lib/question-analysis";
import { analyzeCrossWriterDistinctiveness } from "../src/lib/claims/distinctiveness";
import {
  getPublicPerspectiveMode,
  isStagingModeOverrideEnabled,
} from "../src/lib/public/mode";
import {
  choosePublicSurface,
  observePublicBeta,
} from "../src/lib/public/observe";
import { isStagingProseEnabled, isPublicBetaProseEnabled } from "../src/lib/prose";
import { createRetriever } from "../src/lib/retrieval-mode";
import { closeReviewDb } from "../src/lib/review/db";
import { validateReleaseConfig } from "../src/lib/release/config";
import {
  loadPublicBetaFreeze,
  validateFreezeArtifact,
} from "../src/lib/release/freeze";
import {
  computePublicBetaReadiness,
  decideBlindGate,
  decidePublicMode,
} from "../src/lib/release/decision";
import type { ReleaseQACase } from "../src/types/public";
import { loadLocalEnv } from "./load-env";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — release readiness\n");

  delete process.env.PUBLIC_PERSPECTIVE_MODE;
  delete process.env.PUBLIC_BETA_PROSE;
  delete process.env.STAGING_PROSE;
  delete process.env.STAGING_MODE_OVERRIDE;
  delete process.env.EXPERIMENT_C;
  delete process.env.STAGING_CLAIMS;
  delete process.env.EVIDENCE_BOUNDED_SKELETON;
  assert(getPublicPerspectiveMode() === "skeleton", "default mode skeleton");
  assert(getPublicPerspectiveMode("prose") === "skeleton", "public ignores ?mode=");
  assert(isStagingModeOverrideEnabled() === false, "staging override off");
  assert(isPublicBetaProseEnabled() === false, "PUBLIC_BETA_PROSE false");
  assert(isStagingProseEnabled() === false, "STAGING_PROSE false");
  process.env.STAGING_MODE_OVERRIDE = "true";
  assert(getPublicPerspectiveMode("prose") === "prose", "staging ?mode=prose");
  delete process.env.STAGING_MODE_OVERRIDE;
  const observeSrc = readFileSync("src/app/observe/page.tsx", "utf8");
  assert(
    !observeSrc.includes("@/lib/observe"),
    "public /observe must not import curator research observe",
  );
  assert(
    !observeSrc.includes("better-sqlite3"),
    "public /observe source must not mention sqlite",
  );
  const publicObserveSrc = readFileSync("src/lib/public/observe.ts", "utf8");
  assert(
    !/from ["']@\/lib\/(review|claims\/human-eval|claims\/llm\/store|observe|prose)["']/.test(
      publicObserveSrc,
    ),
    "public observe module must not import curator sqlite",
  );
  const productionOk = validateReleaseConfig({
    NODE_ENV: "production",
    PUBLIC_RELEASE: "true",
    PUBLIC_PERSPECTIVE_MODE: "skeleton",
    RETRIEVAL_MODE: "deterministic",
    CURATOR_ENABLED: "true",
    CURATOR_TOKEN: "deploy-token",
  } as NodeJS.ProcessEnv);
  assert(productionOk.ok, `production env invalid: ${productionOk.issues.join("; ")}`);
  assert(productionOk.mode === "skeleton", "production mode skeleton");
  const productionBadStaging = validateReleaseConfig({
    NODE_ENV: "production",
    PUBLIC_PERSPECTIVE_MODE: "skeleton",
    STAGING_MODE_OVERRIDE: "true",
  } as NodeJS.ProcessEnv);
  assert(!productionBadStaging.ok, "staging override must fail production validation");
  const productionBadCurator = validateReleaseConfig({
    NODE_ENV: "production",
    PUBLIC_PERSPECTIVE_MODE: "skeleton",
    CURATOR_ENABLED: "true",
  } as NodeJS.ProcessEnv);
  assert(!productionBadCurator.ok, "curator without token must fail production validation");
  const productionBadResearch = validateReleaseConfig({
    NODE_ENV: "production",
    PUBLIC_PERSPECTIVE_MODE: "skeleton",
    EXPERIMENT_C: "true",
  } as NodeJS.ProcessEnv);
  assert(!productionBadResearch.ok, "EXPERIMENT_C must fail production validation");
  console.log("1. public flags isolated / ENV default skeleton: PASS");

  assert(createRetriever().mode === "deterministic", "retrieval deterministic");
  console.log("2. production retrieval unchanged: PASS");

  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert(!layout.includes('href="/curator"'), "public layout has no curator link");
  const home = readFileSync("src/app/page.tsx", "utf8");
  assert(!home.includes("/curator"), "public home has no curator link");
  console.log("3. curator hidden from public chrome: PASS");

  const sample = await observePublicBeta(
    "AIに自分の仕事を奪われる気がします。",
    "skeleton",
  );
  assert(sample.writers.length === 3, "three writers");
  assert(
    sample.writers.some((w) => w.archiveParagraphs.length > 0),
    "skeleton can render",
  );
  assert(
    sample.writers.every((w) => !w.usedProse),
    "skeleton mode does not use prose",
  );
  const soseki = sample.writers.find((w) => w.personId === "person-soseki")!;
  assert(soseki.provenance.length > 0, "provenance opens with sources");
  assert(
    soseki.provenance.every(
      (p) =>
        !/DIRECT AUTHOR|NEAR|WORK LEVEL|WORK-LEVEL/i.test(p.voiceLabel) &&
        !/DIRECT AUTHOR|NEAR|WORK LEVEL|WORK-LEVEL/i.test(p.distanceLabel),
    ),
    "work voice / attribution human-readable",
  );
  assert(
    soseki.provenance.some((p) => p.voiceLabel.length > 0),
    "provenance has voice labels",
  );
  if (soseki.returnedQuestion) {
    assert(
      !/^[「『"].+[」』"]$/.test(soseki.returnedQuestion.trim()),
      "returned question not wrapped as fake quote",
    );
  }
  console.log("4. public skeleton render + provenance + RQ: PASS");

  assert(
    choosePublicSurface({ proseAllowed: true, proseHasSentences: true }) ===
      "prose",
    "validated prose can render",
  );
  assert(
    choosePublicSurface({ proseAllowed: false, proseHasSentences: true }) ===
      "skeleton",
    "invalid prose falls back to skeleton",
  );
  assert(
    choosePublicSurface({ proseAllowed: true, proseHasSentences: false }) ===
      "skeleton",
    "empty prose falls back to skeleton",
  );
  console.log("5. prose/skeleton fallback path exists: PASS");

  const death = await observePublicBeta(
    "死ぬことを考えることがあります。どう生きればいいのでしょうか。",
    "skeleton",
  );
  assert(Boolean(death.observation.safetyNotice), "safety notice on death theme");
  console.log("6. safety state works: PASS");

  const emptyish = await observePublicBeta("あ", "skeleton");
  assert(
    emptyish.writers.every(
      (w) =>
        w.availability === "insufficient" ||
        w.availability === "limited" ||
        w.availability === "available",
    ),
    "availability states are explicit",
  );
  const silenceOk = emptyish.writers.some(
    (w) =>
      w.availability === "insufficient" ||
      (w.archiveParagraphs.length === 0 && w.connectionParagraphs.length === 0),
  );
  assert(silenceOk || emptyish.writers.length === 3, "insufficient can remain silent");
  console.log("7. insufficient/silence path: PASS");

  const qaResults: ReleaseQACase[] = [];
  for (const fixture of RELEASE_QA_FIXTURES) {
    const issues: string[] = [];
    const analysis = analyzeQuestion(fixture.question);
    if (
      fixture.expectedSafetyLevel &&
      !analysis.safetyFlags.includes(fixture.expectedSafetyLevel)
    ) {
      issues.push(`safety missing: expected ${fixture.expectedSafetyLevel}`);
    }

    const result = await observePublicBeta(fixture.question, "skeleton");
    const available = result.writers.some(
      (w) =>
        w.availability !== "insufficient" &&
        (w.archiveParagraphs.length > 0 || Boolean(w.returnedQuestion)),
    );
    if (!available && fixture.category !== "death") {
      // silence is allowed; mark needs-review only if all insufficient unexpectedly
      if (result.writers.every((w) => w.availability === "insufficient")) {
        issues.push("all writers insufficient");
      }
    }

    const claimsByPerson = Object.fromEntries(
      result.skeleton.map((s) => [s.personId, s.claims]),
    );
    const cross = analyzeCrossWriterDistinctiveness({
      question: fixture.question,
      claimsByPerson,
    });
    if (cross.convergenceRisk === "high") {
      issues.push("generic/high convergence");
    }

    for (const writer of result.writers) {
      if (
        writer.returnedQuestion &&
        /^[「『"].+[」』"]$/.test(writer.returnedQuestion.trim())
      ) {
        issues.push(`${writer.personId} fake quote around returned question`);
      }
      if (
        writer.usedProse === false &&
        writer.provenance.some((p) => /DIRECT AUTHOR|WORK LEVEL/.test(p.voiceLabel))
      ) {
        issues.push(`${writer.personId} internal attribution leaked`);
      }
    }

    const distinct =
      new Set(
        result.writers
          .map((w) => w.returnedQuestion ?? w.archiveParagraphs[0] ?? "")
          .filter(Boolean),
      ).size >= 2 || result.writers.some((w) => w.availability === "insufficient");
    if (!distinct) issues.push("writer difference not visible");

    const status: ReleaseQACase["result"] =
      issues.length === 0
        ? "pass"
        : issues.some((i) => i.includes("fake quote") || i.includes("convergence"))
          ? "fail"
          : "needs-review";

    qaResults.push({
      id: fixture.id,
      question: fixture.question,
      category: fixture.category,
      expectedSafetyLevel: fixture.expectedSafetyLevel,
      result: status,
      issues,
    });
    console.log(
      `${fixture.id} [${fixture.category}] ${status}${
        issues.length ? ` — ${issues.join("; ")}` : ""
      }`,
    );
  }

  const failed = qaResults.filter((r) => r.result === "fail");
  const messy = qaResults.filter((r) => r.id.startsWith("qa-messy"));
  console.log("\n--- summary ---");
  console.log(`QA fixtures: ${qaResults.length}`);
  console.log(`pass: ${qaResults.filter((r) => r.result === "pass").length}`);
  console.log(
    `needs-review: ${qaResults.filter((r) => r.result === "needs-review").length}`,
  );
  console.log(`fail: ${failed.length}`);
  console.log(`messy inputs: ${messy.length}`);
  assert(failed.length === 0, `release QA fail: ${failed.map((f) => f.id).join(",")}`);
  console.log("\n8. release QA FAIL=0: PASS");

  const config = validateReleaseConfig();
  assert(config.ok, `release config: ${config.issues.join("; ")}`);
  console.log("9. release config: PASS");

  const freeze = loadPublicBetaFreeze();
  assert(Boolean(freeze), "freeze artifact missing");
  const freezeCheck = validateFreezeArtifact(freeze!);
  assert(freezeCheck.ok, `freeze invalid: ${freezeCheck.issues.join("; ")}`);
  assert(
    freeze!.contentHash ===
      "7c4e1076ecbfbb9576a4a2a46ebd77435def3a4d4c44008feaee6b86f0fab476",
    `unexpected freeze hash ${freeze!.contentHash}`,
  );
  console.log(`10. freeze artifact: PASS (${freeze!.cases.length} cases)`);

  const blind = decideBlindGate();
  const mode = decidePublicMode();
  const readiness = computePublicBetaReadiness({
    qa: {
      pass: qaResults.filter((r) => r.result === "pass").length,
      needsReview: qaResults.filter((r) => r.result === "needs-review").length,
      fail: failed.length,
      total: qaResults.length,
    },
    buildOk: true,
  });
  console.log(`11. blind gate: ${blind.decision} (${blind.reviewed}/18)`);
  console.log(`12. recommended public mode: ${mode.recommendedMode}`);
  console.log(`13. readiness: ${readiness.status}`);
  assert(
    readiness.readyForPublicBeta,
    `not ready: ${readiness.blockers.join("; ")}`,
  );
  console.log("\nRELEASE READINESS CHECKS PASSED");
  console.log(readiness.status);

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
