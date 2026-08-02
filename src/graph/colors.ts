import { interpolateRainbow } from "d3-scale-chromatic";

/**
 * A hand-picked palette that stays legible against the dark canvas.
 */
export const PALETTE = [
  "#4cc9f0",
  "#3eb017",
  "#fd8720",
  "#f72585",
  "#00ffb0",
  "#faca00",
  "#c96dea",
  "#ff6b6b",
  "#7bdff2",
  "#b8f2e6",
  "#ffa5ab",
  "#9bf6ff",
];

/** Deterministic 32-bit string hash (FNV-1a). */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Assign a colour to every label group.
 *
 * The mapping is derived from a hash of the label, so a given label keeps the
 * same colour across queries, re-renders and page reloads — the previous
 * implementation drew colours at random, which made nodes change colour every
 * time the graph was reprocessed. Within a single graph, collisions are
 * resolved by walking to the next free palette slot so two labels are never
 * rendered in the same colour.
 */
export function buildLabelColorMap(labelKeys: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const sorted = [...new Set(labelKeys)].sort();
  const taken = new Set<number>();

  // Palette-sized groups get a stable, distinct slot each.
  if (sorted.length <= PALETTE.length) {
    for (const key of sorted) {
      const preferred = hash(key) % PALETTE.length;
      let slot = preferred;
      for (let i = 0; i < PALETTE.length && taken.has(slot); i++) {
        slot = (preferred + i + 1) % PALETTE.length;
      }
      taken.add(slot);
      map.set(key, PALETTE[slot]);
    }
    return map;
  }

  // Too many groups for the palette: spread them around the rainbow instead,
  // still ordered deterministically so the result is reproducible.
  const step = 0.8 / Math.max(sorted.length - 1, 1);
  sorted.forEach((key, index) => {
    map.set(key, interpolateRainbow(index * step + 0.1));
  });
  return map;
}

export { hash as hashString };
