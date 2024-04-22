import React, { useCallback, useContext, useEffect, useState } from "react";
import { INode } from "../graph/helpers";
import { SessionContext } from "../../providers/SessionProvider";
import GraphRelatedLinksList from "./GraphRelatedLinksList";

export interface IRelatedLinkOption {
  outgoing: boolean;
  type: string;
}
function GraphRelatedNodes({ item }: { item: INode }) {
  const { getSession } = useContext(SessionContext);

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<IRelatedLinkOption[] | undefined>(undefined);
  useEffect(() => {
    setData(undefined);
    setIsLoading(false);
  }, [item]);
  return (
    <div>
      <button
        className={
          "button is-primary is-small" + (isLoading ? " is-disabled" : "")
        }
        disabled={isLoading}
        onClick={useCallback(() => {
          const session = getSession();
          setIsLoading(true);
          session
            .run(
              `MATCH (n)-[link]-() where elementId(n)=$elementId 
            with case when elementId(startNode((link))) = $elementId then true else false end as outgoing,
            type(link) as type
            return distinct outgoing, type`,
              {
                elementId: item.elementId,
              },
            )
            .then((r) =>
              r.records.map((t) => t.toObject() as IRelatedLinkOption),
            )
            .then((r) =>
              r.sort((a, b) => {
                if (a.outgoing && b.outgoing) {
                  return a.type.localeCompare(b.type);
                }
                return a.outgoing ? -1 : 1;
              }),
            )
            .then(setData)
            .finally(() => {
              session.close();
              setIsLoading(false);
            });
        }, [getSession, item])}
      >
        Show neighbours
      </button>
      {data && <GraphRelatedLinksList item={item} links={data} />}
    </div>
  );
}

export default GraphRelatedNodes;
