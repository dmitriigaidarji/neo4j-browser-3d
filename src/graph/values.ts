import {
  isDate,
  isDateTime,
  isDuration,
  isInt,
  isLocalDateTime,
  isLocalTime,
  isPoint,
  isTime,
} from "neo4j-driver";

/**
 * Render any Neo4j property value as display text.
 *
 * The previous implementation dereferenced `value[key]` before checking for
 * null (`typeof null === "object"`), so a single null property anywhere in the
 * result crashed the whole side panel.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ");
  }

  if (isInt(value)) {
    return value.toString();
  }

  if (
    isDate(value) ||
    isDateTime(value) ||
    isLocalDateTime(value) ||
    isTime(value) ||
    isLocalTime(value) ||
    isDuration(value) ||
    isPoint(value)
  ) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  try {
    return JSON.stringify(value, (_key, entry) =>
      typeof entry === "bigint" ? entry.toString() : entry,
    );
  } catch {
    return String(value);
  }
}

/** JSON-safe deep conversion, used when exporting a graph to a file. */
export function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(toJsonSafe);
  }
  if (typeof value === "object") {
    if (isInt(value) || value instanceof Date) {
      return value.toString();
    }
    if (
      isDate(value) ||
      isDateTime(value) ||
      isLocalDateTime(value) ||
      isTime(value) ||
      isLocalTime(value) ||
      isDuration(value) ||
      isPoint(value)
    ) {
      return value.toString();
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        toJsonSafe(entry),
      ]),
    );
  }
  return value;
}
