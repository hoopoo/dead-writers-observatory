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

export type PublicDomainStatus = "public-domain" | "copyrighted" | "unknown";

export type Reliability = "primary" | "secondary" | "tertiary";

export interface Source {
  id: string;
  personId: string;
  title: string;
  titleEn?: string;
  sourceType: SourceType;
  publicationDate?: string;
  originalPublicationYear?: number;
  edition?: string;
  publisher?: string;
  sourceUrl?: string;
  bibliographicReference: string;
  copyrightStatus: CopyrightStatus;
  publicDomainStatus: PublicDomainStatus;
  reliability: Reliability;
  notes?: string;
}
