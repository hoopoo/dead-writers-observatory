import { LocalBridgeEmbeddingProvider } from "@/lib/embeddings/providers/local-bridge";
import { OpenAIEmbeddingProvider } from "@/lib/embeddings/providers/openai";
import type { EmbeddingProvider } from "@/types/embedding";

export function createEmbeddingProvider(): EmbeddingProvider {
  const kind = (process.env.EMBEDDING_PROVIDER ?? "local-bridge").toLowerCase();
  if (kind === "openai" && process.env.EMBEDDING_API_KEY) {
    return new OpenAIEmbeddingProvider();
  }
  return new LocalBridgeEmbeddingProvider();
}
