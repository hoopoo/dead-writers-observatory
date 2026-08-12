import type { QuestionAnalysis } from "./question-analysis";
import type { WriterPerspective } from "./perspective";
import type { ThreeVoicesAnalysis } from "./comparison";

export interface ObservationResult {
  analysis: QuestionAnalysis;
  perspectives: WriterPerspective[];
  comparison: ThreeVoicesAnalysis;
  safetyNotice?: string;
}
