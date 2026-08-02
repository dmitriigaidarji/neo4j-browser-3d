import { int, type Session } from "neo4j-driver";
import { extractGraph, postProcessGraph } from "./model";
import type { IGraph, ILink, INode, NodeSizeMode } from "./types";

/**
 * Relationship types are interpolated into Cypher because they cannot be
 * parameterised. Restrict them to what Neo4j actually allows in an identifier
 * so a crafted type name can't extend the query.
 */
const SAFE_REL_TYPE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function relPattern(type: string, outgoing: boolean): string {
  if (!SAFE_REL_TYPE.test(type)) {
    throw new Error(`Unsupported relationship type: ${type}`);
  }
  return outgoing ? `-[l:${type}]->` : `<-[l:${type}]-`;
}

/**
 * Find relationships that exist between nodes already on screen but were not
 * returned by the user's query, so the picture is not misleadingly sparse.
 */
export async function fetchRelationshipsBetween({
  graph,
  session,
  sizeMode,
}: {
  graph: IGraph;
  session: Session;
  sizeMode: NodeSizeMode;
}): Promise<IGraph> {
  const nodeIds = graph.nodes.map((node) => node.elementId);
  if (nodeIds.length === 0) {
    return graph;
  }
  const linkIds = graph.links.map((link) => link.elementId);

  const result = await session.run(
    `
    MATCH (n)-[r]-(m)
    WHERE elementId(n) IN $nodeIds
      AND elementId(m) IN $nodeIds
      AND elementId(m) <> elementId(n)
      AND NOT elementId(r) IN $linkIds
    RETURN DISTINCT r
    `,
    { nodeIds, linkIds },
  );

  const discovered = extractGraph(result.records.map((r) => r.get("r")));
  const known = new Set(linkIds);
  const additions = discovered.links.filter(
    (link) => !known.has(link.elementId),
  );

  if (additions.length === 0) {
    return graph;
  }

  return postProcessGraph(
    { nodes: graph.nodes, links: [...graph.links, ...additions] },
    sizeMode,
  );
}

export interface IRelatedLinkOption {
  outgoing: boolean;
  type: string;
}

/** The relationship types attached to a node, split by direction. */
export async function fetchRelationshipOptions({
  session,
  elementId,
}: {
  session: Session;
  elementId: string;
}): Promise<IRelatedLinkOption[]> {
  const result = await session.run(
    `MATCH (n)-[link]-() WHERE elementId(n) = $elementId
     WITH elementId(startNode(link)) = $elementId AS outgoing, type(link) AS type
     RETURN DISTINCT outgoing, type`,
    { elementId },
  );

  return result.records
    .map((record) => record.toObject() as IRelatedLinkOption)
    .sort((a, b) => {
      if (a.outgoing === b.outgoing) {
        return a.type.localeCompare(b.type);
      }
      return a.outgoing ? -1 : 1;
    });
}

export interface IRelatedNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
  /** Already present in the visible graph. */
  checked: boolean;
}

/** Candidate neighbours reachable from a node through one relationship type. */
export async function fetchRelatedNodes({
  session,
  elementId,
  link,
  limit,
}: {
  session: Session;
  elementId: string;
  link: IRelatedLinkOption;
  limit: number;
}): Promise<Array<Omit<IRelatedNode, "checked">>> {
  const result = await session.run(
    `MATCH (n)${relPattern(link.type, link.outgoing)}(m)
     WHERE elementId(n) = $elementId
     WITH DISTINCT m
     RETURN elementId(m) AS id, labels(m) AS labels, properties(m) AS properties
     LIMIT $limit`,
    // LIMIT rejects a float, and the driver encodes plain JS numbers as floats.
    { elementId, limit: int(limit) },
  );

  return result.records.map((record) => ({
    id: record.get("id") as string,
    labels: record.get("labels") as string[],
    properties: record.get("properties") as Record<string, unknown>,
  }));
}

/**
 * Add and/or remove neighbours of `sourceNode` reached through `link`.
 */
export async function expandNeighbours({
  session,
  graph,
  sourceNode,
  link,
  add,
  remove,
  sizeMode,
}: {
  session: Session;
  graph: IGraph;
  sourceNode: string;
  link: IRelatedLinkOption;
  add: string[];
  remove: string[];
  sizeMode: NodeSizeMode;
}): Promise<IGraph> {
  let nodes: INode[] = graph.nodes;
  let links: ILink[] = graph.links;

  if (remove.length > 0) {
    const removeSet = new Set(remove);
    nodes = nodes.filter((node) => !removeSet.has(node.elementId));
  }

  if (add.length > 0) {
    const result = await session.run(
      `MATCH (n)${relPattern(link.type, link.outgoing)}(m)
       WHERE elementId(n) = $elementId AND elementId(m) IN $nodeIds
       RETURN DISTINCT l, m`,
      { elementId: sourceNode, nodeIds: add },
    );

    const discovered = extractGraph(
      result.records.flatMap((record) => [record.get("l"), record.get("m")]),
    );

    const knownNodes = new Set(nodes.map((node) => node.elementId));
    const knownLinks = new Set(links.map((entry) => entry.elementId));

    nodes = [
      ...nodes,
      ...discovered.nodes.filter((node) => !knownNodes.has(node.elementId)),
    ];
    links = [
      ...links,
      ...discovered.links.filter((entry) => !knownLinks.has(entry.elementId)),
    ];
  }

  return postProcessGraph({ nodes, links }, sizeMode);
}

/** Labels, relationship types and property keys, for editor autocompletion. */
export async function fetchSchema(session: Session) {
  const [labels, relationshipTypes, propertyKeys] = await Promise.all([
    session.run("CALL db.labels()"),
    session.run("CALL db.relationshipTypes()"),
    session.run("CALL db.propertyKeys()"),
  ]);

  return {
    labels: labels.records.map((r) => r.get("label") as string),
    relationshipTypes: relationshipTypes.records.map(
      (r) => r.get("relationshipType") as string,
    ),
    propertyKeys: propertyKeys.records.map(
      (r) => r.get("propertyKey") as string,
    ),
  };
}
