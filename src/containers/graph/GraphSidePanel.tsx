import { useMemo } from "react";
import { isGraphNode, type ILink, type INode } from "../../graph/types";
import { formatValue } from "../../graph/values";
import { getNodeCaption, type CaptionOverrides } from "../../graph/captions";
import GraphRelatedNodes from "../relatednodes/GraphRelatedNodes";

export default function GraphSidePanel({
  item,
  onClose,
  captionOverrides,
}: {
  item: INode | ILink;
  onClose: () => void;
  captionOverrides: CaptionOverrides;
}) {
  const isNode = isGraphNode(item);

  const { title, subtitle, chips } = useMemo(() => {
    if (isNode) {
      return {
        title: getNodeCaption(item, captionOverrides),
        subtitle: "Node",
        chips: item.labels,
      };
    }
    return { title: item.type, subtitle: "Relationship", chips: [item.type] };
  }, [item, isNode, captionOverrides]);

  const properties = useMemo(
    () =>
      Object.entries(item.properties).sort(([a], [b]) => a.localeCompare(b)),
    [item.properties],
  );

  return (
    <aside className="graph-inspector">
      <header className="graph-inspector__header">
        <div className="u-truncate">
          <p className="graph-inspector__kind u-muted">{subtitle}</p>
          <h3 className="graph-inspector__title u-truncate" title={title}>
            {title}
          </h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close inspector">
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
      </header>

      <div className="graph-inspector__body u-scroll-y">
        <div className="graph-inspector__chips">
          {chips.map((chip) => (
            <span
              className="tag is-dark"
              key={chip}
              style={
                isNode
                  ? { background: item.color, color: "#05070d" }
                  : undefined
              }
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Keyed so switching inspected node remounts with clean state. */}
        {isNode && <GraphRelatedNodes key={item.elementId} item={item} />}

        <table className="table is-fullwidth graph-inspector__table">
          <tbody>
            <tr>
              <th scope="row">&lt;elementId&gt;</th>
              <td>{item.elementId}</td>
            </tr>
            <tr>
              <th scope="row">&lt;id&gt;</th>
              <td>{item.identity || "—"}</td>
            </tr>
            {isNode && (
              <tr>
                <th scope="row">&lt;degree&gt;</th>
                <td>{item.degree}</td>
              </tr>
            )}
            {properties.length === 0 ? (
              <tr>
                <td colSpan={2} className="u-muted">
                  No properties
                </td>
              </tr>
            ) : (
              properties.map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{formatValue(value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
