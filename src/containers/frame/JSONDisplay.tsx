import { useMemo } from "react";
import { prettyPrintJson } from "pretty-print-json";
import { toJsonSafe } from "../../graph/values";

/** Rows above which the JSON view is truncated to keep the DOM manageable. */
const MAX_ROWS = 500;

export default function JSONDisplay({ data }: { data: unknown[] }) {
  const truncated = data.length > MAX_ROWS;

  const html = useMemo(
    () => ({
      // `prettyPrintJson` HTML-escapes its input, so this is safe to inject.
      // Neo4j Integers/temporals are converted first — they would otherwise
      // serialise as opaque `{low, high}` pairs.
      __html: prettyPrintJson.toHtml(
        toJsonSafe(truncated ? data.slice(0, MAX_ROWS) : data),
      ),
    }),
    [data, truncated],
  );

  return (
    <div className="json-display">
      {truncated && (
        <p className="u-muted is-size-7">
          Showing the first {MAX_ROWS} of {data.length} records.
        </p>
      )}
      <pre className="u-scroll-y" dangerouslySetInnerHTML={html} />
    </div>
  );
}
