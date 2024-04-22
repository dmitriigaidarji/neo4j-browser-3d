import GraphContainer from "./GraphContainer";
import {
  applyLinkValuesToGraph,
  fetchRelationshipsBetweenNodesOfAGraph,
  IGraph,
} from "./helpers";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SessionContext } from "../../providers/SessionProvider";
import { cloneDeep } from "lodash-es";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";

export interface IGraphContext {
  graph: IGraph;
  setGraph: Dispatch<SetStateAction<IGraph>>;
}
export const GraphContext = createContext<IGraphContext>({
  graph: {
    nodes: [],
    links: [],
  },
  setGraph: () => {},
});
function GraphProcessedContainer({ graph: initialGraph }: { graph: IGraph }) {
  const [graph, setGraph] = useState<IGraph>({ nodes: [], links: [] });

  const { getSession } = useContext(SessionContext);
  const [fetchLinksInBetween, setFetchLinksInBetween] = useCachedValue(
    CachedKey.fetchLinksInBetween,
    true as boolean,
  );
  // fetch extra links between presented nodes, if any
  useEffect(() => {
    setGraph(initialGraph);
    if (fetchLinksInBetween) {
      const session = getSession();
      fetchRelationshipsBetweenNodesOfAGraph({ graph: initialGraph, session })
        .then((newGraph) => {
          setGraph(newGraph);
        })
        .finally(() => {
          session.close();
        });
    }
  }, [initialGraph, getSession, fetchLinksInBetween]);

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
    }),
    [graph],
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
