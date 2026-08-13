/**
 * Write prose-v1.json snapshot (manual — never auto-updated).
 */
import fs from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { generateProse } from "../src/lib/prose/generate";
import { DeterministicProseEditor } from "../src/lib/prose/provider";
import { analyzeCrossWriterProseDistinctiveness } from "../src/lib/prose/distinctiveness";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const forceDet =
    process.argv.includes("--deterministic") ||
    process.env.PROSE_LLM_PROVIDER === "deterministic";
  const provider = forceDet ? new DeterministicProseEditor() : undefined;

  const cases = [];
  const distinctiveness = [];

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
      peer.push(result);
      cases.push({
        fixtureId,
        personId: person.id,
        experimentId: "B" as const,
        inputHash: result.input.inputHash,
        provider: result.record.provider,
        model: result.record.model,
        promptVersion: result.record.promptVersion,
        claimIds: result.input.approvedClaims.map((c) => c.id),
        sections: result.record.output.sections.map((s) => ({
          type: s.type,
          sentences: s.sentences.map((x) => ({
            id: x.id,
            text: x.text,
            claimIds: x.claimIds,
            transformationType: x.transformationType,
          })),
        })),
        validation: {
          totalSentences: result.record.validation.totalSentences,
          supportedSentences: result.record.validation.supportedSentences,
          unsupportedSentences: result.record.validation.unsupportedSentences,
          claimCoverageRate: result.record.validation.claimCoverageRate,
          semanticPreservationRate:
            result.record.validation.semanticPreservationRate,
          attributionViolations:
            result.record.validation.attributionViolations,
          historicalTransferViolations:
            result.record.validation.historicalTransferViolations,
          workVoiceViolations: result.record.validation.workVoiceViolations,
          newMeaningViolations: result.record.validation.newMeaningViolations,
          allowed: result.record.validation.allowed,
        },
        repaired: result.repaired,
      });
    }
    distinctiveness.push(
      analyzeCrossWriterProseDistinctiveness({
        fixtureId,
        skeletons: peer.map((r) => r.input.skeleton),
        proseByPerson: Object.fromEntries(
          peer.map((r) => [r.input.personId, r.record.output]),
        ),
      }),
    );
  }

  const bundle = {
    version: "prose-v1",
    generatedAt: new Date().toISOString(),
    experimentId: "B",
    promptVersion: process.env.PROSE_PROMPT_VERSION ?? "v1",
    cases,
    distinctiveness,
  };

  const out = path.join(
    process.cwd(),
    "src/data/generation-snapshots/prose-v1.json",
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Wrote ${out} (${cases.length} cases)`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
