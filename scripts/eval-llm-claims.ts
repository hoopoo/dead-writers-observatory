/**
 * Machine validation summary for LLM claim proposals.
 * Does not invent LLM output when the provider is unavailable.
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { runLlmClaimExperimentCase } from "../src/lib/claims/llm/experiment";
import { OpenAIClaimLLMProvider } from "../src/lib/claims/llm/provider";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — LLM claim machine eval\n");
  console.log("LLM proposes. Evidence decides. Human judges.\n");

  if (!OpenAIClaimLLMProvider.isConfigured()) {
    console.log("LLM CLAIM PROVIDER UNAVAILABLE");
    console.log("(OPENAI_API_KEY / CLAIM_LLM_API_KEY not set)\n");
    process.exitCode = 2;
    return;
  }

  let generated = 0;
  let schemaValid = 0;
  let allowed = 0;
  let blocked = 0;
  let unsupported = 0;
  let workVoice = 0;
  let modernAttr = 0;
  let external = 0;
  let stereotype = 0;
  let evidenceIdInvalid = 0;
  let schemaInvalid = 0;
  let duplicateReduced = 0;
  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let newAngle = 0;
  let similar = 0;
  let duplicate = 0;

  const force = process.argv.includes("--refresh");

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const result = await runLlmClaimExperimentCase({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        forceRefresh: force,
      });

      if (result.providerUnavailable) {
        console.log("LLM CLAIM PROVIDER UNAVAILABLE");
        process.exitCode = 2;
        return;
      }

      if (result.record?.usage) {
        calls += result.record.usage.calls ?? 0;
        inputTokens += result.record.usage.inputTokens ?? 0;
        outputTokens += result.record.usage.outputTokens ?? 0;
      }

      const beforeDedupe = result.llmClaims.length;
      const noveltyDupes = result.llmClaims.filter(
        (c) => c.novelty?.novelty === "duplicate",
      ).length;
      duplicateReduced += noveltyDupes;

      for (const item of result.llmClaims) {
        generated += 1;
        if (item.schemaValid) schemaValid += 1;
        else schemaInvalid += 1;
        if (item.claim.allowedInFinalPerspective) allowed += 1;
        else blocked += 1;
        if (
          item.claim.supportStatus === "unsupported" ||
          item.claim.supportStatus === "unclear"
        ) {
          unsupported += 1;
        }
        if (item.claim.validationIssues.includes("work-voice-misattribution")) {
          workVoice += 1;
        }
        if (
          item.claim.validationIssues.includes(
            "modern-concept-attributed-to-writer",
          )
        ) {
          modernAttr += 1;
        }
        if (
          item.claim.validationIssues.includes("external-knowledge-injection")
        ) {
          external += 1;
        }
        if (
          item.claim.validationIssues.includes("writer-stereotype-injection")
        ) {
          stereotype += 1;
        }
        if (item.claim.validationIssues.includes("evidence-id-invalid")) {
          evidenceIdInvalid += 1;
        }
        if (item.claim.validationIssues.includes("proposal-schema-invalid")) {
          schemaInvalid += 1;
        }
        if (item.novelty?.novelty === "new-angle") newAngle += 1;
        if (item.novelty?.novelty === "similar") similar += 1;
        if (item.novelty?.novelty === "duplicate") duplicate += 1;
      }

      const allowedCount = result.llmClaims.filter(
        (c) => c.claim.allowedInFinalPerspective,
      ).length;
      console.log(
        `${fixture.id} ${person.name}: proposals=${result.llmClaims.length} allowed=${allowedCount} (det=${result.deterministicClaims.length}, prefilter=${beforeDedupe})`,
      );
    }
  }

  console.log("\n--- Machine summary ---");
  console.log(`Generated:\n${generated}`);
  console.log(`Schema valid:\n${schemaValid}`);
  console.log(`Validator allowed:\n${allowed}`);
  console.log(`Blocked:\n${blocked}`);
  console.log(`Unsupported:\n${unsupported}`);
  console.log(`Work voice violations:\n${workVoice}`);
  console.log(`Modern attribution violations:\n${modernAttr}`);
  console.log(`External knowledge violations:\n${external}`);
  console.log(`Stereotype injections:\n${stereotype}`);
  console.log(`Evidence ID invalid:\n${evidenceIdInvalid}`);
  console.log(`Schema invalid signals:\n${schemaInvalid}`);
  console.log(`Duplicate (vs deterministic) count:\n${duplicate}`);
  console.log(`Similar:\n${similar}`);
  console.log(`New-angle:\n${newAngle}`);
  console.log(`Duplicate reduction markers:\n${duplicateReduced}`);
  console.log(`\nCost visibility:`);
  console.log(`Calls:\n${calls}`);
  console.log(`Input tokens:\n${inputTokens}`);
  console.log(`Output tokens:\n${outputTokens}`);
  console.log(`Proposal count:\n${generated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
