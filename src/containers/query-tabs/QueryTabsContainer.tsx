import { useCallback, useContext, useState } from "react";
import { QueryContext } from "../../providers/QueryProvider";
import FrameContainer from "../frame/FrameContainer";
import FrameCypherEditor from "../frame/FrameCypherEditor";
import ErrorBoundary from "../../components/ErrorBoundary";

const EXAMPLES = [
  "MATCH (n) RETURN n LIMIT 25",
  "MATCH p = ()-[]->() RETURN p LIMIT 25",
  "CALL db.schema.visualization()",
];

export default function QueryTabsContainer() {
  const {
    current: { queries, addQuery: openFrame, onQueryDelete },
    history: { addQuery: rememberQuery },
  } = useContext(QueryContext);

  const [draft, setDraft] = useState("");

  const runDraft = useCallback(
    (query: string) => {
      openFrame(query);
      setDraft("");
    },
    [openFrame],
  );

  return (
    <div className="workspace">
      <div className="workspace__composer">
        <FrameCypherEditor
          value={draft}
          onChange={setDraft}
          onSubmit={runDraft}
          autofocus
        />
      </div>

      {queries.length === 0 && (
        <div className="workspace__empty">
          <i className="fas fa-circle-nodes" aria-hidden="true" />
          <h2>Run a Cypher query to get started</h2>
          <p className="u-muted">
            Results containing nodes or relationships are rendered as an
            interactive 3D graph.
          </p>
          <div className="workspace__examples">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="workspace__example"
                onClick={() => openFrame(example)}
              >
                <code>{example}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      {queries.map((query) => (
        <ErrorBoundary key={query.id} title="This frame failed to render">
          <FrameContainer
            query={query}
            cacheQuery={rememberQuery}
            onClose={onQueryDelete}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
}
