import { personName } from "@/lib/prose/input";
import { extractConcepts } from "@/lib/claims/redundancy";
import { textSimilarity } from "@/lib/claims/llm/novelty";
import type { PerspectiveClaim } from "@/types/perspective-claim";
import type {
  EvidenceBoundedProseInput,
  EvidenceBoundedProseOutput,
  ProseSentence,
  ProseSentenceValidation,
  ProseValidationIssue,
  ProseValidationResult,
} from "@/types/prose";

const ADVICE_PATTERNS = [
  /大切です/,
  /しましょう/,
  /すべきです/,
  /しなさい/,
  /生きることが大切/,
  /自分らしく/,
  /つながりを大切/,
];

const CERTAINTY_PATTERNS = [/したがって.*である/, /本質は/, /核心です/, /真理/];

const OUTSIDE_KNOWLEDGE = [
  /ChatGPT/,
  /Twitter/,
  /X（旧Twitter）/,
  /令和/,
  /202[0-9]年/,
];

function claimsById(input: EvidenceBoundedProseInput): Map<string, PerspectiveClaim> {
  return new Map(input.approvedClaims.map((c) => [c.id, c]));
}

function allSentences(output: EvidenceBoundedProseOutput): ProseSentence[] {
  return output.sections.flatMap((s) => s.sentences);
}

function hasAuthorStrengthening(
  text: string,
  claim: PerspectiveClaim,
  writer: string,
): boolean {
  const nameHit = text.includes(writer) || /漱石|芥川|太宰/.test(text);
  if (!nameHit) return false;
  const belief = /と考え|考えて|記して|述べて|主張|断言/.test(text);
  if (!belief) return false;
  if (
    claim.authorialAttribution === "work-level" ||
    claim.authorialAttribution === "none"
  ) {
    return true;
  }
  return false;
}

function modernTransferHidden(text: string, claim: PerspectiveClaim): boolean {
  if (claim.historicalTransfer !== "explicit") return false;
  // Block attributing modern concepts as the writer's own belief/statement.
  // Mentions like「漱石の作品に見られる〜を現在へ接続」are allowed.
  return (
    /(漱石|芥川|太宰)(は|が).{0,24}(AI|SNS|インターネット|現代の|現代において).{0,20}(考えて|述べた|記して|主張|感じて)/.test(
      text,
    ) ||
    /(漱石|芥川|太宰)(は|が).{0,12}(AI時代|SNS時代)/.test(text)
  );
}

function modernFramingLost(text: string, claim: PerspectiveClaim): boolean {
  if (claim.historicalTransfer !== "explicit") return false;
  return !/(現在の問い|いまの問い|接続|現代への|観点を現在)/.test(text);
}

function sentenceHasNewConcepts(
  sentence: ProseSentence,
  claims: PerspectiveClaim[],
): boolean {
  if (sentence.transformationType === "transition") return false;
  const claimText = claims.map((c) => c.text).join(" ");
  const claimConcepts = new Set(extractConcepts(claimText));
  const sentConcepts = extractConcepts(sentence.text);
  const novel = sentConcepts.filter((c) => !claimConcepts.has(c));
  if (novel.length === 0) return false;
  // Only flag if lexical support is also weak
  const maxSim = Math.max(
    0,
    ...claims.map((c) => textSimilarity(sentence.text, c.text)),
  );
  return maxSim < 0.28 && novel.length > 0;
}

function isTransitionOnly(sentence: ProseSentence): boolean {
  if (sentence.transformationType === "transition") return true;
  return (
    sentence.claimIds.length === 0 &&
    /並べると|見えてきます|続いて|一方で|また、/.test(sentence.text) &&
    sentence.text.length < 40
  );
}

function validateSentence(
  sentence: ProseSentence,
  input: EvidenceBoundedProseInput,
  claimMap: Map<string, PerspectiveClaim>,
  sectionType: string,
): ProseSentenceValidation {
  const issues: ProseValidationIssue[] = [];
  const writer = personName(input.personId);
  const mappedClaims = sentence.claimIds
    .map((id) => claimMap.get(id))
    .filter((c): c is PerspectiveClaim => Boolean(c));

  const unknownIds = sentence.claimIds.filter((id) => !claimMap.has(id));
  if (unknownIds.length > 0) {
    issues.push("missing-claim-mapping");
  }

  if (
    !isTransitionOnly(sentence) &&
    (sentence.claimIds.length === 0 || mappedClaims.length === 0)
  ) {
    issues.push("missing-claim-mapping");
  }

  if (sentence.introducesNewMeaning) {
    issues.push("new-meaning-added");
  }

  for (const pattern of ADVICE_PATTERNS) {
    if (pattern.test(sentence.text)) {
      const covered = mappedClaims.some((c) => pattern.test(c.text));
      if (!covered) {
        issues.push("new-advice");
        issues.push("new-meaning-added");
      }
    }
  }

  for (const pattern of CERTAINTY_PATTERNS) {
    if (pattern.test(sentence.text)) {
      const covered = mappedClaims.some((c) => pattern.test(c.text));
      if (!covered) {
        issues.push("certainty-increased");
        issues.push("new-meaning-added");
      }
    }
  }

  for (const pattern of OUTSIDE_KNOWLEDGE) {
    if (pattern.test(sentence.text)) {
      const covered = mappedClaims.some((c) => pattern.test(c.text));
      if (!covered) issues.push("outside-knowledge");
    }
  }

  for (const claim of mappedClaims) {
    if (hasAuthorStrengthening(sentence.text, claim, writer)) {
      if (claim.authorialAttribution === "work-level") {
        issues.push("work-voice-misattribution");
      }
      issues.push("authorial-strengthened");
    }
    if (modernTransferHidden(sentence.text, claim)) {
      issues.push("modern-transfer-hidden");
      issues.push("historical-distance-lost");
    }
  }

  if (
    sectionType === "connection" &&
    mappedClaims.some((c) => c.historicalTransfer === "explicit") &&
    modernFramingLost(sentence.text, mappedClaims[0])
  ) {
    // Soft: only if also author-attributing modern
    if (/(漱石|芥川|太宰)/.test(sentence.text)) {
      issues.push("modern-transfer-hidden");
    }
  }

  if (sectionType === "returned-question") {
    const rqClaims = input.approvedClaims.filter(
      (c) => c.claimType === "returned-question",
    );
    const maxSim = Math.max(
      0,
      ...rqClaims.map((c) => textSimilarity(sentence.text, c.text)),
    );
    if (rqClaims.length === 0 || maxSim < 0.45) {
      issues.push("new-returned-question");
      issues.push("new-meaning-added");
    }
  }

  if (
    !isTransitionOnly(sentence) &&
    mappedClaims.length > 0 &&
    sentenceHasNewConcepts(sentence, mappedClaims)
  ) {
    issues.push("unsupported-synthesis");
    issues.push("new-meaning-added");
  }

  // Bad transition with core claim language
  if (
    isTransitionOnly(sentence) &&
    /核心|本質|真理|だから人間とは/.test(sentence.text)
  ) {
    issues.push("new-meaning-added");
  }

  let support: ProseSentenceValidation["support"] = "supported";
  if (
    issues.includes("missing-claim-mapping") ||
    issues.includes("new-meaning-added") ||
    issues.includes("new-advice") ||
    issues.includes("outside-knowledge") ||
    issues.includes("new-returned-question") ||
    issues.includes("authorial-strengthened") ||
    issues.includes("work-voice-misattribution") ||
    issues.includes("modern-transfer-hidden") ||
    issues.includes("unsupported-synthesis")
  ) {
    support = "unsupported";
  } else if (
    mappedClaims.some(
      (c) =>
        c.claimType === "modern-transfer" &&
        c.supportStatus === "partially-supported",
    )
  ) {
    // §19: partial prose allowed for approved partially-supported modern-transfer
    support = "partially-supported";
  } else if (isTransitionOnly(sentence)) {
    support = "supported";
  } else {
    // Restating any approved claim (including partial synthesis) is sentence-supported
    // when no new-meaning issues fired — claim-level partial is already human-approved.
    support = "supported";
  }

  const allowed =
    support === "supported" ||
    (support === "partially-supported" &&
      mappedClaims.every(
        (c) =>
          c.claimType === "modern-transfer" &&
          c.supportStatus === "partially-supported" &&
          c.authorialAttribution === "none",
      ) &&
      !issues.includes("new-meaning-added") &&
      !issues.includes("modern-transfer-hidden"));


  return {
    sentenceId: sentence.id,
    claimIds: sentence.claimIds,
    support,
    issues: Array.from(new Set(issues)),
    allowed,
  };
}

export function validateProseOutput(
  input: EvidenceBoundedProseInput,
  output: EvidenceBoundedProseOutput,
  outputId: string,
): ProseValidationResult {
  const claimMap = claimsById(input);
  const sentenceResults: ProseSentenceValidation[] = [];

  for (const section of output.sections) {
    for (const sentence of section.sentences) {
      sentenceResults.push(
        validateSentence(sentence, input, claimMap, section.type),
      );
    }
  }

  // Returned question count
  const rqSections = output.sections.filter(
    (s) => s.type === "returned-question",
  );
  const rqSentences = rqSections.flatMap((s) => s.sentences);
  if (rqSentences.length > 1) {
    for (const extra of rqSentences.slice(1)) {
      const existing = sentenceResults.find((r) => r.sentenceId === extra.id);
      if (existing) {
        existing.issues.push("new-returned-question");
        existing.support = "unsupported";
        existing.allowed = false;
      }
    }
  }

  const usedClaimIds = new Set(
    allSentences(output).flatMap((s) => s.claimIds).filter((id) => claimMap.has(id)),
  );
  const inputClaimIds = input.approvedClaims.map((c) => c.id);
  const claimCoverageRate =
    inputClaimIds.length === 0
      ? 1
      : usedClaimIds.size / inputClaimIds.length;

  if (claimCoverageRate < 0.9) {
    // mark as coverage issue on validation aggregate via claim-omitted counts
    for (const id of inputClaimIds) {
      if (!usedClaimIds.has(id)) {
        // synthetic note via sentenceResults not needed; counted below
        void id;
      }
    }
  }

  const supportedSentences = sentenceResults.filter(
    (r) => r.support === "supported",
  ).length;
  const partialSentences = sentenceResults.filter(
    (r) => r.support === "partially-supported",
  ).length;
  const unsupportedSentences = sentenceResults.filter(
    (r) => r.support === "unsupported" || r.support === "unclear",
  ).length;

  const semanticPreservationRate =
    sentenceResults.length === 0
      ? 1
      : sentenceResults.filter((r) => r.allowed).length / sentenceResults.length;

  const countIssue = (issue: ProseValidationIssue) =>
    sentenceResults.filter((r) => r.issues.includes(issue)).length;

  const attributionViolations = countIssue("authorial-strengthened");
  const historicalTransferViolations =
    countIssue("modern-transfer-hidden") + countIssue("historical-distance-lost");
  const workVoiceViolations = countIssue("work-voice-misattribution");
  const newMeaningViolations = countIssue("new-meaning-added");

  const allowed =
    unsupportedSentences === 0 &&
    newMeaningViolations === 0 &&
    attributionViolations === 0 &&
    workVoiceViolations === 0 &&
    historicalTransferViolations === 0 &&
    claimCoverageRate >= 0.9 &&
    sentenceResults.every((r) => r.allowed);


  return {
    outputId,
    sentenceResults,
    totalSentences: sentenceResults.length,
    supportedSentences,
    partialSentences,
    unsupportedSentences,
    claimCoverageRate: Number(claimCoverageRate.toFixed(3)),
    semanticPreservationRate: Number(semanticPreservationRate.toFixed(3)),
    attributionViolations,
    historicalTransferViolations,
    workVoiceViolations,
    newMeaningViolations,
    allowed,
  };
}

/** Strip disallowed sentences for user-facing view (never silently rewrite). */
export function filterAllowedProse(
  output: EvidenceBoundedProseOutput,
  validation: ProseValidationResult,
): EvidenceBoundedProseOutput {
  const allowedIds = new Set(
    validation.sentenceResults.filter((r) => r.allowed).map((r) => r.sentenceId),
  );
  return {
    ...output,
    sections: output.sections
      .map((section) => ({
        ...section,
        sentences: section.sentences.filter((s) => allowedIds.has(s.id)),
      }))
      .filter((s) => s.sentences.length > 0),
    sentenceMappings: output.sentenceMappings.filter((m) =>
      allowedIds.has(m.sentenceId),
    ),
  };
}

export function assertProseInputApprovedOnly(
  input: EvidenceBoundedProseInput,
): void {
  if (input.experimentId !== "B") {
    throw new Error("Prose input must use Experiment B");
  }
  for (const claim of input.approvedClaims) {
    if (!claim.allowedInFinalPerspective) {
      throw new Error(`Invalid claim in prose input: ${claim.id}`);
    }
  }
  const skeletonIds = new Set(input.skeleton.claims.map((c) => c.id));
  for (const claim of input.approvedClaims) {
    if (!skeletonIds.has(claim.id)) {
      throw new Error(`Claim not in B skeleton: ${claim.id}`);
    }
  }
}
