import { CypherEditor } from "@neo4j-cypher/react-codemirror";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import FrameQueryContainer from "./FrameQueryContainer";
import "./frame.scss";
import { RecordShape } from "neo4j-driver";
import "@neo4j-cypher/codemirror/css/cypher-codemirror.css";

export type IFrameQueryResult = RecordShape<PropertyKey, any>;
function FrameContainer({
  defaultQuery,
  cacheQuery,
}: {
  defaultQuery?: string;
  cacheQuery: (query: string) => void;
}) {
  const { schema, getSession } = useContext(SessionContext);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = React.useState("");
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
    [getSession, cacheQuery],
  );

  const handleSubmit = useCallback(async () => {
    handleFetchData(value);
  }, [handleFetchData, value]);

  useEffect(() => {
    setValue("");
    setData(null);
    const v = defaultQuery ?? "";
    setValue(v);
  }, [defaultQuery]);

  return (
    <div>
      <div className="control has-icons-right is-bordered block cyphercontainer">
        <CypherEditor value={value} schema={schema} onValueChanged={setValue} />
        <span
          className="icon is-medium is-right play-button"
          onClick={handleSubmit}
        >
          <i className="fas fa-play"></i>
        </span>
      </div>
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
        data && <FrameQueryContainer data={data} />
      )}
    </div>
  );
}

export default FrameContainer;
