import { useCallback, useContext, useState, type FormEvent } from "react";
import { AuthContext } from "../../providers/AuthProvider";
import {
  CachedKey,
  readCachedValue,
  writeCachedValue,
} from "../../hooks/useCachedValue";

const PROTOCOLS = ["neo4j://", "neo4j+s://", "bolt://", "bolt+s://"] as const;

interface RememberedConnection {
  protocol: string;
  url: string;
  username: string;
  database: string;
}

const DEFAULT_CONNECTION: RememberedConnection = {
  protocol: "neo4j://",
  url: "localhost:7687",
  username: "neo4j",
  database: "",
};

export default function LoginContainer() {
  const { connect } = useContext(AuthContext);
  // The protocol was previously the only field not remembered, so every
  // reconnection to an Aura instance had to be re-selected by hand.
  //
  // Read once, and persist by writing straight to storage rather than through
  // `useCachedValue`: that hook saves from an effect, and a successful connect
  // unmounts this form immediately (AuthProvider swaps in the session UI), so
  // the effect never ran and nothing was ever remembered.
  const [remembered] = useState(() =>
    readCachedValue<RememberedConnection>(
      CachedKey.connection,
      DEFAULT_CONNECTION,
    ),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urlInvalid, setUrlInvalid] = useState(false);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      setUrlInvalid(false);

      const data = Object.fromEntries(
        new FormData(event.currentTarget).entries(),
      ) as Record<string, string>;

      const url = data.url?.trim() ?? "";
      if (!url) {
        setUrlInvalid(true);
        return;
      }

      setLoading(true);
      try {
        await connect({
          protocol: data.protocol,
          url,
          username: data.username?.trim() ?? "",
          password: data.password ?? "",
          database: data.database?.trim() || undefined,
        });
        // Only remember details that actually worked. The old code chained
        // `.then()` after `.catch()`, so failed attempts were saved too.
        writeCachedValue<RememberedConnection>(CachedKey.connection, {
          protocol: data.protocol,
          url,
          username: data.username?.trim() ?? "",
          database: data.database?.trim() ?? "",
        });
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not connect",
        );
      } finally {
        setLoading(false);
      }
    },
    [connect],
  );

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__brand">
          <span className="login__logo" aria-hidden="true">
            <i className="fas fa-circle-nodes" />
          </span>
          <div>
            <h1 className="login__title">Neo4j Browser 3D</h1>
            <p className="login__subtitle">
              Query and explore your graph in three dimensions
            </p>
          </div>
        </div>

        <fieldset disabled={loading} className="login__fields">
          <div className="field">
            <label className="label" htmlFor="login-url">
              Connect URL
            </label>
            <div className="field has-addons">
              <div className="control">
                <span className="select">
                  <select
                    name="protocol"
                    defaultValue={remembered.protocol}
                    aria-label="Protocol"
                  >
                    {PROTOCOLS.map((protocol) => (
                      <option key={protocol}>{protocol}</option>
                    ))}
                  </select>
                </span>
              </div>
              <div className="control is-expanded">
                <input
                  id="login-url"
                  className={`input${urlInvalid ? " is-danger" : ""}`}
                  name="url"
                  type="text"
                  autoComplete="url"
                  placeholder="localhost:7687"
                  defaultValue={remembered.url}
                />
              </div>
            </div>
            {urlInvalid && (
              <p className="help is-danger">A connect URL is required</p>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="login-database">
              Database <span className="u-muted">(optional)</span>
            </label>
            <div className="control has-icons-left">
              <input
                id="login-database"
                className="input"
                name="database"
                type="text"
                placeholder="neo4j"
                defaultValue={remembered.database}
              />
              <span className="icon is-small is-left">
                <i className="fas fa-database" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="login-username">
              Username
            </label>
            <div className="control has-icons-left">
              <input
                id="login-username"
                className="input"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="neo4j"
                defaultValue={remembered.username}
              />
              <span className="icon is-small is-left">
                <i className="fas fa-user" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <div className="control has-icons-left">
              <input
                id="login-password"
                className="input"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <span className="icon is-small is-left">
                <i className="fas fa-lock" aria-hidden="true" />
              </span>
            </div>
          </div>

          <button
            type="submit"
            className={`button is-link is-fullwidth${loading ? " is-loading" : ""}`}
          >
            Connect
          </button>
        </fieldset>

        {error && (
          <div className="notification is-danger is-light login__error">
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />{" "}
            {error}
          </div>
        )}

        <p className="login__hint u-muted">
          Credentials are sent straight from your browser to the database and
          are never stored — only the URL, database and username are remembered.
        </p>
      </form>
    </div>
  );
}
