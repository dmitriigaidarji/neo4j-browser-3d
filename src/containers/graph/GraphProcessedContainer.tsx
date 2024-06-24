import GraphContainer from "./GraphContainer";
import {
  applyLinkValuesToGraph,
  fetchNeighbours,
  fetchRelationshipsBetweenNodesOfAGraph,
  IGraph,
  removeNodeFromGraph,
} from "./helpers";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SessionContext } from "../../providers/SessionProvider";
import { cloneDeep } from "lodash-es";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";
import { IRelatedLinkOption } from "../relatednodes/GraphRelatedNodes";
import { IRelatedNode } from "../relatednodes/GraphRelatedLink";

export interface IGraphContext {
  graph: IGraph;
  setGraph: Dispatch<SetStateAction<IGraph>>;
  addItemsToGraph: (param: {
    targetNodes: IRelatedNode[];
    sourceNode: string;
    link: IRelatedLinkOption;
  }) => void;
  removeNode: (elementId: string) => void;
}
export const GraphContext = createContext<IGraphContext>({
  graph: {
    nodes: [],
    links: [],
  },
  setGraph: () => {},
  addItemsToGraph: (param) => {},
  removeNode: () => {},
});
function GraphProcessedContainer({ graph: initialGraph }: { graph: IGraph }) {
  const [graph, setGraph] = useState<IGraph>({ nodes: [], links: [] });
  const graphRef = useRef(graph);

  useEffect(() => {
    setGraph(initialGraph);
  }, [initialGraph]);
  useEffect(() => {
    graphRef.current = graph;
  }, [graph, graphRef]);

  const { getSession } = useContext(SessionContext);

  const [fetchLinksInBetween, setFetchLinksInBetween] = useCachedValue(
    CachedKey.fetchLinksInBetween,
    true as boolean,
  );

  const removeNode: IGraphContext["removeNode"] = useCallback(
    (elementId) => {
      setGraph(removeNodeFromGraph({ graph, nodeId: elementId }));
    },
    [graph],
  );

  const addItemsToGraph: IGraphContext["addItemsToGraph"] = useCallback(
    (props) => {
      const session = getSession();
      return fetchNeighbours({ ...props, session, graph, fetchLinksInBetween })
        .then((newGraph) => {
          setGraph(newGraph);
        })
        .finally(() => {
          return session.close();
        });
    },
    [getSession, graph, fetchLinksInBetween],
  );

  // fetch extra links between presented nodes, if any
  useEffect(() => {
    if (fetchLinksInBetween && graph.nodes.length > 0) {
      const session = getSession();
      fetchRelationshipsBetweenNodesOfAGraph({
        graph: graphRef.current,
        session,
      })
        .then((newGraph) => {
          setGraph(newGraph);
        })
        .finally(() => {
          session.close();
        });
    }
  }, [graphRef, getSession, fetchLinksInBetween]);

  const rerenderGraph = useCallback(
    (props?: { [CachedKey.showLinkValues]?: boolean }) => {
      setGraph((t) => {
        const showLinkValues = props?.showLinkValues;
        const cloned = cloneDeep(t);
        if (showLinkValues !== undefined) {
          applyLinkValuesToGraph(cloned, showLinkValues);
        }
        return cloned;
      });
    },
    [setGraph],
  );
  const flipFetchLinksInBetween = useCallback(() => {
    setFetchLinksInBetween((t) => !t);
  }, [setFetchLinksInBetween]);

  const contextValue: IGraphContext = useMemo(
    () => ({
      graph,
      setGraph,
      addItemsToGraph,
      removeNode,
    }),
    [graph, setGraph, addItemsToGraph, removeNode],
  );

  if (graph.nodes.length === 0) {
    return null;
  }
  return (
    <GraphContext.Provider value={contextValue}>
      <GraphContainer
        graph={graph}
        rerenderGraph={rerenderGraph}
        buttonsNode={
          <>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={fetchLinksInBetween}
                onChange={flipFetchLinksInBetween}
              />
              Fetch links in between all nodes
            </label>
          </>
        }
      />
    </GraphContext.Provider>
  );
}

export default GraphProcessedContainer;
