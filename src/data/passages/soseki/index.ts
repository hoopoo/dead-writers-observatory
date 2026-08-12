import type { SourcePassage } from "@/types/source-passage";
import { individualismPassages } from "./watashi-no-kojinshugi";
import { garasudoPassages } from "./garasudo-no-uchi";
import { kokoroPassages } from "./kokoro";

export const sosekiPassages: SourcePassage[] = [
  ...individualismPassages,
  ...garasudoPassages,
  ...kokoroPassages,
];
