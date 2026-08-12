export type SourceType =
  | "novel"
  | "essay"
  | "diary"
  | "letter"
  | "speech"
  | "interview"
  | "criticism"
  | "autobiographical_text"
  | "other";

export type CopyrightStatus =
  | "public_domain"
  | "restricted"
  | "unknown"
  | "placeholder";

export type PublicDomainStatus =
  | "yes"
  | "no"
  | "jurisdiction_dependent"
  | "unknown"
  | "placeholder";

export type Reliability = "high" | "medium" | "low" | "placeholder";

export interface Source {
  id: string;
  personId: string;
  title: string;
  titleEn?: string;
  sourceType: SourceType;
  publicationDate?: string;
  edition?: string;
  publisher?: string;
  sourceUrl?: string;
  bibliographicReference: string;
  copyrightStatus: CopyrightStatus;
  publicDomainStatus: PublicDomainStatus;
  rawText?: string;
  excerpt?: string;
  reliability: Reliability;
  notes?: string;
}
