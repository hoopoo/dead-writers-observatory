export interface FixtureQuestion {
  id: string;
  label: string;
  question: string;
  expectedPrimaryThemes: string[];
}

export const FIXTURE_QUESTIONS: FixtureQuestion[] = [
  {
    id: "q1",
    label: "独立と収入不安",
    question: "会社を辞めて独立したい。でも収入がなくなるのが怖い。",
    expectedPrimaryThemes: ["work", "independence", "money", "fear"],
  },
  {
    id: "q2",
    label: "友人のいる孤独",
    question: "友達はいるのに孤独です。",
    expectedPrimaryThemes: ["loneliness", "intimacy"],
  },
  {
    id: "q3",
    label: "SNS依存",
    question: "SNSを見るのをやめたいのに、つい見てしまいます。",
    expectedPrimaryThemes: ["approval", "anxiety", "performance"],
  },
  {
    id: "q4",
    label: "AIと仕事",
    question: "AIに自分の仕事を奪われる気がします。",
    expectedPrimaryThemes: ["work", "society", "fear", "modernization"],
  },
  {
    id: "q5",
    label: "成功と幸福の乖離",
    question: "成功しているはずなのに幸福ではありません。",
    expectedPrimaryThemes: ["happiness", "approval", "self"],
  },
  {
    id: "q6",
    label: "老いへの恐怖",
    question: "歳を取っていくことが怖いです。",
    expectedPrimaryThemes: ["aging", "fear", "death"],
  },
  {
    id: "q7",
    label: "結婚と後悔",
    question: "結婚しなくてもいいと思っています。でも将来後悔するでしょうか。",
    expectedPrimaryThemes: ["love", "family", "aging", "happiness"],
  },
  {
    id: "q8",
    label: "他者の視線",
    question: "人からどう見られているかが気になります。",
    expectedPrimaryThemes: ["approval", "shame", "anxiety"],
  },
  {
    id: "q9",
    label: "創作の意味",
    question: "何かを作りたいのに、意味があるのかわからなくなります。",
    expectedPrimaryThemes: ["creativity", "self", "anxiety"],
  },
  {
    id: "q10",
    label: "死と生き方",
    question: "死ぬことを考えることがあります。どう生きればいいのでしょうか。",
    expectedPrimaryThemes: ["death", "self", "loneliness"],
  },
];
