import { memo, useMemo, useState } from "react";
import type { IFrameQueryResult } from "./FrameContainer";
import JSONDisplay from "./JSONDisplay";
import TableDisplay from "./TableDisplay";
import GraphProcessedContainer from "../graph/GraphProcessedContainer";
import { processQueryResultsForGraph } from "../../graph/model";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";
import type { NodeSizeMode } from "../../graph/types";

type TabMode = "graph" | "table" | "json";

const TABS: Array<{ value: TabMode; label: string; icon: string }> = [
  { value: "graph", label: "Graph", icon: "diagram-project" },
  { value: "table", label: "Table", icon: "table" },
  { value: "json", label: "JSON", icon: "code" },
];

function FrameQueryContainer({
  data,
  keys,
}: {
  data: IFrameQueryResult[];
  keys: string[];
}) {
  const [sizeMode] = useCachedValue<NodeSizeMode>(
    CachedKey.nodeSizeMode,
    "uniform",
  );

  const graph = useMemo(
    () => processQueryResultsForGraph(data, sizeMode),
    [data, sizeMode],
  );
  const graphKey = useMemo(
    () => graph.nodes.map((node) => node.elementId).join("|"),
    [graph],
  );
  const hasGraph = graph.nodes.length > 0;

  const [requested, setMode] = useState<TabMode>(hasGraph ? "graph" : "table");
  // Derived rather than corrected in an effect: a result with no graph simply
  // cannot display the graph tab.
  const mode: TabMode =
    requested === "graph" && !hasGraph ? "table" : requested;

  const tabs = hasGraph ? TABS : TABS.filter((tab) => tab.value !== "graph");

  return (
    <div className="frame__results">
      <div className="frame__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={mode === tab.value}
            className={`frame__tab${mode === tab.value ? " is-active" : ""}`}
            onClick={() => setMode(tab.value)}
          >
            <i className={`fas fa-${tab.icon}`} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="frame__empty u-muted">
          The query completed without returning any records.
        </p>
      ) : mode === "graph" ? (
        // Keyed on the result identity so a new result starts from a clean
        // graph state instead of syncing the prop into state via an effect.
        <GraphProcessedContainer key={graphKey} graph={graph} />
      ) : mode === "table" ? (
        <TableDisplay data={data} keys={keys} />
      ) : (
        <JSONDisplay data={data} />
      )}
    </div>
  );
}

export default memo(FrameQueryContainer);
