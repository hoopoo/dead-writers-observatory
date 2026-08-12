import type { SourcePassage } from "@/types/source-passage";
import { shujuPassages } from "./shuju-no-kotoba";
import { ahouPassages } from "./aru-aho-no-issho";
import { hagurumaPassages } from "./haguruma";

export const akutagawaPassages: SourcePassage[] = [
  ...shujuPassages,
  ...ahouPassages,
  ...hagurumaPassages,
];
