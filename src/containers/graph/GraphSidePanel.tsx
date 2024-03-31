import { ILink, INode } from "./helpers";
import { useCallback, useEffect, useMemo, useState } from "react";

interface IProps {
  item: INode | ILink | null;
}

interface IInfo {
  title: string;
  properties?: object;
}
function isNode(item: INode | ILink): item is INode {
  return (item as INode).labels !== undefined;
}
function GraphSidePanel({ item }: IProps) {
  const [open, setOpen] = useState(item !== null);
  const closeIt = useCallback(() => {
    setOpen(false);
  }, []);
  useEffect(() => {
    if (item) {
      setOpen(true);
    }
  }, [item]);
  const info: IInfo = useMemo(() => {
    if (item) {
      if (isNode(item)) {
        return {
          title: "Node properties",
          properties: item.properties,
        };
      } else {
        return {
          title: "Relationship properties",
          properties: item.properties,
        };
      }
    }
    return {
      title: "Info",
    };
  }, [item]);
  console.log(item, info);
  return (
    <div className={`sidepanel ${open ? "" : "is-hidden"}`}>
      <article className="message is-info">
        <div className="message-header">
          {info.title}
          <button onClick={closeIt} className="delete"></button>
        </div>
        <div className="message-body">{JSON.stringify(info.properties)}</div>
      </article>
    </div>
  );
}

export default GraphSidePanel;
