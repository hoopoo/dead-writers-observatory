import { people } from "@/data/people";
import type {
  ClaimSupportStatus,
  ClaimValidationIssue,
  ClaimValidationResult,
  ClaimValidator,
  EvidencePacket,
  PerspectiveClaim,
} from "@/types/perspective-claim";

const CERTAINTY_PATTERNS = [
  /必ず/,
  /絶対/,
  /本質的に/,
  /すべて/,
  /に違いない/,
  /すべき/,
  /常に/,
];

const MODERN_MARKERS = /AI|SNS|アルゴリズム|プラットフォーム|雇用制度|現代の/;

function writerNamePatterns(personId: string): RegExp[] {
  const name = people.find((p) => p.id === personId)?.name ?? "";
  const patterns: RegExp[] = [];
  if (name) patterns.push(new RegExp(`${name}は`));
  if (personId.includes("soseki")) {
    patterns.push(/漱石は/, /夏目は/);
  }
  if (personId.includes("akutagawa")) {
    patterns.push(/芥川は/);
  }
  if (personId.includes("dazai")) {
    patterns.push(/太宰は/);
  }
  return patterns;
}

function evidenceById(packet: EvidencePacket, id: string) {
  return packet.evidence.find((e) => e.id === id || e.fragmentId === id);
}

function assignSupport(
  claim: PerspectiveClaim,
  packet: EvidencePacket,
  issues: ClaimValidationIssue[],
): ClaimSupportStatus {
  if (claim.evidenceIds.length === 0) {
    issues.push("missing-evidence");
    return "unsupported";
  }
  for (const id of claim.evidenceIds) {
    if (!evidenceById(packet, id)) {
      issues.push("missing-evidence");
      if (claim.generatorOrigin === "llm") {
        issues.push("evidence-id-invalid");
      }
      return "unsupported";
    }
  }

  if (claim.claimType === "archive-observation") {
    return "supported";
  }
  if (claim.claimType === "returned-question") {
    return "partially-supported";
  }
  if (claim.claimType === "modern-transfer") {
    return "partially-supported";
  }
  if (claim.claimType === "cross-evidence-synthesis") {
    const sources = new Set(
      claim.evidenceIds
        .map((id) => evidenceById(packet, id)?.sourceId)
        .filter(Boolean),
    );
    if (sources.size < 2) {
      issues.push("insufficient-source-diversity");
    }
    return "partially-supported";
  }
  if (claim.claimType === "writer-perspective") {
    return "partially-supported";
  }
  return "unclear";
}

function decideAllowed(
  claim: PerspectiveClaim,
  support: ClaimSupportStatus,
  issues: ClaimValidationIssue[],
): boolean {
  if (support === "unsupported" || support === "unclear") return false;
  if (
    issues.includes("work-voice-misattribution") ||
    issues.includes("modern-concept-attributed-to-writer") ||
    issues.includes("authorial-overreach") ||
    issues.includes("unsupported-certainty") ||
    issues.includes("historical-overreach") ||
    issues.includes("external-knowledge-injection") ||
    issues.includes("writer-stereotype-injection") ||
    issues.includes("evidence-id-invalid") ||
    issues.includes("proposal-schema-invalid") ||
    issues.includes("contradiction-flattened")
  ) {
    return false;
  }
  if (support === "supported") return true;

  // partially-supported: only with explicit modern/returned labeling rules
  if (claim.claimType === "modern-transfer") {
    return (
      claim.historicalTransfer === "explicit" &&
      claim.authorialAttribution === "none"
    );
  }
  if (claim.claimType === "returned-question") {
    return claim.authorialAttribution === "none";
  }
  if (claim.claimType === "cross-evidence-synthesis") {
    return (
      claim.authorialAttribution === "mixed" ||
      claim.authorialAttribution === "work-level" ||
      claim.authorialAttribution === "none"
    );
  }
  if (claim.claimType === "writer-perspective") {
    return claim.authorialAttribution !== "direct-author";
  }
  return false;
}

export class DefaultClaimValidator implements ClaimValidator {
  validate(
    claim: PerspectiveClaim,
    packet: EvidencePacket,
  ): ClaimValidationResult {
    const issues: ClaimValidationIssue[] = [];
    const support = assignSupport(claim, packet, issues);

    const linked = claim.evidenceIds
      .map((id) => evidenceById(packet, id))
      .filter(Boolean);
    const onlyWorkVoice =
      linked.length > 0 &&
      linked.every(
        (item) =>
          item &&
          (item.voiceType === "narrator" ||
            item.voiceType === "fictional_character" ||
            item.voiceType === "dialogue" ||
            item.evidenceRole === "work-perspective"),
      );

    for (const pattern of writerNamePatterns(claim.personId)) {
      if (pattern.test(claim.text) && onlyWorkVoice) {
        issues.push("work-voice-misattribution");
      }
      if (
        pattern.test(claim.text) &&
        (claim.claimType === "modern-transfer" ||
          MODERN_MARKERS.test(claim.text) ||
          MODERN_MARKERS.test(packet.question.rawQuestion))
      ) {
        issues.push("modern-concept-attributed-to-writer");
      }
      if (
        pattern.test(claim.text) &&
        claim.authorialAttribution === "none"
      ) {
        issues.push("authorial-overreach");
      }
    }

    // Death romanticization / author death binding
    if (
      /死を選んだ|自殺した|同じ苦しみから死/.test(claim.text) &&
      claim.personId.includes("akutagawa")
    ) {
      issues.push("historical-overreach");
    }

    for (const pattern of CERTAINTY_PATTERNS) {
      if (pattern.test(claim.text) && claim.claimType !== "archive-observation") {
        issues.push("unsupported-certainty");
        break;
      }
    }

    if (
      claim.claimType === "modern-transfer" &&
      claim.historicalTransfer !== "explicit"
    ) {
      issues.push("historical-overreach");
    }

    if (
      claim.claimType === "returned-question" &&
      claim.authorialAttribution !== "none"
    ) {
      issues.push("authorial-overreach");
    }

    // Returned question must not speak as the writer addressing the user
    if (
      claim.claimType === "returned-question" &&
      writerNamePatterns(claim.personId).some((p) => p.test(claim.text))
    ) {
      issues.push("authorial-overreach");
    }

    // Contradiction flattening: synthesis that asserts a single resolved essence
    if (
      claim.claimType === "cross-evidence-synthesis" &&
      /本質は一つ|矛盾は解消|真意は/.test(claim.text)
    ) {
      issues.push("contradiction-flattened");
    }

    const uniqueIssues = Array.from(new Set(issues));
    const allowed = decideAllowed(
      { ...claim, supportStatus: support },
      support,
      uniqueIssues,
    );

    let attributionRisk: ClaimValidationResult["attributionRisk"] = "low";
    if (
      uniqueIssues.includes("work-voice-misattribution") ||
      uniqueIssues.includes("modern-concept-attributed-to-writer") ||
      uniqueIssues.includes("authorial-overreach")
    ) {
      attributionRisk = "high";
    } else if (
      claim.authorialAttribution === "mixed" ||
      claim.claimType === "writer-perspective"
    ) {
      attributionRisk = "medium";
    }

    let historicalTransferRisk: ClaimValidationResult["historicalTransferRisk"] =
      "low";
    if (uniqueIssues.includes("historical-overreach")) {
      historicalTransferRisk = "high";
    } else if (claim.historicalTransfer === "explicit") {
      historicalTransferRisk = "medium";
    }

    const coverage =
      packet.evidence.length === 0
        ? 0
        : claim.evidenceIds.filter((id) => evidenceById(packet, id)).length /
          Math.max(1, packet.evidence.length);

    return {
      claimId: claim.id,
      supportStatus: support,
      allowed,
      issues: uniqueIssues,
      evidenceCoverage: coverage,
      attributionRisk,
      historicalTransferRisk,
    };
  }
}

export function applyValidation(
  claim: PerspectiveClaim,
  result: ClaimValidationResult,
): PerspectiveClaim {
  return {
    ...claim,
    supportStatus: result.supportStatus,
    allowedInFinalPerspective: result.allowed,
    validationIssues: result.issues,
    confidence:
      result.allowed && result.supportStatus === "supported"
        ? "high"
        : result.allowed
          ? "medium"
          : "low",
  };
}

export const defaultClaimValidator = new DefaultClaimValidator();
