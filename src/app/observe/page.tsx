import { PublicResultView } from "@/components/public/PublicResultView";
import { QuestionForm } from "@/components/QuestionForm";
import { getPublicPerspectiveMode } from "@/lib/public/mode";
import { observePublicBeta } from "@/lib/public/observe";

export default async function ObservePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    mode?: string;
    writer?: string;
    view?: string;
  }>;
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
