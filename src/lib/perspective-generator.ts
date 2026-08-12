import { getPersonById } from "@/data/people";
import { getSourceById } from "@/data/sources";
import { getPassageById } from "@/data/passages";
import {
  AUTHORIAL_DISTANCE_LABELS,
  distanceAwareSourcePhrase,
  summarizeArchivalDistance,
} from "@/lib/archive-distance";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type {
  PerspectiveEvidence,
} from "@/types/evidence";
import type {
  SourceFragmentView,
  WriterPerspective,
} from "@/types/perspective";
import type { ProvenanceLabel } from "@/types/provenance";
import type { ThemeTag, ThoughtFragment } from "@/types/thought-fragment";
import type { VoiceType } from "@/types/source-passage";

const THEME_LABELS: Record<ThemeTag, string> = {
  work: "仕事",
  love: "愛・関係",
  loneliness: "孤独",
  money: "金銭",
  aging: "老い",
  family: "家族",
  society: "社会",
  anxiety: "不安",
  shame: "羞恥",
  creativity: "創作",
  death: "死",
  happiness: "幸福",
  independence: "独立",
  self: "自己",
  intimacy: "親密さ",
  approval: "承認",
  fear: "恐怖",
  modernization: "近代化／現代変化",
  obligation: "義務",
  observation: "自己観察",
  fatigue: "疲労",
  performance: "自己演出",
};

const VOICE_LABELS: Record<VoiceType, string> = {
  authorial: "Authorial（作者）",
  essayistic: "Essayistic（随筆）",
  autobiographical: "Autobiographical（自伝的）",
  diary: "Diary（日記）",
  letter: "Letter（書簡）",
  narrator: "Narrator（語り手）",
  fictional_character: "Fictional character（登場人物）",
  dialogue: "Dialogue（対話）",
  editorial: "Editorial（編集）",
  uncertain: "Uncertain（不明）",
};

function themeLabels(themes: ThemeTag[]): string {
  return themes
    .slice(0, 3)
    .map((theme) => THEME_LABELS[theme] ?? theme)
    .join("・");
}

function locatorLabel(passageId: string): string {
  const passage = getPassageById(passageId);
  if (!passage) return "locator unavailable";
  const { locator } = passage;
  return [
    locator.chapter && `章: ${locator.chapter}`,
    locator.section && `節: ${locator.section}`,
    locator.page && `p.${locator.page}`,
    locator.paragraph && `段落: ${locator.paragraph}`,
    locator.anchor && `anchor: ${locator.anchor}`,
  ]
    .filter(Boolean)
    .join(" / ");
}

function evidenceProvenance(passageId: string): ProvenanceLabel {
  const passage = getPassageById(passageId);
  if (passage?.verificationStatus === "verified" && passage.text) {
    return "DIRECT SOURCE";
  }
  if (passage?.verificationStatus === "placeholder" || !passage?.text) {
    return "SOURCE REFERENCE";
  }
  return "ARCHIVE INTERPRETATION";
}

function evidenceRoleFor(fragment: ThoughtFragment): PerspectiveEvidence["evidenceRole"] {
  if (fragment.authorialDistance === "direct") return "author-statement";
  if (fragment.authorialDistance === "indirect") return "work-perspective";
  return "context";
}

function roleLabelJa(role: PerspectiveEvidence["evidenceRole"]): string {
  switch (role) {
    case "author-statement":
      return "作者本人の直接発言";
    case "work-perspective":
      return "作品に現れる視点";
    case "context":
      return "自伝的・文脈的記述";
  }
}

function buildWhereHeLooks(personId: string): string {
  switch (personId) {
    case "person-soseki":
      return "Society / Self — 個人と社会の摩擦、役割、金銭、義務、距離";
    case "person-akutagawa":
      return "Mind / Anxiety — 思考の増幅、自己観察、神経、創作、恐怖";
    case "person-dazai":
      return "Shame / Intimacy — 羞恥、承認、親密さ、自己演出、孤独";
    default:
      return "Archive lens";
  }
}

function buildPerspectiveText(
  personId: string,
  analysis: QuestionAnalysis,
  fragments: ThoughtFragment[],
): string {
  const lead = fragments[0];
  const source = lead ? getSourceById(lead.sourceId) : undefined;
  const distancePhrase =
    lead && source
      ? distanceAwareSourcePhrase(source.title, lead.authorialDistance)
      : "参照資料に基づき";

  const themeList = themeLabels(analysis.relevantThemes);
  const meaning = lead?.normalizedMeaning;

  if (personId === "person-soseki") {
    return [
      `この相談を、まず「${themeList}」が個人の内側の問題なのか、社会的役割や制度との摩擦なのかという地点から読み直す。`,
      `${distancePhrase}。`,
      meaning ? `そこから立ち上がる観点は、${meaning}` : "",
      analysis.socialLayer
        ? `表面の悩みの背後に、${analysis.socialLayer}が見えている。`
        : "自我の独立と社会的義務のあいだで、どこに負荷がかかっているかを測る。",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (personId === "person-akutagawa") {
    return [
      `この相談を、出来事そのものより、出来事を解釈し続ける意識が第二の苦痛を増やしていないかという地点から読む。`,
      `${distancePhrase}。`,
      meaning ? `そこから立ち上がる観点は、${meaning}` : "",
      `「${analysis.surfaceQuestion}」という事態に、観察と連想がどこまで重なっているかを問う。作者の人生や死を、この相談の説明に使わない。`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `この相談を、望んでいるものと、それを誰かに許してほしい／認めてほしい欲求が結びついていないかという地点から読む。`,
    `${distancePhrase}。`,
    meaning ? `そこから立ち上がる観点は、${meaning}` : "",
    analysis.intimacyLayer
      ? `表面の悩みの背後に、${analysis.intimacyLayer}が見えている。`
      : "失敗や評価への恐れが、自己像のどこを守ろうとしているのかを測る。",
    "小説の語り手や登場人物を、作者本人と同一視しない。",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildInterpretation(
  personId: string,
  analysis: QuestionAnalysis,
  fragments: ThoughtFragment[],
): string {
  const titlesHint = fragments
    .map((f) => getSourceById(f.sourceId)?.title)
    .filter(Boolean)
    .slice(0, 2)
    .join("・");

  const distances = fragments
    .map((f) => AUTHORIAL_DISTANCE_LABELS[f.authorialDistance].ja)
    .slice(0, 3)
    .join("／");

  const hidden = analysis.possibleHiddenQuestion;

  if (personId === "person-soseki") {
    return `${titlesHint || "参照資料"}（距離: ${distances}）から立ち上がる観点は、この悩みを性格の問題へ還元せず、社会との位置取りの問題として接続する。AI推論としての隠れ問い——「${hidden}」——は事実ではなく、Society / Self のレンズから見える仮説である。小説の登場人物や語り手を、作者の個人史へ還元しない。`;
  }

  if (personId === "person-akutagawa") {
    return `${titlesHint || "参照資料"}（距離: ${distances}）から立ち上がる観点は、外的条件の悪化だけでなく、意識が苦痛を反復・増幅していないかを点検する。AI推論としての隠れ問い——「${hidden}」——は仮説であり、作者の死の説明でも医療助言でもない。`;
  }

  return `${titlesHint || "参照資料"}（距離: ${distances}）から立ち上がる観点は、選択や不安の奥に、承認・羞恥・親密さへの揺れがないかを見る。AI推論としての隠れ問い——「${hidden}」——は仮説であり、「太宰も同じ苦しみを経験した」といった同一化は行わない。`;
}

function toEvidence(fragment: ThoughtFragment): PerspectiveEvidence {
  const source = getSourceById(fragment.sourceId);
  const passage = getPassageById(fragment.passageId);
  const role = evidenceRoleFor(fragment);

  return {
    fragmentId: fragment.id,
    sourceId: fragment.sourceId,
    passageId: fragment.passageId,
    sourceTitle: source?.title ?? "Unknown source",
    sourceType: source?.sourceType ?? "other",
    voiceType: passage?.voiceType ?? "uncertain",
    authorialDistance: fragment.authorialDistance,
    evidenceRole: role,
    locatorLabel: locatorLabel(fragment.passageId),
    verificationStatus: passage?.verificationStatus ?? "placeholder",
    normalizedMeaning: fragment.normalizedMeaning,
    bibliographicReference:
      source?.bibliographicReference ?? "書誌情報未整備（placeholder）",
    provenance: evidenceProvenance(fragment.passageId),
    distanceLabelJa: AUTHORIAL_DISTANCE_LABELS[fragment.authorialDistance].ja,
    voiceLabelJa: VOICE_LABELS[passage?.voiceType ?? "uncertain"],
    roleLabelJa: roleLabelJa(role),
  };
}

function toSourceFragmentView(fragment: ThoughtFragment): SourceFragmentView {
  const source = getSourceById(fragment.sourceId);

  return {
    fragment,
    sourceTitle: source?.title ?? "Unknown source",
    sourceType: source?.sourceType ?? "other",
    bibliographicReference:
      source?.bibliographicReference ?? "書誌情報未整備（placeholder）",
    copyrightStatus: source?.copyrightStatus ?? "unknown",
    provenance: evidenceProvenance(fragment.passageId),
  };
}

export function generatePerspective(
  personId: string,
  analysis: QuestionAnalysis,
  fragments: ThoughtFragment[],
): WriterPerspective {
  const person = getPersonById(personId);
  if (!person) {
    throw new Error(`Unknown person: ${personId}`);
  }

  return {
    personId: person.id,
    personName: person.name,
    personNameEn: person.nameEn,
    primaryLens: person.primaryLens,
    whereHeLooks: buildWhereHeLooks(personId),
    archiveBasedPerspective: buildPerspectiveText(personId, analysis, fragments),
    sourceFragments: fragments.map(toSourceFragmentView),
    evidence: fragments.map(toEvidence),
    archivalDistance: summarizeArchivalDistance(fragments),
    interpretation: buildInterpretation(personId, analysis, fragments),
    provenanceMap: {
      perspective: "AI INFERENCE",
      interpretation: "INTERPRETATION",
    },
  };
}
