import type { QuestionAnalysis } from "@/types/question-analysis";
import type { ThemeTag } from "@/types/thought-fragment";

export type PublicQueryFamilyId =
  | "work-income-anxiety"
  | "loneliness"
  | "sns-compulsion"
  | "ai-job-loss"
  | "success-without-happiness"
  | "aging-fear"
  | "marriage-regret"
  | "social-gaze"
  | "creative-meaning"
  | "death-and-how-to-live";

export interface PublicQueryFamily {
  id: PublicQueryFamilyId;
  canonicalFixtureId: string;
  canonicalQuestion: string;
  themes: ThemeTag[];
  keywords: string[];
  variants: string[];
  exclusions?: string[];
  tensionHints?: string[];
}

export interface FamilyMatchScore {
  familyId: PublicQueryFamilyId;
  themeScore: number;
  keywordScore: number;
  tensionScore: number;
  safetyAdjustment: number;
  exactBonus: number;
  total: number;
  matchedSignals: string[];
  blocked: boolean;
  blockReasons: string[];
}

export interface PublicQueryResolution {
  status: "matched" | "ambiguous" | "unmatched";
  familyId?: PublicQueryFamilyId;
  canonicalFixtureId?: string;
  confidence: "high" | "medium" | "low";
  matchedSignals: string[];
  reasons: string[];
  scores?: FamilyMatchScore[];
}

export interface PublicQueryResolver {
  resolve(question: string, analysis: QuestionAnalysis): PublicQueryResolution;
}

export interface PublicQueryResolverThresholds {
  highMin: number;
  mediumMin: number;
  highGap: number;
  ambiguousGap: number;
}
