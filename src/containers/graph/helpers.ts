import { IFrameQueryResult } from "../frame/FrameContainer";
import { cloneDeep, uniqBy } from "lodash-es";
import { Session } from "neo4j-driver";
export interface INode {
  labels: string[];
  elementId: string;
  identity: number;
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
  item: INode | ILink | any;
  nodes: INode[];
  rels: ILink[];
}): void {
  if (item) {
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
  // Object.values(mapped)
  //   .filter((t) => t.length > 1)
  //   .map((links) => {
  //     console.log(links);
  //     console.log(
  //       links.map((t) => [
  //         graph.nodes.find((n) => n.elementId === t.startNodeElementId),
  //         graph.nodes.find((n) => n.elementId === t.endNodeElementId),
  //       ]),
  //     );
  //   });
  Object.values(mapped).forEach((links) => {
    const len = links.length;
    const step = 2 / len;
    links.forEach((link, i) => {
      link.rotation = Math.PI * step * (i + 1);
      link.curvature = len > 1 ? len / 10 : 0;
    });
  });
}

export function fetchRelationshipsBetweenNodesOfAGraph({
  graph,
  session,
}: {
  graph: IGraph;
  session: Session;
}) {
  const nodeIds = graph.nodes.map((t) => t.elementId);
  const linkIds = graph.links.map((t) => t.elementId);
  if (nodeIds.length > 0) {
    const cloned = cloneDeep(graph);
    return session
      .run(
        `
    MATCH (n)-[r]-(m)
    where elementId(n) in $nodeIds
    and elementId(m) in $nodeIds
    and elementId(m) <> elementId(n)
    and not elementId(r) in $linkIds
    return r
  `,
        { nodeIds, linkIds },
      )
      .then((r) => r.records.map((t) => t.get("r") as ILink))
      .then((links) => {
        let wasAdded = false;
        links.forEach((link) => {
          if (
            cloned.links.find((t) => t.elementId === link.elementId) ===
            undefined
          ) {
            cloned.links.push(link);
            wasAdded = true;
          }
        });
        if (wasAdded) {
          curveLinksThatAreOfSameStartAndEnd(cloned);
          return cloned;
        } else {
          return graph;
        }
      });
  }
  return Promise.resolve(graph);
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
