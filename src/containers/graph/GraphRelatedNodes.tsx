import React, { useCallback, useContext, useState } from "react";
import { INode } from "./helpers";
import { SessionContext } from "../../providers/SessionProvider";

function GraphRelatedNodes({ item }: { item: INode }) {
  const { getSession } = useContext(SessionContext);
  const [isLoading, setIsLoading] = useState(false);
  return (
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
            "MATCH (n)-[link]-(node) where elementId(n)=$elementId return link, node",
            {
              elementId: item.elementId,
            },
          )
          .then((r) => r.records.map((t) => t.toObject()))
          .then((r) => {
            // group by link
            return r;
          })
          .then(console.log)
          .finally(() => {
            session.close();
            setIsLoading(false);
          });
      }, [getSession, item])}
    >
      Show neighbours
    </button>
  );
}

export default GraphRelatedNodes;
