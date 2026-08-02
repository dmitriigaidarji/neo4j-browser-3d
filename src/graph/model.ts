import { isNode, isPath, isPathSegment, isRelationship } from "neo4j-driver";
import { buildLabelColorMap } from "./colors";
import { graphConfig, labelConfig } from "./config";
import type { IGraph, ILink, INode, NodeSizeMode, PropertyMap } from "./types";

/**
 * Neo4j numeric ids may arrive as `Integer`, `bigint` or `number` depending on
 * driver config. They are only ever displayed, so normalise to a string.
 */
function idToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function toPlainNode(driverNode: any): INode {
  const labels: string[] = Array.isArray(driverNode.labels)
    ? [...driverNode.labels]
    : [];
  return {
    elementId: driverNode.elementId,
    identity: idToString(driverNode.identity),
    labels,
    labelKey: labels.join("|"),
    properties: { ...(driverNode.properties as PropertyMap) },
    color: "#888888",
    val: 1,
    degree: 0,
    neighbors: [],
    links: [],
  };
}

function toPlainLink(driverRel: any): ILink {
  return {
    elementId: driverRel.elementId,
    identity: idToString(driverRel.identity),
    type: driverRel.type,
    properties: { ...(driverRel.properties as PropertyMap) },
    startNodeElementId: driverRel.startNodeElementId,
    endNodeElementId: driverRel.endNodeElementId,
    curvature: 0,
    rotation: 0,
  };
}

/**
 * Walk an arbitrary query result and pull out every node and relationship.
 *
 * Detection goes through the driver's own type guards rather than sniffing for
 * a `labels`/`type` property, so a plain map that happens to contain a key
 * called `type` is no longer mistaken for a relationship.
 */
function collect(
  item: unknown,
  nodes: Map<string, INode>,
  links: Map<string, ILink>,
  seen: Set<object>,
): void {
  if (item === null || item === undefined) {
    return;
  }

  if (isNode(item as any)) {
    const node = toPlainNode(item);
    if (!nodes.has(node.elementId)) {
      nodes.set(node.elementId, node);
    }
    return;
  }

  if (isRelationship(item as any)) {
    const link = toPlainLink(item);
    if (!links.has(link.elementId)) {
      links.set(link.elementId, link);
    }
    return;
  }

  if (isPath(item as any)) {
    const path = item as any;
    collect(path.start, nodes, links, seen);
    collect(path.end, nodes, links, seen);
    path.segments.forEach((segment: unknown) =>
      collect(segment, nodes, links, seen),
    );
    return;
  }

  if (isPathSegment(item as any)) {
    const segment = item as any;
    collect(segment.start, nodes, links, seen);
    collect(segment.relationship, nodes, links, seen);
    collect(segment.end, nodes, links, seen);
    return;
  }

  if (Array.isArray(item)) {
    item.forEach((entry) => collect(entry, nodes, links, seen));
    return;
  }

  if (typeof item === "object") {
    // Guard against cyclic structures in user-shaped maps.
    if (seen.has(item as object)) {
      return;
    }
    seen.add(item as object);
    Object.values(item as Record<string, unknown>).forEach((entry) =>
      collect(entry, nodes, links, seen),
    );
  }
}

export function extractGraph(records: unknown[]): IGraph {
  const nodes = new Map<string, INode>();
  const links = new Map<string, ILink>();
  const seen = new Set<object>();
  records.forEach((record) => collect(record, nodes, links, seen));
  return { nodes: [...nodes.values()], links: [...links.values()] };
}

/**
 * Populate `neighbors`/`links`/`degree` and drop dangling relationships whose
 * endpoints are not part of the visible graph.
 *
 * Uses an index rather than the previous `nodes.find()` inside a loop over
 * links, which was O(nodes × links) and dominated processing time on graphs of
 * more than a few hundred elements.
 */
function crossLink(graph: IGraph): IGraph {
  const byId = new Map(graph.nodes.map((node) => [node.elementId, node]));

  graph.nodes.forEach((node) => {
    node.neighbors = [];
    node.links = [];
    node.degree = 0;
  });

  graph.links = graph.links.filter((link) => {
    const source = byId.get(link.startNodeElementId);
    const target = byId.get(link.endNodeElementId);
    if (!source || !target) {
      return false;
    }
    source.neighbors.push(target);
    target.neighbors.push(source);
    source.links.push(link);
    target.links.push(link);
    source.degree += 1;
    target.degree += 1;
    return true;
  });

  return graph;
}

/**
 * Fan out relationships that share the same pair of endpoints so they do not
 * render on top of each other, and give self-loops enough curvature to be
 * visible at all (previously a lone self-loop collapsed into its node).
 */
function curveParallelLinks(graph: IGraph): IGraph {
  const groups = new Map<string, { outgoing: ILink[]; incoming: ILink[] }>();

  graph.links.forEach((link) => {
    const key = [link.startNodeElementId, link.endNodeElementId]
      .slice()
      .sort()
      .join("|");
    let group = groups.get(key);
    if (!group) {
      group = { outgoing: [], incoming: [] };
      groups.set(key, group);
    }
    // Direction relative to the sorted key, so opposing links bend apart.
    if (key.indexOf(link.endNodeElementId) === 0) {
      group.incoming.push(link);
    } else {
      group.outgoing.push(link);
    }
  });

  groups.forEach(({ incoming, outgoing }) => {
    const total = incoming.length + outgoing.length;
    const step = 2 / total;
    const apply = (link: ILink, index: number, sign: number) => {
      const selfLoop = link.startNodeElementId === link.endNodeElementId;
      link.rotation = sign * Math.PI * step * (index + 1);
      link.curvature = selfLoop
        ? 0.4 + index * 0.15
        : total > 1
          ? total / 10
          : 0;
    };
    incoming.forEach((link, index) => apply(link, index, 1));
    outgoing.forEach((link, index) => apply(link, index, -1));
  });

  return graph;
}

function applyColors(graph: IGraph): IGraph {
  const colorMap = buildLabelColorMap(graph.nodes.map((n) => n.labelKey));
  graph.nodes.forEach((node) => {
    // An explicit colour in graph-config.json always wins.
    node.color =
      labelConfig(node.labels)?.color ?? colorMap.get(node.labelKey) ?? "#888";
  });
  return graph;
}

/** Read a relationship's configured numeric value, normalised by its unit. */
function relationshipValue(link: ILink): number {
  const rule = graphConfig.relationships[link.type];
  if (!rule?.valueField) {
    return 0;
  }
  const raw = link.properties[rule.valueField];
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return 0;
  }

  const { unitField, unitFactors } = graphConfig.value;
  if (unitField && unitFactors) {
    const unit = link.properties[unitField];
    if (typeof unit === "string" && unit in unitFactors) {
      return raw * unitFactors[unit];
    }
  }
  return raw;
}

const VALUE_SCALE = 1000;

/**
 * Derive `node.val`, which drives rendered node radius.
 *
 * `value` mode replaces the old hardcoded unit table (GM/MG/ML/LB/…) baked
 * into the source; conversion factors are now data in `graph-config.json`.
 */
export function applyNodeSizes(graph: IGraph, mode: NodeSizeMode): IGraph {
  if (mode === "uniform") {
    graph.nodes.forEach((node) => {
      node.val = 1;
    });
    return graph;
  }

  if (mode === "degree") {
    graph.nodes.forEach((node) => {
      node.val = 1 + node.degree;
    });
    return graph;
  }

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  graph.links.forEach((link) => {
    const value = relationshipValue(link);
    if (value <= 0) {
      return;
    }
    incoming.set(
      link.endNodeElementId,
      (incoming.get(link.endNodeElementId) ?? 1) + value,
    );
    outgoing.set(
      link.startNodeElementId,
      (outgoing.get(link.startNodeElementId) ?? 1) + value,
    );
  });

  // Iterated rather than spread into Math.max: a large graph would otherwise
  // exceed the argument limit and throw.
  let peak = 0;
  for (const value of incoming.values()) {
    peak = Math.max(peak, value);
  }
  for (const value of outgoing.values()) {
    peak = Math.max(peak, value);
  }
  const divisor = peak > VALUE_SCALE ? peak / VALUE_SCALE : 1;

  graph.nodes.forEach((node) => {
    // Source nodes have no inbound value, so fall back to what they emit.
    const raw =
      incoming.get(node.elementId) ?? outgoing.get(node.elementId) ?? 1;
    node.val = divisor === 1 ? raw : raw / divisor + 1;
  });

  return graph;
}

/**
 * Run the full derivation pipeline over a graph.
 *
 * Node objects are reused rather than deep-cloned so that positions already
 * computed by the force engine survive incremental updates (expanding
 * neighbours no longer scatters the existing layout). Fresh array wrappers are
 * returned so React still sees a changed reference.
 */
export function postProcessGraph(
  graph: IGraph,
  sizeMode: NodeSizeMode = "value",
): IGraph {
  const next: IGraph = { nodes: [...graph.nodes], links: [...graph.links] };
  crossLink(next);
  curveParallelLinks(next);
  applyColors(next);
  applyNodeSizes(next, sizeMode);
  return next;
}

export function processQueryResultsForGraph(
  records: unknown[],
  sizeMode: NodeSizeMode = "value",
): IGraph {
  return postProcessGraph(extractGraph(records), sizeMode);
}

export function removeNodeFromGraph(
  graph: IGraph,
  elementId: string,
  sizeMode: NodeSizeMode,
): IGraph {
  return postProcessGraph(
    {
      nodes: graph.nodes.filter((node) => node.elementId !== elementId),
      links: graph.links.filter(
        (link) =>
          link.startNodeElementId !== elementId &&
          link.endNodeElementId !== elementId,
      ),
    },
    sizeMode,
  );
}

/** Distinct label groups present in a graph, with counts, sorted by name. */
export function summariseLabels(
  graph: IGraph,
): Array<{ key: string; color: string; count: number }> {
  const counts = new Map<string, { color: string; count: number }>();
  graph.nodes.forEach((node) => {
    const entry = counts.get(node.labelKey);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(node.labelKey, { color: node.color, count: 1 });
    }
  });
  return [...counts.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Distinct relationship types present in a graph, with counts. */
export function summariseRelationships(
  graph: IGraph,
): Array<{ type: string; count: number }> {
  const counts = new Map<string, number>();
  graph.links.forEach((link) => {
    counts.set(link.type, (counts.get(link.type) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type));
}
