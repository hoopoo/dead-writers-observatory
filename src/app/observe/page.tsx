import Link from "next/link";
import { ObservationResultView } from "@/components/ObservationResultView";
import { QuestionForm } from "@/components/QuestionForm";
import { observeQuestion } from "@/lib/observe";

export default async function ObservePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const question = params.q?.trim() ?? "";

  if (!question) {
    return (
      <section className="panel">
        <h1>問いがありません</h1>
        <p className="panel__lede">観測する問いを置いてください。</p>
        <QuestionForm />
      </section>
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
      </div>
    </>
  );
}
