import type { Source } from "@/types/source";

export const akutagawaSources: Source[] = [
  {
    id: "src-akutagawa-shuju",
    personId: "person-akutagawa",
    title: "侏儒の言葉",
    titleEn: "Words of a Dwarf",
    sourceType: "essay",
    publicationDate: "1923-1927",
    originalPublicationYear: 1923,
    bibliographicReference:
      "芥川龍之介『侏儒の言葉』（1923–1927）。正式テキストは後続アーカイブで差し替え。",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes: "アフォリズム的随筆。direct / near。",
  },
  {
    id: "src-akutagawa-ahou",
    personId: "person-akutagawa",
    title: "或阿呆の一生",
    titleEn: "A Fool's Life",
    sourceType: "autobiographical_text",
    publicationDate: "1927",
    originalPublicationYear: 1927,
    bibliographicReference:
      "芥川龍之介『或阿呆の一生』（1927）。正式テキストは後続アーカイブで差し替え。",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes: "自伝的断章。near。作者の死の説明として単純化しない。",
  },
  {
    id: "src-akutagawa-haguruma",
    personId: "person-akutagawa",
    title: "歯車",
    titleEn: "Spinning Gears",
    sourceType: "novel",
    publicationDate: "1927",
    originalPublicationYear: 1927,
    bibliographicReference:
      "芥川龍之介『歯車』（1927）。正式テキストは後続アーカイブで差し替え。",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes:
      "小説的テクスト。作品と作者人生の距離を断定しない。indirect / near。",
  },
];
