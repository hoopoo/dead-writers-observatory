import { getReviewDb, migrateReviewDb } from "@/lib/review/db";
import { cosineSimilarity } from "@/lib/embeddings/cosine";
import type {
  PassageEmbeddingRecord,
  SemanticCandidate,
  SemanticIndex,
  SemanticSearchOptions,
} from "@/types/embedding";

function ensureEmbeddingTable(): void {
  const db = getReviewDb();
  migrateReviewDb(db);

  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get("003_passage_embeddings_namespaced");

  if (!applied) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS passage_embeddings_v2 (
        passage_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        source_id TEXT NOT NULL,
        person_id TEXT NOT NULL,
        embedding_json TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        embedded_at TEXT NOT NULL,
        archive_review_version TEXT,
        PRIMARY KEY (passage_id, provider, model)
      );

      CREATE INDEX IF NOT EXISTS idx_passage_embeddings_v2_person_provider
        ON passage_embeddings_v2(person_id, provider, model);
    `);

    // Migrate legacy single-provider rows if present.
    const legacy = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='passage_embeddings'`,
      )
      .get() as { name?: string } | undefined;
    if (legacy?.name) {
      db.exec(`
        INSERT OR IGNORE INTO passage_embeddings_v2 (
          passage_id, provider, model, source_id, person_id,
          embedding_json, dimensions, content_hash, embedded_at, archive_review_version
        )
        SELECT
          passage_id,
          provider,
          COALESCE(model, ''),
          source_id,
          person_id,
          embedding_json,
          dimensions,
          content_hash,
          embedded_at,
          archive_review_version
        FROM passage_embeddings;
      `);
      db.exec(`DROP TABLE passage_embeddings;`);
    }

    db.exec(`ALTER TABLE passage_embeddings_v2 RENAME TO passage_embeddings;`);
    db.prepare(
      `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
    ).run("003_passage_embeddings_namespaced", new Date().toISOString());
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS passage_embeddings (
      passage_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      embedding_json TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      embedded_at TEXT NOT NULL,
      archive_review_version TEXT,
      PRIMARY KEY (passage_id, provider, model)
    );

    CREATE INDEX IF NOT EXISTS idx_passage_embeddings_person_provider
      ON passage_embeddings(person_id, provider, model);
  `);
}

type EmbeddingRow = {
  passage_id: string;
  provider: string;
  model: string;
  source_id: string;
  person_id: string;
  embedding_json: string;
  dimensions: number;
  content_hash: string;
  embedded_at: string;
  archive_review_version: string | null;
};

function normalizeModel(model?: string | null): string {
  return model ?? "";
}

function rowToRecord(row: EmbeddingRow): PassageEmbeddingRecord {
  return {
    passageId: row.passage_id,
    sourceId: row.source_id,
    personId: row.person_id,
    embedding: JSON.parse(row.embedding_json) as number[],
    provider: row.provider,
    model: row.model || undefined,
    dimensions: row.dimensions,
    contentHash: row.content_hash,
    embeddedAt: row.embedded_at,
    archiveReviewVersion: row.archive_review_version ?? undefined,
  };
}

export class SqliteSemanticIndex implements SemanticIndex {
  constructor() {
    ensureEmbeddingTable();
  }

  get(
    passageId: string,
    provider: string,
    model?: string,
  ): PassageEmbeddingRecord | null {
    ensureEmbeddingTable();
    const row = getReviewDb()
      .prepare(
        `SELECT * FROM passage_embeddings
         WHERE passage_id = ? AND provider = ? AND model = ?`,
      )
      .get(passageId, provider, normalizeModel(model)) as
      | EmbeddingRow
      | undefined;
    return row ? rowToRecord(row) : null;
  }

  listByPersonProvider(
    personId: string,
    provider: string,
    model?: string,
  ): PassageEmbeddingRecord[] {
    ensureEmbeddingTable();
    const rows = getReviewDb()
      .prepare(
        `SELECT * FROM passage_embeddings
         WHERE person_id = ? AND provider = ? AND model = ?`,
      )
      .all(personId, provider, normalizeModel(model)) as EmbeddingRow[];
    return rows.map(rowToRecord);
  }

  listAll(): PassageEmbeddingRecord[] {
    ensureEmbeddingTable();
    const rows = getReviewDb()
      .prepare(`SELECT * FROM passage_embeddings`)
      .all() as EmbeddingRow[];
    return rows.map(rowToRecord);
  }

  countByProvider(provider: string, model?: string): number {
    ensureEmbeddingTable();
    const row = getReviewDb()
      .prepare(
        `SELECT COUNT(*) as n FROM passage_embeddings
         WHERE provider = ? AND model = ?`,
      )
      .get(provider, normalizeModel(model)) as { n: number };
    return row.n;
  }

  async upsert(records: PassageEmbeddingRecord[]): Promise<void> {
    ensureEmbeddingTable();
    const stmt = getReviewDb().prepare(
      `INSERT INTO passage_embeddings (
        passage_id, provider, model, source_id, person_id,
        embedding_json, dimensions, content_hash, embedded_at, archive_review_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(passage_id, provider, model) DO UPDATE SET
        source_id = excluded.source_id,
        person_id = excluded.person_id,
        embedding_json = excluded.embedding_json,
        dimensions = excluded.dimensions,
        content_hash = excluded.content_hash,
        embedded_at = excluded.embedded_at,
        archive_review_version = excluded.archive_review_version`,
    );
    const tx = getReviewDb().transaction((items: PassageEmbeddingRecord[]) => {
      for (const record of items) {
        stmt.run(
          record.passageId,
          record.provider,
          normalizeModel(record.model),
          record.sourceId,
          record.personId,
          JSON.stringify(record.embedding),
          record.dimensions,
          record.contentHash,
          record.embeddedAt,
          record.archiveReviewVersion ?? null,
        );
      }
    });
    tx(records);
  }

  async remove(passageIds: string[]): Promise<void> {
    ensureEmbeddingTable();
    const stmt = getReviewDb().prepare(
      `DELETE FROM passage_embeddings WHERE passage_id = ?`,
    );
    const tx = getReviewDb().transaction((ids: string[]) => {
      for (const id of ids) stmt.run(id);
    });
    tx(passageIds);
  }

  async removeNamespace(provider: string, model?: string): Promise<number> {
    ensureEmbeddingTable();
    const result = getReviewDb()
      .prepare(
        `DELETE FROM passage_embeddings WHERE provider = ? AND model = ?`,
      )
      .run(provider, normalizeModel(model));
    return result.changes;
  }

  async removeRecord(
    passageId: string,
    provider: string,
    model?: string,
  ): Promise<void> {
    ensureEmbeddingTable();
    getReviewDb()
      .prepare(
        `DELETE FROM passage_embeddings
         WHERE passage_id = ? AND provider = ? AND model = ?`,
      )
      .run(passageId, provider, normalizeModel(model));
  }

  async search(
    queryVector: number[],
    options: SemanticSearchOptions,
  ): Promise<SemanticCandidate[]> {
    const records = this.listByPersonProvider(
      options.personId,
      options.provider,
      options.model,
    );
    const ranked = records
      .map((record) => ({
        record,
        similarity: cosineSimilarity(queryVector, record.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.topK);

    return ranked.map((item, index) => ({
      passageId: item.record.passageId,
      personId: item.record.personId,
      sourceId: item.record.sourceId,
      similarity: item.similarity,
      rank: index + 1,
      matchedBy: "semantic" as const,
    }));
  }
}

export const defaultSemanticIndex = new SqliteSemanticIndex();
