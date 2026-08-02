import ConnectionStatus from "../connection-status-sidepanel/ConnectionStatus";
import SavedQueriesContainer from "../saved-queries/SavedQueriesContainer";
import DatabaseContainer from "../database/DatabaseContainer";
import SchemaInfoContainer from "../schema/SchemaInfoContainer";

export default function LeftPanel({ open }: { open: boolean }) {
  return (
    <aside
      className={`left-panel${open ? "" : " is-collapsed"}`}
      // `inert` keeps the collapsed panel out of the tab order; previously the
      // hidden controls were still focusable.
      inert={!open || undefined}
    >
      <div className="left-panel__inner u-scroll-y">
        <DatabaseContainer />
        <SchemaInfoContainer />
        <SavedQueriesContainer />
        <ConnectionStatus />
      </div>
    </aside>
  );
}
