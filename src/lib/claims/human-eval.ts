import { randomUUID } from "node:crypto";
import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import { DEFAULT_REVIEW_ACTOR, type ReviewActor } from "@/types/review";
import type {
  ClaimHumanEvaluation,
  ClaimHumanEvaluationInput,
  ClaimHumanReasonTag,
  HumanNoveltyVerdict,
} from "@/types/perspective-claim";

const MIGRATION_ID = "005_claim_human_evaluations";
const NOVELTY_MIGRATION = "007_claim_human_novelty";

export function ensureClaimHumanEvalTable(): void {
  const db = getReviewDb();
  migrateReviewDb(db);
  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(MIGRATION_ID);
  if (!applied) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS claim_human_evaluations (
        id TEXT PRIMARY KEY,
        claim_id TEXT NOT NULL,
        fixture_id TEXT NOT NULL,
        person_id TEXT NOT NULL,
        evidence_verdict TEXT NOT NULL,
        usefulness_verdict TEXT NOT NULL,
        strength_verdict TEXT NOT NULL,
        reason_tags_json TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        reviewer_id TEXT NOT NULL,
        reviewer_name TEXT NOT NULL,
        reviewer_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        UNIQUE (claim_id, reviewer_id)
      );

      CREATE INDEX IF NOT EXISTS idx_claim_human_eval_fixture
        ON claim_human_evaluations(fixture_id, person_id);
    `);
    db.prepare(
      `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
    ).run(MIGRATION_ID, new Date().toISOString());
  }

  const noveltyApplied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(NOVELTY_MIGRATION);
  if (!noveltyApplied) {
    const cols = db
      .prepare(`PRAGMA table_info(claim_human_evaluations)`)
      .all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "novelty_verdict")) {
      db.exec(
        `ALTER TABLE claim_human_evaluations ADD COLUMN novelty_verdict TEXT`,
      );
    }
    db.prepare(
      `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
    ).run(NOVELTY_MIGRATION, new Date().toISOString());
  }
}

type Row = {
  id: string;
  claim_id: string;
  fixture_id: string;
  person_id: string;
  evidence_verdict: ClaimHumanEvaluation["evidenceVerdict"];
  usefulness_verdict: ClaimHumanEvaluation["usefulnessVerdict"];
  strength_verdict: ClaimHumanEvaluation["strengthVerdict"];
  novelty_verdict: HumanNoveltyVerdict | null;
  reason_tags_json: string;
  notes: string | null;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_type: ReviewActor["type"];
  created_at: string;
  updated_at: string | null;
};

function rowToEval(row: Row): ClaimHumanEvaluation {
  return {
    id: row.id,
    claimId: row.claim_id,
    fixtureId: row.fixture_id,
    personId: row.person_id,
    evidenceVerdict: row.evidence_verdict,
    usefulnessVerdict: row.usefulness_verdict,
    strengthVerdict: row.strength_verdict,
    noveltyVerdict: row.novelty_verdict ?? undefined,
    reasonTags: JSON.parse(row.reason_tags_json) as ClaimHumanReasonTag[],
    notes: row.notes ?? undefined,
    reviewer: {
      id: row.reviewer_id,
      displayName: row.reviewer_name,
      type: row.reviewer_type,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function upsertClaimHumanEvaluation(
  input: ClaimHumanEvaluationInput,
  reviewer: ReviewActor = DEFAULT_REVIEW_ACTOR,
): ClaimHumanEvaluation {
  ensureClaimHumanEvalTable();
  const db = getReviewDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare(
      `SELECT * FROM claim_human_evaluations
       WHERE claim_id = ? AND reviewer_id = ?`,
    )
    .get(input.claimId, reviewer.id) as Row | undefined;

  if (existing) {
    db.prepare(
      `UPDATE claim_human_evaluations SET
        fixture_id = ?,
        person_id = ?,
        evidence_verdict = ?,
        usefulness_verdict = ?,
        strength_verdict = ?,
        novelty_verdict = ?,
        reason_tags_json = ?,
        notes = ?,
        reviewer_name = ?,
        reviewer_type = ?,
        updated_at = ?
       WHERE id = ?`,
    ).run(
      input.fixtureId,
      input.personId,
      input.evidenceVerdict,
      input.usefulnessVerdict,
      input.strengthVerdict,
      input.noveltyVerdict ?? null,
      JSON.stringify(input.reasonTags ?? []),
      input.notes ?? null,
      reviewer.displayName,
      reviewer.type,
      now,
      existing.id,
    );
    return getClaimHumanEvaluationById(existing.id)!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO claim_human_evaluations (
      id, claim_id, fixture_id, person_id,
      evidence_verdict, usefulness_verdict, strength_verdict, novelty_verdict,
      reason_tags_json, notes,
      reviewer_id, reviewer_name, reviewer_type,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.claimId,
    input.fixtureId,
    input.personId,
    input.evidenceVerdict,
    input.usefulnessVerdict,
    input.strengthVerdict,
    input.noveltyVerdict ?? null,
    JSON.stringify(input.reasonTags ?? []),
    input.notes ?? null,
    reviewer.id,
    reviewer.displayName,
    reviewer.type,
    now,
    null,
  );
  return getClaimHumanEvaluationById(id)!;
}

export function getClaimHumanEvaluationById(
  id: string,
): ClaimHumanEvaluation | null {
  ensureClaimHumanEvalTable();
  const row = getReviewDb()
    .prepare(`SELECT * FROM claim_human_evaluations WHERE id = ?`)
    .get(id) as Row | undefined;
  return row ? rowToEval(row) : null;
}

export function getClaimHumanEvaluation(args: {
  claimId: string;
  reviewerId?: string;
}): ClaimHumanEvaluation | null {
  ensureClaimHumanEvalTable();
  const reviewerId = args.reviewerId ?? DEFAULT_REVIEW_ACTOR.id;
  const row = getReviewDb()
    .prepare(
      `SELECT * FROM claim_human_evaluations
       WHERE claim_id = ? AND reviewer_id = ?`,
    )
    .get(args.claimId, reviewerId) as Row | undefined;
  return row ? rowToEval(row) : null;
}

export function listClaimHumanEvaluations(args?: {
  fixtureId?: string;
  personId?: string;
}): ClaimHumanEvaluation[] {
  ensureClaimHumanEvalTable();
  let sql = `SELECT * FROM claim_human_evaluations`;
  const params: string[] = [];
  const where: string[] = [];
  if (args?.fixtureId) {
    where.push(`fixture_id = ?`);
    params.push(args.fixtureId);
  }
  if (args?.personId) {
    where.push(`person_id = ?`);
    params.push(args.personId);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += ` ORDER BY created_at ASC`;
  const rows = getReviewDb().prepare(sql).all(...params) as Row[];
  return rows.map(rowToEval);
}

export function exportClaimHumanEvaluationsJson() {
  return {
    version: "claim-human-v1",
    exportedAt: new Date().toISOString(),
    evaluations: listClaimHumanEvaluations(),
  };
}
