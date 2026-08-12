/**
 * Blind evidence dump for Neural Retrieval Evaluation Gate.
 * Writes derived artifact only — no secrets.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { compareRetrievalEvaluationModes } from "../src/lib/retrieval-compare";
import { closeReviewDb } from "../src/lib/review/db";
import type { ModeComparisonResult } from "../src/lib/retrieval-compare";

function flip(seed: string): boolean {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 2 === 1;
}

function pack(r: ModeComparisonResult) {
  return {
    mode: r.mode,
    quality: r.quality.total,
    sourceDiversity: r.sourceDiversity,
    distanceDiversity: r.distanceDiversity,
    themeDiversity: r.themeDiversity,
    singleSourceDominance: r.singleSourceDominance,
    sources: r.selected.map((f) => f.sourceId),
    passageIds: r.selected.map((f) => f.passageId),
    distances: r.selected.map((f) => f.authorialDistance),
    themes: r.selected.map((f) => f.themes),
    meanings: r.selected.map((f) => f.normalizedMeaning),
    previews: r.traces.map((t) => t.passagePreview),
    titles: r.traces.map((t) => t.sourceTitle),
    voices: r.traces.map((t) => t.voiceType),
  };
}

async function main() {
  const cases = [];
  for (const fixture of FIXTURE_QUESTIONS) {
    for (const person of people) {
      const comps = await compareRetrievalEvaluationModes({
        question: fixture.question,
        personId: person.id,
        modes: ["deterministic", "neural-hybrid", "neural-semantic"],
      });
      const det = comps.find((c) => c.mode === "deterministic")!;
      const hyb = comps.find((c) => c.mode === "neural-hybrid")!;
      const sem = comps.find((c) => c.mode === "neural-semantic")!;
      const seed = `${fixture.id}:${person.id}:neural-hybrid`;
      const flipped = flip(seed);
      const left = flipped ? hyb : det;
      const right = flipped ? det : hyb;
      cases.push({
        fixtureId: fixture.id,
        label: fixture.label,
        question: fixture.question,
        personId: person.id,
        personName: person.name,
        priority: ["q3", "q4", "q5", "q6"].includes(fixture.id),
        flipped,
        setA: pack(left),
        setB: pack(right),
        _det: pack(det),
        _hyb: pack(hyb),
        _sem: pack(sem),
        identicalPassageSet:
          [...det.selected.map((f) => f.passageId)].sort().join(",") ===
          [...hyb.selected.map((f) => f.passageId)].sort().join(","),
        identicalOrdered:
          det.selected.map((f) => f.passageId).join(",") ===
          hyb.selected.map((f) => f.passageId).join(","),
      });
    }
  }

  const outDir = path.join(process.cwd(), "data", "evaluations");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "blind-cases-neural-hybrid-v1.json");
  writeFileSync(outPath, JSON.stringify(cases, null, 2));
  console.log(`wrote ${cases.length} cases → ${outPath}`);
  console.log(
    `identical ordered=${cases.filter((c) => c.identicalOrdered).length}`,
  );
  console.log(
    `identical set=${cases.filter((c) => c.identicalPassageSet).length}`,
  );
  console.log(`differ=${cases.filter((c) => !c.identicalPassageSet).length}`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
