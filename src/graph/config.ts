import rawConfig from "../config/graph-config.json";

export interface LabelConfig {
  color?: string;
  /** Property name to use as the node's on-screen caption. */
  caption?: string;
  /** An emoji, or a URL/path to an image, drawn above the caption. */
  icon?: string;
}

export interface RelationshipConfig {
  /** Numeric property summed by the "By relationship value" size mode. */
  valueField?: string;
}

export interface GraphConfig {
  labels: Record<string, LabelConfig | undefined>;
  relationships: Record<string, RelationshipConfig | undefined>;
  value: {
    unitField?: string;
    unitFactors?: Record<string, number>;
  };
}

const parsed = rawConfig as unknown as Partial<GraphConfig>;

export const graphConfig: GraphConfig = {
  labels: parsed.labels ?? {},
  relationships: parsed.relationships ?? {},
  value: parsed.value ?? {},
};

export function labelConfig(labels: string[]): LabelConfig | undefined {
  for (const label of labels) {
    const found = graphConfig.labels[label];
    if (found) {
      return found;
    }
  }
  return undefined;
}
