import { randomUUID } from "node:crypto";
import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import { DEFAULT_REVIEW_ACTOR, type ReviewActor } from "@/types/review";
import type {
  BCThreeWriterComparison,
  ExperimentComparisonHumanVerdict,
  ExperimentComparisonReason,
} from "@/lib/claims/experiment-c/types";

const MIGRATION_ID = "010_bc_experiment_comparisons";

export function ensureBcComparisonTables(): void {
  const db = getReviewDb();
  migrateReviewDb(db);
  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(MIGRATION_ID);
  if (applied) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS bc_writer_comparisons (
      id TEXT PRIMARY KEY,
      fixture_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      verdict TEXT NOT NULL,
      reasons_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (fixture_id, person_id, reviewer_id)
    );

    CREATE TABLE IF NOT EXISTS bc_three_writer_comparisons (
      id TEXT PRIMARY KEY,
      fixture_id TEXT NOT NULL,
      verdict TEXT NOT NULL,
      distinctiveness TEXT NOT NULL,
      overall_usefulness TEXT NOT NULL,
      notes TEXT,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (fixture_id, reviewer_id)
    );
  `);
  db.prepare(
    `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
  ).run(MIGRATION_ID, new Date().toISOString());
}

export function upsertBcWriterComparison(args: {
  fixtureId: string;
  personId: string;
  verdict: ExperimentComparisonHumanVerdict;
  reasons?: ExperimentComparisonReason[];
  notes?: string;
}, reviewer: ReviewActor = DEFAULT_REVIEW_ACTOR): void {
  ensureBcComparisonTables();
  const db = getReviewDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare(
      `SELECT id FROM bc_writer_comparisons
       WHERE fixture_id = ? AND person_id = ? AND reviewer_id = ?`,
    )
    .get(args.fixtureId, args.personId, reviewer.id) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE bc_writer_comparisons SET
        verdict = ?, reasons_json = ?, notes = ?
       WHERE id = ?`,
    ).run(
      args.verdict,
      JSON.stringify(args.reasons ?? []),
      args.notes ?? null,
      existing.id,
    );
    return;
  }
  db.prepare(
    `INSERT INTO bc_writer_comparisons (
      id, fixture_id, person_id, verdict, reasons_json, notes,
      reviewer_id, reviewer_name, reviewer_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    args.fixtureId,
    args.personId,
    args.verdict,
    JSON.stringify(args.reasons ?? []),
    args.notes ?? null,
    reviewer.id,
    reviewer.displayName,
    reviewer.type,
    now,
  );
}

export function listBcWriterComparisons(): Array<{
  fixtureId: string;
  personId: string;
  verdict: ExperimentComparisonHumanVerdict;
  reasons: ExperimentComparisonReason[];
  notes?: string;
}> {
  ensureBcComparisonTables();
  const rows = getReviewDb()
    .prepare(`SELECT * FROM bc_writer_comparisons`)
    .all() as Array<{
    fixture_id: string;
    person_id: string;
    verdict: ExperimentComparisonHumanVerdict;
    reasons_json: string;
    notes: string | null;
  }>;
  return rows.map((row) => ({
    fixtureId: row.fixture_id,
    personId: row.person_id,
    verdict: row.verdict,
    reasons: JSON.parse(row.reasons_json) as ExperimentComparisonReason[],
    notes: row.notes ?? undefined,
  }));
}

export function upsertBcThreeWriterComparison(
  input: Omit<BCThreeWriterComparison, "id" | "createdAt">,
  reviewer: ReviewActor = DEFAULT_REVIEW_ACTOR,
): void {
  ensureBcComparisonTables();
  const db = getReviewDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare(
      `SELECT id FROM bc_three_writer_comparisons
       WHERE fixture_id = ? AND reviewer_id = ?`,
    )
    .get(input.fixtureId, reviewer.id) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE bc_three_writer_comparisons SET
        verdict = ?, distinctiveness = ?, overall_usefulness = ?, notes = ?
       WHERE id = ?`,
    ).run(
      input.verdict,
      input.distinctiveness,
      input.overallUsefulness,
      input.notes ?? null,
      existing.id,
    );
    return;
  }
  db.prepare(
    `INSERT INTO bc_three_writer_comparisons (
      id, fixture_id, verdict, distinctiveness, overall_usefulness, notes,
      reviewer_id, reviewer_name, reviewer_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    input.fixtureId,
    input.verdict,
    input.distinctiveness,
    input.overallUsefulness,
    input.notes ?? null,
    reviewer.id,
    reviewer.displayName,
    reviewer.type,
    now,
  );
}

export function listBcThreeWriterComparisons(): BCThreeWriterComparison[] {
  ensureBcComparisonTables();
  const rows = getReviewDb()
    .prepare(`SELECT * FROM bc_three_writer_comparisons`)
    .all() as Array<{
    id: string;
    fixture_id: string;
    verdict: ExperimentComparisonHumanVerdict;
    distinctiveness: BCThreeWriterComparison["distinctiveness"];
    overall_usefulness: BCThreeWriterComparison["overallUsefulness"];
    notes: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    fixtureId: row.fixture_id,
    verdict: row.verdict,
    distinctiveness: row.distinctiveness,
    overallUsefulness: row.overall_usefulness,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }));
}
