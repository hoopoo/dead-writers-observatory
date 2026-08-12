import { randomUUID } from "node:crypto";
import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import { DEFAULT_REVIEW_ACTOR, type ReviewActor } from "@/types/review";
import type {
  CandidateEvaluationMode,
  RetrievalHumanEvaluation,
  RetrievalHumanEvaluationInput,
  RetrievalHumanReasonTag,
  RetrievalHumanVerdict,
} from "@/types/embedding";

const MIGRATION_ID = "004_retrieval_human_evaluations";

export function ensureHumanEvalTable(): void {
  const db = getReviewDb();
  migrateReviewDb(db);
  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(MIGRATION_ID);
  if (applied) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS retrieval_human_evaluations (
      id TEXT PRIMARY KEY,
      fixture_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      baseline_mode TEXT NOT NULL DEFAULT 'deterministic',
      candidate_mode TEXT NOT NULL,
      verdict TEXT NOT NULL,
      preferred_passage_ids_json TEXT NOT NULL DEFAULT '[]',
      reason_tags_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      blind_left_mode TEXT,
      blind_right_mode TEXT,
      UNIQUE (fixture_id, person_id, baseline_mode, candidate_mode, reviewer_id)
    );

    CREATE INDEX IF NOT EXISTS idx_retrieval_human_eval_fixture
      ON retrieval_human_evaluations(fixture_id, person_id);
  `);
  db.prepare(
    `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
  ).run(MIGRATION_ID, new Date().toISOString());
}

type HumanEvalRow = {
  id: string;
  fixture_id: string;
  person_id: string;
  baseline_mode: "deterministic";
  candidate_mode: CandidateEvaluationMode;
  verdict: RetrievalHumanVerdict;
  preferred_passage_ids_json: string;
  reason_tags_json: string;
  notes: string | null;
  reviewer_id: string;
  reviewer_name: string;
  created_at: string;
  updated_at: string | null;
  blind_left_mode: string | null;
  blind_right_mode: string | null;
};

function rowToEval(row: HumanEvalRow): RetrievalHumanEvaluation {
  return {
    id: row.id,
    fixtureId: row.fixture_id,
    personId: row.person_id,
    baselineMode: row.baseline_mode,
    candidateMode: row.candidate_mode,
    verdict: row.verdict,
    preferredPassageIds: JSON.parse(row.preferred_passage_ids_json) as string[],
    reasonTags: JSON.parse(row.reason_tags_json) as RetrievalHumanReasonTag[],
    notes: row.notes ?? undefined,
    reviewer: {
      id: row.reviewer_id,
      displayName: row.reviewer_name,
      type: "human",
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    blindLeftMode: (row.blind_left_mode as RetrievalHumanEvaluation["blindLeftMode"]) ?? undefined,
    blindRightMode:
      (row.blind_right_mode as RetrievalHumanEvaluation["blindRightMode"]) ??
      undefined,
  };
}

export function upsertRetrievalHumanEvaluation(
  input: RetrievalHumanEvaluationInput,
  reviewer: ReviewActor = DEFAULT_REVIEW_ACTOR,
): RetrievalHumanEvaluation {
  ensureHumanEvalTable();
  const db = getReviewDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare(
      `SELECT * FROM retrieval_human_evaluations
       WHERE fixture_id = ? AND person_id = ? AND baseline_mode = ?
         AND candidate_mode = ? AND reviewer_id = ?`,
    )
    .get(
      input.fixtureId,
      input.personId,
      "deterministic",
      input.candidateMode,
      reviewer.id,
    ) as HumanEvalRow | undefined;

  if (existing) {
    db.prepare(
      `UPDATE retrieval_human_evaluations SET
        verdict = ?,
        preferred_passage_ids_json = ?,
        reason_tags_json = ?,
        notes = ?,
        reviewer_name = ?,
        updated_at = ?,
        blind_left_mode = ?,
        blind_right_mode = ?
       WHERE id = ?`,
    ).run(
      input.verdict,
      JSON.stringify(input.preferredPassageIds ?? []),
      JSON.stringify(input.reasonTags ?? []),
      input.notes ?? null,
      reviewer.displayName,
      now,
      input.blindLeftMode ?? null,
      input.blindRightMode ?? null,
      existing.id,
    );
    return getRetrievalHumanEvaluationById(existing.id)!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO retrieval_human_evaluations (
      id, fixture_id, person_id, baseline_mode, candidate_mode, verdict,
      preferred_passage_ids_json, reason_tags_json, notes,
      reviewer_id, reviewer_name, created_at, updated_at,
      blind_left_mode, blind_right_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.fixtureId,
    input.personId,
    "deterministic",
    input.candidateMode,
    input.verdict,
    JSON.stringify(input.preferredPassageIds ?? []),
    JSON.stringify(input.reasonTags ?? []),
    input.notes ?? null,
    reviewer.id,
    reviewer.displayName,
    now,
    null,
    input.blindLeftMode ?? null,
    input.blindRightMode ?? null,
  );
  return getRetrievalHumanEvaluationById(id)!;
}

export function getRetrievalHumanEvaluationById(
  id: string,
): RetrievalHumanEvaluation | null {
  ensureHumanEvalTable();
  const row = getReviewDb()
    .prepare(`SELECT * FROM retrieval_human_evaluations WHERE id = ?`)
    .get(id) as HumanEvalRow | undefined;
  return row ? rowToEval(row) : null;
}

export function getRetrievalHumanEvaluation(args: {
  fixtureId: string;
  personId: string;
  candidateMode: CandidateEvaluationMode;
  reviewerId?: string;
}): RetrievalHumanEvaluation | null {
  ensureHumanEvalTable();
  const reviewerId = args.reviewerId ?? DEFAULT_REVIEW_ACTOR.id;
  const row = getReviewDb()
    .prepare(
      `SELECT * FROM retrieval_human_evaluations
       WHERE fixture_id = ? AND person_id = ? AND baseline_mode = 'deterministic'
         AND candidate_mode = ? AND reviewer_id = ?`,
    )
    .get(args.fixtureId, args.personId, args.candidateMode, reviewerId) as
    | HumanEvalRow
    | undefined;
  return row ? rowToEval(row) : null;
}

export function listRetrievalHumanEvaluations(): RetrievalHumanEvaluation[] {
  ensureHumanEvalTable();
  const rows = getReviewDb()
    .prepare(
      `SELECT * FROM retrieval_human_evaluations ORDER BY created_at ASC`,
    )
    .all() as HumanEvalRow[];
  return rows.map(rowToEval);
}

export interface HumanEvalSummaryBucket {
  mode: CandidateEvaluationMode;
  better: number;
  same: number;
  worse: number;
  unclear: number;
  notReviewed: number;
  reviewed: number;
  total: number;
  betterSameRate: number;
}

export function summarizeHumanEvaluations(args: {
  evaluations: RetrievalHumanEvaluation[];
  fixtureIds: string[];
  personIds: string[];
  modes?: CandidateEvaluationMode[];
}): HumanEvalSummaryBucket[] {
  const modes: CandidateEvaluationMode[] = args.modes ?? [
    "local-semantic",
    "neural-semantic",
    "neural-hybrid",
  ];
  const total = args.fixtureIds.length * args.personIds.length;

  return modes.map((mode) => {
    const relevant = args.evaluations.filter((e) => e.candidateMode === mode);
    const better = relevant.filter((e) => e.verdict === "better").length;
    const same = relevant.filter((e) => e.verdict === "same").length;
    const worse = relevant.filter((e) => e.verdict === "worse").length;
    const unclear = relevant.filter((e) => e.verdict === "unclear").length;
    const reviewed = better + same + worse + unclear;
    const betterSameRate =
      reviewed === 0 ? 0 : ((better + same) / reviewed) * 100;
    return {
      mode,
      better,
      same,
      worse,
      unclear,
      notReviewed: Math.max(0, total - reviewed),
      reviewed,
      total,
      betterSameRate,
    };
  });
}

export const CRITICAL_WORSE_TAGS: RetrievalHumanReasonTag[] = [
  "wrong-context",
  "source-collapse",
  "distance-collapse",
  "too-associative",
];

export function listCriticalWorseCases(
  evaluations: RetrievalHumanEvaluation[],
): RetrievalHumanEvaluation[] {
  return evaluations.filter(
    (evaluation) =>
      evaluation.verdict === "worse" &&
      (evaluation.reasonTags ?? []).some((tag) =>
        CRITICAL_WORSE_TAGS.includes(tag),
      ),
  );
}

export function exportHumanEvaluationsJson(): {
  version: string;
  exportedAt: string;
  evaluations: RetrievalHumanEvaluation[];
} {
  return {
    version: "retrieval-human-v1",
    exportedAt: new Date().toISOString(),
    evaluations: listRetrievalHumanEvaluations(),
  };
}
