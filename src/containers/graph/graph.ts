import ForceGraph3D from "3d-force-graph";
import {
  CSS2DObject,
  CSS2DRenderer,
  // @ts-ignore
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { ILink, INode } from "./helpers";
import SpriteText from "three-spritetext";
// @ts-ignore
import { Vector3 } from "three";
interface IIcon {
  label: string;
  url: string;
}
const iconList: IIcon[] = [
  {
    label: "Person",
    url: "https://clipart-library.com/images/pTq8LAnac.png",
  },
  {
    label: "Movie",
    url: "https://cdn-icons-png.flaticon.com/512/2503/2503508.png",
  },
];

export function createGraph() {
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
    .nodeThreeObject((node: any) => {
      const nodeEl = document.createElement("div");
      nodeEl.style.textAlign = "center";
      let icon: IIcon | null = null;
      for (const label of node.labels) {
        icon = iconList.find((t) => t.label === label) ?? null;
        if (icon) {
          break;
        }
      }
      if (icon) {
        const imgContainer = document.createElement("div");

        const img = document.createElement("img");
        img.src = icon.url;
        img.style.width = "30px";
        imgContainer.append(img);
        nodeEl.append(imgContainer);
      }

      const textContainer = document.createElement("div");

      const properties = (node as any).properties;
      textContainer.textContent =
        properties.name ?? properties.title ?? (node as any).elementId;
      textContainer.style.color = (node as unknown as any).color ?? "";
      textContainer.style.textShadow =
        "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black";

      nodeEl.append(textContainer);
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
    .linkPositionUpdate((sprite, { start, end }, link) => {
      const middlePos: { [key: string]: number } = {};
      const plink: ILink = link as ILink;
      (["x", "y", "z"] as const).forEach((xyz) => {
        middlePos[xyz] = start[xyz] + (end[xyz] - start[xyz]) / 2;
      });
      if (plink.curvature > 0) {
        let vDiff = new Vector3(0, 0, 0).subVectors(end, start).normalize();

        let V = new Vector3(
          vDiff.y + vDiff.x * vDiff.z,
          vDiff.y * vDiff.z - vDiff.x,
          -(vDiff.x * vDiff.x) - vDiff.y * vDiff.y,
        );

        const t = V.applyAxisAngle(
          vDiff,
          plink.rotation / plink.curvature - 0.5,
        ).applyAxisAngle(
          new Vector3().multiplyVectors(V, vDiff).normalize(),
          (15 * Math.PI) / 180,
        );
        t.multiplyScalar(plink.curvature * 10);

        const translated = {
          x: middlePos.x + t.x,
          y: middlePos.y + t.y,
          z: middlePos.z + t.z,
        };
        Object.assign(sprite.position, translated);
      } else {
        // Position sprite
        Object.assign(sprite.position, middlePos);
      }
    });

  return graph;
}
