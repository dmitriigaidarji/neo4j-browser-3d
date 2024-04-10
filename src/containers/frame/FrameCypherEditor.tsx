import { CypherEditor } from "@neo4j-cypher/react-codemirror";
import React, { useCallback, useContext, useEffect } from "react";
import { SessionContext } from "../../providers/SessionProvider";

function FrameCypherEditor({
  onSubmit,
  defaultValue,
}: {
  onSubmit: (props: string) => void;
  defaultValue?: string;
}) {
  const { schema } = useContext(SessionContext);
  const [value, setValue] = React.useState("");
  const handleSubmit = useCallback(() => {
    onSubmit(value);
  }, [onSubmit, value]);

  useEffect(() => {
    setValue("");
    setValue(defaultValue ?? "");
  }, [defaultValue]);
  return (
    <div className="control has-icons-right is-bordered block cyphercontainer">
      <span
        className="icon is-medium is-right play-button"
        onClick={handleSubmit}
      >
        <i className="fas fa-play"></i>
      </span>
      <CypherEditor value={value} schema={schema} onValueChanged={setValue} />
    </div>
  );
}

export default FrameCypherEditor;
