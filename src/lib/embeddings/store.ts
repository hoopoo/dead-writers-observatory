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
  db.exec(`
    CREATE TABLE IF NOT EXISTS passage_embeddings (
      passage_id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      embedding_json TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT,
      dimensions INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      embedded_at TEXT NOT NULL,
      archive_review_version TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_passage_embeddings_person
      ON passage_embeddings(person_id);
  `);

  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get("002_passage_embeddings");
  if (!applied) {
    db.prepare(
      `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
    ).run("002_passage_embeddings", new Date().toISOString());
  }
}

type EmbeddingRow = {
  passage_id: string;
  source_id: string;
  person_id: string;
  embedding_json: string;
  provider: string;
  model: string | null;
  dimensions: number;
  content_hash: string;
  embedded_at: string;
  archive_review_version: string | null;
};

function rowToRecord(row: EmbeddingRow): PassageEmbeddingRecord {
  return {
    passageId: row.passage_id,
    sourceId: row.source_id,
    personId: row.person_id,
    embedding: JSON.parse(row.embedding_json) as number[],
    provider: row.provider,
    model: row.model ?? undefined,
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

  get(passageId: string): PassageEmbeddingRecord | null {
    ensureEmbeddingTable();
    const row = getReviewDb()
      .prepare(`SELECT * FROM passage_embeddings WHERE passage_id = ?`)
      .get(passageId) as EmbeddingRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  listByPerson(personId: string): PassageEmbeddingRecord[] {
    ensureEmbeddingTable();
    const rows = getReviewDb()
      .prepare(`SELECT * FROM passage_embeddings WHERE person_id = ?`)
      .all(personId) as EmbeddingRow[];
    return rows.map(rowToRecord);
  }

  listAll(): PassageEmbeddingRecord[] {
    ensureEmbeddingTable();
    const rows = getReviewDb()
      .prepare(`SELECT * FROM passage_embeddings`)
      .all() as EmbeddingRow[];
    return rows.map(rowToRecord);
  }

  async upsert(records: PassageEmbeddingRecord[]): Promise<void> {
    ensureEmbeddingTable();
    const stmt = getReviewDb().prepare(
      `INSERT INTO passage_embeddings (
        passage_id, source_id, person_id, embedding_json,
        provider, model, dimensions, content_hash, embedded_at, archive_review_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(passage_id) DO UPDATE SET
        source_id = excluded.source_id,
        person_id = excluded.person_id,
        embedding_json = excluded.embedding_json,
        provider = excluded.provider,
        model = excluded.model,
        dimensions = excluded.dimensions,
        content_hash = excluded.content_hash,
        embedded_at = excluded.embedded_at,
        archive_review_version = excluded.archive_review_version`,
    );
    const tx = getReviewDb().transaction((items: PassageEmbeddingRecord[]) => {
      for (const record of items) {
        stmt.run(
          record.passageId,
          record.sourceId,
          record.personId,
          JSON.stringify(record.embedding),
          record.provider,
          record.model ?? null,
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

  async search(
    queryVector: number[],
    options: SemanticSearchOptions,
  ): Promise<SemanticCandidate[]> {
    const records = this.listByPerson(options.personId);
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
