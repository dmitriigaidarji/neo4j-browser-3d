import { useCallback, useContext } from "react";
import { CypherEditor } from "@neo4j-cypher/react-codemirror";
import { SessionContext } from "../../providers/SessionProvider";
import { ThemeContext } from "../../providers/ThemeProvider";

/**
 * Fully controlled Cypher editor: the owning frame holds the text. Keeping the
 * value in one place removes the prop-to-state mirroring the previous version
 * needed and the effect that came with it.
 */
export default function FrameCypherEditor({
  value,
  onChange,
  onSubmit,
  autofocus = false,
  placeholder = "MATCH (n) RETURN n LIMIT 25",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  autofocus?: boolean;
  placeholder?: string;
}) {
  const { schema } = useContext(SessionContext);
  const { theme } = useContext(ThemeContext);

  const handleRun = useCallback(() => {
    const query = value.trim();
    if (query.length > 0) {
      onSubmit(query);
    }
  }, [value, onSubmit]);

  // Ctrl/Cmd + Enter runs the query, matching the official Neo4j Browser.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleRun();
      }
    },
    [handleRun],
  );

  return (
    <div className="cypher-editor">
      <CypherEditor
        className="cypher-editor__input"
        value={value}
        schema={schema}
        theme={theme}
        placeholder={placeholder}
        autofocus={autofocus}
        lineWrapping
        onValueChanged={onChange}
        onKeyDown={handleKeyDown as never}
      />
      <div className="cypher-editor__actions">
        <kbd className="cypher-editor__hint">⌘/Ctrl + ⏎</kbd>
        <button
          type="button"
          className="cypher-editor__run"
          onClick={handleRun}
          disabled={value.trim().length === 0}
          aria-label="Run query"
          title="Run query (Ctrl/Cmd + Enter)"
        >
          <i className="fas fa-play" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
