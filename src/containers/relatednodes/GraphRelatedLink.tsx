import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { GraphContext } from "../graph/GraphProcessedContainer";
import { IRelatedLinkOption } from "./GraphRelatedNodes";
import { SessionContext } from "../../providers/SessionProvider";
import { INode } from "../graph/helpers";

interface IRelatedNode {
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
  } = useContext(GraphContext);
  const [data, setData] = useState<IRelatedNode[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const { getSession } = useContext(SessionContext);
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
          m.application_name,
          m.title,
          m.application_name,
          m.team_name,
          m.batch_id,
          m.material_id,
          m.site_id,
          m.vendor_name,
          m.customer_name
        ) as name`,
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
    <ul>
      {data.map(({ id, name, labels, checked }) => (
        <li key={id}>
          <label className={"checkbox"}>
            <input type={"checkbox"} defaultChecked={checked} />
            {labels.map((t) => (
              <span className={"tag is-primary"} key={t}>
                {t}
              </span>
            ))}
            {name}
          </label>
        </li>
      ))}
    </ul>
  );
};

export default GraphRelatedLink;
