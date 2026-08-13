# Dead Writers Observatory

**Status: v0.1 Public Beta**

死者は答えない。言葉が残っている。AI は、その言葉と現在の問いを再接続する。

Public version: **Dead Writers Observatory v0.1 Public Beta** (`0.1.0`)

詳細: [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)

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

## Public Beta flags

Source of truth:

```bash
PUBLIC_PERSPECTIVE_MODE=skeleton   # or prose after independent blind PASS
```

Staging override only:

```bash
STAGING_MODE_OVERRIDE=true
# then /observe?q=...&mode=skeleton|prose
```

Deprecated research flags (not public default):

```
PUBLIC_BETA_PROSE
STAGING_PROSE
/observe?q=...&prose=1
```

Priority: `PUBLIC_PERSPECTIVE_MODE` > deprecated `PUBLIC_BETA_PROSE` > default `skeleton`.
Production must leave `STAGING_MODE_OVERRIDE` unset.
Research query params (`?prose=1`, `?experiment=C`, `?stagingClaims=1`, `?skeleton=1`) are ignored unless staging override is on.

## Deploy (v0.1 Public Beta)

Vercel / Node. Freeze artifact is in git: `src/data/release/approved-public-beta-v0.1.json`.
Do not rely on `data/curator-reviews.sqlite` at runtime.

```bash
npm ci
PUBLIC_PERSPECTIVE_MODE=skeleton \
RETRIEVAL_MODE=deterministic \
NEXT_PUBLIC_SITE_URL=https://your-domain.example \
npm run build
npm start
```

If Curator is enabled:

```bash
CURATOR_ENABLED=true
CURATOR_TOKEN=<secret>
```

Do not set `STAGING_MODE_OVERRIDE`, `STAGING_PROSE`, `PUBLIC_BETA_PROSE`, `EXPERIMENT_C`, `STAGING_CLAIMS`, or `EVIDENCE_BOUNDED_SKELETON`.

Public rendering uses freeze artifact `src/data/release/approved-public-beta-v0.1.json`.
Curator SQLite (`data/curator-reviews.sqlite`) is review/experiment only — do not delete it, and do not depend on it at Vercel runtime.

```bash
npm run release:freeze
npm run eval:prose-blind
npm run eval:release-qa
npm run eval:release-readiness
npm run snapshot:release
```

Final regression:

```bash
npm run eval:claim-regression
npm run eval:retrieval-regression
npm run eval:perspective-distinctiveness
npm run eval:prose-regression
npm run eval:release-qa
npm run eval:release-readiness
npm run build
```

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
npm run embeddings:index -- --provider=local-bridge
npm run embeddings:index -- --provider=openai
npm run eval:semantic-retrieval
npm run eval:neural-retrieval
npm run eval:retrieval-human
```

- Archive content（原文・Source）は Git 管理
- Curator decisions（review status / events）は SQLite（`data/curator-reviews.sqlite`）
- Review history は append-only
- Passage embeddings も同 DB の derived artifact（source of truth ではない）
- Human retrieval verdicts も同 DB（`retrieval_human_evaluations`）

## Retrieval modes

```bash
RETRIEVAL_MODE=deterministic   # default / production-safe
RETRIEVAL_MODE=semantic
RETRIEVAL_MODE=hybrid
```

Public UI に mode selector は出さない。Curator `/curator/retrieval` で A/B 比較。

Evaluation modes（Curator / scripts only）:

```
deterministic
local-semantic
neural-semantic
neural-hybrid
```

Embedding provider:

```bash
EMBEDDING_PROVIDER=local-bridge   # offline default
# EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=...
# OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

local-bridge と neural（openai）の embeddings は
`passageId + provider + model` で namespace 分離する。

## Human Retrieval Evaluation

Machine retrieval quality cannot replace human archival judgment.

Neural similarity is useful only when it improves the evidence set
without damaging provenance or diversity.

- Machine metrics（Retrieval Quality / diversity / trust）と Human Verdict は合成しない
- Curator `/curator/retrieval` で side-by-side evidence set 比較
- Blind mode（SET A / SET B）で mode 名バイアスを減らす
- 30 cases = 10 fixtures × 3 writers
- Staging candidate（neural-hybrid）は Better+Same ≥ 80% かつ critical WORSE なし、など条件を満たす場合のみ報告

```bash
npm run eval:retrieval-human
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

Do not ask whether neural retrieval is smarter.
Ask whether it retrieves better evidence.

## Retrieval evaluation scripts

```bash
npx tsx scripts/dump-blind-cases.ts
npx tsx scripts/persist-neural-human-evals.ts
```

- `dump-blind-cases.ts` — blind SET A/B dump for reproducible human comparison
- `persist-neural-human-evals.ts` — rebuild / re-apply neural human verdicts with provenance notes

## Claim Layer (Evidence-Bounded Generation prep)

```
Selected Evidence
  → Evidence Packet
  → Perspective Claims
  → Claim Validation
  → Approved Claims
  → [future] Prose Generation
```

```bash
npm run eval:claims
npm run eval:claim-regression
npm run snapshot:claims
```

Curator: `/curator/claims`

```
RETRIEVAL

Vector proposes.
Archive decides.

GENERATION

Generator proposes.
Evidence decides.
```

```
YOU ARE NOT SOSEKI.
YOU ARE NOT AKUTAGAWA.
YOU ARE NOT DAZAI.

You are an archival interpretation engine.
You may propose claims.
Evidence decides whether those claims survive.
```

Default generation mode: `deterministic-claims`.
LLM Claim Proposal is experiment-only (`/curator/claim-experiments`).
It does **not** replace the deterministic generator and does **not** feed `/observe` skeletons yet.
`llm-prose` remains unimplemented.

```bash
# CLAIM_LLM_PROVIDER=openai
# OPENAI_CLAIM_MODEL=gpt-4o-mini
# LLM_CLAIM_PROMPT_VERSION=v1
npm run eval:llm-claims
npx tsx scripts/persist-llm-claim-human-evals.ts
npm run eval:llm-claim-human
```

```
LLM proposes.
Evidence decides.
Human judges whether the proposal is worth keeping.
```

## Staging Perspectives (Experiment B)

Live human novelty (`new-angle` / `useful-rephrase` / `duplicate` / `stereotype`) decides LLM staging eligibility.

```bash
npx tsx scripts/persist-live-llm-novelty.ts
npm run eval:perspective-distinctiveness
npm run eval:perspective-human
npm run snapshot:perspectives
```

- Curator: `/curator/claim-experiments` (LLM LIVE REVIEW)
- Curator: `/curator/perspectives` (3-writer set + distinctiveness)
- Staging observe only: `/observe?q=...&stagingClaims=1`
- Production default unchanged (`stagingClaims=false`)
- Public Beta prose is freeze-only (no live LLM on public observe)

```
Three archives in.
Three different perspectives out.
```

## Experiment C (neural-hybrid retrieval)

Compare retrieval only; keep ClaimSetSelector / validator / promptVersion fixed.

```bash
npx tsx scripts/persist-experiment-c-claims.ts
npm run eval:experiment-c
npm run snapshot:perspectives:c
```

- Curator: `/curator/perspectives?experiment=C` and `?compare=bc`
- Staging: `/observe?q=...&experiment=C`
- Does **not** overwrite `perspective-sets-v1.json` (B)
- Writes `perspective-sets-c-v1.json`
- RetrievalRouter / TemporalSemanticDistance: interface prep only

```
Change the retrieval.
Keep the perspective intact.
```

## Claim Human Evaluation

Safe is not enough. A claim must also be useful.

Machine ClaimValidator and Human Evaluation stay separate — no composite score.

Axes:

- Evidence / Attribution Quality
- Perspective Usefulness
- Strength

```bash
npx tsx scripts/persist-claim-human-evals.ts
npm run eval:claim-human
npm run eval:perspective-skeleton
```

Approved Claims (human-reviewed only) → Perspective Skeleton sections.
No new prose synthesis. Silence is preferable to unsupported interpretation.

```bash
# optional public skeleton
EVIDENCE_BOUNDED_SKELETON=true
# or /observe?q=...&skeleton=1
```

```
Silence is preferable
to unsupported interpretation.
```
