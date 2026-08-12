import { QuestionForm } from "@/components/QuestionForm";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <h1 className="hero__brand">Dead Writers Observatory</h1>
        <p className="hero__principle">
          死者は答えない。
          <br />
          言葉が残っている。
        </p>
        <div className="hero__writers">
          <span>夏目漱石</span>
          <span>芥川龍之介</span>
          <span>太宰治</span>
        </div>
        <p className="hero__support">
          三人の残した言葉から、あなたの問いを読み直します。本人を再現しません。口調を模倣しません。死者が直接答えているようには見せません。
        </p>
      </section>

      <QuestionForm />

      <aside className="principle-strip">
        <p>The dead do not answer.</p>
        <p>Their words remain.</p>
        <p>AI reconnects those words to the questions of the living.</p>
      </aside>
    </>
  );
}
