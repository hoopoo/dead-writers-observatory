import type { SourcePassage } from "@/types/source-passage";
import { sosekiPassages } from "./soseki";
import { akutagawaPassages } from "./akutagawa";
import { dazaiPassages } from "./dazai";

export const passages: SourcePassage[] = [
  ...sosekiPassages,
  ...akutagawaPassages,
  ...dazaiPassages,
];

export function getPassageById(id: string): SourcePassage | undefined {
  return passages.find((passage) => passage.id === id);
}

export function getPassagesBySourceId(sourceId: string): SourcePassage[] {
  return passages.filter((passage) => passage.sourceId === sourceId);
}

export function getPassagesByPersonId(personId: string): SourcePassage[] {
  return passages.filter((passage) => passage.personId === personId);
}
