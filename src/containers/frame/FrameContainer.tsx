import { CypherEditor } from "@neo4j-cypher/react-codemirror";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import FrameQueryContainer from "./FrameQueryContainer";
import "./frame.scss";
import { RecordShape } from "neo4j-driver";

export type IFrameQueryResult = RecordShape<PropertyKey, any>;
function FrameContainer({
  defaultQuery,
  defaultData,
  onUpdate,
}: {
  defaultQuery?: string;
  defaultData?: IFrameQueryResult[] | null;
  onUpdate: ({
    query,
    result,
  }: {
    query: string;
    result: IFrameQueryResult[];
  }) => any;
}) {
  const { schema, session } = useContext(SessionContext);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = React.useState("");
  const [data, setData] = React.useState<IFrameQueryResult[] | null>(null);

  useEffect(() => {
    setValue(defaultQuery ?? "");
    setData(defaultData ?? null);
  }, [defaultData, defaultQuery]);

  useEffect(() => {
    if (value && data) {
      onUpdate({ query: value, result: data });
    }
  }, [value, data, onUpdate]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setData(
      await session.run(value).then((r) => r.records.map((t) => t.toObject())),
    );
    setLoading(false);
  }, [value, session]);

  return (
    <div>
      <div className="control has-icons-right is-bordered block">
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
      {data && <FrameQueryContainer data={data} />}
    </div>
  );
}

export default FrameContainer;
