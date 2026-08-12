import { getFragmentsByPersonId } from "@/data/fragments";
import { getSourceById } from "@/data/sources";
import type { SourcePassage } from "@/types/source-passage";
import type { QuestionAnalysis } from "@/types/question-analysis";
import { isWorkVoice } from "@/lib/evidence";

/**
 * Primary semantic representation = verified source text.
 * Themes are light metadata. normalizedMeaning is intentionally excluded.
 */
export function buildPassageEmbeddingPayload(passage: SourcePassage): string {
  const source = getSourceById(passage.sourceId);
  const themes = Array.from(
    new Set(
      getFragmentsByPersonId(passage.personId)
        .filter((fragment) => fragment.passageId === passage.id)
        .flatMap((fragment) => fragment.themes),
    ),
  );

  const voiceLines: string[] = [];
  voiceLines.push(`Voice: ${passage.voiceType}`);
  if (isWorkVoice(passage)) {
    voiceLines.push("Authorial relationship: work voice");
  } else if (passage.isAuthorDirectStatement) {
    voiceLines.push("Authorial relationship: author statement");
  }

  return [
    `作品: ${source?.title ?? passage.sourceId}`,
    "",
    "原文:",
    passage.text?.trim() ?? "",
    "",
    `Themes: ${themes.join(", ") || "(none)"}`,
    ...voiceLines,
  ].join("\n");
}

export function buildQueryEmbeddingPayload(analysis: QuestionAnalysis): string {
  // possibleHiddenQuestion excluded in v0.1 — avoid amplifying AI inference.
  return [
    `Surface question:`,
    analysis.surfaceQuestion,
    "",
    `Themes:`,
    analysis.relevantThemes.join(", "),
    "",
    `Tensions:`,
    analysis.underlyingTensions.join("; "),
  ].join("\n");
}
