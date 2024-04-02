import { IFrameQueryResult } from "../frame/FrameContainer";
import { cloneDeep, max, uniq, uniqBy } from "lodash-es";
import { Session } from "neo4j-driver";
import config from "../../config/graph-config.json";
import { interpolateRainbow } from "d3-scale-chromatic";

export interface INode {
  labels: string[];
  elementId: string;
  identity: number;
  properties: any;
  color?: string;
  val?: number;
  neighbors: INode[];
  links: ILink[];
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
  source?: INode;
  target?: INode;
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
  Object.values(mapped).forEach((links) => {
    const len = links.length;
    const step = 2 / len;
    links.forEach((link, i) => {
      link.rotation = Math.PI * step * (i + 1);
      link.curvature = len > 1 ? len / 10 : 0;
    });
  });
  return graph;
}
export function applyLinkValuesToGraph(graph: IGraph, enable: boolean): IGraph {
  const nodeValues: { [key: string]: number } = {};
  const nodeOutgoing: { [key: string]: number } = {};
  if (enable) {
    graph.links.forEach((link) => {
      const type = link.type as "ACTED_IN";
      if (config.relationships[type]) {
        const rule = config.relationships[type];
        // apply value to nodes
        const rawvalue = link.properties[rule["value-field"]];
        if (rawvalue && typeof rawvalue === "number") {
          let value = rawvalue;
          if (link.properties.buom) {
            const buom = link.properties.buom as "GM" | "MG" | "ML";
            switch (buom) {
              case "GM":
              case "ML":
                value /= 1000;
                break;
              case "MG":
                value /= 1000 * 1000;
                break;
              default:
                value = rawvalue;
                break;
            }
          }
          const inNode = link.endNodeElementId;
          if (nodeValues[inNode] === undefined) {
            nodeValues[inNode] = 1;
          }
          nodeValues[inNode] += value;

          const outNode = link.startNodeElementId;
          if (nodeOutgoing[outNode] === undefined) {
            nodeOutgoing[outNode] = 1;
          }
          nodeOutgoing[outNode] += value;
        }
      }
    });

    // normalize node values. scale to 100
    const scale = 1000;
    const maxVal = max(
      Object.values(nodeValues).concat(Object.values(nodeOutgoing)),
    )!;
    if (maxVal > scale) {
      const q = maxVal / scale;
      Object.entries(nodeValues).forEach(([key, val]) => {
        nodeValues[key] = val / q + 1;
      });
      Object.entries(nodeOutgoing).forEach(([key, val]) => {
        nodeOutgoing[key] = val / q + 1;
      });
    }
    graph.nodes.forEach((node) => {
      // set val. affects node size visual
      node.val = nodeValues[node.elementId];

      if (node.val === undefined) {
        // node is source node. get value from all outgoing links
        node.val = nodeOutgoing[node.elementId] ?? 1;
      }
    });
    return graph;
  }
  graph.nodes.forEach((node) => {
    // set val. affects node size visual
    node.val = 1;
  });
  return graph;
}
function applyRulesToGraph(graph: IGraph): IGraph {
  graph.nodes.forEach((node) => {
    // set node color
    node.labels.forEach((label) => {
      if (config.nodes[label as "Movie"]?.color) {
        node.color = config.nodes[label as "Movie"]?.color;
      }
    });
  });
  return graph;
}
function applyColors(graph: IGraph): IGraph {
  const colorMap: { [key: string]: string } = {};
  const labels = uniq(graph.nodes.map((t) => t.labels.join("|")));
  if (labels.length === 1) {
    colorMap[labels[0]] = interpolateRainbow(Math.random());
  } else {
    const offset = 0.1;
    const adjustment = Math.random() * 0.1;
    const step = (1 - offset * 2) / Math.max(labels.length - 1, 1);
    labels.forEach((t, index) => {
      colorMap[t] = interpolateRainbow(index * step + offset + adjustment);
    });
  }
  graph.nodes.forEach((t) => (t.color = colorMap[t.labels.join("|")]));
  return graph;
}
function crossLink(graph: IGraph): IGraph {
  // cross-link node objects
  graph.links.forEach((link) => {
    const a = graph.nodes.find((t) => t.elementId === link.startNodeElementId)!;
    const b = graph.nodes.find((t) => t.elementId === link.endNodeElementId)!;
    !a.neighbors && (a.neighbors = []);
    !b.neighbors && (b.neighbors = []);
    a.neighbors.push(b);
    b.neighbors.push(a);

    !a.links && (a.links = []);
    !b.links && (b.links = []);
    a.links.push(link);
    b.links.push(link);
  });
  return graph;
}
function postProcessGraph(graph: IGraph): IGraph {
  return applyLinkValuesToGraph(
    applyRulesToGraph(
      applyColors(curveLinksThatAreOfSameStartAndEnd(crossLink(graph))),
    ),
    true,
  );
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
          return postProcessGraph(cloned);
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
  return postProcessGraph(graph);
}
