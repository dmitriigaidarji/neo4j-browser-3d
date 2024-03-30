import { IFrameQueryResult } from "../frame/FrameContainer";
import { uniqBy } from "lodash-es";
export interface INode {
  labels: string[];
  elementId: string;
  properties: any;
}

export interface ILink {
  elementId: string;
  properties: any;
  type: string;
  curvature: number;
  rotation: number;
  startNodeElementId: string;
  endNodeElementId: string;
  end: number;
  start: number;
  identity: number;
}
export interface IGraph {
  nodes: INode[];
  links: ILink[];
}
function findNodesRecursively({
  item,
  nodes,
  rels,
}: {
  item: INode | any;
  nodes: INode[];
  rels: ILink[];
}): void {
  if (item.hasOwnProperty("labels")) {
    nodes.push(item);
    return;
  } else if (item.hasOwnProperty("type")) {
    rels.push(item);
    return;
  } else if (typeof item === "object") {
    Object.values(item).forEach((nestedItem) => {
      findNodesRecursively({ item: nestedItem, nodes, rels });
    });
    return;
  }
  return;
}

function getUniqueNodesAndLinks(data: IFrameQueryResult[]) {
  const nodes: INode[] = [];
  const rels: ILink[] = [];
  data.forEach((item) => findNodesRecursively({ item, nodes, rels }));

  return {
    nodes: uniqBy(nodes, (t) => t.elementId),
    links: uniqBy(rels, (t) => t.elementId),
  };
}

function curveLinksThatAreOfSameStartAndEnd(graph: IGraph) {
  const mapped: { [key: string]: ILink[] } = {};
  graph.links.forEach((link) => {
    const key = [link.startNodeElementId, link.endNodeElementId]
      .sort()
      .join("|");
    if (mapped[key]) {
      mapped[key].push(link);
    } else {
      mapped[key] = [link];
    }
  });
  Object.values(mapped).forEach((links) => {
    const len = links.length;
    const step = 2 / len;
    links.forEach((link, i) => {
      link.rotation = Math.PI * step * (i + 1);
      link.curvature = len > 1 ? len / 10 : 0;
    });
  });
}

export function processQueryResultsForGraph(data: IFrameQueryResult[]) {
  const graph = getUniqueNodesAndLinks(data);
  //
  // [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((i) => {
  //   graph.links.push({
  //     curvature: 0.8,
  //     elementId: "5:3d2f91a4-814c-4347-a79f-915751885b1" + i,
  //     end: 119,
  //     endNodeElementId: "4:3d2f91a4-814c-4347-a79f-9215751885b2:119",
  //     identity: 169,
  //     properties: {},
  //     rotation: 0,
  //     start: 5,
  //     startNodeElementId: "4:3d2f91a4-814c-4347-a79f-9215751885b2:5",
  //     type: "WROTE",
  //   });
  // });
  curveLinksThatAreOfSameStartAndEnd(graph);
  return graph;
}
