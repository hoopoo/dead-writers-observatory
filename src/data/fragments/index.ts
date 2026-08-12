import type { ThoughtFragment } from "@/types/thought-fragment";
import { sosekiFragments } from "./soseki";
import { akutagawaFragments } from "./akutagawa";
import { dazaiFragments } from "./dazai";

export const fragments: ThoughtFragment[] = [
  ...sosekiFragments,
  ...akutagawaFragments,
  ...dazaiFragments,
];

export function getFragmentsByPersonId(personId: string): ThoughtFragment[] {
  return fragments.filter((fragment) => fragment.personId === personId);
}

export function getFragmentById(id: string): ThoughtFragment | undefined {
  return fragments.find((fragment) => fragment.id === id);
}
