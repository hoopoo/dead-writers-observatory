import type { ThemeTag } from "./thought-fragment";

export interface QuestionAnalysis {
  rawQuestion: string;
  surfaceQuestion: string;
  underlyingTensions: string[];
  /** AI inference only — never treat as stated fact. */
  possibleHiddenQuestion: string;
  relevantThemes: ThemeTag[];
  socialLayer?: string;
  intimacyLayer?: string;
  selfLayer?: string;
  timeLayer?: string;
  confidence: number;
  safetyFlags: SafetyFlag[];
}

export type SafetyFlag =
  | "death_theme"
  | "self_harm_adjacent"
  | "medical_legal_financial"
  | "none";
