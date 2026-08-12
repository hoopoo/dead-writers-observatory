import type { AuthorialDistance } from "@/types/thought-fragment";

export const AUTHORIAL_DISTANCE_LABELS: Record<
  AuthorialDistance,
  { en: string; ja: string }
> = {
  direct: {
    en: "DIRECT",
    ja: "作者本人の直接発言",
  },
  near: {
    en: "NEAR",
    ja: "作者の自伝的・随筆的記述",
  },
  indirect: {
    en: "INDIRECT",
    ja: "作品内の語り・人物",
  },
  unknown: {
    en: "UNKNOWN",
    ja: "距離を特定できない",
  },
};

export function authorialDistanceBonus(distance: AuthorialDistance): number {
  switch (distance) {
    case "direct":
      return 2;
    case "near":
      return 1;
    case "indirect":
      return 0;
    case "unknown":
      return -1;
  }
}
