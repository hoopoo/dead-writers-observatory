/**
 * Deterministic public-question normalization.
 * Routing only — does not change approved claim text.
 */
export function normalizePublicQuestion(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u00A0\u3000]/g, " ")
    .replace(/SNS/gi, "sns")
    .replace(/AI/gi, "ai")
    .replace(/人工知能/g, "ai")
    .replace(/生成ai/gi, "生成ai")
    .replace(/[！？。．.、，,｡､?!\uFF01\uFF1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function collapsePublicWhitespace(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}
