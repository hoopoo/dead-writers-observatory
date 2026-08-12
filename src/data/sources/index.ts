import type { Source } from "@/types/source";
import { sosekiSources } from "./soseki";
import { akutagawaSources } from "./akutagawa";
import { dazaiSources } from "./dazai";

export const sources: Source[] = [
  ...sosekiSources,
  ...akutagawaSources,
  ...dazaiSources,
];

export function getSourceById(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}

export function getSourcesByPersonId(personId: string): Source[] {
  return sources.filter((source) => source.personId === personId);
}
