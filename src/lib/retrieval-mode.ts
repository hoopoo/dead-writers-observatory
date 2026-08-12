import {
  MockPerspectiveRetriever,
  type PerspectiveRetriever,
} from "@/lib/retrieval";
import {
  HybridPerspectiveRetriever,
  SemanticPerspectiveRetriever,
} from "@/lib/semantic-retrieval";
import type { RetrievalMode } from "@/types/embedding";

export function getRetrievalMode(): RetrievalMode {
  const raw = (process.env.RETRIEVAL_MODE ?? "deterministic").toLowerCase();
  if (raw === "semantic" || raw === "hybrid" || raw === "deterministic") {
    return raw;
  }
  return "deterministic";
}

export function createRetriever(mode: RetrievalMode = getRetrievalMode()): {
  mode: RetrievalMode;
  retriever: PerspectiveRetriever;
} {
  if (mode === "semantic") {
    return { mode, retriever: new SemanticPerspectiveRetriever() };
  }
  if (mode === "hybrid") {
    return { mode, retriever: new HybridPerspectiveRetriever() };
  }
  return { mode: "deterministic", retriever: new MockPerspectiveRetriever() };
}

export const defaultModeRetriever = createRetriever().retriever;
