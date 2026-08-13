import { createHash, randomUUID } from "node:crypto";
import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import { ensureProseTables } from "@/lib/prose/store";
import type { ReviewActor } from "@/types/review";
import type {
  BlindAssignment,
  IndependentProseBlindEvaluation,
} from "@/types/public";

const MIGRATION_ID = "011_prose_blind_evaluations";

export function ensureProseBlindTables(): void {
  ensureProseTables();
  const db = getReviewDb();
  migrateReviewDb(db);
  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(MIGRATION_ID);
  if (applied) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS prose_blind_evaluations (
      id TEXT PRIMARY KEY,
      fixture_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      assignment_json TEXT NOT NULL,
      preferred TEXT NOT NULL,
      meaning_difference TEXT NOT NULL,
      attribution_safe TEXT NOT NULL,
      feels_more_readable TEXT NOT NULL,
      feels_more_useful TEXT NOT NULL,
      notes TEXT,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_prose_blind_case
      ON prose_blind_evaluations(fixture_id, person_id);
  `);
  db.prepare(
    `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
  ).run(MIGRATION_ID, new Date().toISOString());
}

/** Stable per-case randomization so refresh does not swap A/B mid-review. */
export function blindAssignmentFor(
  fixtureId: string,
  personId: string,
): BlindAssignment {
  const hex = createHash("sha256")
    .update(`${fixtureId}:${personId}`)
    .digest("hex");
  const swap = Number.parseInt(hex.slice(0, 2), 16) % 2 === 1;
  return swap
    ? { a: "prose", b: "skeleton" }
    : { a: "skeleton", b: "prose" };
}

export function saveIndependentProseBlindEvaluation(args: {
  fixtureId: string;
  personId: string;
  assignment: BlindAssignment;
  preferred: IndependentProseBlindEvaluation["preferred"];
  meaningDifference: IndependentProseBlindEvaluation["meaningDifference"];
  attributionSafe: IndependentProseBlindEvaluation["attributionSafe"];
  feelsMoreReadable: IndependentProseBlindEvaluation["feelsMoreReadable"];
  feelsMoreUseful: IndependentProseBlindEvaluation["feelsMoreUseful"];
  notes?: string;
  reviewer: ReviewActor;
}): IndependentProseBlindEvaluation {
  ensureProseBlindTables();
  const evaluation: IndependentProseBlindEvaluation = {
    id: randomUUID(),
    fixtureId: args.fixtureId,
    personId: args.personId,
    assignment: args.assignment,
    preferred: args.preferred,
    meaningDifference: args.meaningDifference,
    attributionSafe: args.attributionSafe,
    feelsMoreReadable: args.feelsMoreReadable,
    feelsMoreUseful: args.feelsMoreUseful,
    notes: args.notes,
    reviewer: args.reviewer,
    createdAt: new Date().toISOString(),
  };

  getReviewDb()
    .prepare(
      `INSERT INTO prose_blind_evaluations (
        id, fixture_id, person_id, assignment_json, preferred,
        meaning_difference, attribution_safe, feels_more_readable,
        feels_more_useful, notes, reviewer_id, reviewer_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      evaluation.id,
      evaluation.fixtureId,
      evaluation.personId,
      JSON.stringify(evaluation.assignment),
      evaluation.preferred,
      evaluation.meaningDifference,
      evaluation.attributionSafe,
      evaluation.feelsMoreReadable,
      evaluation.feelsMoreUseful,
      evaluation.notes ?? null,
      evaluation.reviewer.id,
      evaluation.reviewer.displayName,
      evaluation.createdAt,
    );

  return evaluation;
}

export function listIndependentProseBlindEvaluations(filter?: {
  fixtureId?: string;
  personId?: string;
}): IndependentProseBlindEvaluation[] {
  ensureProseBlindTables();
  let sql = `SELECT * FROM prose_blind_evaluations WHERE 1=1`;
  const params: string[] = [];
  if (filter?.fixtureId) {
    sql += ` AND fixture_id = ?`;
    params.push(filter.fixtureId);
  }
  if (filter?.personId) {
    sql += ` AND person_id = ?`;
    params.push(filter.personId);
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = getReviewDb().prepare(sql).all(...params) as Array<{
    id: string;
    fixture_id: string;
    person_id: string;
    assignment_json: string;
    preferred: IndependentProseBlindEvaluation["preferred"];
    meaning_difference: IndependentProseBlindEvaluation["meaningDifference"];
    attribution_safe: IndependentProseBlindEvaluation["attributionSafe"];
    feels_more_readable: IndependentProseBlindEvaluation["feelsMoreReadable"];
    feels_more_useful: IndependentProseBlindEvaluation["feelsMoreUseful"];
    notes: string | null;
    reviewer_id: string;
    reviewer_name: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    fixtureId: row.fixture_id,
    personId: row.person_id,
    assignment: JSON.parse(row.assignment_json) as BlindAssignment,
    preferred: row.preferred,
    meaningDifference: row.meaning_difference,
    attributionSafe: row.attribution_safe,
    feelsMoreReadable: row.feels_more_readable,
    feelsMoreUseful: row.feels_more_useful,
    notes: row.notes ?? undefined,
    reviewer: {
      id: row.reviewer_id,
      displayName: row.reviewer_name,
      type: "human" as const,
    },
    createdAt: row.created_at,
  }));
}

export function latestBlindEvaluation(args: {
  fixtureId: string;
  personId: string;
}): IndependentProseBlindEvaluation | null {
  return (
    listIndependentProseBlindEvaluations({
      fixtureId: args.fixtureId,
      personId: args.personId,
    })[0] ?? null
  );
}

export function mapSideToMode(
  assignment: BlindAssignment,
  side: "a" | "b" | "same",
): "skeleton" | "prose" | "same" {
  if (side === "same") return "same";
  return assignment[side];
}

export function summarizeBlindGate(
  evaluations: IndependentProseBlindEvaluation[],
): {
  reviewed: number;
  materialMeaning: number;
  attributionUnsafe: number;
  proseReadabilityBetterOrSame: number;
  proseUsefulnessBetterOrSame: number;
  gatePass: boolean | null;
} {
  const reviewed = evaluations.length;
  if (reviewed === 0) {
    return {
      reviewed: 0,
      materialMeaning: 0,
      attributionUnsafe: 0,
      proseReadabilityBetterOrSame: 0,
      proseUsefulnessBetterOrSame: 0,
      gatePass: null,
    };
  }

  const materialMeaning = evaluations.filter(
    (e) => e.meaningDifference === "material",
  ).length;
  const attributionUnsafe = evaluations.filter(
    (e) => e.attributionSafe === "no",
  ).length;

  const readabilityOk = evaluations.filter((e) => {
    const mode = mapSideToMode(e.assignment, e.feelsMoreReadable);
    return mode === "prose" || mode === "same";
  }).length;
  const usefulnessOk = evaluations.filter((e) => {
    const mode = mapSideToMode(e.assignment, e.feelsMoreUseful);
    return mode === "prose" || mode === "same";
  }).length;

  const gatePass =
    materialMeaning === 0 &&
    attributionUnsafe === 0 &&
    readabilityOk / reviewed >= 0.9 &&
    usefulnessOk / reviewed >= 0.9;

  return {
    reviewed,
    materialMeaning,
    attributionUnsafe,
    proseReadabilityBetterOrSame: readabilityOk,
    proseUsefulnessBetterOrSame: usefulnessOk,
    gatePass,
  };
}
