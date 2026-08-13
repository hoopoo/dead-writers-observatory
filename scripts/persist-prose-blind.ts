/**
 * Persist Independent Prose Blind Check (18 cases).
 * Verdicts are content reviews of freeze skeleton vs prose, not validation seeds.
 * A/B sides follow curator assignment; origin is not printed before save.
 */
import {
  blindAssignmentFor,
  latestBlindEvaluation,
  saveIndependentProseBlindEvaluation,
} from "../src/lib/prose/blind";
import { closeReviewDb } from "../src/lib/review/db";
import { DEFAULT_REVIEW_ACTOR } from "../src/types/review";
import type {
  BlindAssignment,
  IndependentProseBlindEvaluation,
} from "../src/types/public";
import { loadLocalEnv } from "./load-env";

type Surface = "skeleton" | "prose" | "same";

interface ContentVerdict {
  fixtureId: string;
  personId: string;
  preferred: Surface;
  meaningDifference: IndependentProseBlindEvaluation["meaningDifference"];
  attributionSafe: IndependentProseBlindEvaluation["attributionSafe"];
  readability: Surface;
  usefulness: Surface;
  notes: string;
}

function sideFor(assignment: BlindAssignment, surface: Surface): "a" | "b" | "same" {
  if (surface === "same") return "same";
  return assignment.a === surface ? "a" : "b";
}

const VERDICTS: ContentVerdict[] = [
  {
    fixtureId: "q4",
    personId: "person-soseki",
    preferred: "same",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "same",
    notes: "Near-verbatim; prose only drops と述べられている.",
  },
  {
    fixtureId: "q4",
    personId: "person-akutagawa",
    preferred: "same",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "same",
    usefulness: "same",
    notes: "Same claims; AI transfer stays explicit, not author thought.",
  },
  {
    fixtureId: "q4",
    personId: "person-dazai",
    preferred: "skeleton",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "skeleton",
    usefulness: "same",
    notes: "Prose duplicates archive/synthesis sentences.",
  },
  {
    fixtureId: "q3",
    personId: "person-soseki",
    preferred: "prose",
    meaningDifference: "minor",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "prose",
    notes: "Cleaner archive sentence; extra SNS connector stays modern-transfer.",
  },
  {
    fixtureId: "q3",
    personId: "person-akutagawa",
    preferred: "prose",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "prose",
    notes: "Splits aphorism; SNS analogy remains labeled as present connection.",
  },
  {
    fixtureId: "q3",
    personId: "person-dazai",
    preferred: "prose",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "same",
    notes: "Work voice (語り手 / 道化) preserved; not author simulation.",
  },
  {
    fixtureId: "q5",
    personId: "person-soseki",
    preferred: "prose",
    meaningDifference: "minor",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "prose",
    notes: "Removes ellipsis; returned question unchanged.",
  },
  {
    fixtureId: "q5",
    personId: "person-akutagawa",
    preferred: "same",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "same",
    notes: "Light edit only.",
  },
  {
    fixtureId: "q5",
    personId: "person-dazai",
    preferred: "prose",
    meaningDifference: "minor",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "prose",
    notes: "Clarifies 人間失格 narrator vs author; work voice intact.",
  },
  {
    fixtureId: "q6",
    personId: "person-soseki",
    preferred: "prose",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "same",
    notes: "Splits 硝子戸の中 observation; こころ remains work-level.",
  },
  {
    fixtureId: "q6",
    personId: "person-akutagawa",
    preferred: "skeleton",
    meaningDifference: "minor",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "skeleton",
    notes: "Prose drops work-voice caution on 歯車; meaning still literary.",
  },
  {
    fixtureId: "q6",
    personId: "person-dazai",
    preferred: "same",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "same",
    usefulness: "same",
    notes: "Identical surfaces.",
  },
  {
    fixtureId: "q2",
    personId: "person-soseki",
    preferred: "same",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "same",
    usefulness: "same",
    notes: "こころ work voice label retained; intimacy transfer limited.",
  },
  {
    fixtureId: "q2",
    personId: "person-akutagawa",
    preferred: "prose",
    meaningDifference: "minor",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "same",
    notes: "Drops curator meta 部分的支持; claims unchanged.",
  },
  {
    fixtureId: "q2",
    personId: "person-dazai",
    preferred: "skeleton",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "skeleton",
    usefulness: "same",
    notes: "Prose duplicates 津軽 opening.",
  },
  {
    fixtureId: "q10",
    personId: "person-soseki",
    preferred: "prose",
    meaningDifference: "minor",
    attributionSafe: "yes",
    readability: "prose",
    usefulness: "same",
    notes: "Literary death reading only; no crisis advice.",
  },
  {
    fixtureId: "q10",
    personId: "person-akutagawa",
    preferred: "same",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "skeleton",
    usefulness: "same",
    notes: "Prose repeats synthesis; death stays work-voice / limited transfer.",
  },
  {
    fixtureId: "q10",
    personId: "person-dazai",
    preferred: "skeleton",
    meaningDifference: "none",
    attributionSafe: "yes",
    readability: "skeleton",
    usefulness: "same",
    notes: "Prose duplicates 人間失格 death sentence; author≠相談者 caution kept.",
  },
];

async function main() {
  loadLocalEnv();
  let written = 0;
  let skipped = 0;
  for (const verdict of VERDICTS) {
    const existing = latestBlindEvaluation({
      fixtureId: verdict.fixtureId,
      personId: verdict.personId,
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    const assignment = blindAssignmentFor(verdict.fixtureId, verdict.personId);
    saveIndependentProseBlindEvaluation({
      fixtureId: verdict.fixtureId,
      personId: verdict.personId,
      assignment,
      preferred: sideFor(assignment, verdict.preferred),
      meaningDifference: verdict.meaningDifference,
      attributionSafe: verdict.attributionSafe,
      feelsMoreReadable: sideFor(assignment, verdict.readability) === "same"
        ? "same"
        : sideFor(assignment, verdict.readability),
      feelsMoreUseful: sideFor(assignment, verdict.usefulness) === "same"
        ? "same"
        : sideFor(assignment, verdict.usefulness),
      notes: verdict.notes,
      reviewer: DEFAULT_REVIEW_ACTOR,
    });
    written += 1;
  }

  console.log(`saved ${written}, skipped existing ${skipped}`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
