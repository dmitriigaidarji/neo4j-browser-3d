import GraphContainer from "./GraphContainer";
import {
  applyLinkValuesToGraph,
  fetchRelationshipsBetweenNodesOfAGraph,
  IGraph,
} from "./helpers";
import { useCallback, useContext, useEffect, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import { cloneDeep } from "lodash-es";
import { CachedKey } from "../../hooks/useCachedValue";

function GraphProcessedContainer({ graph: initialGraph }: { graph: IGraph }) {
  const [graph, setGraph] = useState<IGraph>({ nodes: [], links: [] });
  const { getSession } = useContext(SessionContext);

  // fetch extra links between presented nodes, if any
  useEffect(() => {
    setGraph(initialGraph);
    const session = getSession();
    fetchRelationshipsBetweenNodesOfAGraph({ graph: initialGraph, session })
      .then((newGraph) => {
        setGraph(newGraph);
      })
      .finally(() => {
        session.close();
      });
  }, [initialGraph, getSession]);

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

  if (graph.nodes.length === 0) {
    return null;
  }
  return <GraphContainer graph={graph} rerenderGraph={rerenderGraph} />;
}
export default GraphProcessedContainer;
