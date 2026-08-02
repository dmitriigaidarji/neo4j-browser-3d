import { useContext } from "react";
import { AuthContext } from "../../providers/AuthProvider";
import { SessionContext } from "../../providers/SessionProvider";
import PanelSection from "../../components/PanelSection";

export default function ConnectionStatus() {
  const { disconnect, serverInfo } = useContext(AuthContext);
  const { database } = useContext(SessionContext);

  if (!serverInfo) {
    return (
      <PanelSection title="Connection" icon="plug-circle-xmark">
        <p className="has-text-danger is-size-7">
          <i className="fas fa-signal" aria-hidden="true" /> Disconnected
        </p>
      </PanelSection>
    );
  }

  const rows: Array<[string, string]> = [
    ["Address", serverInfo.address ?? "—"],
    ["Protocol", String(serverInfo.protocolVersion ?? "—")],
    ["Agent", serverInfo.agent ?? "—"],
    ["Database", database],
    ["User", serverInfo.username || "—"],
  ];

  return (
    <PanelSection
      title="Connection"
      icon="plug-circle-check"
      defaultOpen={false}
    >
      <dl className="connection">
        {rows.map(([label, value]) => (
          <div className="connection__row" key={label}>
            <dt>{label}</dt>
            <dd className="u-truncate" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className="button is-small is-danger is-light is-fullwidth"
        onClick={disconnect}
      >
        <i className="fas fa-right-from-bracket" aria-hidden="true" />
        <span>Disconnect</span>
      </button>
    </PanelSection>
  );
}
