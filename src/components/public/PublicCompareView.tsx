import type { PublicObservation } from "@/types/public";

export function PublicCompareView(props: { result: PublicObservation }) {
  const { result } = props;

  return (
    <section className="public-compare">
      <h2>3人が見た場所</h2>
      <ul className="public-compare__where">
        {result.summary.whereTheyLook.map((row) => (
          <li key={row.personId}>
            <strong>{row.personName}</strong>
            <span>{row.text}</span>
          </li>
        ))}
      </ul>

      <div className="public-compare__split">
        <div>
          <h3>重なる場所</h3>
          {result.summary.shared.length > 0 ? (
            <ul>
              {result.summary.shared.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>大きく重なる論点は、今回の資料では目立ちません。</p>
          )}
        </div>
        <div>
          <h3>違って見える場所</h3>
          <ul>
            {result.summary.different.map((row) => (
              <li key={row.personId}>
                <strong>{row.personName}</strong>
                {row.text ? ` — ${row.text}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="public-compare__note">
        3つの視点は競争しません。どれが正しい答えか、一番合う作家かを決めるものではありません。
      </p>
    </section>
  );
}
