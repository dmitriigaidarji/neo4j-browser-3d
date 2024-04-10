import React, { useCallback, useContext, useEffect, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import FrameQueryContainer from "./FrameQueryContainer";
import "./frame.scss";
import { RecordShape } from "neo4j-driver";
import "@neo4j-cypher/codemirror/css/cypher-codemirror.css";
import FrameCypherEditor from "./FrameCypherEditor";
import { IQueryContextInfo, ISavedQuery } from "../../providers/QueryProvider";

export type IFrameQueryResult = RecordShape<PropertyKey, any>;
function FrameContainer({
  query: defaultQuery,
  cacheQuery,
  onClose,
}: {
  query: ISavedQuery;
  cacheQuery: IQueryContextInfo["addQuery"];
  onClose: IQueryContextInfo["onQueryDelete"];
}) {
  const { getSession } = useContext(SessionContext);
  const [loading, setLoading] = useState(false);
  const [data, setData] = React.useState<IFrameQueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchData = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(null);
      const session = getSession();
      await session
        .run(query)
        .then((r) => r.records.map((t) => t.toObject()))
        .then((r) => {
          setData(r);
          cacheQuery(query);
          defaultQuery.query = query;
          return r;
        })
        .catch((e) => {
          console.error(e);
          setError(e?.message ?? "Error");
        })
        .finally(() => {
          session.close();
        });

      setLoading(false);
    },
    [getSession, cacheQuery, defaultQuery],
  );

  useEffect(() => {
    setData(null);
    if (defaultQuery) {
      handleFetchData(defaultQuery.query);
    }
  }, [defaultQuery, handleFetchData]);

  const handleClose = useCallback(() => {
    onClose(defaultQuery);
  }, [onClose, defaultQuery]);
  return (
    <div>
      <FrameCypherEditor
        onSubmit={handleFetchData}
        defaultValue={defaultQuery.query}
      />
      {loading && (
        <div className={"field block"}>
          <progress className="progress is-small is-primary" max="100">
            100%
          </progress>
        </div>
      )}
      {error ? (
        <div className={"field block"}>{JSON.stringify(error)}</div>
      ) : (
        data && <FrameQueryContainer data={data} onClose={handleClose} />
      )}
    </div>
  );
}

export default FrameContainer;
