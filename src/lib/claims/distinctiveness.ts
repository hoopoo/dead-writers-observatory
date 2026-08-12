import { textSimilarity } from "@/lib/claims/llm/novelty";
import { extractConcepts } from "@/lib/claims/redundancy";
import { claimPairRelationship } from "@/lib/claims/redundancy";
import type {
  CrossWriterDistinctivenessAnalysis,
  PerspectiveClaim,
  ReturnedQuestionDistinctiveness,
  ThemeSaturation,
  WriterPerspectiveDiversity,
  WriterPerspectiveFingerprint,
} from "@/types/perspective-claim";

const GENERIC_PSYCHOLOGY = [
  { key: "self-worth", pattern: /自己価値|セルフワース|self-worth/i },
  { key: "validation", pattern: /バリデーション|承認欲求だけ|validation/i },
  { key: "authentic-self", pattern: /自分らしく|真正の自己|authentic/i },
  { key: "boundaries", pattern: /境界線|boundaries/i },
  { key: "trauma", pattern: /トラウマ|trauma/i },
  { key: "identity", pattern: /アイデンティティ|identity/i },
  { key: "self-esteem", pattern: /自尊心|セルフエスティーム|self-esteem/i },
];

function themesFromClaims(claims: PerspectiveClaim[]): string[] {
  const bag: string[] = [];
  for (const claim of claims) {
    bag.push(...extractConcepts(claim.text));
  }
  return bag;
}

function countThemes(themes: string[]): ThemeSaturation[] {
  const counts = new Map<string, number>();
  for (const theme of themes) {
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  const total = Math.max(1, themes.length);
  return Array.from(counts.entries())
    .map(([theme, count]) => ({
      theme,
      count,
      ratio: count / total,
    }))
    .sort((a, b) => b.count - a.count);
}

export function analyzeWriterDiversity(
  personId: string,
  claims: PerspectiveClaim[],
  evidenceSourceIds: string[] = [],
): WriterPerspectiveDiversity {
  const claimTypes = new Set(claims.map((c) => c.claimType));
  const themes = themesFromClaims(claims);
  const themeSat = countThemes(themes);
  const sources = new Set(
    evidenceSourceIds.length
      ? evidenceSourceIds
      : claims.flatMap((c) => c.evidenceIds),
  );
  const distances = new Set(claims.map((c) => c.interpretationDistance));

  let redundancyCount = 0;
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const rel = claimPairRelationship(claims[i], claims[j]);
      if (rel === "duplicate" || rel === "strong-overlap") {
        redundancyCount += 1;
      }
    }
  }

  const dominant = themeSat[0];
  const narrow =
    claims.length > 0 &&
    claimTypes.size <= 2 &&
    (dominant?.ratio ?? 0) >= 0.75;

  const score =
    claimTypes.size * 0.25 +
    Math.min(1, themeSat.length / 4) * 0.25 +
    Math.min(1, sources.size / 3) * 0.2 +
    distances.size * 0.1 -
    redundancyCount * 0.15;

  return {
    personId,
    claimTypeDiversity: claimTypes.size,
    themeDiversity: themeSat.length,
    sourceDiversity: sources.size,
    distanceDiversity: distances.size,
    redundancyCount,
    dominantTheme: dominant?.theme,
    dominantThemeRatio: dominant?.ratio ?? 0,
    score: Math.max(0, Number(score.toFixed(3))),
    themeSaturation: themeSat,
    narrowArchiveConnection: narrow,
  };
}

export function buildWriterFingerprint(
  personId: string,
  claims: PerspectiveClaim[],
): WriterPerspectiveFingerprint {
  const themeSat = countThemes(themesFromClaims(claims));
  return {
    personId,
    dominantThemes: themeSat.slice(0, 3).map((t) => t.theme),
    secondaryThemes: themeSat.slice(3, 6).map((t) => t.theme),
    claimTypes: Array.from(new Set(claims.map((c) => c.claimType))),
    sourceIds: Array.from(new Set(claims.flatMap((c) => c.evidenceIds))),
    authorialDistances: Array.from(
      new Set(claims.map((c) => c.interpretationDistance)),
    ),
    modernTransferConcepts: claims
      .filter((c) => c.claimType === "modern-transfer")
      .flatMap((c) => extractConcepts(c.text)),
    returnedQuestionConcepts: claims
      .filter((c) => c.claimType === "returned-question")
      .flatMap((c) => extractConcepts(c.text)),
    claimIds: claims.map((c) => c.id),
  };
}

export function analyzeReturnedQuestionDistinctiveness(
  byWriter: Record<string, string[]>,
): ReturnedQuestionDistinctiveness {
  const allConcepts = Object.entries(byWriter).map(([personId, texts]) => ({
    personId,
    concepts: Array.from(new Set(texts.flatMap((t) => extractConcepts(t)))),
  }));
  const counts = new Map<string, number>();
  for (const row of allConcepts) {
    for (const c of row.concepts) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  const repeated = Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .map(([c]) => c);
  const uniqueConcepts: Record<string, string[]> = {};
  for (const row of allConcepts) {
    uniqueConcepts[row.personId] = row.concepts.filter(
      (c) => (counts.get(c) ?? 0) === 1,
    );
  }

  // Text overlap among returned questions
  const texts = Object.values(byWriter).flat();
  let pairSim = 0;
  let pairs = 0;
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      pairSim += textSimilarity(texts[i], texts[j]);
      pairs += 1;
    }
  }
  const overlap = pairs === 0 ? 0 : pairSim / pairs;
  const risk =
    overlap >= 0.45 || repeated.length >= 3
      ? "high"
      : overlap >= 0.28 || repeated.length >= 2
        ? "medium"
        : "low";

  return {
    overlap: Number(overlap.toFixed(3)),
    repeatedConcepts: repeated,
    uniqueConcepts,
    risk,
  };
}

export function analyzeCrossWriterDistinctiveness(args: {
  question: string;
  claimsByPerson: Record<string, PerspectiveClaim[]>;
}): CrossWriterDistinctivenessAnalysis {
  const fingerprints = Object.entries(args.claimsByPerson).map(
    ([personId, claims]) => buildWriterFingerprint(personId, claims),
  );

  const themeSets = fingerprints.map((fp) => new Set(fp.dominantThemes));
  const sharedThemes: string[] = [];
  if (themeSets.length > 0) {
    for (const theme of themeSets[0]) {
      if (themeSets.every((set) => set.has(theme))) sharedThemes.push(theme);
    }
  }

  const writerSpecificThemes = fingerprints.map((fp) => ({
    personId: fp.personId,
    themes: fp.dominantThemes.filter((t) => !sharedThemes.includes(t)),
  }));

  const returnedByWriter: Record<string, string[]> = {};
  for (const [personId, claims] of Object.entries(args.claimsByPerson)) {
    returnedByWriter[personId] = claims
      .filter((c) => c.claimType === "returned-question")
      .map((c) => c.text);
  }
  const returnedQuestions =
    analyzeReturnedQuestionDistinctiveness(returnedByWriter);

  // Semantic overlap across all claim texts between writers
  const writers = Object.keys(args.claimsByPerson);
  let crossSim = 0;
  let crossPairs = 0;
  for (let i = 0; i < writers.length; i += 1) {
    for (let j = i + 1; j < writers.length; j += 1) {
      const a = args.claimsByPerson[writers[i]];
      const b = args.claimsByPerson[writers[j]];
      for (const ca of a) {
        for (const cb of b) {
          crossSim += textSimilarity(ca.text, cb.text);
          crossPairs += 1;
        }
      }
    }
  }
  const perspectiveSemanticOverlap =
    crossPairs === 0 ? 0 : Number((crossSim / crossPairs).toFixed(3));

  const warnings: string[] = [];

  // Generic modern psychology convergence
  const psychHits = GENERIC_PSYCHOLOGY.map((g) => {
    const writersHit = writers.filter((personId) =>
      args.claimsByPerson[personId].some((c) => g.pattern.test(c.text)),
    );
    return { key: g.key, writersHit };
  }).filter((row) => row.writersHit.length >= 3);
  if (psychHits.length > 0) {
    warnings.push(
      `GENERIC MODERN PSYCHOLOGY CONVERGENCE: ${psychHits
        .map((p) => p.key)
        .join(", ")}`,
    );
  }

  // Historical flattening: many high interpretationDistance modern transfers with shared psych language
  const flattening = writers.every((personId) =>
    args.claimsByPerson[personId].some(
      (c) =>
        c.claimType === "modern-transfer" &&
        c.interpretationDistance === "high" &&
        /アイデンティティ|自己価値|自分らしく/.test(c.text),
    ),
  );
  if (flattening) {
    warnings.push("HISTORICAL FLATTENING");
  }

  const specificCount = writerSpecificThemes.reduce(
    (n, row) => n + row.themes.length,
    0,
  );
  let distinctivenessScore =
    specificCount * 0.2 +
    (1 - perspectiveSemanticOverlap) * 0.5 +
    (1 - returnedQuestions.overlap) * 0.3 -
    psychHits.length * 0.15;
  distinctivenessScore = Math.max(
    0,
    Math.min(1, Number(distinctivenessScore.toFixed(3))),
  );

  const convergenceRisk =
    returnedQuestions.risk === "high" ||
    perspectiveSemanticOverlap >= 0.4 ||
    psychHits.length > 0
      ? "high"
      : returnedQuestions.risk === "medium" ||
          perspectiveSemanticOverlap >= 0.28 ||
          distinctivenessScore < 0.45
        ? "medium"
        : "low";

  if (convergenceRisk === "high") {
    warnings.push("HIGH CROSS-WRITER CONVERGENCE");
  }

  return {
    question: args.question,
    fingerprints,
    sharedThemes,
    writerSpecificThemes,
    returnedQuestionOverlap: returnedQuestions.overlap,
    perspectiveSemanticOverlap,
    distinctivenessScore,
    convergenceRisk,
    warnings,
    returnedQuestions,
  };
}
