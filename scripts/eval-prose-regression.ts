/**
 * Prose regression invariants (Experiment B only; production unchanged).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { generateProse } from "../src/lib/prose/generate";
import { DeterministicProseEditor } from "../src/lib/prose/provider";
import {
  assertProseInputApprovedOnly,
  validateProseOutput,
} from "../src/lib/prose/validator";
import { analyzeCrossWriterProseDistinctiveness } from "../src/lib/prose/distinctiveness";
import { isStagingProseEnabled, isPublicBetaProseEnabled } from "../src/lib/prose";
import { getPublicPerspectiveMode } from "../src/lib/public/mode";
import { createRetriever } from "../src/lib/retrieval-mode";
import {
  closeReviewDb,
  openReviewDbAt,
} from "../src/lib/review/db";
import { resetReviewSeedFlag } from "../src/lib/review/active";
import { sqliteReviewRepository } from "../src/lib/review/sqlite-repository";
import type { EvidenceBoundedProseOutput } from "../src/types/prose";
import { loadLocalEnv } from "./load-env";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — prose regression\n");

  // Production defaults
  delete process.env.STAGING_PROSE;
  delete process.env.PUBLIC_BETA_PROSE;
  delete process.env.PUBLIC_PERSPECTIVE_MODE;
  delete process.env.STAGING_MODE_OVERRIDE;
  assert(isStagingProseEnabled() === false, "staging prose default false");
  assert(isPublicBetaProseEnabled() === false, "PUBLIC_BETA_PROSE default false");
  assert(isStagingProseEnabled("1") === true, "prose=1 enables staging");
  assert(getPublicPerspectiveMode() === "skeleton", "public mode default skeleton");
  console.log("1. staging prose flag isolated: PASS");

  const mode = createRetriever();
  assert(mode.mode === "deterministic", "production retrieval remains deterministic by default");
  console.log("2. production retrieval config unchanged: PASS");

  // Isolated DB for structural tests
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dwo-prose-"));
  openReviewDbAt(path.join(tmp, "reviews.sqlite"));
  resetReviewSeedFlag();
  sqliteReviewRepository.seedFromStatic();

  const editor = new DeterministicProseEditor();
  const fixture = FIXTURE_QUESTIONS.find((f) => f.id === "q4")!;
  const base = await generateProse({
    question: fixture.question,
    personId: "person-soseki",
    fixtureId: "q4",
    provider: editor,
    useCache: false,
  });
  assertProseInputApprovedOnly(base.input);
  assert(base.input.experimentId === "B", "Experiment B only");
  for (const claim of base.input.approvedClaims) {
    assert(claim.allowedInFinalPerspective, "approved claims only");
  }
  console.log("3. prose input approved claims only: PASS");

  // Invalid claim rejected
  let rejected = false;
  try {
    assertProseInputApprovedOnly({
      ...base.input,
      approvedClaims: [
        {
          ...base.input.approvedClaims[0],
          id: "illegal",
          allowedInFinalPerspective: false,
        },
      ],
    });
  } catch {
    rejected = true;
  }
  assert(rejected, "invalid claim rejected");
  console.log("4. invalid claim rejected: PASS");

  // Unsupported sentence blocked
  const bad: EvidenceBoundedProseOutput = {
    ...base.record.output,
    sections: [
      {
        type: "archive",
        sentences: [
          {
            id: "bad-1",
            text: "漱石文学の核心は自己理解です。自分らしく生きることが大切です。",
            claimIds: [],
            transformationType: "light-edit",
            introducesNewMeaning: true,
          },
        ],
      },
    ],
    sentenceMappings: [],
  };
  const badValidation = validateProseOutput(base.input, bad, "bad");
  assert(badValidation.unsupportedSentences >= 1, "unsupported detected");
  assert(!badValidation.sentenceResults[0].allowed, "unsupported blocked");
  assert(badValidation.newMeaningViolations >= 1, "new meaning flagged");
  console.log("5. unsupported / new meaning / advice blocked: PASS");

  // Attribution / work-voice (synthetic claim)
  {
    const workClaim = {
      ...(base.input.approvedClaims[0] ?? {
        id: "synthetic-work",
        personId: "person-soseki",
        claimType: "archive-observation" as const,
        text: "作品内の声として描かれている。",
        evidenceIds: ["e1"],
        supportStatus: "supported" as const,
        authorialAttribution: "work-level" as const,
        interpretationDistance: "medium" as const,
        historicalTransfer: "none" as const,
        allowedInFinalPerspective: true,
        generatorOrigin: "deterministic" as const,
      }),
      id: "synthetic-work-voice",
      authorialAttribution: "work-level" as const,
      text: "作品内の声として描かれている。",
      allowedInFinalPerspective: true,
    };
    const inputWithWork = {
      ...base.input,
      approvedClaims: [...base.input.approvedClaims, workClaim],
    };
    const misattr: EvidenceBoundedProseOutput = {
      personId: base.input.personId,
      sections: [
        {
          type: "archive",
          sentences: [
            {
              id: "mis-1",
              text: "太宰はそう考えていた。",
              claimIds: [workClaim.id],
              transformationType: "light-edit",
              introducesNewMeaning: false,
            },
          ],
        },
      ],
      sentenceMappings: [],
      editorMetadata: base.record.output.editorMetadata,
    };
    const v = validateProseOutput(inputWithWork, misattr, "mis");
    assert(
      v.attributionViolations >= 1 || v.workVoiceViolations >= 1,
      "work-level cannot strengthen to author belief",
    );
    console.log("6. authorial / work-voice preservation: PASS");
  }

  // Modern transfer (synthetic)
  {
    const modern = {
      ...(base.input.approvedClaims[0] ?? {
        id: "synthetic-modern",
        personId: "person-soseki",
        claimType: "modern-transfer" as const,
        text: "この観点を現在の問いへ接続できる。",
        evidenceIds: ["e1"],
        supportStatus: "partially-supported" as const,
        authorialAttribution: "none" as const,
        interpretationDistance: "high" as const,
        historicalTransfer: "explicit" as const,
        allowedInFinalPerspective: true,
        generatorOrigin: "deterministic" as const,
      }),
      id: "synthetic-modern",
      claimType: "modern-transfer" as const,
      historicalTransfer: "explicit" as const,
      authorialAttribution: "none" as const,
      supportStatus: "partially-supported" as const,
      text: "この観点を現在の問いへ接続できる。",
      allowedInFinalPerspective: true,
    };
    const inputModern = {
      ...base.input,
      approvedClaims: [...base.input.approvedClaims, modern],
    };
    const hidden: EvidenceBoundedProseOutput = {
      personId: base.input.personId,
      sections: [
        {
          type: "connection",
          sentences: [
            {
              id: "mod-1",
              text: "漱石はAI時代の仕事について深く考えていた。",
              claimIds: [modern.id],
              transformationType: "light-edit",
              introducesNewMeaning: false,
            },
          ],
        },
      ],
      sentenceMappings: [],
      editorMetadata: base.record.output.editorMetadata,
    };
    const v = validateProseOutput(inputModern, hidden, "mod");
    assert(
      v.historicalTransferViolations >= 1,
      "modern attribution violation detected",
    );
    console.log("7. modern transfer preservation: PASS");
  }

  // Returned question mutation (synthetic)
  {
    const rq = {
      ...(base.input.approvedClaims[0] ?? {
        id: "synthetic-rq",
        personId: "person-soseki",
        claimType: "returned-question" as const,
        text: "あなたは何を独立と呼んでいますか。",
        evidenceIds: ["e1"],
        supportStatus: "supported" as const,
        authorialAttribution: "none" as const,
        interpretationDistance: "low" as const,
        historicalTransfer: "none" as const,
        allowedInFinalPerspective: true,
        generatorOrigin: "deterministic" as const,
      }),
      id: "synthetic-rq",
      claimType: "returned-question" as const,
      text: "あなたは何を独立と呼んでいますか。",
      allowedInFinalPerspective: true,
    };
    const inputRq = {
      ...base.input,
      approvedClaims: [...base.input.approvedClaims, rq],
    };
    const mutated: EvidenceBoundedProseOutput = {
      personId: base.input.personId,
      sections: [
        {
          type: "returned-question",
          sentences: [
            {
              id: "rq-1",
              text: "あなたは本当に幸せですか？ そして明日何をしますか？",
              claimIds: [rq.id],
              transformationType: "light-edit",
              introducesNewMeaning: false,
            },
          ],
        },
      ],
      sentenceMappings: [],
      editorMetadata: base.record.output.editorMetadata,
    };
    const v = validateProseOutput(inputRq, mutated, "rq");
    assert(
      v.sentenceResults.some((r) => r.issues.includes("new-returned-question")),
      "returned-question mutation blocked",
    );
    console.log("8. returned-question identity: PASS");
  }

  // Restore real DB path for priority sweep — use workspace DB
  closeReviewDb();
  delete process.env.CURATOR_REVIEW_DB_PATH;
  loadLocalEnv();

  let unsupported = 0;
  let newMeaning = 0;
  let misattr = 0;
  let workVoice = 0;
  let modernV = 0;
  let rqMutation = 0;
  const high: string[] = [];

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fx = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    const peer = [];
    for (const person of people) {
      const result = await generateProse({
        question: fx.question,
        personId: person.id,
        fixtureId,
        provider: editor,
        allowRepair: true,
      });
      assert(result.input.experimentId === "B", "B only");
      unsupported += result.record.validation.unsupportedSentences;
      newMeaning += result.record.validation.newMeaningViolations;
      misattr += result.record.validation.attributionViolations;
      workVoice += result.record.validation.workVoiceViolations;
      modernV += result.record.validation.historicalTransferViolations;
      rqMutation += result.record.validation.sentenceResults.filter((r) =>
        r.issues.includes("new-returned-question"),
      ).length;
      peer.push(result);
    }
    const cross = analyzeCrossWriterProseDistinctiveness({
      fixtureId,
      skeletons: peer.map((r) => r.input.skeleton),
      proseByPerson: Object.fromEntries(
        peer.map((r) => [r.input.personId, r.record.output]),
      ),
    });
    if (cross.convergenceRisk === "high") high.push(fixtureId);
  }

  assert(unsupported === 0, `unsupported must be 0, got ${unsupported}`);
  assert(newMeaning === 0, `new meaning must be 0, got ${newMeaning}`);
  assert(misattr === 0, `misattribution must be 0, got ${misattr}`);
  assert(workVoice === 0, `work voice must be 0, got ${workVoice}`);
  assert(modernV === 0, `modern violations must be 0, got ${modernV}`);
  assert(rqMutation === 0, `rq mutations must be 0, got ${rqMutation}`);
  assert(high.length === 0, `high convergence must be 0, got ${high.join(",")}`);
  console.log("9. priority-18 invariants: PASS");
  console.log("\nALL PROSE REGRESSION CHECKS PASSED");

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
