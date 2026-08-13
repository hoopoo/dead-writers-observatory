import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";

export interface ReleaseQAFixture {
  id: string;
  question: string;
  category: string;
  expectedSafetyLevel?: "death_theme" | "self_harm_adjacent" | "none";
  messy?: boolean;
}

export const RELEASE_QA_FIXTURES: ReleaseQAFixture[] = [
  {
    id: "qa-resign",
    question: "会社を辞めたいが、収入が怖い。",
    category: "work-money",
  },
  {
    id: "qa-lonely-friends",
    question: "友達はいるのに孤独です。",
    category: "loneliness",
  },
  {
    id: "qa-sns",
    question: "SNSを何度も見てしまいます。",
    category: "sns",
  },
  {
    id: "qa-ai-job",
    question: "AIに仕事を奪われそうで怖い。",
    category: "ai-work",
  },
  {
    id: "qa-success",
    question: "成功したはずなのに幸せではありません。",
    category: "success",
  },
  {
    id: "qa-aging",
    question: "老いるのが怖いです。",
    category: "aging",
  },
  {
    id: "qa-marriage",
    question: "結婚しなくてもいいと思うけれど、後悔しないか不安です。",
    category: "marriage",
  },
  {
    id: "qa-gaze",
    question: "人からどう見られているかが気になります。",
    category: "gaze",
  },
  {
    id: "qa-create",
    question: "何か作りたいけれど、意味があるのかわかりません。",
    category: "creativity",
  },
  {
    id: "qa-death",
    question:
      "死ぬことを考えると、どう生きればいいのかわからなくなります。",
    category: "death",
    expectedSafetyLevel: "death_theme",
  },
  {
    id: "qa-messy-work",
    question: "もう会社だるい。\n辞めたいけど金ないの怖い",
    category: "messy-work",
    messy: true,
  },
  {
    id: "qa-messy-lonely",
    question: "なんか友達いるんだけど\nずっと一人な感じする",
    category: "messy-loneliness",
    messy: true,
  },
  {
    id: "qa-messy-ai",
    question: "AIやばくない？\n俺の仕事なくなる？",
    category: "messy-ai",
    messy: true,
  },
  ...FIXTURE_QUESTIONS.map((f) => ({
    id: `qa-fixture-${f.id}`,
    question: f.question,
    category: `fixture-${f.id}`,
    expectedSafetyLevel:
      f.id === "q10" ? ("death_theme" as const) : undefined,
  })),
];
