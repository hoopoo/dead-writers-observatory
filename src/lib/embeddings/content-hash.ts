import { createHash } from "node:crypto";

export function hashEmbeddingContent(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
