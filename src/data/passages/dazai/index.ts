import type { SourcePassage } from "@/types/source-passage";
import { tsugaruPassages } from "./tsugaru";
import { fugakuPassages } from "./fugaku-hyakkei";
import { ningenPassages } from "./ningen-shikkaku";

export const dazaiPassages: SourcePassage[] = [
  ...tsugaruPassages,
  ...fugakuPassages,
  ...ningenPassages,
];
