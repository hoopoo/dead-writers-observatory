import { l2Normalize } from "@/lib/embeddings/cosine";
import type { EmbeddingProvider } from "@/types/embedding";
import type { ThemeTag } from "@/types/thought-fragment";

/**
 * Offline embedding for v0.1 evaluation.
 * Bridges modern Japanese concerns ↔ classical archive vocabulary
 * without calling an external LLM / embedding API.
 *
 * Not a substitute for production neural embeddings — swappable via EmbeddingProvider.
 */
const THEMES: ThemeTag[] = [
  "work",
  "love",
  "loneliness",
  "money",
  "aging",
  "family",
  "society",
  "anxiety",
  "shame",
  "creativity",
  "death",
  "happiness",
  "independence",
  "self",
  "intimacy",
  "approval",
  "fear",
  "modernization",
  "obligation",
  "observation",
  "fatigue",
  "performance",
];

/** Shared concept lexicon: modern + classical cues → concept slots after themes. */
const CONCEPT_LEXICON: Array<{ concept: string; cues: string[] }> = [
  {
    concept: "labor_role",
    cues: [
      "仕事",
      "職業",
      "会社",
      "独立",
      "収入",
      "金力",
      "金",
      "AI",
      "奪",
      "肩書",
      "役割",
      "自己本位",
      "個性",
      "責任",
    ],
  },
  {
    concept: "gaze_approval",
    cues: [
      "SNS",
      "視線",
      "見られ",
      "評価",
      "承認",
      "世間",
      "道化",
      "演技",
      "笑顔",
      "恥",
      "サーヴィス",
      "人間",
    ],
  },
  {
    concept: "anxiety_nerve",
    cues: [
      "不安",
      "怖い",
      "恐れ",
      "神経",
      "歯車",
      "頭痛",
      "疲労",
      "錯覚",
      "世紀末",
      "良心",
    ],
  },
  {
    concept: "success_happiness",
    cues: [
      "成功",
      "幸福",
      "幸せ",
      "グッドセンス",
      "痩せ我慢",
      "承認",
      "富",
      "名声",
    ],
  },
  {
    concept: "aging_memory",
    cues: [
      "歳",
      "老い",
      "老",
      "記憶",
      "母",
      "晩年",
      "死",
      "狭",
      "書斎",
      "年",
    ],
  },
  {
    concept: "intimacy_guilt",
    cues: [
      "恋",
      "罪",
      "罪悪",
      "先生",
      "信頼",
      "親密",
      "孤独",
      "友達",
      "財産",
    ],
  },
  {
    concept: "self_observation",
    cues: [
      "自己",
      "観察",
      "自分",
      "意識",
      "創作",
      "芸術家",
      "道徳",
      "便宜",
    ],
  },
  {
    concept: "modern_distance",
    cues: [
      "近代",
      "社会",
      "電信",
      "ビルディング",
      "東京",
      "現代化",
      "時代",
    ],
  },
];

const TRIGRAM_DIMS = 48;
const DIMENSIONS = THEMES.length + CONCEPT_LEXICON.length + TRIGRAM_DIMS;

function stableTrigramIndex(tri: string): number {
  let hash = 2166136261;
  for (let i = 0; i < tri.length; i += 1) {
    hash ^= tri.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % TRIGRAM_DIMS;
}

function accumulate(text: string): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  const normalized = text.toLowerCase();

  for (let i = 0; i < THEMES.length; i += 1) {
    const theme = THEMES[i];
    if (normalized.includes(theme)) {
      vector[i] += 1.2;
    }
  }

  for (let i = 0; i < CONCEPT_LEXICON.length; i += 1) {
    const entry = CONCEPT_LEXICON[i];
    let hits = 0;
    for (const cue of entry.cues) {
      if (normalized.includes(cue.toLowerCase())) hits += 1;
    }
    if (hits > 0) {
      vector[THEMES.length + i] += Math.min(3, hits) * 1.5;
    }
  }

  const compact = normalized.replace(/\s+/g, "");
  for (let i = 0; i < compact.length - 2; i += 1) {
    const tri = compact.slice(i, i + 3);
    const idx = THEMES.length + CONCEPT_LEXICON.length + stableTrigramIndex(tri);
    vector[idx] += 0.15;
  }

  return l2Normalize(vector);
}

export class LocalBridgeEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = "local-bridge";
  readonly modelName = "concept-bridge-v0.1";
  readonly dimensions = DIMENSIONS;

  async embedText(text: string): Promise<number[]> {
    return accumulate(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embedText(text)));
  }
}
