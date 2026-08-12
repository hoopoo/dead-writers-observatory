import type { SourcePassage } from "@/types/source-passage";
import type { ThoughtFragment } from "@/types/thought-fragment";
import type { OverclaimRisk } from "@/types/review";

const STRONG_CLAIM_PATTERNS = [
  /必ず/,
  /すべて/,
  /人間は/,
  /すべき/,
  /絶対/,
  /本質的に/,
  /常に/,
  /と考えていた/,
  /と考えた/,
  /と断定/,
];

const WORK_VOICES = new Set([
  "narrator",
  "fictional_character",
  "dialogue",
]);

export function detectOverclaimRisk(
  fragment: ThoughtFragment,
  passage?: SourcePassage,
): { risk: OverclaimRisk; reasons: string[] } {
  const reasons: string[] = [];
  const meaning = fragment.normalizedMeaning;

  let hits = 0;
  for (const pattern of STRONG_CLAIM_PATTERNS) {
    if (pattern.test(meaning)) {
      hits += 1;
      reasons.push(`強い断定語を含む: ${pattern.source}`);
    }
  }

  if (passage && WORK_VOICES.has(passage.voiceType)) {
    if (
      /作者は|本人は|漱石は|芥川は|太宰は|考えてい|主張し/.test(meaning) &&
      !/作品に現れる|として描|構図|視点/.test(meaning)
    ) {
      hits += 2;
      reasons.push(
        "作品内の声を作者一般思想へ変換している可能性",
      );
    }
    if (fragment.authorialDistance === "direct") {
      hits += 3;
      reasons.push("work voice なのに authorialDistance=direct");
    }
    if (fragment.interpretationType === "direct-author-statement") {
      hits += 3;
      reasons.push("work voice なのに direct-author-statement");
    }
  }

  if (
    passage?.verificationStatus === "placeholder" &&
    /「.*」/.test(meaning)
  ) {
    hits += 1;
    reasons.push("placeholder に引用風表記がある");
  }

  if (hits >= 3) return { risk: "high", reasons };
  if (hits >= 1) return { risk: "medium", reasons };
  return { risk: "low", reasons };
}
