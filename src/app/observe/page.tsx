import Link from "next/link";
import { ObservationResultView } from "@/components/ObservationResultView";
import { PerspectiveSkeletonCard } from "@/components/PerspectiveSkeletonView";
import { QuestionForm } from "@/components/QuestionForm";
import {
  isEvidenceBoundedSkeletonEnabled,
  isStagingClaimsEnabled,
  observeQuestion,
  observeQuestionWithSkeleton,
  observeQuestionWithStagingClaims,
} from "@/lib/observe";

export default async function ObservePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    skeleton?: string;
    stagingClaims?: string;
  }>;
}) {
  const params = await searchParams;
  const question = params.q?.trim() ?? "";
  const staging = isStagingClaimsEnabled(params.stagingClaims);
  const skeletonRequested =
    !staging &&
    (params.skeleton === "1" || isEvidenceBoundedSkeletonEnabled());

  if (!question) {
    return (
      <section className="panel">
        <h1>問いがありません</h1>
        <p className="panel__lede">観測する問いを置いてください。</p>
        <QuestionForm />
      </section>
    );
  }

  if (staging) {
    const { observation, skeletons } =
      await observeQuestionWithStagingClaims(question);
    return (
      <>
        {observation.safetyNotice ? (
          <aside className="safety-notice" role="note">
            {observation.safetyNotice}
          </aside>
        ) : null}
        <section className="panel question-panel">
          <p className="eyebrow">Staging claims · Experiment B</p>
          <h1 className="question-panel__text">
            {observation.analysis.surfaceQuestion}
          </h1>
          <p className="panel__lede">
            Deterministic + human-approved LLM claims（no free-form prose）
          </p>
        </section>
        <section className="voices-section">
          <div className="section-heading">
            <p className="eyebrow">Three archives</p>
            <h2>資料から組み立てた視点（staging）</h2>
          </div>
          <div className="voices-grid">
            {skeletons.map((skeleton) => (
              <PerspectiveSkeletonCard
                key={skeleton.personId}
                skeleton={skeleton}
              />
            ))}
          </div>
        </section>
        <div className="result-actions">
          <Link href="/" className="button-secondary">
            別の問いを置く
          </Link>
          <Link
            href={`/observe?q=${encodeURIComponent(question)}`}
            className="button-secondary"
          >
            Production表示
          </Link>
        </div>
      </>
    );
  }

  if (skeletonRequested) {
    const { observation, skeletons } =
      await observeQuestionWithSkeleton(question);
    return (
      <>
        {observation.safetyNotice ? (
          <aside className="safety-notice" role="note">
            {observation.safetyNotice}
          </aside>
        ) : null}
        <section className="panel question-panel">
          <p className="eyebrow">Your question</p>
          <h1 className="question-panel__text">
            {observation.analysis.surfaceQuestion}
          </h1>
          <p className="panel__lede">
            Evidence-Bounded Skeleton（Approved Claims only / no free-form prose）
          </p>
        </section>
        <section className="voices-section">
          <div className="section-heading">
            <p className="eyebrow">Three archives</p>
            <h2>資料から組み立てた視点</h2>
          </div>
          <div className="voices-grid">
            {skeletons.map((skeleton) => (
              <PerspectiveSkeletonCard
                key={skeleton.personId}
                skeleton={skeleton}
              />
            ))}
          </div>
        </section>
        <div className="result-actions">
          <Link href="/" className="button-secondary">
            別の問いを置く
          </Link>
          <Link
            href={`/observe?q=${encodeURIComponent(question)}`}
            className="button-secondary"
          >
            既存Perspective表示
          </Link>
          <Link
            href={`/observe?q=${encodeURIComponent(question)}&stagingClaims=1`}
            className="button-secondary"
          >
            Staging Claims
          </Link>
        </div>
      </>
    );
  }

  const result = await observeQuestion(question);

  return (
    <>
      <ObservationResultView result={result} />
      <div className="result-actions">
        <Link href="/" className="button-secondary">
          別の問いを置く
        </Link>
        <Link
          href={`/observe?q=${encodeURIComponent(question)}&skeleton=1`}
          className="button-secondary"
        >
          Claim Skeleton表示
        </Link>
        <Link
          href={`/observe?q=${encodeURIComponent(question)}&stagingClaims=1`}
          className="button-secondary"
        >
          Staging Claims
        </Link>
      </div>
    </>
  );
}
