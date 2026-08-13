import { randomUUID } from "node:crypto";
import type {
  EvidenceBoundedProseInput,
  EvidenceBoundedProseOutput,
  ProseLLMProvider,
  ProseSection,
  ProseSectionType,
  ProseSentence,
  ProseSentenceMapping,
} from "@/types/prose";
import { PROSE_PROMPT_VERSION } from "@/types/prose";
import {
  buildProseUserPrompt,
  PROSE_SYSTEM_PROMPT,
} from "@/lib/prose/prompt";
import type { PerspectiveClaim } from "@/types/perspective-claim";

export class ProseLLMProviderUnavailableError extends Error {
  constructor(message = "PROSE LLM PROVIDER UNAVAILABLE") {
    super(message);
    this.name = "ProseLLMProviderUnavailableError";
  }
}

const PROSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["personId", "sections", "sentenceMappings"],
  properties: {
    personId: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "sentences"],
        properties: {
          type: {
            type: "string",
            enum: [
              "archive",
              "across-sources",
              "connection",
              "returned-question",
            ],
          },
          sentences: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "id",
                "text",
                "claimIds",
                "transformationType",
                "introducesNewMeaning",
              ],
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                claimIds: {
                  type: "array",
                  items: { type: "string" },
                },
                transformationType: {
                  type: "string",
                  enum: [
                    "verbatim-claim",
                    "light-edit",
                    "claim-merge",
                    "transition",
                  ],
                },
                introducesNewMeaning: { type: "boolean" },
              },
            },
          },
        },
      },
    },
    sentenceMappings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sentenceId", "claimIds", "relation", "support"],
        properties: {
          sentenceId: { type: "string" },
          claimIds: {
            type: "array",
            items: { type: "string" },
          },
          relation: {
            type: "string",
            enum: [
              "direct-restatement",
              "merged-restatement",
              "transition-only",
            ],
          },
          support: {
            type: "string",
            enum: [
              "supported",
              "partially-supported",
              "unsupported",
              "unclear",
            ],
          },
        },
      },
    },
  },
} as const;

function claimTypeToSection(type: PerspectiveClaim["claimType"]): ProseSectionType {
  switch (type) {
    case "archive-observation":
    case "writer-perspective":
      return "archive";
    case "cross-evidence-synthesis":
      return "across-sources";
    case "modern-transfer":
      return "connection";
    case "returned-question":
      return "returned-question";
    default:
      return "archive";
  }
}

/**
 * Deterministic meaning-preserving editor for tests / offline.
 * Emits light-edit sentences from approved claim texts only.
 */
export class DeterministicProseEditor implements ProseLLMProvider {
  readonly providerName = "deterministic-editor";
  readonly modelName = "claim-surface-v1";

  isConfigured(): boolean {
    return true;
  }

  async edit(input: EvidenceBoundedProseInput): Promise<EvidenceBoundedProseOutput> {
    const bySection = new Map<ProseSectionType, ProseSentence[]>();
    const mappings: ProseSentenceMapping[] = [];
    let rqCount = 0;

    for (const claim of input.approvedClaims) {
      const sectionType = claimTypeToSection(claim.claimType);
      if (sectionType === "returned-question") {
        if (rqCount >= 1) continue;
        rqCount += 1;
      }

      let text = claim.text.trim();
      if (claim.historicalTransfer === "explicit" && sectionType === "connection") {
        if (!/現在の問い|いまの問い|接続/.test(text)) {
          text = `この観点を現在の問いへ接続すると、${text}`;
        }
      }

      const sentenceId = `sent-${claim.id}`;
      const sentence: ProseSentence = {
        id: sentenceId,
        text,
        claimIds: [claim.id],
        transformationType:
          text === claim.text.trim() ? "verbatim-claim" : "light-edit",
        introducesNewMeaning: false,
      };
      const list = bySection.get(sectionType) ?? [];
      list.push(sentence);
      bySection.set(sectionType, list);
      mappings.push({
        sentenceId,
        claimIds: [claim.id],
        relation: "direct-restatement",
        support:
          claim.supportStatus === "partially-supported"
            ? "partially-supported"
            : "supported",
      });
    }

    const order: ProseSectionType[] = [
      "archive",
      "across-sources",
      "connection",
      "returned-question",
    ];
    const sections: ProseSection[] = order
      .filter((type) => (bySection.get(type)?.length ?? 0) > 0)
      .map((type) => ({ type, sentences: bySection.get(type)! }));

    return {
      personId: input.personId,
      sections,
      sentenceMappings: mappings,
      editorMetadata: {
        provider: this.providerName,
        model: this.modelName,
        promptVersion: PROSE_PROMPT_VERSION,
        temperature: 0,
      },
    };
  }
}

export class OpenAIProseLLMProvider implements ProseLLMProvider {
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
      process.env.PROSE_LLM_API_KEY ??
      "";
    this.modelName =
      options?.model ??
      process.env.OPENAI_PROSE_MODEL ??
      process.env.PROSE_LLM_MODEL ??
      "gpt-4o-mini";
    this.baseUrl =
      options?.baseUrl ??
      process.env.EMBEDDING_BASE_URL ??
      process.env.OPENAI_BASE_URL ??
      "https://api.openai.com/v1";
    this.temperature =
      options?.temperature ??
      Number(process.env.PROSE_LLM_TEMPERATURE ?? "0.1");
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async edit(input: EvidenceBoundedProseInput): Promise<EvidenceBoundedProseOutput> {
    if (!this.apiKey) {
      throw new ProseLLMProviderUnavailableError(
        "PROSE LLM PROVIDER UNAVAILABLE: missing OPENAI_API_KEY",
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
          { role: "system", content: PROSE_SYSTEM_PROMPT },
          { role: "user", content: buildProseUserPrompt(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "evidence_bounded_prose",
            strict: true,
            schema: PROSE_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ProseLLMProviderUnavailableError(
        `PROSE LLM PROVIDER UNAVAILABLE: ${response.status}`,
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      personId?: string;
      sections?: ProseSection[];
      sentenceMappings?: ProseSentenceMapping[];
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ProseLLMProviderUnavailableError(
        "PROSE LLM PROVIDER UNAVAILABLE: invalid JSON content",
      );
    }

    const sections = (parsed.sections ?? []).map((section) => ({
      ...section,
      sentences: (section.sentences ?? []).map((s) => ({
        ...s,
        id: s.id || `sent-${randomUUID().slice(0, 8)}`,
        claimIds: s.claimIds ?? [],
        introducesNewMeaning: Boolean(s.introducesNewMeaning),
      })),
    }));

    return {
      personId: parsed.personId ?? input.personId,
      sections,
      sentenceMappings: parsed.sentenceMappings ?? [],
      editorMetadata: {
        provider: this.providerName,
        model: this.modelName,
        promptVersion:
          process.env.PROSE_PROMPT_VERSION ?? PROSE_PROMPT_VERSION,
        temperature: this.temperature,
      },
    };
  }
}

export function createProseLLMProvider(options?: {
  preferDeterministic?: boolean;
}): ProseLLMProvider {
  if (options?.preferDeterministic) {
    return new DeterministicProseEditor();
  }
  const name = (process.env.PROSE_LLM_PROVIDER ?? "openai").toLowerCase();
  if (name === "deterministic") {
    return new DeterministicProseEditor();
  }
  const openai = new OpenAIProseLLMProvider();
  if (openai.isConfigured()) return openai;
  return new DeterministicProseEditor();
}

export function getProsePromptVersion(): string {
  return process.env.PROSE_PROMPT_VERSION ?? PROSE_PROMPT_VERSION;
}
