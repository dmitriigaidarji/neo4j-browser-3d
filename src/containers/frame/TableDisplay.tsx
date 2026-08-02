import { useMemo, useState } from "react";
import type { IFrameQueryResult } from "./FrameContainer";
import { formatValue } from "../../graph/values";
import { isNode, isRelationship } from "neo4j-driver";

const PAGE_SIZE = 50;

/** Compact one-line rendering for graph entities inside a table cell. */
function cellText(value: unknown): string {
  if (isNode(value as never)) {
    const node = value as unknown as {
      labels: string[];
      properties: Record<string, unknown>;
    };
    return `(:${node.labels.join(":")} ${formatValue(node.properties)})`;
  }
  if (isRelationship(value as never)) {
    const rel = value as unknown as {
      type: string;
      properties: Record<string, unknown>;
    };
    return `[:${rel.type} ${formatValue(rel.properties)}]`;
  }
  return formatValue(value);
}

/**
 * Tabular result view — the column-per-return-item layout the official browser
 * shows, which this app previously had no equivalent of (JSON only).
 */
export default function TableDisplay({
  data,
  keys,
}: {
  data: IFrameQueryResult[];
  keys: string[];
}) {
  const [page, setPage] = useState(0);

  const columns = useMemo(() => {
    if (keys.length > 0) {
      return keys;
    }
    return [...new Set(data.flatMap((row) => Object.keys(row)))];
  }, [keys, data]);

  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = data.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="table-display">
      <div className="table-display__scroll u-scroll-y">
        <table className="table is-striped is-hoverable is-fullwidth">
          <thead>
            <tr>
              <th className="table-display__index">#</th>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={current * PAGE_SIZE + index}>
                <td className="table-display__index">
                  {current * PAGE_SIZE + index + 1}
                </td>
                {columns.map((column) => {
                  const text = cellText(row[column]);
                  return (
                    <td key={column} title={text}>
                      <span className="table-display__cell">{text}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="table-display__pager">
          <button
            type="button"
            className="button is-small"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
          >
            Previous
          </button>
          <span className="u-muted">
            Page {current + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="button is-small"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount - 1}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
