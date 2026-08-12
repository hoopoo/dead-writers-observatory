export type ThemeTag =
  | "work"
  | "love"
  | "loneliness"
  | "money"
  | "aging"
  | "family"
  | "society"
  | "anxiety"
  | "shame"
  | "creativity"
  | "death"
  | "happiness"
  | "independence"
  | "self"
  | "intimacy"
  | "approval"
  | "fear"
  | "modernization"
  | "obligation"
  | "observation"
  | "fatigue"
  | "performance";

export type InterpretationType =
  | "direct-author-statement"
  | "work-level-theme"
  | "narrative-perspective"
  | "biographical-context"
  | "critical-inference";

export type AuthorialDistance = "direct" | "near" | "indirect" | "unknown";

export type FragmentConfidence = "high" | "medium" | "low";

export interface ThoughtFragment {
  id: string;
  personId: string;
  sourceId: string;
  passageId: string;
  normalizedMeaning: string;
  themes: ThemeTag[];
  interpretationType: InterpretationType;
  authorialDistance: AuthorialDistance;
  historicalContext?: string;
  lifeStage?: string;
  confidence: FragmentConfidence;
  interpretiveNotes?: string;
}
