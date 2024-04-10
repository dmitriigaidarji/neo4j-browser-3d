import "./status.scss";
import React, { useContext } from "react";
import { AuthContext } from "../../providers/AuthProvider";
import { SessionContext } from "../../providers/SessionProvider";
function ConnectionStatusSidepanel() {
  const { disconnect, serverInfo: info } = useContext(AuthContext);
  const { database } = useContext(SessionContext);
  return (
    <div className={"ConnectionStatusSidepanel"}>
      {info ? (
        <div>
          <div className={"title has-text-primary-10-invert"}>
            Connection Status
          </div>

          <div className="fixed-grid">
            <div className="grid">
              <div className="cell">URL</div>
              <div className="cell">
                <span className="tag is-dark">{info.address}</span>
              </div>

              <div className="cell">
                <span>Protocol</span>
              </div>
              <div className="cell">
                <span className="tag is-dark">{info.protocolVersion}</span>
              </div>
              <div className="cell">
                <span>Agent</span>
              </div>
              <div className="cell">
                <span className="tag is-dark">{info.agent}</span>
              </div>
              <div className="cell">
                <span>Database</span>
              </div>
              <div className="cell">
                <span className="tag is-dark">{database}</span>
              </div>
              <div className="cell">
                <span>User</span>
              </div>
              <div className="cell">
                <span className="tag is-dark">{info.username}</span>
              </div>
            </div>
          </div>

          <div className={"block"}>
            <button
              className="button is-primary is-small disconnect"
              onClick={disconnect}
            >
              Disconnect
            </button>
          </div>
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

export default ConnectionStatusSidepanel;
