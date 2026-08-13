import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import type {
  PublicQueryFamily,
  PublicQueryFamilyId,
  PublicQueryResolverThresholds,
} from "@/types/public-query";

function fixtureQuestion(id: string): string {
  const hit = FIXTURE_QUESTIONS.find((f) => f.id === id);
  if (!hit) throw new Error(`missing fixture ${id}`);
  return hit.question;
}

export const PUBLIC_QUERY_RESOLVER_THRESHOLDS: PublicQueryResolverThresholds = {
  highMin: 8,
  mediumMin: 5,
  highGap: 3,
  ambiguousGap: 2,
};

export const PUBLIC_QUERY_FAMILIES: PublicQueryFamily[] = [
  {
    id: "work-income-anxiety",
    canonicalFixtureId: "q1",
    canonicalQuestion: fixtureQuestion("q1"),
    themes: ["work", "independence", "money", "fear", "anxiety"],
    keywords: [
      "会社",
      "辞め",
      "独立",
      "退職",
      "収入",
      "金ない",
      "お金",
      "給料",
      "仕事",
      "怖い",
      "不安",
    ],
    variants: [
      "会社を辞めたいが、収入が怖い。",
      "会社を辞めたいが、収入が怖い",
      "もう会社だるい。辞めたいけど金ないの怖い",
      "会社を辞めて独立したいけど収入が不安",
    ],
    tensionHints: ["経済的", "自己決定", "安定"],
  },
  {
    id: "loneliness",
    canonicalFixtureId: "q2",
    canonicalQuestion: fixtureQuestion("q2"),
    themes: ["loneliness", "intimacy"],
    keywords: [
      "孤独",
      "ひとり",
      "一人",
      "寂しい",
      "友達",
      "友人",
      "周りに人",
      "会って",
    ],
    variants: [
      "友達はいるのに孤独です",
      "人と会ってるのにずっと一人な感じ",
      "周りに人はいるけど孤独",
      "なんか友達いるんだけどずっと一人な感じする",
    ],
    exclusions: ["貸した", "返ってこ", "お金が返", "借金"],
    tensionHints: ["関係の有無", "関係の深さ", "分かっても"],
  },
  {
    id: "sns-compulsion",
    canonicalFixtureId: "q3",
    canonicalQuestion: fixtureQuestion("q3"),
    themes: ["approval", "anxiety", "performance", "modernization"],
    keywords: [
      "sns",
      "通知",
      "見て",
      "見てしま",
      "確認",
      "開く",
      "何度も",
      "ばかり",
      "やめたい",
      "スマホ",
    ],
    variants: [
      "snsを何度も見てしまう",
      "snsを何度も見てしまいます",
      "スマホでsnsばかり確認してしまう",
      "通知が気になって何回も開く",
      "snsを見るのをやめたいのに、つい見てしまいます",
    ],
    exclusions: ["マーケティング", "仕事にしたい", "仕事にしよう"],
    tensionHints: ["承認", "見続ける"],
  },
  {
    id: "ai-job-loss",
    canonicalFixtureId: "q4",
    canonicalQuestion: fixtureQuestion("q4"),
    themes: ["work", "society", "fear", "modernization", "anxiety"],
    keywords: [
      "ai",
      "生成ai",
      "仕事",
      "職種",
      "職",
      "奪わ",
      "なくなる",
      "なくなり",
      "置き換え",
      "消えそう",
      "怖い",
      "不安",
      "やば",
    ],
    variants: [
      "aiに自分の仕事を奪われる気がします",
      "aiに仕事を奪われる気がします",
      "aiに仕事を奪われる気がしてすごく不安です",
      "aiやばくない？俺の仕事なくなる？",
      "aiやばくない俺の仕事なくなる",
      "生成aiのせいで仕事がなくなりそう",
      "aiで自分の職種が消えそう",
      "仕事がaiに置き換えられそうで怖い",
      "aiに仕事を奪われそうで怖い",
    ],
    exclusions: ["小説", "書きたい", "創作", "作りたい"],
    tensionHints: ["変化する社会", "役割定義", "テクノロジー"],
  },
  {
    id: "success-without-happiness",
    canonicalFixtureId: "q5",
    canonicalQuestion: fixtureQuestion("q5"),
    themes: ["happiness", "approval", "self"],
    keywords: [
      "成功",
      "うまくい",
      "幸せ",
      "幸福",
      "満たされ",
      "幸福感",
      "得た",
      "欲しかった",
    ],
    variants: [
      "成功したはずなのに幸せじゃない",
      "成功しているはずなのに幸福ではありません",
      "仕事もうまくいってるのに満たされない",
      "欲しかったものを得たのに幸福感がない",
      "成功したはずなのに幸せではありません",
    ],
    tensionHints: ["外部的成功", "内的充実"],
  },
  {
    id: "aging-fear",
    canonicalFixtureId: "q6",
    canonicalQuestion: fixtureQuestion("q6"),
    themes: ["aging", "fear", "death", "anxiety"],
    keywords: ["老い", "老いる", "歳", "年を取", "年取", "怖い", "嫌", "不安"],
    variants: [
      "老いるのが怖い",
      "老いるのが怖いです",
      "年を取るのが嫌だ",
      "このまま歳を取っていくのが不安",
      "歳を取っていくことが怖いです",
    ],
    exclusions: ["老人ホーム", "探して", "介護施設", "施設を探"],
    tensionHints: ["時間の不可逆", "いまの生き方"],
  },
  {
    id: "marriage-regret",
    canonicalFixtureId: "q7",
    canonicalQuestion: fixtureQuestion("q7"),
    themes: ["love", "family", "aging", "happiness"],
    keywords: ["結婚", "後悔", "しなくても", "将来"],
    variants: [
      "結婚しなくてもいいと思っています。でも将来後悔するでしょうか",
      "結婚しなくてもいいと思うけれど、後悔しないか不安です",
    ],
    tensionHints: ["後悔", "正解"],
  },
  {
    id: "social-gaze",
    canonicalFixtureId: "q8",
    canonicalQuestion: fixtureQuestion("q8"),
    themes: ["approval", "shame", "anxiety"],
    keywords: ["どう見", "見られ", "視線", "人目", "気にな"],
    variants: ["人からどう見られているかが気になります"],
    tensionHints: ["他者に認め", "視線"],
  },
  {
    id: "creative-meaning",
    canonicalFixtureId: "q9",
    canonicalQuestion: fixtureQuestion("q9"),
    themes: ["creativity", "self", "anxiety"],
    keywords: ["作りたい", "創作", "何かを作", "意味", "わから"],
    variants: [
      "何かを作りたいのに、意味があるのかわからなくなります",
      "何か作りたいけれど、意味があるのかわかりません",
    ],
    exclusions: ["aiで小説", "マーケティング"],
    tensionHints: ["表現したい", "意味や正当性"],
  },
  {
    id: "death-and-how-to-live",
    canonicalFixtureId: "q10",
    canonicalQuestion: fixtureQuestion("q10"),
    themes: ["death", "self", "loneliness"],
    keywords: ["死", "自死", "どう生き", "生きれば", "生き方"],
    variants: [
      "死ぬことを考えることがあります。どう生きればいいのでしょうか",
      "死ぬことを考えると、どう生きればいいのかわからなくなります",
    ],
    tensionHints: ["有限性", "いまの生き方"],
  },
];

export function publicQueryFamilyById(
  id: PublicQueryFamilyId,
): PublicQueryFamily {
  const hit = PUBLIC_QUERY_FAMILIES.find((family) => family.id === id);
  if (!hit) throw new Error(`missing family ${id}`);
  return hit;
}

export function publicQueryFamilyByFixtureId(
  fixtureId: string,
): PublicQueryFamily | undefined {
  return PUBLIC_QUERY_FAMILIES.find((f) => f.canonicalFixtureId === fixtureId);
}
