import { ForceGraph3DInstance } from "3d-force-graph";
// @ts-ignore
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

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
function setGraphIcons({
  graph,
  showNodeIcons,
  showNodeTexts,
}: {
  graph: ForceGraph3DInstance;
  showNodeIcons: boolean;
  showNodeTexts: boolean;
}) {
  graph.nodeThreeObject((node: any) => {
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

    if (showNodeTexts) {
      const textContainer = document.createElement("div");
      const labelContainer = document.createElement("div");
      const titleContainer = document.createElement("div");

      const properties = (node as any).properties;

      labelContainer.textContent = node.labels.join("|");

      titleContainer.textContent =
        properties.name ??
        properties.title ??
        properties.batch_id ??
        properties.material_id ??
        properties.site_id ??
        properties.vendor_id ??
        properties.customer_id ??
        "";

      textContainer.style.color = (node as unknown as any).color ?? "";
      textContainer.style.textShadow =
        "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black";

      textContainer.append(labelContainer);
      textContainer.append(titleContainer);

      nodeEl.append(textContainer);
    }

    return new CSS2DObject(nodeEl);
  });
}

export default setGraphIcons;
