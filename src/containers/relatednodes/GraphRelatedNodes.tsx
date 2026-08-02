import { useCallback, useContext, useState } from "react";
import { SessionContext } from "../../providers/SessionProvider";
import { GraphContext } from "../graph/GraphProcessedContainer";
import {
  fetchRelationshipOptions,
  type IRelatedLinkOption,
} from "../../graph/queries";
import type { INode } from "../../graph/types";
import GraphRelatedLinksList from "./GraphRelatedLinksList";

export default function GraphRelatedNodes({ item }: { item: INode }) {
  const { getSession } = useContext(SessionContext);
  const { removeNode } = useContext(GraphContext);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<IRelatedLinkOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // No reset effect needed: the inspector keys this component on the node id,
  // so a different node gets a fresh mount.
  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const session = getSession();
    try {
      setOptions(
        await fetchRelationshipOptions({ session, elementId: item.elementId }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      await session.close().catch(() => {});
      setLoading(false);
    }
  }, [getSession, item.elementId]);

  return (
    <div className="related">
      <div className="related__actions">
        <button
          type="button"
          className={`button is-small is-link${loading ? " is-loading" : ""}`}
          disabled={loading}
          onClick={loadOptions}
        >
          <i className="fas fa-diagram-project" aria-hidden="true" />
          <span>Show neighbours</span>
        </button>
        <button
          type="button"
          className="button is-small is-danger is-light"
          onClick={() => removeNode(item.elementId)}
        >
          <i className="fas fa-eye-slash" aria-hidden="true" />
          <span>Hide node</span>
        </button>
      </div>

      {error && <p className="related__error">{error}</p>}

      {options &&
        (options.length === 0 ? (
          <p className="u-muted is-size-7">This node has no relationships.</p>
        ) : (
          <GraphRelatedLinksList item={item} links={options} />
        ))}
    </div>
  );
}
