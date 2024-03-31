import GraphContainer from "./GraphContainer";
import { fetchRelationshipsBetweenNodesOfAGraph, IGraph } from "./helpers";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";

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
  if (graph.nodes.length === 0) {
    return null;
  }
  return <GraphContainer graph={graph} />;
}
export default GraphProcessedContainer;
