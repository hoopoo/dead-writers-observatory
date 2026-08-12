import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { observeQuestion } from "../src/lib/observe";

const SPECIAL_TESTS = [
  {
    id: "A",
    question: "人からどう見られているか気になります。",
    personId: "person-dazai",
    assert: (sources: string[]) => {
      const unique = new Set(sources);
      const hasNingen = sources.some((s) => s.includes("人間失格"));
      const hasOther =
        sources.some((s) => s.includes("津軽")) ||
        sources.some((s) => s.includes("富嶽百景"));
      return {
        ok: unique.size >= 2 && hasNingen && hasOther,
        detail: `sources=${[...unique].join(", ")}`,
      };
    },
  },
  {
    id: "B",
    question: "死ぬことを考えることがあります。どう生きればいいのでしょうか。",
    personId: "person-akutagawa",
    assert: (
      sources: string[],
      perspectiveText: string,
      safety?: string,
      distances?: string[],
    ) => {
      const hasWork =
        sources.some((s) => s.includes("歯車")) ||
        sources.some((s) => s.includes("或阿呆の一生"));
      const noSuicideSimplification = !/自殺を説明|同じ苦しみを経験/.test(
        perspectiveText,
      );
      return {
        ok: Boolean(hasWork && safety && noSuicideSimplification),
        detail: `sources=${sources.join(" / ")}; distances=${distances?.join(",")}; safety=${Boolean(safety)}`,
      };
    },
  },
  {
    id: "C",
    question: "友達はいるのに孤独です。",
    personId: "person-soseki",
    assert: (
      _sources: string[],
      perspectiveText: string,
      _safety?: string,
      distances?: string[],
      evidenceRoles?: string[],
    ) => {
      const usesKokoro = _sources.some((s) => s.includes("こころ"));
      const treatsAsAuthorExperience =
        /漱石本人の体験である|漱石の体験として|漱石は.*を体験した/.test(
          perspectiveText,
        );
      const kokoroIsIndirect =
        !usesKokoro ||
        distances?.includes("indirect") ||
        evidenceRoles?.includes("work-perspective");
      return {
        ok: !treatsAsAuthorExperience && kokoroIsIndirect,
        detail: `sources=${_sources.join(" / ")}; distances=${distances?.join(",")}; authorExperienceLeak=${treatsAsAuthorExperience}`,
      };
    },
  },
];

async function main() {
  console.log("Dead Writers Observatory — fixture evaluation (archive integrity)\n");

  let specialPass = 0;

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
      const sources = perspective.evidence.map((e) => e.sourceTitle);
      const uniqueSources = [...new Set(sources)];
      const distances = perspective.evidence.map((e) => e.authorialDistance);
      const provenances = perspective.evidence.map((e) => e.provenance);

      console.log(
        `- ${perspective.personName} [${perspective.primaryLens}] sources(${uniqueSources.length}): ${uniqueSources.join(" / ")}`,
      );
      console.log(`  distances: ${distances.join(", ")}`);
      console.log(`  provenance: ${provenances.join(", ")}`);
      console.log(`  archival: ${perspective.archivalDistance.summaryText}`);
      console.log(
        `  perspective: ${perspective.archiveBasedPerspective.slice(0, 110)}...`,
      );

      const illegalDirect = provenances.some((p) => p === "DIRECT SOURCE");
      if (illegalDirect) {
        console.log("  FAIL: DIRECT SOURCE used without verified passage");
      }
    }

    console.log(`meet: ${result.comparison.sharedConcerns[0]}`);
    console.log(
      `can see: ${result.comparison.historicalDistance.timelessHumanThemes.slice(0, 3).join(" / ")}`,
    );
    console.log(
      `unknown: ${result.comparison.historicalDistance.historicallySpecificUnknowns.slice(0, 2).join(" / ")}`,
    );
    console.log(`return: ${result.comparison.returnedQuestion}`);
    if (result.safetyNotice) {
      console.log("safety: NOTICE ATTACHED");
    }
    console.log("");
  }

  console.log("=== SPECIAL TESTS ===");
  for (const test of SPECIAL_TESTS) {
    const result = await observeQuestion(test.question);
    const perspective = result.perspectives.find(
      (p) => p.personId === test.personId,
    );
    if (!perspective) {
      console.log(`Test ${test.id}: FAIL (missing perspective)`);
      continue;
    }

    const sources = perspective.evidence.map((e) => e.sourceTitle);
    const distances = perspective.evidence.map((e) => e.authorialDistance);
    const roles = perspective.evidence.map((e) => e.evidenceRole);
    const verdict = test.assert(
      sources,
      perspective.archiveBasedPerspective + " " + perspective.interpretation,
      result.safetyNotice,
      distances,
      roles,
    );

    if (verdict.ok) specialPass += 1;
    console.log(
      `Test ${test.id}: ${verdict.ok ? "PASS" : "FAIL"} — ${verdict.detail}`,
    );
  }

  console.log(
    `\nSpecial tests passed: ${specialPass}/${SPECIAL_TESTS.length}`,
  );

  if (specialPass < SPECIAL_TESTS.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
