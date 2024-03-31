import { ILink, INode } from "./helpers";
import React, { useCallback, useEffect, useMemo, useState } from "react";

interface IProps {
  item: INode | ILink;
}

interface IInfo extends Pick<INode, "labels" | "identity" | "elementId"> {
  title: string;
  properties: Array<[string, string | number | string[]]>;
}
function isNode(item: INode | ILink): item is INode {
  return (item as INode).labels !== undefined;
}
function GraphSidePanel({ item }: IProps) {
  const [open, setOpen] = useState(item !== null);
  const flipOpen = useCallback(() => {
    setOpen((t) => !t);
  }, []);

  const info: IInfo = useMemo(() => {
    if (isNode(item)) {
      return {
        ...item,
        title: "Node properties",
        properties: Object.entries(item.properties),
        labels: item.labels,
      };
    } else {
      return {
        ...item,
        title: "Relationship properties",
        properties: Object.entries(item.properties),
        labels: [item.type],
      };
    }
  }, [item]);

  return (
    <div className={`sidepanel`}>
      {open ? (
        <article className={`message is-info ${open ? "" : "is-hidden"}`}>
          <div className="message-header">
            {info.title}
            <button onClick={flipOpen} className="delete"></button>
          </div>
          <div className="message-body">
            {info.labels && info.labels.length > 0 && (
              <div className="tags are-medium">
                {info.labels.map((t) => (
                  <span className="tag is-dark" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="table-wrapper">
              <table className="table is-fullwidth">
                <tbody>
                  <tr>
                    <td>{"<element Id>"}</td>
                    <td>{info.elementId}</td>
                  </tr>
                  <tr>
                    <td>{"<id>"}</td>
                    <td>{info.identity}</td>
                  </tr>
                  {info.properties.map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>
                        <div>
                          {typeof value === "object"
                            ? JSON.stringify(value).split(",").join(", ")
                            : value}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      ) : (
        <div className="open-container" onClick={flipOpen}>
          <span className="icon is-medium">
            <i className="fas fa-chevron-right"></i>
          </span>
        </div>
      )}
    </div>
  );
}

export default GraphSidePanel;
