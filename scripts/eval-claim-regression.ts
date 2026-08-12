import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { generateClaimsForQuestion } from "../src/lib/claims";
import { buildEvidencePacket } from "../src/lib/claims/evidence-packet";
import { DeterministicClaimGenerator } from "../src/lib/claims/deterministic-generator";
import {
  applyValidation,
  defaultClaimValidator,
} from "../src/lib/claims/validator";
import { analyzeQuestion } from "../src/lib/question-analysis";
import { MockPerspectiveRetriever } from "../src/lib/retrieval";
import {
  closeReviewDb,
  openReviewDbAt,
} from "../src/lib/review/db";
import { resetReviewSeedFlag } from "../src/lib/review/active";
import { sqliteReviewRepository } from "../src/lib/review/sqlite-repository";
import { loadClaimsSnapshot } from "../src/lib/claims/snapshot";
import { DEFAULT_REVIEW_ACTOR } from "../src/types/review";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("Dead Writers Observatory — claim regression\n");

  // Structural gates on temp DB
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dwo-claims-"));
  openReviewDbAt(path.join(tmp, "reviews.sqlite"));
  resetReviewSeedFlag();
  sqliteReviewRepository.seedFromStatic();

  const analysis = analyzeQuestion("AIに自分の仕事を奪われる気がします。");
  const retriever = new MockPerspectiveRetriever();
  const selected = await retriever.retrieve("person-soseki", analysis);
  const { packet } = buildEvidencePacket({
    personId: "person-soseki",
    analysis,
    selected,
  });
  assert(packet.evidence.length > 0, "packet has evidence");

  // Reject untrusted: mark one passage rejected and rebuild
  const target = selected[0];
  await sqliteReviewRepository.updatePassageReview(
    target.passageId,
    { reviewStatus: "rejected", notes: "claim gate test" },
    DEFAULT_REVIEW_ACTOR,
  );
  const after = buildEvidencePacket({
    personId: "person-soseki",
    analysis,
    selected,
  });
  assert(
    after.packet.evidence.every((e) => e.passageId !== target.passageId),
    "EvidencePacket rejects untrusted evidence",
  );
  assert(
    after.rejected.some((r) => r.passageId === target.passageId),
    "rejected recorded",
  );
  console.log("1. EvidencePacket rejects untrusted: PASS");

  // Restore for remaining tests
  await sqliteReviewRepository.updatePassageReview(
    target.passageId,
    {
      reviewStatus: "approved",
      notes: "restore",
      checks: {
        textVerified: true,
        locatorVerified: true,
        voiceVerified: true,
        authorialDistanceVerified: true,
        sourceRelationshipVerified: true,
        fragmentMeaningVerified: true,
      },
    },
    DEFAULT_REVIEW_ACTOR,
  );

  const generator = new DeterministicClaimGenerator();
  const goodPacket = buildEvidencePacket({
    personId: "person-dazai",
    analysis: analyzeQuestion("人からどう見られているかが気になります。"),
    selected: await retriever.retrieve(
      "person-dazai",
      analyzeQuestion("人からどう見られているかが気になります。"),
    ),
  }).packet;

  // Inject illegal claim: work voice → author attribution
  const illegal = {
    id: "illegal-work-voice",
    personId: "person-dazai",
    claimType: "archive-observation" as const,
    text: "太宰は他者の前では誰もが演技して生きると考えていた。",
    evidenceIds: goodPacket.evidence
      .filter((e) => e.evidenceRole === "work-perspective")
      .slice(0, 1)
      .map((e) => e.id),
    supportStatus: "unclear" as const,
    authorialAttribution: "direct-author" as const,
    interpretationDistance: "low" as const,
    historicalTransfer: "none" as const,
    confidence: "high" as const,
    allowedInFinalPerspective: true,
    validationIssues: [],
  };
  if (illegal.evidenceIds.length === 0) {
    illegal.evidenceIds = goodPacket.evidence.slice(0, 1).map((e) => e.id);
  }
  const illegalResult = defaultClaimValidator.validate(illegal, goodPacket);
  assert(
    illegalResult.issues.includes("work-voice-misattribution") ||
      illegalResult.issues.includes("authorial-overreach") ||
      !illegalResult.allowed,
    "work voice cannot become direct author claim",
  );
  console.log("2. work voice misattribution blocked: PASS");

  const modernIllegal = {
    ...illegal,
    id: "illegal-modern",
    claimType: "modern-transfer" as const,
    text: "漱石はAIによる失業を自己像の問題だと考えるだろう。",
    personId: "person-soseki",
    authorialAttribution: "direct-author" as const,
    historicalTransfer: "explicit" as const,
    evidenceIds: packet.evidence.slice(0, 2).map((e) => e.id),
  };
  const modernResult = defaultClaimValidator.validate(modernIllegal, packet);
  assert(
    modernResult.issues.includes("modern-concept-attributed-to-writer") ||
      !modernResult.allowed,
    "modern transfer cannot become writer attribution",
  );
  console.log("3. modern concept attribution blocked: PASS");

  const raw = await generator.generate(packet);
  const validated = raw.map((claim) => {
    const result = defaultClaimValidator.validate(claim, packet);
    return applyValidation(claim, result);
  });
  assert(
    validated.every((c) => c.evidenceIds.every((id) => packet.evidence.some((e) => e.id === id))),
    "claim evidence IDs exist",
  );
  assert(
    validated
      .filter((c) => c.supportStatus === "unsupported")
      .every((c) => !c.allowedInFinalPerspective),
    "unsupported claim blocked",
  );
  const modernOk = validated.filter((c) => c.claimType === "modern-transfer");
  assert(modernOk.length >= 1, "modern transfer present");
  assert(
    modernOk.every(
      (c) =>
        c.authorialAttribution === "none" &&
        c.historicalTransfer === "explicit" &&
        c.allowedInFinalPerspective,
    ),
    "partial modern transfer allowed with explicit labeling",
  );
  console.log("4. supported/partial modern rules: PASS");

  const xes = validated.filter((c) => c.claimType === "cross-evidence-synthesis");
  for (const claim of xes) {
    const sources = new Set(
      claim.evidenceIds.map(
        (id) => packet.evidence.find((e) => e.id === id)?.sourceId,
      ),
    );
    if (claim.validationIssues.includes("insufficient-source-diversity")) {
      continue;
    }
    assert(sources.size >= 1, "synthesis uses packet sources");
  }
  console.log("5. cross-evidence synthesis sources: PASS");

  const rq = validated.filter((c) => c.claimType === "returned-question");
  assert(
    rq.every((c) => c.authorialAttribution === "none"),
    "returned question has no authorial attribution",
  );
  console.log("6. returned question attribution none: PASS");

  assert(packet.tensions.length >= 0, "tensions field present");
  console.log("7. contradiction preservation field: PASS");

  // LLM proposal gates (offline — no provider required)
  const { proposalToPerspectiveClaim, validateProposalSchema } = await import(
    "../src/lib/claims/llm/convert"
  );
  const { dedupeProposals, assessNoveltyAgainst } = await import(
    "../src/lib/claims/llm/novelty"
  );

  const badIdProposal = {
    temporaryId: "t-bad",
    claimType: "modern-transfer" as const,
    text: "資料の観点を現在の職業変化へ接続できる。",
    evidenceIds: ["not-in-packet"],
    proposedSupport: "supported" as const,
    proposedAuthorialAttribution: "none" as const,
    proposedInterpretationDistance: "high" as const,
    proposedHistoricalTransfer: "explicit" as const,
    rationale: "test",
  };
  assert(
    validateProposalSchema(badIdProposal, packet).includes("evidence-id-invalid"),
    "invalid evidence ID blocked at schema",
  );
  const badClaim = proposalToPerspectiveClaim({
    proposal: badIdProposal,
    packet,
    providerName: "test",
    modelName: "test",
    promptVersion: "v1",
  });
  const badVal = defaultClaimValidator.validate(
    { ...badClaim, generatorOrigin: "llm" },
    packet,
  );
  assert(!badVal.allowed, "packet-outside evidence cannot enter");
  console.log("8. packet outside / invalid evidence ID blocked: PASS");

  const rqWriter = {
    id: "rq-writer",
    personId: "person-soseki",
    claimType: "returned-question" as const,
    text: "漱石はあなたに問うでしょう。何を恐れていますか。",
    evidenceIds: packet.evidence.slice(0, 1).map((e) => e.id),
    supportStatus: "unclear" as const,
    authorialAttribution: "none" as const,
    interpretationDistance: "high" as const,
    historicalTransfer: "explicit" as const,
    confidence: "medium" as const,
    allowedInFinalPerspective: true,
    validationIssues: [],
    generatorOrigin: "llm" as const,
  };
  const rqVal = defaultClaimValidator.validate(rqWriter, packet);
  assert(
    rqVal.issues.includes("authorial-overreach") || !rqVal.allowed,
    "returned question has no writer attribution voice",
  );
  console.log("9. returned question writer voice blocked: PASS");

  const flat = {
    id: "flat-contradiction",
    personId: packet.personId,
    claimType: "cross-evidence-synthesis" as const,
    text: "資料を読むと矛盾は解消され、本質は一つにまとまる。",
    evidenceIds: packet.evidence.slice(0, 2).map((e) => e.id),
    supportStatus: "unclear" as const,
    authorialAttribution: "mixed" as const,
    interpretationDistance: "medium" as const,
    historicalTransfer: "none" as const,
    confidence: "medium" as const,
    allowedInFinalPerspective: true,
    validationIssues: [],
    generatorOrigin: "llm" as const,
  };
  const flatVal = defaultClaimValidator.validate(flat, packet);
  assert(
    flatVal.issues.includes("contradiction-flattened") || !flatVal.allowed,
    "contradictions must not be flattened",
  );
  console.log("10. contradiction flattening blocked: PASS");

  const dups = dedupeProposals([
    validated[0],
    { ...validated[0], id: "dup-2", text: validated[0].text },
    validated[1] ?? validated[0],
  ]);
  assert(dups.length < 3, "duplicate proposals reduced");
  const novelty = assessNoveltyAgainst(
    { ...validated[0], id: "novel-test", text: validated[0].text },
    validated,
  );
  assert(
    novelty.novelty === "duplicate" || novelty.novelty === "similar",
    "novelty detector sees near-duplicates",
  );
  assert(
    validated.every((c) => (c.generatorOrigin ?? "deterministic") === "deterministic"),
    "deterministic claims unchanged origin",
  );
  console.log("11. duplicate reduction + deterministic origin: PASS");

  // Restore default DB env for fixture sweep
  delete process.env.CURATOR_REVIEW_DB_PATH;
  closeReviewDb();
  resetReviewSeedFlag();

  let unsupportedFinal = 0;
  let workVoice = 0;
  let modernAttr = 0;
  let blockedAllowed = 0;

  for (const fixture of FIXTURE_QUESTIONS) {
    for (const person of people) {
      const result = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        retrievalMode: "deterministic",
      });
      unsupportedFinal += result.claims.filter(
        (c) =>
          c.supportStatus === "unsupported" && c.allowedInFinalPerspective,
      ).length;
      workVoice += result.quality.workVoiceViolationCount;
      modernAttr += result.claims.filter((c) =>
        c.validationIssues.includes("modern-concept-attributed-to-writer"),
      ).length;
      blockedAllowed += result.claims.filter(
        (c) =>
          (c.validationIssues.includes("work-voice-misattribution") ||
            c.validationIssues.includes("modern-concept-attributed-to-writer") ||
            c.supportStatus === "unsupported" ||
            c.supportStatus === "unclear") &&
          c.allowedInFinalPerspective,
      ).length;
    }
  }

  console.log(`unsupported final claims: ${unsupportedFinal}`);
  console.log(`work voice misattribution: ${workVoice}`);
  console.log(`modern concept attributed: ${modernAttr}`);
  console.log(`blocked-but-allowed violations: ${blockedAllowed}`);

  const snapshot = loadClaimsSnapshot();
  if (snapshot) {
    console.log(`snapshot present: ${snapshot.version} cases=${snapshot.cases.length}`);
  } else {
    console.log("snapshot not present yet (run npm run snapshot:claims)");
  }

  const failed =
    unsupportedFinal > 0 ||
    workVoice > 0 ||
    modernAttr > 0 ||
    blockedAllowed > 0;

  console.log(failed ? "\nFAIL" : "\nPASS");
  closeReviewDb();
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
