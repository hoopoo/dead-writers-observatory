import { randomUUID } from "node:crypto";
import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import type {
  ClaimNoveltyAssessment,
  LLMClaimProposalRecord,
  LLMClaimProposalUsage,
  ValidatedLLMClaim,
} from "@/lib/claims/llm/types";
import type { PerspectiveClaim } from "@/types/perspective-claim";

const MIGRATION_ID = "006_llm_claim_proposals";

export function ensureLlmClaimTables(): void {
  const db = getReviewDb();
  migrateReviewDb(db);
  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get(MIGRATION_ID);
  if (applied) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_claim_proposal_records (
      id TEXT PRIMARY KEY,
      fixture_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      evidence_packet_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      temperature REAL,
      raw_structured_output_json TEXT,
      usage_json TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (evidence_packet_hash, provider, model, prompt_version)
    );

    CREATE TABLE IF NOT EXISTS llm_proposed_claims (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      fixture_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      claim_json TEXT NOT NULL,
      proposal_json TEXT NOT NULL,
      validation_json TEXT NOT NULL,
      experiment_status TEXT NOT NULL,
      schema_valid INTEGER NOT NULL,
      schema_issues_json TEXT NOT NULL DEFAULT '[]',
      novelty_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES llm_claim_proposal_records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_llm_proposed_claims_case
      ON llm_proposed_claims(fixture_id, person_id);
  `);
  db.prepare(
    `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
  ).run(MIGRATION_ID, new Date().toISOString());
}

type RecordRow = {
  id: string;
  fixture_id: string;
  person_id: string;
  evidence_packet_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  temperature: number | null;
  raw_structured_output_json: string | null;
  usage_json: string | null;
  created_at: string;
};

type ClaimRow = {
  id: string;
  record_id: string;
  fixture_id: string;
  person_id: string;
  claim_json: string;
  proposal_json: string;
  validation_json: string;
  experiment_status: string;
  schema_valid: number;
  schema_issues_json: string;
  novelty_json: string | null;
  created_at: string;
};

function rowToRecord(row: RecordRow): LLMClaimProposalRecord {
  return {
    id: row.id,
    fixtureId: row.fixture_id,
    personId: row.person_id,
    evidencePacketHash: row.evidence_packet_hash,
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    temperature: row.temperature ?? undefined,
    rawStructuredOutput: row.raw_structured_output_json
      ? JSON.parse(row.raw_structured_output_json)
      : undefined,
    usage: row.usage_json
      ? (JSON.parse(row.usage_json) as LLMClaimProposalUsage)
      : undefined,
    createdAt: row.created_at,
  };
}

export function findCachedProposalRecord(args: {
  evidencePacketHash: string;
  provider: string;
  model: string;
  promptVersion: string;
}): LLMClaimProposalRecord | null {
  ensureLlmClaimTables();
  const row = getReviewDb()
    .prepare(
      `SELECT * FROM llm_claim_proposal_records
       WHERE evidence_packet_hash = ?
         AND provider = ?
         AND model = ?
         AND prompt_version = ?`,
    )
    .get(
      args.evidencePacketHash,
      args.provider,
      args.model,
      args.promptVersion,
    ) as RecordRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function saveProposalRecord(args: {
  fixtureId: string;
  personId: string;
  evidencePacketHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  temperature?: number;
  rawStructuredOutput?: unknown;
  usage?: LLMClaimProposalUsage;
}): LLMClaimProposalRecord {
  ensureLlmClaimTables();
  const db = getReviewDb();
  const existing = findCachedProposalRecord(args);
  if (existing) return existing;

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO llm_claim_proposal_records (
      id, fixture_id, person_id, evidence_packet_hash,
      provider, model, prompt_version, temperature,
      raw_structured_output_json, usage_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    args.fixtureId,
    args.personId,
    args.evidencePacketHash,
    args.provider,
    args.model,
    args.promptVersion,
    args.temperature ?? null,
    args.rawStructuredOutput
      ? JSON.stringify(args.rawStructuredOutput)
      : null,
    args.usage ? JSON.stringify(args.usage) : null,
    createdAt,
  );
  return findCachedProposalRecord(args)!;
}

export function replaceProposedClaimsForRecord(args: {
  recordId: string;
  fixtureId: string;
  personId: string;
  items: ValidatedLLMClaim[];
}): void {
  ensureLlmClaimTables();
  const db = getReviewDb();
  const now = new Date().toISOString();
  const wipe = db.prepare(
    `DELETE FROM llm_proposed_claims WHERE record_id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO llm_proposed_claims (
      id, record_id, fixture_id, person_id,
      claim_json, proposal_json, validation_json,
      experiment_status, schema_valid, schema_issues_json,
      novelty_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    wipe.run(args.recordId);
    for (const item of args.items) {
      insert.run(
        item.claim.id,
        args.recordId,
        args.fixtureId,
        args.personId,
        JSON.stringify(item.claim),
        JSON.stringify(item.proposal),
        JSON.stringify({
          supportStatus: item.claim.supportStatus,
          allowed: item.claim.allowedInFinalPerspective,
          issues: item.claim.validationIssues,
        }),
        item.experimentStatus,
        item.schemaValid ? 1 : 0,
        JSON.stringify(item.schemaIssues),
        item.novelty ? JSON.stringify(item.novelty) : null,
        now,
      );
    }
  });
  tx();
}

export function listProposedClaims(args?: {
  fixtureId?: string;
  personId?: string;
}): ValidatedLLMClaim[] {
  ensureLlmClaimTables();
  const where: string[] = [];
  const params: string[] = [];
  if (args?.fixtureId) {
    where.push(`fixture_id = ?`);
    params.push(args.fixtureId);
  }
  if (args?.personId) {
    where.push(`person_id = ?`);
    params.push(args.personId);
  }
  const sql = `SELECT * FROM llm_proposed_claims${
    where.length ? ` WHERE ${where.join(" AND ")}` : ""
  } ORDER BY created_at ASC`;
  const rows = getReviewDb().prepare(sql).all(...params) as ClaimRow[];
  return rows.map((row) => ({
    claim: JSON.parse(row.claim_json) as PerspectiveClaim,
    proposal: JSON.parse(row.proposal_json),
    experimentStatus: row.experiment_status as ValidatedLLMClaim["experimentStatus"],
    schemaValid: Boolean(row.schema_valid),
    schemaIssues: JSON.parse(row.schema_issues_json) as string[],
    novelty: row.novelty_json
      ? (JSON.parse(row.novelty_json) as ClaimNoveltyAssessment)
      : undefined,
  }));
}

export function listProposalRecords(): LLMClaimProposalRecord[] {
  ensureLlmClaimTables();
  const rows = getReviewDb()
    .prepare(`SELECT * FROM llm_claim_proposal_records ORDER BY created_at ASC`)
    .all() as RecordRow[];
  return rows.map(rowToRecord);
}
