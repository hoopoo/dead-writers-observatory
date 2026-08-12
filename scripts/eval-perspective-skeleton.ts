import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { generateClaimsForQuestion } from "../src/lib/claims";
import {
  buildPerspectiveSkeleton,
  isHumanApprovedClaim,
} from "../src/lib/claims/approved";
import {
  upsertClaimHumanEvaluation,
  getClaimHumanEvaluation,
  listClaimHumanEvaluations,
} from "../src/lib/claims/human-eval";
import {
  closeReviewDb,
  openReviewDbAt,
} from "../src/lib/review/db";
import { resetReviewSeedFlag } from "../src/lib/review/active";
import { sqliteReviewRepository } from "../src/lib/review/sqlite-repository";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("Dead Writers Observatory — perspective skeleton eval\n");

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dwo-skel-"));
  openReviewDbAt(path.join(tmp, "reviews.sqlite"));
  resetReviewSeedFlag();
  sqliteReviewRepository.seedFromStatic();

  const fixture = FIXTURE_QUESTIONS.find((f) => f.id === "q4")!;
  const result = await generateClaimsForQuestion({
    question: fixture.question,
    personId: "person-soseki",
    fixtureId: fixture.id,
  });
  const claim = result.claims.find((c) => c.claimType === "modern-transfer");
  assert(Boolean(claim), "modern transfer exists");

  // persistence
  const created = upsertClaimHumanEvaluation({
    claimId: claim!.id,
    fixtureId: fixture.id,
    personId: "person-soseki",
    evidenceVerdict: "supported",
    usefulnessVerdict: "surprising-but-defensible",
    strengthVerdict: "appropriate",
    reasonTags: ["modern-transfer-clear"],
  });
  const loaded = getClaimHumanEvaluation({ claimId: claim!.id });
  assert(loaded?.id === created.id, "claim human evaluation persists");
  const updated = upsertClaimHumanEvaluation({
    claimId: claim!.id,
    fixtureId: fixture.id,
    personId: "person-soseki",
    evidenceVerdict: "supported",
    usefulnessVerdict: "useful",
    strengthVerdict: "appropriate",
  });
  assert(updated.id === created.id, "upsert updates same row");
  console.log("1. claim human evaluation persists/updates: PASS");

  // machine/human separate
  assert(
    !Object.prototype.hasOwnProperty.call(loaded ?? {}, "compositeScore"),
    "no composite score",
  );
  console.log("2. machine/human state separated: PASS");

  // approval rules
  assert(
    !isHumanApprovedClaim(claim!, {
      ...created,
      evidenceVerdict: "misattributed",
    }),
    "misattributed cannot become approved",
  );
  assert(
    !isHumanApprovedClaim(claim!, {
      ...created,
      evidenceVerdict: "too-strong",
    }),
    "too-strong cannot become approved",
  );
  assert(
    !isHumanApprovedClaim(claim!, {
      ...created,
      usefulnessVerdict: "not-useful",
    }),
    "not-useful cannot become approved",
  );
  assert(
    isHumanApprovedClaim(claim!, {
      ...created,
      evidenceVerdict: "supported",
      usefulnessVerdict: "surprising-but-defensible",
      strengthVerdict: "appropriate",
    }),
    "surprising-but-defensible can become approved",
  );
  console.log("3. approval rules: PASS");

  // approve a few claims for skeleton
  for (const c of result.claims) {
    upsertClaimHumanEvaluation({
      claimId: c.id,
      fixtureId: fixture.id,
      personId: "person-soseki",
      evidenceVerdict: "supported",
      usefulnessVerdict:
        c.claimType === "writer-perspective" ? "obvious" : "useful",
      strengthVerdict: "appropriate",
    });
  }
  const evalMap = new Map(
    listClaimHumanEvaluations().map((e) => [e.claimId, e]),
  );
  const skeleton = buildPerspectiveSkeleton({
    personId: "person-soseki",
    question: fixture.question,
    claims: result.claims,
    evaluationsByClaimId: evalMap,
  });
  assert(
    skeleton.claims.every((c) => isHumanApprovedClaim(c, evalMap.get(c.id))),
    "approved set contains only valid claims",
  );
  for (const text of [
    ...skeleton.sections.archiveObservation,
    ...skeleton.sections.acrossSources,
    ...skeleton.sections.connectionToQuestion,
    ...skeleton.sections.returnedQuestion,
  ]) {
    assert(
      result.claims.some((c) => c.text === text),
      "skeleton adds no new prose",
    );
  }
  assert(
    skeleton.claims.every(
      (c) =>
        c.claimType !== "modern-transfer" ||
        (c.historicalTransfer === "explicit" &&
          c.authorialAttribution === "none"),
    ),
    "modern transfer remains explicit",
  );
  console.log("4. skeleton provenance rules: PASS");

  // insufficient when no approvals
  const empty = buildPerspectiveSkeleton({
    personId: "person-dazai",
    question: fixture.question,
    claims: result.claims,
    evaluationsByClaimId: new Map(),
  });
  assert(empty.availability === "insufficient", "insufficient without human review");
  console.log("5. insufficient archive silence: PASS");

  // Restore default DB and report 30-case availability with production DB
  delete process.env.CURATOR_REVIEW_DB_PATH;
  closeReviewDb();
  resetReviewSeedFlag();

  const availability = { available: 0, limited: 0, insufficient: 0 };
  for (const fixtureItem of FIXTURE_QUESTIONS) {
    for (const person of people) {
      const caseResult = await generateClaimsForQuestion({
        question: fixtureItem.question,
        personId: person.id,
        fixtureId: fixtureItem.id,
      });
      const sk = buildPerspectiveSkeleton({
        personId: person.id,
        question: fixtureItem.question,
        claims: caseResult.claims,
      });
      availability[sk.availability] += 1;
      console.log(
        `${fixtureItem.id} ${person.name}: ${sk.availability} claims=${sk.claimIds.length}`,
      );
    }
  }

  console.log("\n=== AVAILABILITY TOTALS ===");
  console.log(availability);
  console.log("\nPASS");
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
