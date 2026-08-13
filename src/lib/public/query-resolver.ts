import type { QuestionAnalysis } from "@/types/question-analysis";
import type {
  FamilyMatchScore,
  PublicQueryFamily,
  PublicQueryResolution,
  PublicQueryResolver,
} from "@/types/public-query";
import {
  PUBLIC_QUERY_FAMILIES,
  PUBLIC_QUERY_RESOLVER_THRESHOLDS,
} from "@/lib/public/query-families";
import { normalizePublicQuestion } from "@/lib/public/query-normalize";

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function requiredSignalsOk(family: PublicQueryFamily, normalized: string): boolean {
  switch (family.id) {
    case "ai-job-loss":
      return (
        hasAny(normalized, [/\bai\b/, /生成ai/, /人工知能/]) &&
        hasAny(normalized, [
          /仕事/,
          /職種/,
          /職/,
          /雇用/,
          /奪わ/,
          /置き換え/,
          /なくなる/,
          /なくなり/,
          /失業/,
        ])
      );
    case "loneliness":
      return hasAny(normalized, [/孤独/, /ひとり/, /一人/, /寂しい/, /居場所/]);
    case "sns-compulsion":
      return (
        hasAny(normalized, [/\bsns\b/, /通知/]) &&
        hasAny(normalized, [/見/, /確認/, /開/, /やめ/, /つい/, /何度/, /ばかり/, /何回/])
      );
    case "aging-fear":
      return (
        hasAny(normalized, [/老い/, /老いる/, /歳/, /年を取/, /年取/]) &&
        hasAny(normalized, [/怖/, /嫌/, /不安/, /恐/])
      );
    case "success-without-happiness":
      return (
        hasAny(normalized, [/成功/, /うまくい/, /得た/, /欲しかった/]) &&
        hasAny(normalized, [/幸せ/, /幸福/, /満たされ/, /幸福感/])
      );
    case "work-income-anxiety":
      return (
        hasAny(normalized, [/会社/, /辞め/, /独立/, /退職/]) &&
        hasAny(normalized, [/収入/, /金/, /お金/, /給料/, /怖い/, /不安/, /仕事/, /生活/])
      );
    case "marriage-regret":
      return hasAny(normalized, [/結婚/]) && hasAny(normalized, [/後悔/, /しなくても/]);
    case "social-gaze":
      return hasAny(normalized, [/どう見/, /見られ/, /視線/, /人目/]);
    case "creative-meaning":
      return (
        hasAny(normalized, [/作りたい/, /創作/, /何かを作/]) &&
        hasAny(normalized, [/意味/, /わから/])
      );
    case "death-and-how-to-live":
      return hasAny(normalized, [/死/, /自死/]) && hasAny(normalized, [/生き/, /どう生き/]);
    default:
      return false;
  }
}

function exclusionHit(family: PublicQueryFamily, normalized: string): string | undefined {
  return family.exclusions?.find((token) =>
    normalized.includes(normalizePublicQuestion(token)),
  );
}

function exactBonus(
  family: PublicQueryFamily,
  normalized: string,
): { bonus: number; signal?: string } {
  if (normalizePublicQuestion(family.canonicalQuestion) === normalized) {
    return { bonus: 14, signal: `canonical:${family.canonicalFixtureId}` };
  }
  const variant = family.variants.find(
    (item) => normalizePublicQuestion(item) === normalized,
  );
  if (variant) {
    return { bonus: 12, signal: "known-variant" };
  }
  return { bonus: 0 };
}

function scoreFamily(
  family: PublicQueryFamily,
  normalized: string,
  analysis: QuestionAnalysis,
): FamilyMatchScore {
  const matchedSignals: string[] = [];
  const blockReasons: string[] = [];
  const excluded = exclusionHit(family, normalized);
  if (excluded) {
    blockReasons.push(`exclusion:${excluded}`);
  }
  if (!requiredSignalsOk(family, normalized)) {
    blockReasons.push("required-signals-missing");
  }

  const themeScore = family.themes.reduce((sum, theme) => {
    if (!analysis.relevantThemes.includes(theme)) return sum;
    matchedSignals.push(`theme:${theme}`);
    return sum + 2;
  }, 0);

  const keywordScore = family.keywords.reduce((sum, keyword) => {
    const needle = normalizePublicQuestion(keyword);
    if (!needle || !normalized.includes(needle)) return sum;
    matchedSignals.push(`keyword:${keyword}`);
    return sum + 2;
  }, 0);

  const tensionHaystack = analysis.underlyingTensions.join(" ");
  const tensionScore = (family.tensionHints ?? []).reduce((sum, hint) => {
    if (!tensionHaystack.includes(hint)) return sum;
    matchedSignals.push(`tension:${hint}`);
    return sum + 1;
  }, 0);

  const exact = exactBonus(family, normalized);
  if (exact.signal) matchedSignals.push(exact.signal);

  let safetyAdjustment = 0;
  const deathSafety =
    analysis.safetyFlags.includes("death_theme") ||
    analysis.safetyFlags.includes("self_harm_adjacent");
  if (deathSafety && family.id === "death-and-how-to-live") {
    safetyAdjustment += 3;
    matchedSignals.push("safety:death");
  } else if (deathSafety && family.id !== "death-and-how-to-live") {
    safetyAdjustment -= 4;
    matchedSignals.push("safety:non-death-penalty");
  }

  const blocked = blockReasons.length > 0;
  const total = blocked
    ? 0
    : themeScore + keywordScore + tensionScore + safetyAdjustment + exact.bonus;

  return {
    familyId: family.id,
    themeScore,
    keywordScore,
    tensionScore,
    safetyAdjustment,
    exactBonus: exact.bonus,
    total,
    matchedSignals: [...new Set(matchedSignals)],
    blocked,
    blockReasons,
  };
}

export function scorePublicQueryFamilies(
  question: string,
  analysis: QuestionAnalysis,
): FamilyMatchScore[] {
  const normalized = normalizePublicQuestion(question);
  return PUBLIC_QUERY_FAMILIES.map((family) =>
    scoreFamily(family, normalized, analysis),
  ).sort((a, b) => b.total - a.total);
}

export function resolvePublicQuery(
  question: string,
  analysis: QuestionAnalysis,
): PublicQueryResolution {
  const scores = scorePublicQueryFamilies(question, analysis);
  const viable = scores.filter((row) => !row.blocked && row.total > 0);
  const top = viable[0];
  const second = viable[1];
  const thresholds = PUBLIC_QUERY_RESOLVER_THRESHOLDS;
  const reasons: string[] = [];

  if (!top) {
    reasons.push("no approved family passed required signals");
    return {
      status: "unmatched",
      confidence: "low",
      matchedSignals: [],
      reasons,
      scores,
    };
  }

  const gap = top.total - (second?.total ?? 0);
  const family = PUBLIC_QUERY_FAMILIES.find((item) => item.id === top.familyId)!;
  const workIncome = viable.find((row) => row.familyId === "work-income-anxiety");
  const aiJobLoss = viable.find((row) => row.familyId === "ai-job-loss");
  const knownConflict =
    Boolean(workIncome && aiJobLoss) &&
    (workIncome?.total ?? 0) >= thresholds.mediumMin &&
    (aiJobLoss?.total ?? 0) >= thresholds.mediumMin;

  if (top.total < thresholds.mediumMin) {
    reasons.push(`weak top score ${top.total} < ${thresholds.mediumMin}`);
    return {
      status: "unmatched",
      familyId: top.familyId,
      canonicalFixtureId: family.canonicalFixtureId,
      confidence: "low",
      matchedSignals: top.matchedSignals,
      reasons,
      scores,
    };
  }

  if (
    knownConflict ||
    (second && second.total >= thresholds.mediumMin && gap <= thresholds.ambiguousGap)
  ) {
    if (knownConflict) {
      reasons.push(
        `ambiguous between work-income-anxiety (${workIncome!.total}) and ai-job-loss (${aiJobLoss!.total})`,
      );
    } else {
      reasons.push(
        `ambiguous between ${top.familyId} (${top.total}) and ${second!.familyId} (${second!.total})`,
      );
    }
    reasons.push("public remains silent rather than inventing a family");
    return {
      status: "ambiguous",
      familyId: top.familyId,
      canonicalFixtureId: family.canonicalFixtureId,
      confidence: "medium",
      matchedSignals: top.matchedSignals,
      reasons,
      scores,
    };
  }

  const confidence =
    top.total >= thresholds.highMin && gap >= thresholds.highGap ? "high" : "medium";
  reasons.push(`resolved to ${top.familyId} via ${family.canonicalFixtureId}`);
  if (confidence === "medium") {
    reasons.push("plausible match without a dominant gap");
  }

  return {
    status: "matched",
    familyId: top.familyId,
    canonicalFixtureId: family.canonicalFixtureId,
    confidence,
    matchedSignals: top.matchedSignals,
    reasons,
    scores,
  };
}

export const publicQueryResolver: PublicQueryResolver = {
  resolve: resolvePublicQuery,
};

export function formatPublicQueryResolutionTrace(
  question: string,
  resolution: PublicQueryResolution,
): string {
  return [
    "PUBLIC QUERY RESOLUTION",
    "",
    "Input:",
    question,
    "",
    "Family:",
    resolution.familyId ?? "(none)",
    "",
    "Status:",
    resolution.status,
    "",
    "Confidence:",
    resolution.confidence,
    "",
    "Canonical fixture:",
    resolution.canonicalFixtureId ?? "(none)",
    "",
    "Signals:",
    resolution.matchedSignals.join(" / ") || "(none)",
    "",
    "Reasons:",
    ...resolution.reasons.map((reason) => `- ${reason}`),
  ].join("\n");
}
