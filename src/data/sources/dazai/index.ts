import type { Source } from "@/types/source";

export const dazaiSources: Source[] = [
  {
    id: "src-dazai-ningen",
    personId: "person-dazai",
    title: "人間失格",
    titleEn: "No Longer Human",
    sourceType: "novel",
    publicationDate: "1948",
    originalPublicationYear: 1948,
    bibliographicReference:
      "太宰治『人間失格』（1948）。正式テキストは後続アーカイブで差し替え。",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes:
      "小説。語り手・登場人物 ≠ 作者本人。羞恥・演技の主題は work-level theme として扱う。",
  },
  {
    id: "src-dazai-tsugaru",
    personId: "person-dazai",
    title: "津軽",
    titleEn: "Tsugaru",
    sourceType: "autobiographical_text",
    publicationDate: "1944",
    originalPublicationYear: 1944,
    bibliographicReference:
      "太宰治『津軽』（1944）。正式テキストは後続アーカイブで差し替え。",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes: "紀行・自伝的散文。near / direct（passage 依存）。",
  },
  {
    id: "src-dazai-fugaku",
    personId: "person-dazai",
    title: "富嶽百景",
    titleEn: "One Hundred Views of Mount Fuji",
    sourceType: "autobiographical_text",
    publicationDate: "1939",
    originalPublicationYear: 1939,
    bibliographicReference:
      "太宰治『富嶽百景』（1939）。正式テキストは後続アーカイブで差し替え。",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes: "文学的随筆・自伝的記述。near。",
  },
];
