# Dead Writers Observatory

SHIRO & Co. Observatory の MVP。

死者は答えない。言葉が残っている。AI は、その言葉と現在の問いを再接続する。

夏目漱石 / 芥川龍之介 / 太宰治の公開著作・随筆・日記・書簡等を参照し、いまの悩みを三人それぞれの観測軸から読み直す **Archive-based Perspective Engine**。

## Principles

- 本人を再現しない
- 口調を模倣しない
- 死者が直接答えているように見せない
- 架空引用をしない
- Source → Thought Fragment → Interpretation → Perspective の順で生成する

## Stack

- Next.js (App Router)
- TypeScript
- Deterministic mock engine（OpenAI API 未接続）

## Develop

```bash
npm install
npm run dev
```

Fixture evaluation / archive review:

```bash
npm run eval:fixtures
npm run review:archive
```

`DIRECT SOURCE` requires `verificationStatus === "verified"` + approved PassageReview + `text`.
Verified novel passages use `SOURCE TEXT — WORK VOICE` when narrator/character voice.

## Architecture

```
Question
  → QuestionAnalysis
  → PerspectiveRetriever (per person)
  → ThoughtFragment[]  (via SourcePassage)
  → WriterPerspective + Evidence + Archival Distance
  → ThreeVoicesAnalysis + Historical Distance
  → UI (provenance-labeled)
```

Provenance chain:

```
Source → SourcePassage → ThoughtFragment → WriterPerspective
```

`DIRECT SOURCE` は `verificationStatus === "verified"` の passage のみ。
placeholder は `SOURCE REFERENCE` / `ARCHIVE INTERPRETATION`。

RAG 接続時は `src/lib/retrieval.ts` の `PerspectiveRetriever` 実装を差し替える。

## Curator Console (internal)

`/curator` は運用者向け。公開 UI からはリンクしない。

```bash
# .env.local
CURATOR_ENABLED=true
# optional:
# CURATOR_TOKEN=...
```

```bash
npm run curator:seed
npm run snapshot:retrieval
npm run eval:retrieval-regression
npm run eval:review-persistence
```

- Archive content（原文・Source）は Git 管理
- Curator decisions（review status / events）は SQLite（`data/curator-reviews.sqlite`）
- Review history は append-only

## Retrieval quality (before semantic RAG)

Similarity alone ≠ Retrieval Quality.

Dead Writers Observatory treats search quality as:

```
Relevance
× Provenance
× Review Integrity
× Source Diversity
× Authorial Distance
```

Semantic retrieval 導入後も、似ている文章を選ぶだけでは品質を担保しない。
`ArchiveTrustFilter` と `EvidenceDiversityReranker` が trust / diversity を先に守る。
