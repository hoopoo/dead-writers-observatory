import { randomUUID } from "node:crypto";
import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import type {
  EvidenceBoundedProseOutput,
  ProseGenerationRecord,
  ProseHumanEvaluation,
  ProseValidationResult,
} from "@/types/prose";
import type { ReviewActor } from "@/types/review";

const MIGRATION_ID = "010_prose_generation";

export function ensureProseTables(): void {
  const db = getReviewDb();
  migrateReviewDb(db);
  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(MIGRATION_ID);
  if (applied) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS prose_generation_records (
      id TEXT PRIMARY KEY,
      fixture_id TEXT,
      person_id TEXT NOT NULL,
      experiment_id TEXT NOT NULL DEFAULT 'B',
      input_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      output_json TEXT NOT NULL,
      validation_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (input_hash, provider, model, prompt_version)
    );

    CREATE INDEX IF NOT EXISTS idx_prose_gen_case
      ON prose_generation_records(fixture_id, person_id);

    CREATE TABLE IF NOT EXISTS prose_human_evaluations (
      id TEXT PRIMARY KEY,
      prose_id TEXT NOT NULL,
      fixture_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      fidelity TEXT NOT NULL,
      readability TEXT NOT NULL,
      usefulness TEXT NOT NULL,
      distinctiveness TEXT NOT NULL,
      notes TEXT,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (prose_id) REFERENCES prose_generation_records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_prose_human_prose
      ON prose_human_evaluations(prose_id);
  `);
  db.prepare(
    `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
  ).run(MIGRATION_ID, new Date().toISOString());
}

export function findCachedProse(args: {
  inputHash: string;
  provider: string;
  model: string;
  promptVersion: string;
}): ProseGenerationRecord | null {
  ensureProseTables();
  const row = getReviewDb()
    .prepare(
      `SELECT * FROM prose_generation_records
       WHERE input_hash = ? AND provider = ? AND model = ? AND prompt_version = ?`,
    )
    .get(
      args.inputHash,
      args.provider,
      args.model,
      args.promptVersion,
    ) as
    | {
        id: string;
        fixture_id: string | null;
        person_id: string;
        experiment_id: string;
        input_hash: string;
        provider: string;
        model: string;
        prompt_version: string;
        output_json: string;
        validation_json: string;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return rowToRecord(row);
}

function rowToRecord(row: {
  id: string;
  fixture_id: string | null;
  person_id: string;
  experiment_id: string;
  input_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  output_json: string;
  validation_json: string;
  created_at: string;
}): ProseGenerationRecord {
  return {
    id: row.id,
    fixtureId: row.fixture_id ?? undefined,
    personId: row.person_id,
    experimentId: "B",
    inputHash: row.input_hash,
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    output: JSON.parse(row.output_json) as EvidenceBoundedProseOutput,
    validation: JSON.parse(row.validation_json) as ProseValidationResult,
    createdAt: row.created_at,
  };
}

export function saveProseRecord(
  record: Omit<ProseGenerationRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): ProseGenerationRecord {
  ensureProseTables();
  const id = record.id ?? randomUUID();
  const createdAt = record.createdAt ?? new Date().toISOString();
  const full: ProseGenerationRecord = {
    id,
    fixtureId: record.fixtureId,
    personId: record.personId,
    experimentId: "B",
    inputHash: record.inputHash,
    provider: record.provider,
    model: record.model,
    promptVersion: record.promptVersion,
    output: record.output,
    validation: { ...record.validation, outputId: id },
    createdAt,
  };

  getReviewDb()
    .prepare(
      `INSERT INTO prose_generation_records (
        id, fixture_id, person_id, experiment_id, input_hash,
        provider, model, prompt_version, output_json, validation_json, created_at
      ) VALUES (?, ?, ?, 'B', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(input_hash, provider, model, prompt_version) DO UPDATE SET
        output_json = excluded.output_json,
        validation_json = excluded.validation_json,
        fixture_id = excluded.fixture_id,
        person_id = excluded.person_id,
        created_at = excluded.created_at
      `,
    )
    .run(
      full.id,
      full.fixtureId ?? null,
      full.personId,
      full.inputHash,
      full.provider,
      full.model,
      full.promptVersion,
      JSON.stringify(full.output),
      JSON.stringify(full.validation),
      full.createdAt,
    );

  return findCachedProse({
    inputHash: full.inputHash,
    provider: full.provider,
    model: full.model,
    promptVersion: full.promptVersion,
  })!;
}

export function getProseById(id: string): ProseGenerationRecord | null {
  ensureProseTables();
  const row = getReviewDb()
    .prepare(`SELECT * FROM prose_generation_records WHERE id = ?`)
    .get(id) as Parameters<typeof rowToRecord>[0] | undefined;
  return row ? rowToRecord(row) : null;
}

export function listProseRecords(filter?: {
  fixtureId?: string;
  personId?: string;
}): ProseGenerationRecord[] {
  ensureProseTables();
  let sql = `SELECT * FROM prose_generation_records WHERE experiment_id = 'B'`;
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
  const rows = getReviewDb().prepare(sql).all(...params) as Array<
    Parameters<typeof rowToRecord>[0]
  >;
  return rows.map(rowToRecord);
}

export function saveProseHumanEvaluation(args: {
  proseId: string;
  fixtureId: string;
  personId: string;
  fidelity: ProseHumanEvaluation["fidelity"];
  readability: ProseHumanEvaluation["readability"];
  usefulness: ProseHumanEvaluation["usefulness"];
  distinctiveness: ProseHumanEvaluation["distinctiveness"];
  notes?: string;
  reviewer: ReviewActor;
}): ProseHumanEvaluation {
  ensureProseTables();
  const evaluation: ProseHumanEvaluation = {
    id: randomUUID(),
    proseId: args.proseId,
    fixtureId: args.fixtureId,
    personId: args.personId,
    fidelity: args.fidelity,
    readability: args.readability,
    usefulness: args.usefulness,
    distinctiveness: args.distinctiveness,
    notes: args.notes,
    reviewer: args.reviewer,
    createdAt: new Date().toISOString(),
  };
  getReviewDb()
    .prepare(
      `INSERT INTO prose_human_evaluations (
        id, prose_id, fixture_id, person_id, fidelity, readability,
        usefulness, distinctiveness, notes, reviewer_id, reviewer_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      evaluation.id,
      evaluation.proseId,
      evaluation.fixtureId,
      evaluation.personId,
      evaluation.fidelity,
      evaluation.readability,
      evaluation.usefulness,
      evaluation.distinctiveness,
      evaluation.notes ?? null,
      evaluation.reviewer.id,
      evaluation.reviewer.displayName,
      evaluation.createdAt,
    );
  return evaluation;
}

export function listProseHumanEvaluations(filter?: {
  proseId?: string;
  fixtureId?: string;
}): ProseHumanEvaluation[] {
  ensureProseTables();
  let sql = `SELECT * FROM prose_human_evaluations WHERE 1=1`;
  const params: string[] = [];
  if (filter?.proseId) {
    sql += ` AND prose_id = ?`;
    params.push(filter.proseId);
  }
  if (filter?.fixtureId) {
    sql += ` AND fixture_id = ?`;
    params.push(filter.fixtureId);
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = getReviewDb().prepare(sql).all(...params) as Array<{
    id: string;
    prose_id: string;
    fixture_id: string;
    person_id: string;
    fidelity: ProseHumanEvaluation["fidelity"];
    readability: ProseHumanEvaluation["readability"];
    usefulness: ProseHumanEvaluation["usefulness"];
    distinctiveness: ProseHumanEvaluation["distinctiveness"];
    notes: string | null;
    reviewer_id: string;
    reviewer_name: string;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    proseId: row.prose_id,
    fixtureId: row.fixture_id,
    personId: row.person_id,
    fidelity: row.fidelity,
    readability: row.readability,
    usefulness: row.usefulness,
    distinctiveness: row.distinctiveness,
    notes: row.notes ?? undefined,
    reviewer: {
      id: row.reviewer_id,
      displayName: row.reviewer_name,
      type: "human" as const,
    },
    createdAt: row.created_at,
  }));
}
