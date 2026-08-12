import type { Source } from "@/types/source";

export const sosekiSources: Source[] = [
  {
    id: "src-soseki-individualism",
    personId: "person-soseki",
    title: "私の個人主義",
    titleEn: "My Individualism",
    sourceType: "speech",
    publicationDate: "1914",
    originalPublicationYear: 1914,
    bibliographicReference:
      "夏目漱石『私の個人主義』（1914年講演）。底本：ちくま日本文学全集『夏目漱石』（筑摩書房, 1992）。青空文庫 card772。",
    sourceUrl: "https://www.aozora.gr.jp/cards/000148/card772.html",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes: "講演。authorial distance: direct。",
  },
  {
    id: "src-soseki-garasudo",
    personId: "person-soseki",
    title: "硝子戸の中",
    titleEn: "Inside My Glass Doors",
    sourceType: "autobiographical_text",
    publicationDate: "1915",
    originalPublicationYear: 1915,
    bibliographicReference:
      "夏目漱石『硝子戸の中』（1915）。青空文庫 card760。",
    sourceUrl: "https://www.aozora.gr.jp/cards/000148/card760.html",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes: "自伝的随筆。passage により near / direct。",
  },
  {
    id: "src-soseki-kokoro",
    personId: "person-soseki",
    title: "こころ",
    titleEn: "Kokoro",
    sourceType: "novel",
    publicationDate: "1914",
    originalPublicationYear: 1914,
    bibliographicReference:
      "夏目漱石『こころ』（1914）。青空文庫 card773。",
    sourceUrl: "https://www.aozora.gr.jp/cards/000148/card773.html",
    copyrightStatus: "public_domain",
    publicDomainStatus: "public-domain",
    reliability: "primary",
    notes:
      "小説。語り手・登場人物の視点を、作者本人の思想と同一視してはならない。",
  },
];
