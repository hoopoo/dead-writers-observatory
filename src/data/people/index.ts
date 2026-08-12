import type { Person } from "@/types/person";
import { soseki } from "./soseki";
import { akutagawa } from "./akutagawa";
import { dazai } from "./dazai";

export const people: Person[] = [soseki, akutagawa, dazai];

export function getPersonById(id: string): Person | undefined {
  return people.find((person) => person.id === id);
}

export function getPersonBySlug(slug: string): Person | undefined {
  return people.find((person) => person.slug === slug);
}

export { soseki, akutagawa, dazai };
