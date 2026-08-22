import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SessionContext } from "../../providers/SessionProvider";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";
import {
  expandAllNeighbours,
  expandNeighbours,
  fetchRelationshipsBetween,
  type IRelatedLinkOption,
} from "../../graph/queries";
import {
  postProcessGraph,
  removeNodeFromGraph,
  removeNodesFromGraph,
} from "../../graph/model";
import { EMPTY_GRAPH, type IGraph, type NodeSizeMode } from "../../graph/types";
import GraphContainer from "./GraphContainer";

/** Cap for "show all neighbours", matching the per-pattern picker's limit. */
const ALL_NEIGHBOURS_LIMIT = 300;

export interface IGraphContext {
  graph: IGraph;
  removeNode: (elementId: string) => void;
  removeNodes: (elementIds: string[]) => void;
  expand: (params: {
    sourceNode: string;
    link: IRelatedLinkOption;
    add: string[];
    remove: string[];
  }) => Promise<void>;
  expandAll: (elementId: string) => Promise<void>;
  busy: boolean;
}

export const GraphContext = createContext<IGraphContext>({
  graph: EMPTY_GRAPH,
  removeNode: () => {},
  removeNodes: () => {},
  expand: async () => {},
  expandAll: async () => {},
  busy: false,
});

export default function GraphProcessedContainer({
  graph: initialGraph,
}: {
  graph: IGraph;
}) {
  const { getSession } = useContext(SessionContext);
  const [graph, setGraph] = useState<IGraph>(initialGraph);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sizeMode, setSizeMode] = useCachedValue<NodeSizeMode>(
    CachedKey.nodeSizeMode,
    "uniform",
  );
  const [fetchLinksInBetween, setFetchLinksInBetween] = useCachedValue(
    CachedKey.fetchLinksInBetween,
    true,
  );

  // Node sizes are re-derived from the user action itself rather than from an
  // effect watching the mode — the component is keyed on the result, so there
  // is no prop to mirror into state either.
  const handleSizeModeChange = useCallback(
    (mode: NodeSizeMode) => {
      setSizeMode(mode);
      setGraph((current) => postProcessGraph(current, mode));
    },
    [setSizeMode],
  );

  /**
   * Pull in relationships that connect nodes already on screen.
   *
   * Keyed on the set of visible node ids: the previous implementation watched
   * a ref, which never changes identity, so the effect only ever ran on mount
   * while the graph was still empty and the feature silently did nothing.
   * Because this call only ever adds relationships, the key it depends on
   * cannot change as a result of it — no feedback loop.
   */
  const nodeKey = useMemo(
    () =>
      graph.nodes
        .map((node) => node.elementId)
        .sort()
        .join(","),
    [graph.nodes],
  );
  const lastLinkedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!fetchLinksInBetween || nodeKey.length === 0) {
      return;
    }
    if (lastLinkedKey.current === nodeKey) {
      return;
    }
    lastLinkedKey.current = nodeKey;

    let cancelled = false;
    const session = getSession();

    fetchRelationshipsBetween({ graph, session, sizeMode })
      .then((next) => {
        if (!cancelled && next !== graph) {
          setGraph(next);
        }
      })
      .catch((caught: Error) => {
        if (!cancelled) {
          setError(caught.message);
        }
      })
      .finally(() => {
        session.close().catch(() => {});
      });

    return () => {
      cancelled = true;
    };
    // `graph` is read through the closure but intentionally not a dependency:
    // node membership is what should retrigger this, not link additions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, fetchLinksInBetween, getSession, sizeMode]);

  const removeNode = useCallback(
    (elementId: string) => {
      setGraph((current) => removeNodeFromGraph(current, elementId, sizeMode));
    },
    [sizeMode],
  );

  const removeNodes = useCallback(
    (elementIds: string[]) => {
      setGraph((current) =>
        removeNodesFromGraph(current, elementIds, sizeMode),
      );
    },
    [sizeMode],
  );

  const expand = useCallback<IGraphContext["expand"]>(
    async ({ sourceNode, link, add, remove }) => {
      setBusy(true);
      setError(null);
      const session = getSession();
      try {
        const next = await expandNeighbours({
          session,
          graph,
          sourceNode,
          link,
          add,
          remove,
          sizeMode,
        });
        setGraph(next);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        await session.close().catch(() => {});
        setBusy(false);
      }
    },
    [getSession, graph, sizeMode],
  );

  const expandAll = useCallback<IGraphContext["expandAll"]>(
    async (elementId) => {
      setBusy(true);
      setError(null);
      const session = getSession();
      try {
        const next = await expandAllNeighbours({
          session,
          graph,
          elementId,
          sizeMode,
          limit: ALL_NEIGHBOURS_LIMIT,
        });
        setGraph(next);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        await session.close().catch(() => {});
        setBusy(false);
      }
    },
    [getSession, graph, sizeMode],
  );

  const contextValue = useMemo<IGraphContext>(
    () => ({ graph, removeNode, removeNodes, expand, expandAll, busy }),
    [graph, removeNode, removeNodes, expand, expandAll, busy],
  );

  if (graph.nodes.length === 0) {
    return (
      <p className="frame__empty u-muted">
        No nodes or relationships in this result.
      </p>
    );
  }

  return (
    <GraphContext.Provider value={contextValue}>
      <GraphContainer
        graph={graph}
        sizeMode={sizeMode}
        onSizeModeChange={handleSizeModeChange}
        fetchLinksInBetween={fetchLinksInBetween}
        onFetchLinksInBetweenChange={setFetchLinksInBetween}
        error={error}
        onDismissError={() => setError(null)}
      />
    </GraphContext.Provider>
  );
}
