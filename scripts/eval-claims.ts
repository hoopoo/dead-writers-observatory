import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { generateClaimsForQuestion } from "../src/lib/claims";
import { closeReviewDb } from "../src/lib/review/db";

async function main() {
  console.log("Dead Writers Observatory — claim generation eval\n");

  const totals = {
    cases: 0,
    claims: 0,
    supported: 0,
    partial: 0,
    unsupported: 0,
    unclear: 0,
    allowed: 0,
    blocked: 0,
    workVoice: 0,
    modernAttr: 0,
    highAttr: 0,
  };

  for (const fixture of FIXTURE_QUESTIONS) {
    console.log(`=== ${fixture.id}: ${fixture.label} ===`);
    for (const person of people) {
      const result = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        retrievalMode: "deterministic",
      });
      totals.cases += 1;
      totals.claims += result.quality.totalClaims;
      totals.supported += result.quality.supported;
      totals.partial += result.quality.partiallySupported;
      totals.unsupported += result.quality.unsupported;
      totals.unclear += result.quality.unclear;
      totals.allowed += result.quality.allowed;
      totals.blocked += result.quality.blocked;
      totals.workVoice += result.quality.workVoiceViolationCount;
      totals.highAttr += result.quality.attributionRiskCount;
      totals.modernAttr += result.claims.filter((c) =>
        c.validationIssues.includes("modern-concept-attributed-to-writer"),
      ).length;

      console.log(
        `  ${person.name}: claims=${result.quality.totalClaims} supported=${result.quality.supported} partial=${result.quality.partiallySupported} blocked=${result.quality.blocked} packet=${result.packet.evidence.length}`,
      );
    }
  }

  console.log("\n=== SPECIAL GUARDS ===");
  const ai = FIXTURE_QUESTIONS.find((f) => f.id === "q4")!;
  for (const person of people) {
    const result = await generateClaimsForQuestion({
      question: ai.question,
      personId: person.id,
    });
    const modern = result.claims.filter((c) => c.claimType === "modern-transfer");
    const bad = modern.filter(
      (c) =>
        c.authorialAttribution !== "none" ||
        c.validationIssues.includes("modern-concept-attributed-to-writer"),
    );
    console.log(
      `AI ${person.name}: modern-transfers=${modern.length} badAttribution=${bad.length} allowedModern=${modern.filter((c) => c.allowedInFinalPerspective).length}`,
    );
  }

  const dazai = await generateClaimsForQuestion({
    question: "人からどう見られているかが気になります。",
    personId: "person-dazai",
  });
  const workMis = dazai.claims.filter((c) =>
    c.validationIssues.includes("work-voice-misattribution"),
  );
  console.log(`Dazai work-voice violations: ${workMis.length}`);

  console.log("\n=== TOTALS ===");
  console.log(JSON.stringify(totals, null, 2));

  const failed =
    totals.unsupported > 0 ||
    totals.workVoice > 0 ||
    totals.modernAttr > 0 ||
    totals.highAttr > 0;

  console.log(failed ? "\nFAIL" : "\nPASS");
  closeReviewDb();
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
