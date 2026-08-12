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

export interface ThoughtFragment {
  id: string;
  personId: string;
  sourceId: string;
  /** Optional short paraphrase placeholder — never a fabricated direct quote. */
  excerpt?: string;
  normalizedMeaning: string;
  themes: ThemeTag[];
  lifeStage?: string;
  historicalContext?: string;
  confidence: number;
  interpretiveNotes?: string;
}
