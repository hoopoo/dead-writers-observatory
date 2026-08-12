export type PrimaryLens =
  | "Society / Self"
  | "Mind / Anxiety"
  | "Shame / Intimacy"
  | string;

export type ArchiveStatus = "placeholder" | "curated" | "verified";

export interface Person {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  birthYear: number;
  deathYear: number;
  description: string;
  primaryLens: PrimaryLens;
  secondaryThemes: string[];
  portraitUrl?: string;
  copyrightNote: string;
  archiveStatus: ArchiveStatus;
  hypotheticalQuestion: string;
}
