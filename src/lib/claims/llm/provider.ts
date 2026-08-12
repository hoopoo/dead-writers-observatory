import {
  LLM_CLAIM_ALLOWED_TYPES,
  LLM_CLAIM_PROMPT_VERSION,
  type ClaimLLMProvider,
  type LLMClaimProposalInput,
  type LLMClaimProposalOutput,
  type LLMProposedClaim,
} from "@/lib/claims/llm/types";
import {
  buildLLMClaimUserPrompt,
  LLM_CLAIM_SYSTEM_PROMPT,
} from "@/lib/claims/llm/prompt";

export class ClaimLLMProviderUnavailableError extends Error {
  constructor(message = "LLM CLAIM PROVIDER UNAVAILABLE") {
    super(message);
    this.name = "ClaimLLMProviderUnavailableError";
  }
}

const PROPOSAL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["proposals"],
  properties: {
    proposals: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "temporaryId",
          "claimType",
          "text",
          "evidenceIds",
          "proposedSupport",
          "proposedAuthorialAttribution",
          "proposedInterpretationDistance",
          "proposedHistoricalTransfer",
          "rationale",
        ],
        properties: {
          temporaryId: { type: "string" },
          claimType: {
            type: "string",
            enum: [...LLM_CLAIM_ALLOWED_TYPES],
          },
          text: { type: "string" },
          evidenceIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
          proposedSupport: {
            type: "string",
            enum: ["supported", "partially-supported"],
          },
          proposedAuthorialAttribution: {
            type: "string",
            enum: [
              "direct-author",
              "near-author",
              "work-level",
              "mixed",
              "none",
            ],
          },
          proposedInterpretationDistance: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          proposedHistoricalTransfer: {
            type: "string",
            enum: ["none", "limited", "explicit"],
          },
          rationale: { type: "string" },
        },
      },
    },
  },
} as const;

function parseProposals(raw: unknown): LLMProposedClaim[] {
  if (!raw || typeof raw !== "object") return [];
  const proposals = (raw as { proposals?: unknown }).proposals;
  if (!Array.isArray(proposals)) return [];
  return proposals.filter(Boolean) as LLMProposedClaim[];
}

/**
 * OpenAI (or compatible) structured claim proposal provider.
 * Secrets stay inside the provider; never log the API key.
 */
export class OpenAIClaimLLMProvider implements ClaimLLMProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly temperature: number;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    temperature?: number;
  }) {
    this.apiKey =
      options?.apiKey ??
      process.env.OPENAI_API_KEY ??
      process.env.CLAIM_LLM_API_KEY ??
      "";
    this.modelName =
      options?.model ??
      process.env.OPENAI_CLAIM_MODEL ??
      process.env.CLAIM_LLM_MODEL ??
      "gpt-4o-mini";
    this.baseUrl =
      options?.baseUrl ??
      process.env.EMBEDDING_BASE_URL ??
      process.env.OPENAI_BASE_URL ??
      "https://api.openai.com/v1";
    this.temperature =
      options?.temperature ??
      Number(process.env.CLAIM_LLM_TEMPERATURE ?? "0.2");
  }

  static isConfigured(): boolean {
    return Boolean(
      process.env.OPENAI_API_KEY || process.env.CLAIM_LLM_API_KEY,
    );
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async generateStructuredClaims(
    input: LLMClaimProposalInput,
  ): Promise<LLMClaimProposalOutput> {
    if (!this.apiKey) {
      throw new ClaimLLMProviderUnavailableError(
        "LLM CLAIM PROVIDER UNAVAILABLE: missing OPENAI_API_KEY",
      );
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelName,
        temperature: this.temperature,
        messages: [
          { role: "system", content: LLM_CLAIM_SYSTEM_PROMPT },
          { role: "user", content: buildLLMClaimUserPrompt(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "llm_claim_proposals",
            strict: true,
            schema: PROPOSAL_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ClaimLLMProviderUnavailableError(
        `LLM CLAIM PROVIDER UNAVAILABLE: ${response.status}`,
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ClaimLLMProviderUnavailableError(
        "LLM CLAIM PROVIDER UNAVAILABLE: invalid JSON content",
      );
    }

    return {
      proposals: parseProposals(parsed).slice(0, input.maxProposals),
      usage: {
        calls: 1,
        inputTokens: json.usage?.prompt_tokens,
        outputTokens: json.usage?.completion_tokens,
      },
      rawStructuredOutput: parsed,
      temperature: this.temperature,
    };
  }
}

export function createClaimLLMProvider(): ClaimLLMProvider | null {
  const name = (process.env.CLAIM_LLM_PROVIDER ?? "openai").toLowerCase();
  if (name === "openai") {
    const provider = new OpenAIClaimLLMProvider();
    return provider.isConfigured() ? provider : null;
  }
  return null;
}

export function getClaimPromptVersion(): string {
  return process.env.LLM_CLAIM_PROMPT_VERSION ?? LLM_CLAIM_PROMPT_VERSION;
}
