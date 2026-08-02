/**
 * Plain, serialisable representations of the Neo4j graph entities.
 *
 * Everything that comes back from the driver is normalised into these shapes
 * as early as possible (see `model.ts`). Keeping driver class instances out of
 * the render tree means the data can be cloned, diffed, exported to JSON and
 * handed to the force engine without worrying about lost prototypes.
 */

export type PropertyMap = Record<string, unknown>;

export interface INode {
  elementId: string;
  /** Legacy numeric id, kept for display only. */
  identity: string;
  labels: string[];
  properties: PropertyMap;
  /** Key used for colouring/grouping — the labels joined with "|". */
  labelKey: string;
  color: string;
  /** Rendered size, derived from the active size mode. */
  val: number;
  /** Number of attached relationships within the current graph. */
  degree: number;
  neighbors: INode[];
  links: ILink[];

  // Written by the force engine at runtime.
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
  /** True while the user has pinned the node in place. */
  pinned?: boolean;
}

export interface ILink {
  elementId: string;
  identity: string;
  type: string;
  properties: PropertyMap;
  startNodeElementId: string;
  endNodeElementId: string;
  /** Bend applied so parallel relationships do not overlap. */
  curvature: number;
  rotation: number;

  // Written by the force engine at runtime.
  source?: INode | string;
  target?: INode | string;
}

export interface IGraph {
  nodes: INode[];
  links: ILink[];
}

export const EMPTY_GRAPH: IGraph = { nodes: [], links: [] };

export function isGraphNode(item: INode | ILink): item is INode {
  return (item as INode).labels !== undefined;
}

/** How node radius is derived. */
export type NodeSizeMode = "uniform" | "degree" | "value";
