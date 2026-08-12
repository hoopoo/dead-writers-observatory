import { passages } from "@/data/passages";
import { fragments } from "@/data/fragments";
import {
  getActiveFragmentReview,
  getActivePassageReview,
} from "@/lib/review/active";
import { hashEmbeddingContent } from "@/lib/embeddings/content-hash";
import { buildPassageEmbeddingPayload } from "@/lib/embeddings/payload";
import { createEmbeddingProvider } from "@/lib/embeddings/provider";
import { defaultSemanticIndex } from "@/lib/embeddings/store";
import type { PassageEmbeddingRecord } from "@/types/embedding";
import type { SourcePassage } from "@/types/source-passage";

export interface IndexReport {
  eligible: number;
  alreadyCurrent: number;
  embedded: number;
  skippedUnapproved: number;
  skippedUnverified: number;
  skippedNoText: number;
  skippedNoFragment: number;
  skippedHighOverclaim: number;
  errors: number;
  provider: string;
  model?: string;
}

function isIndexEligible(passage: SourcePassage): {
  ok: boolean;
  reason?:
    | "unverified"
    | "unapproved"
    | "no-text"
    | "no-fragment"
    | "high-overclaim"
    | "incomplete-meta";
} {
  if (passage.verificationStatus !== "verified") {
    return { ok: false, reason: "unverified" };
  }
  if (!passage.text?.trim()) return { ok: false, reason: "no-text" };
  if (!passage.voiceType) return { ok: false, reason: "incomplete-meta" };

  const review = getActivePassageReview(passage.id);
  if (!review || review.reviewStatus !== "approved") {
    return { ok: false, reason: "unapproved" };
  }

  const linked = fragments.filter((f) => f.passageId === passage.id);
  if (linked.length === 0) return { ok: false, reason: "no-fragment" };
  if (linked.some((f) => !f.authorialDistance)) {
    return { ok: false, reason: "incomplete-meta" };
  }

  for (const fragment of linked) {
    const fragReview = getActiveFragmentReview(fragment.id);
    if (fragReview?.overclaimRisk === "high") {
      return { ok: false, reason: "high-overclaim" };
    }
  }

  return { ok: true };
}

export async function indexPassageEmbeddings(): Promise<IndexReport> {
  const provider = createEmbeddingProvider();
  const report: IndexReport = {
    eligible: 0,
    alreadyCurrent: 0,
    embedded: 0,
    skippedUnapproved: 0,
    skippedUnverified: 0,
    skippedNoText: 0,
    skippedNoFragment: 0,
    skippedHighOverclaim: 0,
    errors: 0,
    provider: provider.providerName,
    model: provider.modelName,
  };

  const toEmbed: Array<{
    passage: SourcePassage;
    payload: string;
    contentHash: string;
  }> = [];

  for (const passage of passages) {
    const gate = isIndexEligible(passage);
    if (!gate.ok) {
      if (gate.reason === "unapproved") report.skippedUnapproved += 1;
      else if (gate.reason === "unverified") report.skippedUnverified += 1;
      else if (gate.reason === "no-text") report.skippedNoText += 1;
      else if (gate.reason === "no-fragment") report.skippedNoFragment += 1;
      else if (gate.reason === "high-overclaim") {
        report.skippedHighOverclaim += 1;
      }
      continue;
    }

    report.eligible += 1;
    const payload = buildPassageEmbeddingPayload(passage);
    const contentHash = hashEmbeddingContent(payload);
    const existing = defaultSemanticIndex.get(passage.id);
    if (
      existing &&
      existing.contentHash === contentHash &&
      existing.provider === provider.providerName
    ) {
      report.alreadyCurrent += 1;
      continue;
    }
    toEmbed.push({ passage, payload, contentHash });
  }

  if (toEmbed.length === 0) return report;

  try {
    const vectors = await provider.embedBatch(toEmbed.map((item) => item.payload));
    const records: PassageEmbeddingRecord[] = toEmbed.map((item, index) => ({
      passageId: item.passage.id,
      sourceId: item.passage.sourceId,
      personId: item.passage.personId,
      embedding: vectors[index],
      provider: provider.providerName,
      model: provider.modelName,
      dimensions: vectors[index].length,
      contentHash: item.contentHash,
      embeddedAt: new Date().toISOString(),
      archiveReviewVersion: getActivePassageReview(item.passage.id)?.reviewedAt,
    }));
    await defaultSemanticIndex.upsert(records);
    report.embedded = records.length;
  } catch {
    report.errors += toEmbed.length;
  }

  return report;
}

export async function pruneStaleEmbeddings(): Promise<{
  removed: number;
  kept: number;
}> {
  const all = defaultSemanticIndex.listAll();
  const removeIds: string[] = [];
  for (const record of all) {
    const passage = passages.find((p) => p.id === record.passageId);
    if (!passage) {
      removeIds.push(record.passageId);
      continue;
    }
    const gate = isIndexEligible(passage);
    if (!gate.ok) removeIds.push(record.passageId);
  }
  await defaultSemanticIndex.remove(removeIds);
  return { removed: removeIds.length, kept: all.length - removeIds.length };
}
