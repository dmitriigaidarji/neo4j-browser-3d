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
export function processQueryResultsForGraph(data: IFrameQueryResult[]) {
  const nodes: INode[] = [];
  const rels: ILink[] = [];
  data.forEach((item) => findNodesRecursively({ item, nodes, rels }));

  return {
    nodes: uniqBy(nodes, (t) => t.elementId),
    links: uniqBy(rels, (t) => t.elementId),
  };
}
