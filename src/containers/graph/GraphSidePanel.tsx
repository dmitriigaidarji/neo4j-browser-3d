import { ILink, INode } from "./helpers";
import React, { useCallback, useMemo, useState } from "react";
import { Duration } from "neo4j-driver";

interface IProps {
  item: INode | ILink;
}

interface IInfo extends Pick<INode, "labels" | "identity" | "elementId"> {
  title: string;
  properties: Array<[string, string | number | string[] | { days: number }]>;
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
                        <div>{parseValue(value)}</div>
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
const parseDate = (neo4jDateTime: any): Date => {
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    nanosecond = 0,
  } = neo4jDateTime;
  return new Date(
    year,
    month - 1, // neo4j dates start at 1, js dates start at 0
    day,
    hour,
    minute,
    second,
    nanosecond / 1000000, // js dates use milliseconds
  );
};
function parseValue(value: any) {
  if (typeof value === "object") {
    if (["year", "month", "day"].every((key) => value[key] !== undefined)) {
      return parseDate(value).toLocaleDateString();
    }
    if (
      ["days", "months", "seconds"].every((key) => value[key] !== undefined)
    ) {
      return new Duration(
        value.months,
        value.days,
        value.seconds,
        value.nanoseconds,
      ).toString();
    }
    return JSON.stringify(value).split(",").join(", ");
  }
  return value;
}
export default GraphSidePanel;
