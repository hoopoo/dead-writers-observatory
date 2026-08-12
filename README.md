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
