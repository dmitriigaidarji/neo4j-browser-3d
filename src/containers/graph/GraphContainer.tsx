import { useEffect, useMemo, useRef } from "react";
import { IGraph, ILink, INode } from "./helpers";
import ForceGraph3D from "3d-force-graph";
import { cloneDeep } from "lodash-es";
import {
  CSS2DRenderer,
  CSS2DObject,
  // @ts-ignore
} from "three/addons/renderers/CSS2DRenderer.js";
// @ts-ignore
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import SpriteText from "three-spritetext";
function createGraph() {
  const graph = ForceGraph3D({
    extraRenderers: [new CSS2DRenderer() as unknown as any],
  })
    .backgroundColor("#000003")
    .nodeId("elementId")
    .linkSource("startNodeElementId")
    .linkTarget("endNodeElementId")
    .nodeAutoColorBy((t) => {
      return (t as unknown as INode).labels.join(",");
    })
    .linkAutoColorBy((t) => (t as unknown as ILink).type)
    .linkWidth(0.5)
    .nodeResolution(16)
    .linkDirectionalArrowLength(3.5)
    .linkDirectionalArrowRelPos(1)
    .linkCurvature("curvature")
    .linkCurveRotation("rotation")
    .linkDirectionalParticles(2)
    .nodeThreeObject((node: any) => {
      const nodeEl = document.createElement("div");
      const properties = (node as any).properties;
      nodeEl.textContent =
        properties.name ?? properties.title ?? (node as any).elementId;
      nodeEl.style.color = (node as unknown as any).color ?? "";
      nodeEl.className = "node-label";
      return new CSS2DObject(nodeEl);
    })
    .nodeThreeObjectExtend(true)
    .onNodeClick((node: any) => {
      // Aim at node from outside it
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      const newPos =
        node.x || node.y || node.z
          ? {
              x: node.x * distRatio,
              y: node.y * distRatio,
              z: node.z * distRatio,
            }
          : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

      graph.cameraPosition(
        newPos, // new position
        node, // lookAt ({ x, y, z })
        2000, // ms transition duration
      );
    })
    .linkThreeObjectExtend(true)
    .linkThreeObject((link: any) => {
      // extend link with text sprite
      const sprite = new SpriteText((link as unknown as ILink).type);
      sprite.color = "lightgrey";
      sprite.textHeight = 1.5;
      return sprite;
    })
    .linkPositionUpdate((sprite, { start, end }) => {
      const middlePos: { [key: string]: number } = {};
      (["x", "y", "z"] as const).forEach((c) => {
        middlePos[c] = start[c] + (end[c] - start[c]) / 2;
      });
      // Position sprite
      Object.assign(sprite.position, middlePos);
    });

  return graph;
}
function GraphContainer({ graph }: { graph: IGraph }) {
  const graphDomRef = useRef<HTMLDivElement>(null);
  const graphInstance = useMemo(() => createGraph(), []);

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
      console.log("bloom");
      const bloomPass = new UnrealBloomPass();
      bloomPass.strength = 1.5;
      bloomPass.radius = 1;
      bloomPass.threshold = 0;
      graphInstance.postProcessingComposer().addPass(bloomPass);
    }
    return function cleanup() {
      const r = graphInstance.renderer();
      r?.dispose();
      graphInstance._destructor();
    };
  }, [graphDomRef, graphInstance]);

  useEffect(() => {
    const cloned = cloneDeep(graph);
    graphInstance.graphData(cloned);
  }, [graph, graphInstance]);

  console.log(graph);

  return <div ref={graphDomRef} />;
}

export default GraphContainer;
