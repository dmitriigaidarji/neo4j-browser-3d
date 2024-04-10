import * as React from "react";
import "./panel.scss";
import ConnectionStatusSidepanel from "../connection-status-sidepanel/ConnectionStatus";
import SavedQueriesContainer from "../saved-queries/SavedQueriesContainer";
import DatabaseContainer from "../database/DatabaseContainer";
import SchemaInfoContainer from "../schema/SchemaInfoContainer";
const LeftPanel: React.FC = () => {
  return (
    <div
      className={
        "leftPanel has-background-primary-05 has-text-primary-20-invert"
      }
    >
      <DatabaseContainer />
      <SavedQueriesContainer />
      <SchemaInfoContainer />
      <ConnectionStatusSidepanel />
    </div>
  );
};

export default LeftPanel;
