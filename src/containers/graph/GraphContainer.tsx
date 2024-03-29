import { useEffect, useMemo, useRef } from "react";
import { IGraph, ILink, INode } from "./helpers";
import ForceGraph3D from "3d-force-graph";
import { cloneDeep } from "lodash-es";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";

function GraphContainer({ graph }: { graph: IGraph }) {
  const graphDomRef = useRef<HTMLDivElement>(null);
  const graphInstance = useMemo(
    () =>
      ForceGraph3D({
        extraRenderers: [new CSS2DRenderer() as unknown as any],
      })
        .nodeId("elementId")
        .linkSource("startNodeElementId")
        .linkTarget("endNodeElementId")
        .nodeAutoColorBy((t) => {
          return (t as unknown as INode).labels.join(",");
        })
        .linkAutoColorBy((t) => (t as unknown as ILink).type)
        .linkWidth(1)
        .nodeResolution(16)
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1)
        .linkCurvature(0.05)
        .nodeThreeObject((node) => {
          const nodeEl = document.createElement("div");
          const properties = (node as any).properties;
          nodeEl.textContent =
            properties.name ?? properties.title ?? (node as any).elementId;
          nodeEl.style.color = (node as unknown as any).color ?? "";
          nodeEl.className = "node-label";
          return new CSS2DObject(nodeEl);
        })
        .nodeThreeObjectExtend(true),
    [],
  );
  useEffect(() => {
    if (graphDomRef.current) {
      graphInstance(graphDomRef.current)
        .width(graphDomRef.current.getBoundingClientRect().width)
        .height(
          Math.max(
            600,
            graphDomRef.current.getBoundingClientRect().height - 200,
          ),
        );
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
