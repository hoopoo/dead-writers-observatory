import type { AuthorialAttribution } from "@/types/perspective-claim";

export const PUBLIC_LENS_JA: Record<
  string,
  { short: string; where: string }
> = {
  "person-soseki": { short: "社会と自己", where: "社会の中での位置" },
  "person-akutagawa": { short: "不安と自己観察", where: "不安を見る知性" },
  "person-dazai": { short: "羞恥と他者", where: "他者から見られる自己" },
};

export const THEME_LABEL_JA: Record<string, string> = {
  income: "金銭と生活",
  "social-position": "社会の中での位置",
  "self-image": "自己像",
  gaze: "他者から見られる自己",
  performance: "自己演出",
  anxiety: "不安",
  independence: "個人の独立",
  observation: "自己観察",
  belonging: "帰属",
  death: "死と生き方",
  aging: "老い",
};

export function attributionVoiceLabel(
  attribution: AuthorialAttribution,
): string {
  switch (attribution) {
    case "direct-author":
      return "本人による記述";
    case "near-author":
      return "本人に近い記述";
    case "work-level":
      return "作品内の声";
    case "mixed":
      return "複数の距離が混在";
    case "none":
      return "作者への帰属なし";
    default:
      return "資料に基づく記述";
  }
}

export function attributionDistanceLabel(
  attribution: AuthorialAttribution,
): string {
  switch (attribution) {
    case "direct-author":
      return "近い";
    case "near-author":
      return "やや近い";
    case "work-level":
      return "作品内";
    case "mixed":
      return "混在";
    case "none":
      return "作者へは結びつかない";
    default:
      return "不明";
  }
}

export function workVoiceWarning(personName: string): string {
  return `これは${personName}本人の直接発言ではありません。`;
}

export function themeLabelJa(theme: string): string {
  return THEME_LABEL_JA[theme] ?? theme;
}
