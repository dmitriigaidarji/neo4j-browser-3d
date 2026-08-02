import { useMemo, useState } from "react";
import type { IGraph } from "../../graph/types";
import { summariseLabels, summariseRelationships } from "../../graph/model";
import { captionCandidates, type CaptionOverrides } from "../../graph/captions";

/**
 * Legend for the visible graph. Doubles as the filter and caption control:
 * clicking a swatch hides that label group, and each group can be told which
 * property to show as its caption.
 */
export default function GraphLegend({
  graph,
  hiddenLabels,
  onToggleLabel,
  hiddenRelTypes,
  onToggleRelType,
  captionOverrides,
  onCaptionChange,
}: {
  graph: IGraph;
  hiddenLabels: Set<string>;
  onToggleLabel: (key: string) => void;
  hiddenRelTypes: Set<string>;
  onToggleRelType: (type: string) => void;
  captionOverrides: CaptionOverrides;
  onCaptionChange: (labelKey: string, property: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  const labels = useMemo(() => summariseLabels(graph), [graph]);
  const relTypes = useMemo(() => summariseRelationships(graph), [graph]);

  // Property names available for the group currently being edited.
  const propertyOptions = useMemo(() => {
    if (!editing) {
      return [];
    }
    const keys = new Set<string>();
    graph.nodes.forEach((node) => {
      if (node.labelKey === editing) {
        captionCandidates(node.properties).forEach((key) => keys.add(key));
      }
    });
    return [...keys].sort();
  }, [editing, graph.nodes]);

  if (!open) {
    return (
      <button
        type="button"
        className="graph-legend__reopen"
        onClick={() => setOpen(true)}
        title="Show legend"
        aria-label="Show legend"
      >
        <i className="fas fa-list" aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside className="graph-legend">
      <header className="graph-legend__header">
        <span>Legend</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide legend"
        >
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
      </header>

      <div className="graph-legend__body u-scroll-y">
        <ul className="graph-legend__list">
          {labels.map(({ key, color, count }) => {
            const hidden = hiddenLabels.has(key);
            return (
              <li key={key} className={hidden ? "is-hidden-group" : ""}>
                <button
                  type="button"
                  className="graph-legend__entry"
                  onClick={() => onToggleLabel(key)}
                  title={hidden ? "Show these nodes" : "Hide these nodes"}
                >
                  <span
                    className="graph-legend__swatch"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <span className="u-truncate">{key || "(no label)"}</span>
                  <span className="graph-legend__count">{count}</span>
                </button>
                <button
                  type="button"
                  className="graph-legend__caption-button"
                  onClick={() => setEditing(editing === key ? null : key)}
                  title="Choose caption property"
                  aria-label={`Choose caption property for ${key}`}
                >
                  <i className="fas fa-tag" aria-hidden="true" />
                </button>

                {editing === key && (
                  <select
                    className="graph-legend__caption-select"
                    value={captionOverrides[key] ?? ""}
                    onChange={(event) => {
                      onCaptionChange(key, event.target.value);
                      setEditing(null);
                    }}
                  >
                    <option value="">Automatic</option>
                    {propertyOptions.map((property) => (
                      <option key={property} value={property}>
                        {property}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>

        {relTypes.length > 0 && (
          <>
            <h4 className="graph-legend__subtitle">Relationships</h4>
            <ul className="graph-legend__list">
              {relTypes.map(({ type, count }) => (
                <li
                  key={type}
                  className={hiddenRelTypes.has(type) ? "is-hidden-group" : ""}
                >
                  <button
                    type="button"
                    className="graph-legend__entry"
                    onClick={() => onToggleRelType(type)}
                    title={
                      hiddenRelTypes.has(type)
                        ? "Show these relationships"
                        : "Hide these relationships"
                    }
                  >
                    <span className="graph-legend__rel" aria-hidden="true">
                      →
                    </span>
                    <span className="u-truncate">{type}</span>
                    <span className="graph-legend__count">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  );
}
