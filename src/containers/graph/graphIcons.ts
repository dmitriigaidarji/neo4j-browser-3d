import { ForceGraph3DInstance } from "3d-force-graph";
// @ts-ignore
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
// @ts-ignore
import { Vector3 } from "three";
import { IGraphHighlight } from "./graph";
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
  {
    label: "MaterialBatch",
    url: "/stacks_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    label: "Customer",
    url: "/deployed_code_account_FILL1_wght400_GRAD0_opsz24.svg",
  },
  {
    label: "Vendor",
    url: "/trolley_FILL1_wght400_GRAD0_opsz24.svg",
  },
  { label: "Position", url: "/person_FILL1_wght400_GRAD0_opsz24.svg" },
];
function setGraphIcons({
  graph,
  showNodeIcons,
  showNodeTexts,
  highlight,
  visibleTextDistance,
}: {
  graph: ForceGraph3DInstance;
  showNodeIcons: boolean;
  showNodeTexts: boolean;
  highlight: IGraphHighlight;
  visibleTextDistance: number;
}) {
  const camera = graph.cameraPosition();
  const cameraV = new Vector3(camera.x, camera.y, camera.z);
  graph.nodeThreeObject((node: any) => {
    const pos = new Vector3(node.x, node.y, node.z);
    const distance = cameraV.distanceTo(pos);
    const isHighlighted = highlight.node === node;
    const showSomething = distance < visibleTextDistance || isHighlighted;
    if (showSomething) {
      const nodeEl = document.createElement("div");
      nodeEl.style.textAlign = "center";

      if (showNodeIcons) {
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
      }

      if (showNodeTexts || isHighlighted) {
        const textContainer = document.createElement("div");
        const labelContainer = document.createElement("div");
        const titleContainer = document.createElement("div");

        const properties = (node as any).properties;

        labelContainer.textContent = node.labels.join("|");

        titleContainer.textContent =
          properties.ntid ??
          properties.name ??
          properties.team_name ??
          properties.application_name ??
          properties.title ??
          properties.application_name ??
          properties.team_name ??
          properties.batch_id ??
          properties.material_id ??
          properties.site_id ??
          properties.vendor_name ??
          properties.customer_name ??
          properties.project_name ??
          "";

        textContainer.style.color = (node as unknown as any).color ?? "";
        textContainer.style.textShadow =
          "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black";

        if (isHighlighted) {
          textContainer.append(labelContainer);
        }
        textContainer.append(titleContainer);

        nodeEl.append(textContainer);
      }

      return new CSS2DObject(nodeEl);
    } else {
      return false;
    }
  });
}

export default setGraphIcons;
