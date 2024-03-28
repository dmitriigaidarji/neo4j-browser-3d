import { CypherEditor } from "@neo4j-cypher/react-codemirror";
import { useContext } from "react";
import { SessionContext } from "../../providers/SessionProvider";

function FrameContainer() {
  const { schema } = useContext(SessionContext);
  return (
    <div>
      <CypherEditor schema={schema} />
    </div>
  );
}

export default FrameContainer;
