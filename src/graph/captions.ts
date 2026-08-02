import { labelConfig } from "./config";
import type { INode, PropertyMap } from "./types";

/**
 * Property names tried, in order, when nothing else tells us what to show on a
 * node. The previous version hardcoded one dataset's field names (`ntid`,
 * `batch_id`, `material_id`, …) directly in the renderer; those now live in
 * `graph-config.json` or are chosen by the user per label.
 */
const DEFAULT_CAPTION_KEYS = [
  "name",
  "title",
  "caption",
  "label",
  "displayName",
  "display_name",
  "fullName",
  "full_name",
  "username",
  "email",
  "code",
  "key",
  "id",
];

export type CaptionOverrides = Record<string, string>;

function isDisplayable(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  );
}

/** Property keys of a node that can sensibly be rendered as a caption. */
export function captionCandidates(properties: PropertyMap): string[] {
  return Object.keys(properties)
    .filter((key) => isDisplayable(properties[key]))
    .sort();
}

function firstMatch(properties: PropertyMap, keys: string[]): string | null {
  for (const key of keys) {
    const value = properties[key];
    if (isDisplayable(value) && String(value).length > 0) {
      return String(value);
    }
  }
  return null;
}

/**
 * Resolve the text shown next to a node, in priority order:
 * 1. an explicit per-label choice made by the user in the legend,
 * 2. a `caption` entry in `graph-config.json`,
 * 3. one of the conventional property names above,
 * 4. any displayable property,
 * 5. the labels themselves.
 */
export function resolveCaption(
  labels: string[],
  properties: PropertyMap,
  overrides: CaptionOverrides = {},
): string {
  const override = overrides[labels.join("|")];
  if (override) {
    const value = properties[override];
    if (isDisplayable(value)) {
      return String(value);
    }
  }

  const configured = labelConfig(labels)?.caption;
  if (configured) {
    const value = properties[configured];
    if (isDisplayable(value)) {
      return String(value);
    }
  }

  return (
    firstMatch(properties, DEFAULT_CAPTION_KEYS) ??
    firstMatch(properties, captionCandidates(properties)) ??
    labels.join("|")
  );
}

export function getNodeCaption(
  node: INode,
  overrides: CaptionOverrides = {},
): string {
  return resolveCaption(node.labels, node.properties, overrides);
}
