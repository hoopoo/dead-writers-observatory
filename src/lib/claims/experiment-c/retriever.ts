import { createRetriever } from "@/lib/retrieval-mode";
import { createEvaluationRetriever } from "@/lib/semantic-retrieval";
import type { PerspectiveRetriever } from "@/lib/retrieval";
import type { RetrievalMode } from "@/types/embedding";

export type ExperimentRetrievalMode = RetrievalMode | "neural-hybrid";

export function createExperimentRetriever(
  mode: ExperimentRetrievalMode,
): { mode: ExperimentRetrievalMode; retriever: PerspectiveRetriever } {
  if (mode === "neural-hybrid") {
    return {
      mode,
      retriever: createEvaluationRetriever("neural-hybrid"),
    };
  }
  return createRetriever(mode);
}
