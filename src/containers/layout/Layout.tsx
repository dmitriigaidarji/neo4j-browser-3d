import { useCallback, useContext } from "react";
import QueryProvider from "../../providers/QueryProvider";
import { AuthContext } from "../../providers/AuthProvider";
import { SessionContext } from "../../providers/SessionProvider";
import { ThemeContext } from "../../providers/ThemeProvider";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";
import LeftPanel from "../sidepanel/LeftPanel";
import QueryTabsContainer from "../query-tabs/QueryTabsContainer";

function AppHeader({
  panelOpen,
  onTogglePanel,
}: {
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const { serverInfo, disconnect } = useContext(AuthContext);
  const { database, warning } = useContext(SessionContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <header className="app-header">
      <button
        type="button"
        className="app-header__icon"
        onClick={onTogglePanel}
        aria-label={panelOpen ? "Hide side panel" : "Show side panel"}
        aria-expanded={panelOpen}
      >
        <i className="fas fa-bars" aria-hidden="true" />
      </button>

      <div className="app-header__brand">
        <span className="app-header__logo" aria-hidden="true">
          <i className="fas fa-circle-nodes" />
        </span>
        <span className="app-header__title">Neo4j Browser 3D</span>
      </div>

      <div className="app-header__spacer" />

      {warning && (
        <span className="app-header__warning" title={warning}>
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <span className="u-truncate">{warning}</span>
        </span>
      )}

      {serverInfo && (
        <span className="app-header__connection u-truncate">
          <i className="fas fa-plug" aria-hidden="true" />
          {serverInfo.username ? `${serverInfo.username}@` : ""}
          {serverInfo.url}/{database}
        </span>
      )}

      <button
        type="button"
        className="app-header__icon"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        <i
          className={`fas fa-${theme === "dark" ? "sun" : "moon"}`}
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        className="app-header__icon app-header__icon--danger"
        onClick={disconnect}
        aria-label="Disconnect"
        title="Disconnect"
      >
        <i className="fas fa-right-from-bracket" aria-hidden="true" />
      </button>
    </header>
  );
}

export default function Layout() {
  const [panelOpen, setPanelOpen] = useCachedValue(
    CachedKey.leftPanelOpen,
    true,
  );

  const togglePanel = useCallback(
    () => setPanelOpen((open) => !open),
    [setPanelOpen],
  );

  return (
    <QueryProvider>
      <div className="app-shell">
        <AppHeader panelOpen={panelOpen} onTogglePanel={togglePanel} />
        <div className="app-body">
          <LeftPanel open={panelOpen} />
          <main className="app-main u-scroll-y">
            <QueryTabsContainer />
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
