import { getPersonById } from "@/data/people";
import { getSourceById } from "@/data/sources";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type {
  SourceFragmentView,
  WriterPerspective,
} from "@/types/perspective";
import type { ThemeTag, ThoughtFragment } from "@/types/thought-fragment";

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

function themeLabels(themes: ThemeTag[]): string {
  return themes
    .slice(0, 3)
    .map((theme) => THEME_LABELS[theme] ?? theme)
    .join("・");
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
  const meanings = fragments.map((f) => f.normalizedMeaning);
  const themeList = themeLabels(analysis.relevantThemes);

  if (personId === "person-soseki") {
    return [
      `この相談を、まず「${themeList}」が個人の内側の問題なのか、社会的役割や制度との摩擦なのかという地点から読み直す。`,
      meanings[0]
        ? `参照資料が示すのは、${meanings[0]}`
        : "参照資料が、個人と社会の境界を問う視点を与える。",
      analysis.socialLayer
        ? `表面の悩みの背後に、${analysis.socialLayer}が見えている。`
        : "自我の独立と社会的義務のあいだで、どこに負荷がかかっているかを測る。",
    ].join(" ");
  }

  if (personId === "person-akutagawa") {
    return [
      `この相談を、出来事そのものより、出来事を解釈し続ける意識が第二の苦痛を増やしていないかという地点から読む。`,
      meanings[0]
        ? `参照資料が示すのは、${meanings[0]}`
        : "参照資料が、思考の増幅構造を照らす。",
      `「${analysis.surfaceQuestion}」という事態に、観察と連想がどこまで重なっているかを問う。`,
    ].join(" ");
  }

  return [
    `この相談を、望んでいるものと、それを誰かに許してほしい／認めてほしい欲求が結びついていないかという地点から読む。`,
    meanings[0]
      ? `参照資料が示すのは、${meanings[0]}`
      : "参照資料が、羞恥と親密さの緊張を照らす。",
    analysis.intimacyLayer
      ? `表面の悩みの背後に、${analysis.intimacyLayer}が見えている。`
      : "失敗や評価への恐れが、自己像のどこを守ろうとしているのかを測る。",
  ].join(" ");
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

  const hidden = analysis.possibleHiddenQuestion;

  if (personId === "person-soseki") {
    return `${titlesHint || "参照資料"}から立ち上がる観点は、この悩みを性格の問題へ還元せず、社会との位置取りの問題として接続する。AI推論としての隠れ問い——「${hidden}」——は事実ではなく、Society / Self のレンズから見える仮説である。`;
  }

  if (personId === "person-akutagawa") {
    return `${titlesHint || "参照資料"}から立ち上がる観点は、外的条件の悪化だけでなく、意識が苦痛を反復・増幅していないかを点検する。AI推論としての隠れ問い——「${hidden}」——は、Mind / Anxiety のレンズから見える仮説であり、本人の断定ではない。`;
  }

  return `${titlesHint || "参照資料"}から立ち上がる観点は、選択や不安の奥に、承認・羞恥・親密さへの揺れがないかを見る。AI推論としての隠れ問い——「${hidden}」——は、Shame / Intimacy のレンズから見える仮説であり、命令ではない。`;
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
    provenance: fragment.excerpt ? "DIRECT SOURCE" : "INTERPRETATION",
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
    interpretation: buildInterpretation(personId, analysis, fragments),
    provenanceMap: {
      perspective: "AI INFERENCE",
      interpretation: "INTERPRETATION",
    },
  };
}
