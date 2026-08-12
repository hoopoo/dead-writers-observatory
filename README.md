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
  → Query Embedding (optional)
  → Semantic Candidate Retrieval (person-scoped)
  → Archive Trust Filter
  → Evidence Diversity Reranker
  → Retrieval Quality Evaluation
  → Selected Evidence
  → Perspective Generator (unchanged in RAG v0.1)
  → Comparison Layer
  → UI (provenance-labeled)
```

Provenance chain:

```
Source → SourcePassage → ThoughtFragment → WriterPerspective
```

`DIRECT SOURCE` は `verificationStatus === "verified"` の passage のみ。
placeholder は `SOURCE REFERENCE` / `ARCHIVE INTERPRETATION`。

**Vector similarity is nomination, not authority.**

Semantic search may discover connections. The archive + curator review state
decide whether those connections deserve to survive.


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
npm run embeddings:index
npm run eval:semantic-retrieval
```

- Archive content（原文・Source）は Git 管理
- Curator decisions（review status / events）は SQLite（`data/curator-reviews.sqlite`）
- Review history は append-only
- Passage embeddings も同 DB の derived artifact（source of truth ではない）

## Retrieval modes

```bash
RETRIEVAL_MODE=deterministic   # default / production-safe
RETRIEVAL_MODE=semantic
RETRIEVAL_MODE=hybrid
```

Public UI に mode selector は出さない。Curator `/curator/retrieval` で A/B 比較。

Embedding provider:

```bash
EMBEDDING_PROVIDER=local-bridge   # offline default
# EMBEDDING_PROVIDER=openai
# EMBEDDING_API_KEY=...
```

## Retrieval quality

Similarity alone ≠ Retrieval Quality.

```
Relevance
× Provenance
× Review Integrity
× Source Diversity
× Authorial Distance
```

`ArchiveTrustFilter` と `EvidenceDiversityReranker` は semantic / hybrid でも必須。
Index-time gate と query-time gate の二重適用。Vector index は source of truth ではない。
