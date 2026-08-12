import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";

export function PerspectiveSkeletonCard(props: {
  skeleton: EvidenceBoundedPerspectiveSkeleton;
}) {
  const { skeleton } = props;
  const hasAny =
    skeleton.sections.archiveObservation.length +
      skeleton.sections.acrossSources.length +
      skeleton.sections.connectionToQuestion.length +
      skeleton.sections.returnedQuestion.length >
    0;

  return (
    <article className="perspective-skeleton">
      <p className="eyebrow">{skeleton.personName}の資料から</p>
      <h3>{skeleton.personName}</h3>

      {skeleton.availability === "insufficient" || !hasAny ? (
        <p>
          現在のArchiveからは、この問いについて十分な視点を組み立てられませんでした。
        </p>
      ) : null}

      {skeleton.availability === "limited" && hasAny ? (
        <p className="panel__lede">
          この問いに接続できる資料は、現在のArchiveでは限られています。
        </p>
      ) : null}

      {skeleton.sections.archiveObservation.length > 0 ? (
        <div>
          <p className="eyebrow">資料から見えること / ARCHIVE</p>
          {skeleton.sections.archiveObservation.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      ) : null}

      {skeleton.sections.acrossSources.length > 0 ? (
        <div>
          <p className="eyebrow">資料をまたいで見えること / ACROSS THE SOURCES</p>
          {skeleton.sections.acrossSources.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      ) : null}

      {skeleton.sections.connectionToQuestion.length > 0 ? (
        <div>
          <p className="eyebrow">いまの問いとの接点 / CONNECTION</p>
          {skeleton.sections.connectionToQuestion.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      ) : null}

      {skeleton.sections.returnedQuestion.length > 0 ? (
        <div>
          <p className="eyebrow">あなたに残る問い / A QUESTION RETURNED</p>
          {skeleton.sections.returnedQuestion.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      ) : null}

      {skeleton.humanReviewed ? (
        <p className="meta-label">Provenance: Curated / Reviewed</p>
      ) : null}
    </article>
  );
}
