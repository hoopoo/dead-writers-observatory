import { LocalBridgeEmbeddingProvider } from "@/lib/embeddings/providers/local-bridge";
import {
  NeuralProviderUnavailableError,
  OpenAIEmbeddingProvider,
} from "@/lib/embeddings/providers/openai";
import type { EmbeddingProvider } from "@/types/embedding";

export type EmbeddingProviderKind = "local-bridge" | "openai";

export function resolveProviderKind(
  explicit?: string,
): EmbeddingProviderKind {
  const kind = (
    explicit ??
    process.env.EMBEDDING_PROVIDER ??
    "local-bridge"
  ).toLowerCase();
  if (kind === "openai" || kind === "neural") return "openai";
  return "local-bridge";
}

export function createEmbeddingProvider(
  kind?: string,
  options?: { requireNeural?: boolean },
): EmbeddingProvider {
  const resolved = resolveProviderKind(kind);
  if (resolved === "openai") {
    if (!OpenAIEmbeddingProvider.isConfigured()) {
      if (options?.requireNeural) {
        throw new NeuralProviderUnavailableError();
      }
      // Public runtime may fall back; evaluation must set requireNeural.
      return new LocalBridgeEmbeddingProvider();
    }
    return new OpenAIEmbeddingProvider();
  }
  if (options?.requireNeural) {
    throw new NeuralProviderUnavailableError(
      "NEURAL PROVIDER UNAVAILABLE: requested neural but provider is local-bridge",
    );
  }
  return new LocalBridgeEmbeddingProvider();
}

export { NeuralProviderUnavailableError };
