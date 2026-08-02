import type { IGraph } from "./types";
import { toJsonSafe } from "./values";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** Serialise the visible graph, dropping the cyclic render-time fields. */
export function exportGraphAsJson(graph: IGraph) {
  const payload = {
    exportedAt: new Date().toISOString(),
    nodes: graph.nodes.map((node) => ({
      elementId: node.elementId,
      labels: node.labels,
      properties: toJsonSafe(node.properties),
    })),
    relationships: graph.links.map((link) => ({
      elementId: link.elementId,
      type: link.type,
      startNodeElementId: link.startNodeElementId,
      endNodeElementId: link.endNodeElementId,
      properties: toJsonSafe(link.properties),
    })),
  };

  download(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `graph-${timestamp()}.json`,
  );
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Flatten nodes to CSV — one row per node, one column per property seen. */
export function exportGraphAsCsv(graph: IGraph) {
  const keys = [
    ...new Set(graph.nodes.flatMap((node) => Object.keys(node.properties))),
  ].sort();
  const header = ["elementId", "labels", ...keys];

  const rows = graph.nodes.map((node) => [
    node.elementId,
    node.labels.join("|"),
    ...keys.map((key) => {
      const value = node.properties[key];
      return value === undefined || value === null ? "" : String(value);
    }),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  download(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `nodes-${timestamp()}.csv`,
  );
}

/**
 * Grab the current WebGL frame as a PNG.
 *
 * The renderer clears its drawing buffer after each frame, so the scene has to
 * be re-rendered immediately before reading the canvas.
 */
export function exportCanvasAsPng(
  canvas: HTMLCanvasElement | null | undefined,
) {
  if (!canvas) {
    return;
  }
  canvas.toBlob((blob) => {
    if (blob) {
      download(blob, `graph-${timestamp()}.png`);
    }
  }, "image/png");
}
