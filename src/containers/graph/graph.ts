import ForceGraph3D from "3d-force-graph";
import {
  CSS2DRenderer,
  // @ts-ignore
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { ILink, INode } from "./helpers";

export interface IGraphHighlight {
  nodes: Set<any>;
  links: Set<any>;
  node: object | null;
}
export function createGraph({
  onSelect,
  highlight,
}: {
  onSelect: (item: INode | ILink) => any;
  highlight: IGraphHighlight;
}) {
  const graph = ForceGraph3D({
    extraRenderers: [new CSS2DRenderer() as unknown as any],
  })
    .backgroundColor("#000003")
    .nodeId("elementId")
    .linkSource("startNodeElementId")
    .linkTarget("endNodeElementId")
    .nodeColor((node: any) =>
      highlight.nodes.has(node)
        ? node === highlight.node
          ? "rgb(255,0,0,1)"
          : "rgba(255,160,0,0.8)"
        : node.color,
    )
    .linkAutoColorBy((t) => (t as unknown as ILink).type)
    .linkWidth((link) => (highlight.links.has(link) ? 4 : 0.5))
    .nodeResolution(16)
    // .nodeVal((t) => {
    //   // console.log(t);
    //   // return 1;
    //   return (t as any).properties?.total_qty_received ?? 1;
    // })
    // .nodeRelSize(0.2)
    .linkDirectionalArrowLength(3.5)
    .linkDirectionalArrowRelPos(1)
    .linkCurvature("curvature")
    .linkCurveRotation("rotation")
    .linkDirectionalParticles((link) => (highlight.links.has(link) ? 4 : 1))
    .linkDirectionalParticleWidth(2)
    .linkDirectionalParticleColor((t) => "orange")
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
    .linkThreeObjectExtend(true)
    .onNodeHover((inputNode) => {
      const node = inputNode as unknown as INode | null;
      // no state change
      if ((!node && !highlight.nodes.size) || (node && highlight.node === node))
        return;

      highlight.nodes.clear();
      highlight.links.clear();
      if (node) {
        highlight.nodes.add(node);
        node.neighbors.forEach((neighbor) => highlight.nodes.add(neighbor));
        node.links.forEach((link) => highlight.links.add(link));
      }

      highlight.node = node || null;

      updateHighlight();
    })
    .onLinkHover((inputLink) => {
      const link = inputLink as unknown as ILink | null;
      highlight.nodes.clear();
      highlight.links.clear();

      if (link) {
        highlight.links.add(link);
        highlight.nodes.add(link.source);
        highlight.nodes.add(link.target);
      }

      updateHighlight();
    });

  graph.d3Force("charge")?.strength(-200);
  function updateHighlight() {
    // trigger update of highlighted objects in scene
    graph
      .nodeColor(graph.nodeColor())
      .linkWidth(graph.linkWidth())
      .linkDirectionalParticles(graph.linkDirectionalParticles())
      .nodeThreeObject(graph.nodeThreeObject());
  }
  return graph;
}
