import * as React from "react";
import {
  FC,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { GraphContext } from "../graph/GraphProcessedContainer";
import { IRelatedLinkOption } from "./GraphRelatedNodes";
import { SessionContext } from "../../providers/SessionProvider";
import { INode } from "../graph/helpers";

export interface IRelatedNode {
  id: string;
  name: string;
  labels: string[];
  checked: boolean;
}
const GraphRelatedLink: React.FC<{ link: IRelatedLinkOption; item: INode }> = ({
  link,
  item,
}) => {
  const {
    graph: { nodes },
    addItemsToGraph,
  } = useContext(GraphContext);
  const [data, setData] = useState<IRelatedNode[] | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const { getSession } = useContext(SessionContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleApply = useCallback(() => {
    if (containerRef.current && data) {
      const inputs = containerRef.current.querySelectorAll<HTMLInputElement>(
        "input[name='neighbor-node']",
      );
      const modified: IRelatedNode[] = [];
      inputs.forEach((el) => {
        const id = el.dataset.id;
        const checked = el.checked;
        if (id) {
          const item = data.find((t) => t.id === id);
          if (item) {
            if (item.checked !== checked) {
              modified.push(item);
            }
          }
        }
      });
      addItemsToGraph({
        sourceNode: item.elementId,
        link,
        targetNodes: modified,
      });
    }
  }, [containerRef, data, addItemsToGraph, item, link]);

  useEffect(() => {
    const session = getSession();
    setIsLoading(true);
    session
      .run(
        `MATCH (n)${link.outgoing ? "" : "<"}-[:${link.type}]-${link.outgoing ? ">" : ""}(m) 
        where elementId(n)=$elementId 
        with distinct m as m
        return elementId(m) as id, 
        labels(m) as labels,
        COALESCE(
          m.ntid,
          m.name,
          m.team_name,
          m.title,
          m.application_name,
          m.batch_id,
          m.material_id,
          m.site_id,
          m.vendor_name,
          m.customer_name,
          m.project_name,
          m.document_id,
          elementId(m)
        ) as name
        limit 300`,
        {
          elementId: item.elementId,
        },
      )
      .then((r) => r.records.map((t) => t.toObject() as IRelatedNode))
      .then((r) =>
        r.sort((a, b) => {
          const f = a.labels.join("").localeCompare(b.labels.join(""));
          if (f === 0) {
            return a.name.localeCompare(b.name);
          }
          return f;
        }),
      )
      .then((r) =>
        r.map((t) => ({
          ...t,
          checked: nodes.find((ex) => ex.elementId === t.id) !== undefined,
        })),
      )
      .then(setData)
      .finally(() => {
        session.close();
        setIsLoading(false);
      });
  }, [item, link, getSession, nodes]);
  if (isLoading) {
    return <div>Loading..</div>;
  }
  if (!data) {
    return null;
  }
  return (
    <div ref={containerRef}>
      <div className={"block"}>
        <button className={"button is-success is-small"} onClick={handleApply}>
          Apply changes
        </button>
      </div>

      <ul>
        {data.map((item) => (
          <GraphRelatedLinkItem key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
};

const GraphRelatedLinkItem: FC<{
  item: IRelatedNode;
}> = ({ item }) => {
  const { labels, id, checked, name } = item;

  return (
    <li>
      <label className={"checkbox"}>
        <input
          type={"checkbox"}
          data-id={id}
          defaultChecked={checked}
          name={"neighbor-node"}
        />
        {labels.map((t) => (
          <span className={"tag is-primary"} key={t}>
            {t}
          </span>
        ))}
        {name}
      </label>
    </li>
  );
};

export default GraphRelatedLink;
