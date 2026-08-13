import Link from "next/link";
import { people } from "@/data/people";
import { PublicProvenance } from "@/components/public/PublicProvenance";
import type { PublicWriterView } from "@/types/public";

export function PublicWriterCard(props: {
  writer: PublicWriterView;
  question: string;
}) {
  const { writer, question } = props;
  const index = people.findIndex((p) => p.id === writer.personId);
  const next = index >= 0 ? people[index + 1] : undefined;
  const q = encodeURIComponent(question);
  const insufficient = writer.availability === "insufficient";
  const limited = writer.availability === "limited";
  const hasBody =
    writer.archiveParagraphs.length + writer.connectionParagraphs.length > 0 ||
    Boolean(writer.returnedQuestion);

  return (
    <article className="public-writer">
      <header className="public-writer__header">
        <p className="eyebrow">0{index + 1}</p>
        <h2>{writer.personName}</h2>
        {writer.lensJa ? (
          <p className="public-writer__lens">{writer.lensJa}</p>
        ) : null}
      </header>

      {limited && hasBody ? (
        <p className="public-writer__note">
          この問いに接続できる資料は、現在のArchiveでは限られています。
        </p>
      ) : null}

      {insufficient || !hasBody ? (
        <p className="public-writer__silence">
          現在のArchiveからは、この問いについて十分な視点を組み立てられませんでした。
        </p>
      ) : (
        <>
          {writer.archiveParagraphs.length > 0 ? (
            <section className="public-writer__section">
              <h3>資料から見えること</h3>
              {writer.archiveParagraphs.map((text, index) => (
                <p key={`archive-${index}`}>{text}</p>
              ))}
            </section>
          ) : null}

          {writer.connectionParagraphs.length > 0 ? (
            <section className="public-writer__section">
              <h3>いまの問いとの接点</h3>
              {writer.connectionParagraphs.map((text, index) => (
                <p key={`connection-${index}`}>{text}</p>
              ))}
            </section>
          ) : null}

          {writer.returnedQuestion ? (
            <section className="public-writer__returned">
              <h3>あなたに残る問い</h3>
              <p>{writer.returnedQuestion}</p>
            </section>
          ) : null}
        </>
      )}

      <PublicProvenance writer={writer} />

      {writer.proseFallback ? (
        <p className="public-writer__note">
          文章表示を生成できなかったため、資料ベースの表示に切り替えました。
        </p>
      ) : null}

      <footer className="public-writer__nav">
        {next ? (
          <Link
            href={`/observe?q=${q}&writer=${next.slug}`}
            className="button-secondary"
          >
            次の資料群へ → {next.name}
          </Link>
        ) : (
          <Link
            href={`/observe?q=${q}&view=compare`}
            className="button-secondary"
          >
            3人を並べて見る
          </Link>
        )}
      </footer>
    </article>
  );
}
