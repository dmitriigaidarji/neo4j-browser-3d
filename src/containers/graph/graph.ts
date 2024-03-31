import ForceGraph3D from "3d-force-graph";
import {
  CSS2DRenderer,
  // @ts-ignore
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { ILink, INode } from "./helpers";

export function createGraph({
  onSelect,
}: {
  onSelect: (item: INode | ILink) => any;
}) {
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
    .linkDirectionalArrowRelPos(1.05)
    .linkCurvature("curvature")
    .linkCurveRotation("rotation")
    .linkDirectionalParticles(2)
    .nodeThreeObjectExtend(true)
    .onNodeClick((node: any) => {
      // Aim at node from outside it
      const distance = 60;
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
      onSelect(node);
    })
    .onLinkClick((link: any) => {
      onSelect(link);
    })
    .linkThreeObjectExtend(true);

  return graph;
}
