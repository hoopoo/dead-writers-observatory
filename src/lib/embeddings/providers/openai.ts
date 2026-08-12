import type { EmbeddingProvider } from "@/types/embedding";

export class NeuralProviderUnavailableError extends Error {
  constructor(message = "NEURAL PROVIDER UNAVAILABLE") {
    super(message);
    this.name = "NeuralProviderUnavailableError";
  }
}

/**
 * OpenAI / OpenAI-compatible neural embeddings.
 * Secrets and response shape stay inside this provider.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  readonly dimensions?: number;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    dimensions?: number;
  }) {
    this.apiKey =
      options?.apiKey ??
      process.env.OPENAI_API_KEY ??
      process.env.EMBEDDING_API_KEY ??
      "";
    this.modelName =
      options?.model ??
      process.env.OPENAI_EMBEDDING_MODEL ??
      process.env.EMBEDDING_MODEL ??
      "text-embedding-3-small";
    this.baseUrl =
      options?.baseUrl ??
      process.env.EMBEDDING_BASE_URL ??
      "https://api.openai.com/v1";
    this.dimensions = options?.dimensions;
  }

  static isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY);
  }

  async embedText(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new NeuralProviderUnavailableError(
        "NEURAL PROVIDER UNAVAILABLE: missing OPENAI_API_KEY / EMBEDDING_API_KEY",
      );
    }
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelName,
        input: texts,
      }),
    });
    if (!response.ok) {
      throw new NeuralProviderUnavailableError(
        `NEURAL PROVIDER UNAVAILABLE: ${response.status}`,
      );
    }
    const json = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    return json.data
      .sort((a, b) => a.index - b.index)
      .map((row) => row.embedding);
  }
}
