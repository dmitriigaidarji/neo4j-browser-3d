import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import { GraphContext } from "../graph/GraphProcessedContainer";
import {
  fetchRelatedNodes,
  type IRelatedLinkOption,
} from "../../graph/queries";
import { resolveCaption } from "../../graph/captions";
import type { INode } from "../../graph/types";

const FETCH_LIMIT = 300;

interface Candidate {
  id: string;
  labels: string[];
  caption: string;
  /** Present in the graph at load time. */
  initiallyShown: boolean;
}

export default function GraphRelatedLink({
  link,
  item,
}: {
  link: IRelatedLinkOption;
  item: INode;
}) {
  const { getSession } = useContext(SessionContext);
  const { graph, expand, busy } = useContext(GraphContext);

  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Starts true because the fetch below runs on mount; this avoids flipping
  // the flag synchronously inside the effect.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // Snapshot the currently visible ids once, so re-renders driven by the graph
  // updating do not reset the user's in-progress selection.
  const visibleIds = useMemo(
    () => new Set(graph.nodes.map((node) => node.elementId)),
    [graph.nodes],
  );

  useEffect(() => {
    let cancelled = false;
    const session = getSession();

    fetchRelatedNodes({
      session,
      elementId: item.elementId,
      link,
      limit: FETCH_LIMIT,
    })
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const mapped: Candidate[] = rows
          .map((row) => ({
            id: row.id,
            labels: row.labels,
            caption: resolveCaption(row.labels, row.properties) || row.id,
            initiallyShown: visibleIds.has(row.id),
          }))
          .sort((a, b) => {
            const byLabel = a.labels.join().localeCompare(b.labels.join());
            return byLabel !== 0 ? byLabel : a.caption.localeCompare(b.caption);
          });
        setCandidates(mapped);
        setChecked(
          new Set(
            mapped.filter((row) => row.initiallyShown).map((row) => row.id),
          ),
        );
      })
      .catch((caught: Error) => {
        if (!cancelled) {
          setError(caught.message);
        }
      })
      .finally(() => {
        session.close().catch(() => {});
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // `visibleIds` deliberately excluded: it changes as the graph grows, and
    // re-running would wipe the user's pending checkbox selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSession, item.elementId, link]);

  const shown = useMemo(() => {
    if (!candidates) {
      return [];
    }
    const needle = filter.trim().toLowerCase();
    return needle
      ? candidates.filter((row) => row.caption.toLowerCase().includes(needle))
      : candidates;
  }, [candidates, filter]);

  const toggle = useCallback((id: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setAll = useCallback(
    (value: boolean) => {
      setChecked((current) => {
        const next = new Set(current);
        shown.forEach((row) => {
          if (value) {
            next.add(row.id);
          } else {
            next.delete(row.id);
          }
        });
        return next;
      });
    },
    [shown],
  );

  const pending = useMemo(() => {
    if (!candidates) {
      return { add: [] as string[], remove: [] as string[] };
    }
    return {
      add: candidates
        .filter((row) => checked.has(row.id) && !row.initiallyShown)
        .map((row) => row.id),
      remove: candidates
        .filter((row) => !checked.has(row.id) && row.initiallyShown)
        .map((row) => row.id),
    };
  }, [candidates, checked]);

  const changeCount = pending.add.length + pending.remove.length;

  const apply = useCallback(async () => {
    await expand({
      sourceNode: item.elementId,
      link,
      add: pending.add,
      remove: pending.remove,
    });
    // Reflect the newly applied state so a second apply is a no-op.
    setCandidates(
      (current) =>
        current?.map((row) => ({
          ...row,
          initiallyShown: checked.has(row.id),
        })) ?? null,
    );
  }, [expand, item.elementId, link, pending, checked]);

  if (loading) {
    return <p className="u-muted is-size-7">Loading neighbours…</p>;
  }
  if (error) {
    return <p className="related__error">{error}</p>;
  }
  if (!candidates || candidates.length === 0) {
    return <p className="u-muted is-size-7">No neighbours found.</p>;
  }

  return (
    <div className="related__picker">
      <div className="related__picker-controls">
        <input
          className="input is-small"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={`Filter ${candidates.length} neighbours…`}
          aria-label="Filter neighbours"
        />
        <button
          type="button"
          className="button is-small"
          onClick={() => setAll(true)}
        >
          All
        </button>
        <button
          type="button"
          className="button is-small"
          onClick={() => setAll(false)}
        >
          None
        </button>
      </div>

      <ul className="related__list u-scroll-y">
        {shown.map((row) => (
          <li key={row.id}>
            <label className="related__item">
              <input
                type="checkbox"
                checked={checked.has(row.id)}
                onChange={() => toggle(row.id)}
              />
              {row.labels.map((label) => (
                <span className="tag is-info is-light" key={label}>
                  {label}
                </span>
              ))}
              <span className="u-truncate" title={row.caption}>
                {row.caption}
              </span>
            </label>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="u-muted is-size-7">No matches</li>
        )}
      </ul>

      <button
        type="button"
        className={`button is-small is-success${busy ? " is-loading" : ""}`}
        onClick={apply}
        disabled={changeCount === 0 || busy}
      >
        {changeCount === 0
          ? "No changes"
          : `Apply ${changeCount} change${changeCount === 1 ? "" : "s"}`}
      </button>

      {candidates.length === FETCH_LIMIT && (
        <p className="u-muted is-size-7">
          Showing the first {FETCH_LIMIT} neighbours.
        </p>
      )}
    </div>
  );
}
