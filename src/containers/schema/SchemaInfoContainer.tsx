import { useCallback, useContext, useMemo, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import { QueryContext } from "../../providers/QueryProvider";
import PanelSection from "../../components/PanelSection";

/** Quote a label/type only when it is not a bare identifier. */
function escapeIdentifier(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
    ? name
    : `\`${name.replace(/`/g, "``")}\``;
}

function ChipList({
  items,
  emptyText,
  onSelect,
  variant,
}: {
  items: string[];
  emptyText: string;
  onSelect: (item: string) => void;
  variant: "label" | "relationship";
}) {
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => a.localeCompare(b));
    return needle
      ? sorted.filter((item) => item.toLowerCase().includes(needle))
      : sorted;
  }, [items, filter]);

  if (items.length === 0) {
    return <p className="u-muted is-size-7">{emptyText}</p>;
  }

  return (
    <>
      {items.length > 12 && (
        <input
          className="input is-small schema__filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter…"
          aria-label="Filter"
        />
      )}
      <div className="schema__chips u-scroll-y">
        {visible.map((item) => (
          <button
            key={item}
            type="button"
            className={`schema__chip schema__chip--${variant}`}
            onClick={() => onSelect(item)}
            title={`Run a query for ${item}`}
          >
            {item}
          </button>
        ))}
        {visible.length === 0 && (
          <span className="u-muted is-size-7">No matches</span>
        )}
      </div>
    </>
  );
}

export default function SchemaInfoContainer() {
  const { schema } = useContext(SessionContext);
  const {
    current: { addQuery },
  } = useContext(QueryContext);

  // Clicking an entry opens a result frame for it — the same shortcut the
  // official browser offers, and previously these chips did nothing at all.
  const runForLabel = useCallback(
    (label: string) =>
      addQuery(`MATCH (n:${escapeIdentifier(label)}) RETURN n LIMIT 25`),
    [addQuery],
  );

  const runForRelationship = useCallback(
    (type: string) =>
      addQuery(
        `MATCH p = ()-[r:${escapeIdentifier(type)}]->() RETURN p LIMIT 25`,
      ),
    [addQuery],
  );

  return (
    <PanelSection title="Schema" icon="sitemap">
      <h4 className="panel-subtitle">Node labels</h4>
      <ChipList
        items={schema.labels ?? []}
        emptyText="No labels found"
        onSelect={runForLabel}
        variant="label"
      />

      <h4 className="panel-subtitle">Relationship types</h4>
      <ChipList
        items={schema.relationshipTypes ?? []}
        emptyText="No relationship types found"
        onSelect={runForRelationship}
        variant="relationship"
      />
    </PanelSection>
  );
}
