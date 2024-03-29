import { useEffect, useMemo, useRef } from "react";
import { IGraph, INode } from "./helpers";
import ForceGraph3D from "3d-force-graph";
import { cloneDeep } from "lodash-es";

function GraphContainer({ graph }: { graph: IGraph }) {
  const graphDomRef = useRef<HTMLDivElement>(null);
  const graphInstance = useMemo(
    () =>
      ForceGraph3D()
        .nodeId("elementId")
        .linkSource("startNodeElementId")
        .linkTarget("endNodeElementId")
        .nodeAutoColorBy((t) => {
          return (t as unknown as INode).labels.join(",");
        }),
    [],
  );
  useEffect(() => {
    if (graphDomRef.current) {
      graphInstance(graphDomRef.current)
        .width(graphDomRef.current.getBoundingClientRect().width)
        .height(graphDomRef.current.getBoundingClientRect().height - 200);
    }
    return function cleanup() {
      const r = graphInstance.renderer();
      r?.dispose();
    };
  }, [graphDomRef, graphInstance]);

  useEffect(() => {
    graphInstance.graphData(cloneDeep(graph));
  }, [graph, graphInstance]);

  console.log(graph);

  return <div ref={graphDomRef} />;
}

export default GraphContainer;
