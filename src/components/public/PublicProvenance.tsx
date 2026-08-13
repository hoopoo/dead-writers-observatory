import type { PublicWriterView } from "@/types/public";

export function PublicProvenance(props: { writer: PublicWriterView }) {
  const { writer } = props;
  if (writer.provenance.length === 0) return null;

  return (
    <details className="public-provenance">
      <summary>なぜこの視点？</summary>
      <p className="public-provenance__lede">参照した資料 {writer.sourceCount}件</p>
      <ul className="public-provenance__list">
        {writer.provenance.map((item) => (
          <li key={item.sourceId}>
            <p className="public-provenance__title">『{item.title}』</p>
            <p>{item.personName}</p>
            <p>資料の種類: {item.voiceLabel}</p>
            <p>この解釈との距離: {item.distanceLabel}</p>
            {item.workVoiceWarning ? (
              <p className="public-provenance__warn">{item.workVoiceWarning}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {writer.hasModernTransfer ? (
        <div className="public-provenance__modern">
          <p className="eyebrow">現在への接続</p>
          <p>
            この部分は、当時の文章そのものではなく、残された資料を現在の問いへ接続した解釈です。
          </p>
        </div>
      ) : null}
    </details>
  );
}
