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
function setGraphIcons(graph: ForceGraph3DInstance, showIcons: boolean) {
  graph.nodeThreeObject((node: any) => {
    const nodeEl = document.createElement("div");
    nodeEl.style.textAlign = "center";

    if (showIcons) {
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

    const textContainer = document.createElement("div");

    const properties = (node as any).properties;
    textContainer.textContent =
      properties.name ?? properties.title ?? (node as any).elementId;
    textContainer.style.color = (node as unknown as any).color ?? "";
    textContainer.style.textShadow =
      "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black";

    nodeEl.append(textContainer);
    return new CSS2DObject(nodeEl);
  });
}

export default setGraphIcons;
