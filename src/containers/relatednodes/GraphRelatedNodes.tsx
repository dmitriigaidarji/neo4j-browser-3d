import { useCallback, useContext, useMemo, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import { GraphContext } from "../graph/GraphProcessedContainer";
import {
  fetchRelationshipOptions,
  type IRelatedLinkOption,
} from "../../graph/queries";
import type { INode } from "../../graph/types";
import GraphRelatedLinksList from "./GraphRelatedLinksList";

export default function GraphRelatedNodes({ item }: { item: INode }) {
  const { getSession } = useContext(SessionContext);
  const { graph, removeNode, removeNodes, expandAll, busy } =
    useContext(GraphContext);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<IRelatedLinkOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // No reset effect needed: the inspector keys this component on the node id,
  // so a different node gets a fresh mount.
  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const session = getSession();
    try {
      setOptions(
        await fetchRelationshipOptions({ session, elementId: item.elementId }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      await session.close().catch(() => {});
      setLoading(false);
    }
  }, [getSession, item.elementId]);

  // The node's currently visible neighbours, read from the live graph rather
  // than from `item`, which is a snapshot taken when the inspector opened.
  const visibleNeighbourIds = useMemo(() => {
    const current = graph.nodes.find(
      (node) => node.elementId === item.elementId,
    );
    const ids = new Set(current?.neighbors.map((node) => node.elementId));
    // A self-loop lists the node as its own neighbour; never hide the node
    // being inspected.
    ids.delete(item.elementId);
    return [...ids];
  }, [graph.nodes, item.elementId]);

  const hasNeighbours = visibleNeighbourIds.length > 0;

  const toggleAll = useCallback(async () => {
    if (hasNeighbours) {
      removeNodes(visibleNeighbourIds);
    } else {
      await expandAll(item.elementId);
    }
  }, [
    hasNeighbours,
    visibleNeighbourIds,
    removeNodes,
    expandAll,
    item.elementId,
  ]);

  return (
    <div className="related">
      <div className="related__actions">
        <button
          type="button"
          className={`button is-small is-link${loading ? " is-loading" : ""}`}
          disabled={loading}
          onClick={loadOptions}
        >
          <i className="fas fa-diagram-project" aria-hidden="true" />
          <span>Show neighbours</span>
        </button>
        <button
          type="button"
          className={`button is-small is-link is-light${busy ? " is-loading" : ""}`}
          disabled={busy}
          onClick={toggleAll}
        >
          <i
            className={`fas ${hasNeighbours ? "fa-circle-minus" : "fa-circle-nodes"}`}
            aria-hidden="true"
          />
          <span>
            {hasNeighbours ? "Hide all neighbours" : "Show all neighbours"}
          </span>
        </button>
        <button
          type="button"
          className="button is-small is-danger is-light"
          onClick={() => removeNode(item.elementId)}
        >
          <i className="fas fa-eye-slash" aria-hidden="true" />
          <span>Hide node</span>
        </button>
      </div>

      {error && <p className="related__error">{error}</p>}

      {options &&
        (options.length === 0 ? (
          <p className="u-muted is-size-7">This node has no relationships.</p>
        ) : (
          <GraphRelatedLinksList item={item} links={options} />
        ))}
    </div>
  );
}
