import { randomUUID } from "node:crypto";
import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import { DEFAULT_REVIEW_ACTOR, type ReviewActor } from "@/types/review";
import type {
  PerspectiveSetHumanEvaluation,
  ThreeWriterExperienceEvaluation,
} from "@/types/perspective-claim";

const MIGRATION_ID = "008_perspective_human_evals";

export function ensurePerspectiveEvalTables(): void {
  const db = getReviewDb();
  migrateReviewDb(db);
  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(MIGRATION_ID);
  if (applied) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS perspective_set_human_evaluations (
      id TEXT PRIMARY KEY,
      fixture_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      usefulness TEXT NOT NULL,
      distinct_from_other_writers TEXT NOT NULL,
      evidence_feels_visible TEXT NOT NULL,
      notes TEXT,
      experiment TEXT,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (fixture_id, person_id, reviewer_id, experiment)
    );

    CREATE TABLE IF NOT EXISTS three_writer_experience_evaluations (
      id TEXT PRIMARY KEY,
      fixture_id TEXT NOT NULL,
      verdict TEXT NOT NULL,
      most_distinct_writer TEXT,
      weakest_writer TEXT,
      notes TEXT,
      experiment TEXT,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (fixture_id, reviewer_id, experiment)
    );
  `);
  db.prepare(
    `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
  ).run(MIGRATION_ID, new Date().toISOString());
}

export function upsertPerspectiveSetHumanEvaluation(
  input: Omit<PerspectiveSetHumanEvaluation, "id" | "reviewer" | "createdAt">,
  reviewer: ReviewActor = DEFAULT_REVIEW_ACTOR,
): PerspectiveSetHumanEvaluation {
  ensurePerspectiveEvalTables();
  const db = getReviewDb();
  const experiment = input.experiment ?? "B";
  const existing = db
    .prepare(
      `SELECT id FROM perspective_set_human_evaluations
       WHERE fixture_id = ? AND person_id = ? AND reviewer_id = ? AND experiment = ?`,
    )
    .get(input.fixtureId, input.personId, reviewer.id, experiment) as
    | { id: string }
    | undefined;

  const now = new Date().toISOString();
  if (existing) {
    db.prepare(
      `UPDATE perspective_set_human_evaluations SET
        usefulness = ?,
        distinct_from_other_writers = ?,
        evidence_feels_visible = ?,
        notes = ?
       WHERE id = ?`,
    ).run(
      input.usefulness,
      input.distinctFromOtherWriters,
      input.evidenceFeelsVisible,
      input.notes ?? null,
      existing.id,
    );
    return getPerspectiveSetEvalById(existing.id)!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO perspective_set_human_evaluations (
      id, fixture_id, person_id, usefulness,
      distinct_from_other_writers, evidence_feels_visible,
      notes, experiment,
      reviewer_id, reviewer_name, reviewer_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.fixtureId,
    input.personId,
    input.usefulness,
    input.distinctFromOtherWriters,
    input.evidenceFeelsVisible,
    input.notes ?? null,
    experiment,
    reviewer.id,
    reviewer.displayName,
    reviewer.type,
    now,
  );
  return getPerspectiveSetEvalById(id)!;
}

function getPerspectiveSetEvalById(
  id: string,
): PerspectiveSetHumanEvaluation | null {
  ensurePerspectiveEvalTables();
  const row = getReviewDb()
    .prepare(`SELECT * FROM perspective_set_human_evaluations WHERE id = ?`)
    .get(id) as
    | {
        id: string;
        fixture_id: string;
        person_id: string;
        usefulness: PerspectiveSetHumanEvaluation["usefulness"];
        distinct_from_other_writers: PerspectiveSetHumanEvaluation["distinctFromOtherWriters"];
        evidence_feels_visible: PerspectiveSetHumanEvaluation["evidenceFeelsVisible"];
        notes: string | null;
        experiment: "A" | "B" | "C" | null;
        reviewer_id: string;
        reviewer_name: string;
        reviewer_type: ReviewActor["type"];
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    fixtureId: row.fixture_id,
    personId: row.person_id,
    usefulness: row.usefulness,
    distinctFromOtherWriters: row.distinct_from_other_writers,
    evidenceFeelsVisible: row.evidence_feels_visible,
    notes: row.notes ?? undefined,
    experiment: row.experiment ?? undefined,
    reviewer: {
      id: row.reviewer_id,
      displayName: row.reviewer_name,
      type: row.reviewer_type,
    },
    createdAt: row.created_at,
  };
}

export function listPerspectiveSetHumanEvaluations(args?: {
  fixtureId?: string;
  experiment?: string;
}): PerspectiveSetHumanEvaluation[] {
  ensurePerspectiveEvalTables();
  let sql = `SELECT * FROM perspective_set_human_evaluations`;
  const params: string[] = [];
  const where: string[] = [];
  if (args?.fixtureId) {
    where.push(`fixture_id = ?`);
    params.push(args.fixtureId);
  }
  if (args?.experiment) {
    where.push(`experiment = ?`);
    params.push(args.experiment);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  const rows = getReviewDb().prepare(sql).all(...params) as Array<{
    id: string;
  }>;
  return rows
    .map((r) => getPerspectiveSetEvalById(r.id))
    .filter(Boolean) as PerspectiveSetHumanEvaluation[];
}

export function upsertThreeWriterExperienceEvaluation(
  input: Omit<
    ThreeWriterExperienceEvaluation,
    "id" | "reviewer" | "createdAt"
  >,
  reviewer: ReviewActor = DEFAULT_REVIEW_ACTOR,
): ThreeWriterExperienceEvaluation {
  ensurePerspectiveEvalTables();
  const db = getReviewDb();
  const experiment = input.experiment ?? "B";
  const existing = db
    .prepare(
      `SELECT id FROM three_writer_experience_evaluations
       WHERE fixture_id = ? AND reviewer_id = ? AND experiment = ?`,
    )
    .get(input.fixtureId, reviewer.id, experiment) as { id: string } | undefined;
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(
      `UPDATE three_writer_experience_evaluations SET
        verdict = ?,
        most_distinct_writer = ?,
        weakest_writer = ?,
        notes = ?
       WHERE id = ?`,
    ).run(
      input.verdict,
      input.mostDistinctWriter ?? null,
      input.weakestWriter ?? null,
      input.notes ?? null,
      existing.id,
    );
    return getThreeWriterEvalById(existing.id)!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO three_writer_experience_evaluations (
      id, fixture_id, verdict, most_distinct_writer, weakest_writer,
      notes, experiment, reviewer_id, reviewer_name, reviewer_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.fixtureId,
    input.verdict,
    input.mostDistinctWriter ?? null,
    input.weakestWriter ?? null,
    input.notes ?? null,
    experiment,
    reviewer.id,
    reviewer.displayName,
    reviewer.type,
    now,
  );
  return getThreeWriterEvalById(id)!;
}

function getThreeWriterEvalById(
  id: string,
): ThreeWriterExperienceEvaluation | null {
  ensurePerspectiveEvalTables();
  const row = getReviewDb()
    .prepare(`SELECT * FROM three_writer_experience_evaluations WHERE id = ?`)
    .get(id) as
    | {
        id: string;
        fixture_id: string;
        verdict: ThreeWriterExperienceEvaluation["verdict"];
        most_distinct_writer: string | null;
        weakest_writer: string | null;
        notes: string | null;
        experiment: "A" | "B" | "C" | null;
        reviewer_id: string;
        reviewer_name: string;
        reviewer_type: ReviewActor["type"];
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    fixtureId: row.fixture_id,
    verdict: row.verdict,
    mostDistinctWriter: row.most_distinct_writer ?? undefined,
    weakestWriter: row.weakest_writer ?? undefined,
    notes: row.notes ?? undefined,
    experiment: row.experiment ?? undefined,
    reviewer: {
      id: row.reviewer_id,
      displayName: row.reviewer_name,
      type: row.reviewer_type,
    },
    createdAt: row.created_at,
  };
}

export function listThreeWriterExperienceEvaluations(args?: {
  fixtureId?: string;
  experiment?: string;
}): ThreeWriterExperienceEvaluation[] {
  ensurePerspectiveEvalTables();
  let sql = `SELECT id FROM three_writer_experience_evaluations`;
  const params: string[] = [];
  const where: string[] = [];
  if (args?.fixtureId) {
    where.push(`fixture_id = ?`);
    params.push(args.fixtureId);
  }
  if (args?.experiment) {
    where.push(`experiment = ?`);
    params.push(args.experiment);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  const rows = getReviewDb().prepare(sql).all(...params) as Array<{
    id: string;
  }>;
  return rows
    .map((r) => getThreeWriterEvalById(r.id))
    .filter(Boolean) as ThreeWriterExperienceEvaluation[];
}
