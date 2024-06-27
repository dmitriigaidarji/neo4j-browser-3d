import * as React from "react";
import "./panel.scss";
import ConnectionStatusSidepanel from "../connection-status-sidepanel/ConnectionStatus";
import SavedQueriesContainer from "../saved-queries/SavedQueriesContainer";
import DatabaseContainer from "../database/DatabaseContainer";
import SchemaInfoContainer from "../schema/SchemaInfoContainer";
import { Dispatch, SetStateAction, useCallback } from "react";
const LeftPanel: React.FC<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}> = ({ open, setOpen }) => {
  return (
    <div
      className={
        "leftPanel has-background-primary-05 has-text-primary-20-invert" +
        (open ? "" : " closed")
      }
    >
      <div
        className="open-container"
        onClick={useCallback(() => {
          setOpen((t) => !t);
        }, [setOpen])}
      >
        <span className="icon is-medium">
          <i className={`fas fa-chevron-${open ? "left" : "right"}`}></i>
        </span>
      </div>
      <DatabaseContainer />
      <SavedQueriesContainer />
      <SchemaInfoContainer />
      <ConnectionStatusSidepanel />
    </div>
  );
};

export default LeftPanel;
