import Link from "next/link";
import { PerspectiveSkeletonCard } from "@/components/PerspectiveSkeletonView";
import { PerspectiveProseCard } from "@/components/PerspectiveProseView";
import { PublicResultView } from "@/components/public/PublicResultView";
import { QuestionForm } from "@/components/QuestionForm";
import { people } from "@/data/people";
import {
  isEvidenceBoundedSkeletonEnabled,
  isExperimentCEnabled,
  isStagingClaimsEnabled,
  isStagingProseEnabled,
  observeQuestionWithExperimentC,
  observeQuestionWithProse,
  observeQuestionWithSkeleton,
  observeQuestionWithStagingClaims,
} from "@/lib/observe";
import {
  getPublicPerspectiveMode,
  isStagingModeOverrideEnabled,
} from "@/lib/public/mode";
import { observePublicBeta } from "@/lib/public/observe";

export default async function ObservePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    skeleton?: string;
    stagingClaims?: string;
    experiment?: string;
    retrieval?: string;
    prose?: string;
    mode?: string;
    writer?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const question = params.q?.trim() ?? "";
  const allowResearch = isStagingModeOverrideEnabled();
  const experimentC =
    allowResearch &&
    isExperimentCEnabled({
      experiment: params.experiment,
      retrieval: params.retrieval,
    });
  const researchProse =
    allowResearch && !experimentC && isStagingProseEnabled(params.prose);
  const staging =
    allowResearch &&
    !experimentC &&
    !researchProse &&
    isStagingClaimsEnabled(params.stagingClaims);
  const skeletonRequested =
    allowResearch &&
    !staging &&
    !researchProse &&
    !experimentC &&
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

  if (experimentC) {
    const { observation, skeletons } =
      await observeQuestionWithExperimentC(question);
    return (
      <>
        {observation.safetyNotice ? (
          <aside className="safety-notice" role="note">
            {observation.safetyNotice}
          </aside>
        ) : null}
        <section className="panel question-panel">
          <p className="eyebrow">Experiment C · neural-hybrid retrieval</p>
          <h1 className="question-panel__text">
            {observation.analysis.surfaceQuestion}
          </h1>
          <p className="panel__lede">
            Change the retrieval. Keep the perspective intact.（research）
          </p>
        </section>
        <section className="voices-section">
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
        </div>
      </>
    );
  }

  if (researchProse) {
    const { observation, cases } = await observeQuestionWithProse(question);
    return (
      <>
        {observation.safetyNotice ? (
          <aside className="safety-notice" role="note">
            {observation.safetyNotice}
          </aside>
        ) : null}
        <section className="panel question-panel">
          <p className="eyebrow">Research prose · Experiment B</p>
          <h1 className="question-panel__text">
            {observation.analysis.surfaceQuestion}
          </h1>
        </section>
        <section className="voices-section">
          <div className="voices-grid">
            {cases.map((item) => {
              const name =
                people.find((p) => p.id === item.input.personId)?.name ??
                item.input.personId;
              return (
                <PerspectiveProseCard
                  key={item.input.personId}
                  personName={name}
                  prose={item.userFacing}
                  skeleton={item.skeleton}
                  showProvenance
                />
              );
            })}
          </div>
        </section>
        <div className="result-actions">
          <Link href="/" className="button-secondary">
            別の問いを置く
          </Link>
        </div>
      </>
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
        </section>
        <section className="voices-section">
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
          <p className="eyebrow">Research skeleton</p>
          <h1 className="question-panel__text">
            {observation.analysis.surfaceQuestion}
          </h1>
        </section>
        <section className="voices-section">
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
        </div>
      </>
    );
  }

  const mode = getPublicPerspectiveMode(params.mode);
  const publicResult = await observePublicBeta(question, mode);

  return (
    <PublicResultView
      result={publicResult}
      writerSlug={params.writer}
      view={params.view}
    />
  );
}
