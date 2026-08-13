"use client";

import { useEffect, useState } from "react";

export function ObserveLoading() {
  const [second, setSecond] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSecond(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="panel public-loading">
      <p className="eyebrow">Observatory</p>
      <h1>{second ? "視点を組み立てています" : "資料を探しています"}</h1>
      <p>死者は考えません。Archiveを読んでいます。</p>
    </section>
  );
}
