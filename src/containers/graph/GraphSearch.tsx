import { useCallback, useEffect, useMemo, useState } from "react";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { getNodeCaption, type CaptionOverrides } from "../../graph/captions";
import type { IGraph, INode } from "../../graph/types";

const MAX_RESULTS = 20;

/** Case-insensitive search across labels and all property values. */
function matches(node: INode, needle: string): boolean {
  if (node.labelKey.toLowerCase().includes(needle)) {
    return true;
  }
  for (const value of Object.values(node.properties)) {
    if (value !== null && value !== undefined) {
      if (String(value).toLowerCase().includes(needle)) {
        return true;
      }
    }
  }
  return false;
}

export default function GraphSearch({
  graph,
  captionOverrides,
  onMatchesChange,
  onPick,
}: {
  graph: IGraph;
  captionOverrides: CaptionOverrides;
  onMatchesChange: (ids: Set<string>) => void;
  onPick: (node: INode) => void;
}) {
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 200);

  const results = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    if (needle.length < 2) {
      return [];
    }
    return graph.nodes.filter((node) => matches(node, needle));
  }, [graph.nodes, debounced]);

  // Push highlighted ids into the renderer.
  useEffect(() => {
    onMatchesChange(new Set(results.map((node) => node.elementId)));
  }, [results, onMatchesChange]);

  // Drop highlights when the component goes away.
  useEffect(() => () => onMatchesChange(new Set()), [onMatchesChange]);

  const clear = useCallback(() => setTerm(""), []);

  return (
    <div className="graph-search">
      <div className="graph-search__field">
        <i className="fas fa-magnifying-glass" aria-hidden="true" />
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search nodes…"
          aria-label="Search nodes"
        />
        {term && (
          <button type="button" onClick={clear} aria-label="Clear search">
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        )}
      </div>

      {debounced.trim().length >= 2 && (
        <div className="graph-search__results">
          <p className="graph-search__count u-muted">
            {results.length} match{results.length === 1 ? "" : "es"}
          </p>
          <ul className="u-scroll-y">
            {results.slice(0, MAX_RESULTS).map((node) => (
              <li key={node.elementId}>
                <button type="button" onClick={() => onPick(node)}>
                  <span
                    className="graph-search__swatch"
                    style={{ background: node.color }}
                    aria-hidden="true"
                  />
                  <span className="u-truncate">
                    {getNodeCaption(node, captionOverrides)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {results.length > MAX_RESULTS && (
            <p className="u-muted is-size-7">
              Showing the first {MAX_RESULTS}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
