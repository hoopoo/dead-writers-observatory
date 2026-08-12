export type VoiceType =
  | "authorial"
  | "essayistic"
  | "autobiographical"
  | "diary"
  | "letter"
  | "narrator"
  | "fictional_character"
  | "dialogue"
  | "editorial"
  | "uncertain";

export type ProvenanceConfidence = "high" | "medium" | "low";

export type VerificationStatus = "verified" | "unverified" | "placeholder";

export interface PassageLocator {
  chapter?: string;
  section?: string;
  page?: string;
  paragraph?: string;
  line?: string;
  anchor?: string;
}

export interface PassageVerificationMeta {
  sourceUrl?: string;
  checkedAgainst?: string;
  checkedAt?: string;
  checkedBy?: string;
  notes?: string;
}

export interface SourcePassage {
  id: string;
  sourceId: string;
  personId: string;
  /** Only set when a verified citation text exists in-repo. Never invent quotes. */
  text?: string;
  locator: PassageLocator;
  voiceType: VoiceType;
  speaker?: string;
  isAuthorDirectStatement: boolean;
  contextBefore?: string;
  contextAfter?: string;
  provenanceConfidence: ProvenanceConfidence;
  verificationStatus: VerificationStatus;
  verification?: PassageVerificationMeta;
  notes?: string;
}
