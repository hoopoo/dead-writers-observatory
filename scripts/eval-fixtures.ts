import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { observeQuestion } from "../src/lib/observe";

async function main() {
  console.log("Dead Writers Observatory — fixture evaluation\n");

  for (const fixture of FIXTURE_QUESTIONS) {
    const result = await observeQuestion(fixture.question);
    const themeOverlap = fixture.expectedPrimaryThemes.filter((theme) =>
      result.analysis.relevantThemes.includes(theme as never),
    );

    console.log(`=== ${fixture.id}: ${fixture.label} ===`);
    console.log(`Q: ${fixture.question}`);
    console.log(`themes: ${result.analysis.relevantThemes.join(", ")}`);
    console.log(
      `expected overlap: ${themeOverlap.length}/${fixture.expectedPrimaryThemes.length}`,
    );

    for (const perspective of result.perspectives) {
      const sources = perspective.sourceFragments
        .map((f) => f.sourceTitle)
        .join(" / ");
      console.log(
        `- ${perspective.personName} [${perspective.primaryLens}] sources: ${sources}`,
      );
      console.log(
        `  perspective: ${perspective.archiveBasedPerspective.slice(0, 120)}...`,
      );
    }

    console.log(`meet: ${result.comparison.sharedConcerns[0]}`);
    console.log(`return: ${result.comparison.returnedQuestion}`);
    if (result.safetyNotice) {
      console.log("safety: NOTICE ATTACHED");
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
