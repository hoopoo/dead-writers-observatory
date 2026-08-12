import type { QuestionAnalysis } from "@/types/question-analysis";
import type { HistoricalDistanceAnalysis } from "@/types/historical-distance";
import type { ThemeTag } from "@/types/thought-fragment";

function timelessThemes(themes: ThemeTag[]): string[] {
  const map: Partial<Record<ThemeTag, string>> = {
    work: "仕事と自己像",
    society: "社会的役割",
    anxiety: "不安",
    approval: "承認",
    self: "自分の価値",
    loneliness: "孤独",
    intimacy: "親密さ",
    shame: "羞恥",
    money: "金銭と自立",
    independence: "独立への欲求",
    happiness: "幸福の定義",
    creativity: "創作と意味",
    aging: "老いと時間",
    death: "有限性への問い",
    love: "愛と選択",
    family: "家族と帰属",
    fear: "恐れ",
    modernization: "変化する社会との摩擦",
    obligation: "義務",
    observation: "自己観察",
    fatigue: "疲労",
    performance: "自己演出",
  };

  const selected = themes
    .map((theme) => map[theme])
    .filter((value): value is string => Boolean(value));

  const defaults = ["仕事と自己像", "社会的役割", "不安", "承認", "自分の価値"];
  const merged = [...new Set([...selected, ...defaults])];
  return merged.slice(0, 6);
}

function unknownsFor(analysis: QuestionAnalysis): string[] {
  const unknowns = [
    "現代の雇用制度・労働法・社会保障の細部",
    "現代医療・精神医療・危機介入制度",
    "現代の家族制度・ジェンダー規範・法制度",
  ];

  if (
    analysis.relevantThemes.includes("modernization") ||
    /AI|SNS/.test(analysis.rawQuestion)
  ) {
    unknowns.unshift(
      "generative AI",
      "platform economy",
      "current employment market",
      "reskilling systems",
    );
  }
  if (/SNS/.test(analysis.rawQuestion)) {
    unknowns.unshift("SNS の報酬設計・アルゴリズム・常時接続の社会心理");
  }
  if (analysis.relevantThemes.includes("money") || analysis.relevantThemes.includes("work")) {
    unknowns.push("スタートアップ経済・非正規労働の現在形");
  }
  if (
    analysis.safetyFlags.includes("death_theme") ||
    analysis.safetyFlags.includes("self_harm_adjacent")
  ) {
    unknowns.unshift("現代の自殺予防・相談支援・医療介入の枠組み");
  }

  return [...new Set(unknowns)].slice(0, 6);
}

function transferRisks(analysis: QuestionAnalysis): string[] {
  const risks = [
    "過去の人物を「未来を予言した人」として扱い、現代の事実判断を代替する危険",
    "小説の登場人物や語り手を、作者本人の思想と同一視する危険",
    "歴史的文脈を抜きに、現代の制度設計へ直接適用する危険",
  ];

  if (/AI/.test(analysis.rawQuestion)) {
    risks.unshift(
      "「漱石／芥川／太宰は AI 社会を予見していた」といった予言物語への滑落",
    );
  }
  if (
    analysis.safetyFlags.includes("death_theme") ||
    analysis.safetyFlags.includes("self_harm_adjacent")
  ) {
    risks.unshift(
      "作者の死や作品内の死を、相談者の苦しみへ安易に同一化する危険",
    );
  }

  return risks.slice(0, 4);
}

function presentDayFacts(analysis: QuestionAnalysis): string[] {
  const facts = [
    "2026年時点の社会制度・技術条件・労働市場の事実確認",
    "当事者の具体的状況（契約、健康、支援資源）の確認",
  ];

  if (/AI/.test(analysis.rawQuestion)) {
    facts.unshift(
      "当該職種における AI 影響の実証データ",
      "再教育・転職支援・労働法上の保護の現状",
    );
  }
  if (/SNS/.test(analysis.rawQuestion)) {
    facts.unshift("プラットフォーム設計と依存研究の現況");
  }
  if (
    analysis.safetyFlags.includes("death_theme") ||
    analysis.safetyFlags.includes("self_harm_adjacent")
  ) {
    facts.unshift("必要なら文学の外の専門支援・相談窓口への接続");
  }

  return [...new Set(facts)].slice(0, 5);
}

export function analyzeHistoricalDistance(
  analysis: QuestionAnalysis,
): HistoricalDistanceAnalysis {
  const timelessHumanThemes = timelessThemes(analysis.relevantThemes);
  const historicallySpecificUnknowns = unknownsFor(analysis);
  const transferRisksList = transferRisks(analysis);
  const presentDayFactsRequired = presentDayFacts(analysis);

  const situationHint = /AI/.test(analysis.rawQuestion)
    ? "AI による職業変化という2026年固有の状況"
    : /SNS/.test(analysis.rawQuestion)
      ? "SNS という2026年固有の接続環境"
      : "いまの相談が置かれている2026年固有の状況";

  return {
    timelessHumanThemes,
    historicallySpecificUnknowns,
    transferRisks: transferRisksList,
    presentDayFactsRequired,
    interpretationBeginsNote: `漱石・芥川・太宰の言葉を${situationHint}に接続している部分は、現代側の解釈である。彼らは未来を予言していたのではなく、残された主題をいまの問いに再接続している。`,
    provenanceMap: {
      timelessHumanThemes: "AI INFERENCE",
      historicallySpecificUnknowns: "AI INFERENCE",
      transferRisks: "AI INFERENCE",
      presentDayFactsRequired: "AI INFERENCE",
      interpretationBeginsNote: "AI INFERENCE",
    },
  };
}
