import type { PublicQueryResolution } from "@/types/public-query";
import { formatPublicQueryResolutionTrace } from "@/lib/public/query-resolver";

export function PublicQueryResolutionTrace(props: {
  question: string;
  resolution: PublicQueryResolution;
}) {
  return (
    <aside className="public-query-trace" aria-label="Public query resolution trace">
      <pre>{formatPublicQueryResolutionTrace(props.question, props.resolution)}</pre>
    </aside>
  );
}
