import "./status.scss";
import React, { useContext } from "react";
import { AuthContext, IConnectionInfo } from "../../providers/AuthProvider";
function ConnectionStatus({ info }: { info: IConnectionInfo | null }) {
  const { disconnect } = useContext(AuthContext);
  return (
    <div className={"connectionStatus"}>
      {info ? (
        <div>
          <span className="icon is-left has-text-success">
            <i className="fas fa-signal"></i>
          </span>
          <span>Connected</span>
          <span>URL</span>
          <span className="tag is-dark">{info.address}</span>
          <span>Protocol</span>
          <span className="tag is-dark">{info.protocolVersion}</span>
          <span>Agent</span>
          <span className="tag is-dark">{info.agent}</span>
          <span>Database</span>
          <span className="tag is-dark">{info.database}</span>
          <span>User</span>
          <span className="tag is-dark">{info.username}</span>
          <button className="button is-small disconnect" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          <span className="icon is-left has-text-danger">
            <i className="fas fa-signal"></i>
          </span>
          <span>Disconnected</span>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
