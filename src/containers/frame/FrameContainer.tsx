import { useCallback, useContext, useEffect, useRef, useState } from "react";
import type { QueryResult, RecordShape, ResultSummary } from "neo4j-driver";
import { SessionContext } from "../../providers/SessionProvider";
import type {
  IQueryContextInfo,
  ISavedQuery,
} from "../../providers/QueryProvider";
import FrameCypherEditor from "./FrameCypherEditor";
import FrameQueryContainer from "./FrameQueryContainer";
import "@neo4j-cypher/codemirror/css/cypher-codemirror.css";

export type IFrameQueryResult = RecordShape<PropertyKey, unknown>;

interface RunState {
  records: IFrameQueryResult[];
  keys: string[];
  summary: ResultSummary | null;
  elapsedMs: number;
}

function summariseCounters(summary: ResultSummary | null): string | null {
  if (!summary?.counters) {
    return null;
  }
  const updates = summary.counters.updates();
  const parts = Object.entries(updates)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .map(
      ([name, count]) =>
        `${count} ${name.replace(/([A-Z])/g, " $1").toLowerCase()}`,
    );
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function FrameContainer({
  query: savedQuery,
  cacheQuery,
  onClose,
}: {
  query: ISavedQuery;
  cacheQuery: IQueryContextInfo["addQuery"];
  onClose: IQueryContextInfo["onQueryDelete"];
}) {
  const { getSession } = useContext(SessionContext);
  const [queryText, setQueryText] = useState(savedQuery.query);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Identifies the newest run so a slow earlier query cannot overwrite it.
  const runId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    // Re-arming on mount matters: React re-mounts components (StrictMode in
    // development, and any remount in production), and a ref that is only ever
    // set to `false` on cleanup stays `false` for the rest of the component's
    // life — silently discarding every result and leaving the frame spinning.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runQuery = useCallback(
    async (query: string) => {
      const currentRun = ++runId.current;
      setLoading(true);
      setError(null);
      setQueryText(query);

      const session = getSession();
      const startedAt = performance.now();

      try {
        const response: QueryResult = await session.run(query);
        if (!mounted.current || currentRun !== runId.current) {
          return;
        }
        setResult({
          records: response.records.map((record) => record.toObject()),
          keys: response.records[0]?.keys.map(String) ?? [],
          summary: response.summary,
          elapsedMs: performance.now() - startedAt,
        });
        cacheQuery(query);
      } catch (caught) {
        if (!mounted.current || currentRun !== runId.current) {
          return;
        }
        setResult(null);
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        await session.close().catch(() => {});
        if (mounted.current && currentRun === runId.current) {
          setLoading(false);
        }
      }
    },
    [getSession, cacheQuery],
  );

  // Run once when the frame opens. Re-running is driven by the editor.
  const initialQuery = useRef(savedQuery.query);
  useEffect(() => {
    void runQuery(initialQuery.current);
  }, [runQuery]);

  const handleClose = useCallback(
    () => onClose(savedQuery),
    [onClose, savedQuery],
  );

  const counters = summariseCounters(result?.summary ?? null);

  return (
    <section className="frame">
      <header className="frame__header">
        <FrameCypherEditor
          value={queryText}
          onChange={setQueryText}
          onSubmit={runQuery}
        />
        <button
          type="button"
          className="frame__close"
          onClick={handleClose}
          aria-label="Close frame"
          title="Close frame"
        >
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
      </header>

      {loading && (
        <progress
          className="progress is-small is-link frame__progress"
          max="100"
        >
          Running
        </progress>
      )}

      {error && (
        <div className="frame__error">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <pre>{error}</pre>
        </div>
      )}

      {!error && result && (
        <>
          <div className="frame__stats u-muted">
            <span>
              {result.records.length} record
              {result.records.length === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span>{Math.round(result.elapsedMs)} ms</span>
            {counters && (
              <>
                <span>·</span>
                <span>{counters}</span>
              </>
            )}
          </div>
          <FrameQueryContainer data={result.records} keys={result.keys} />
        </>
      )}
    </section>
  );
}
