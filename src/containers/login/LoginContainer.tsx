import "./login.scss";
import React, { FormEvent, useCallback, useContext, useState } from "react";
import { AuthContext } from "../../providers/AuthProvider";

type IKey = "url" | "username" | "password" | "database" | "protocol";
const requiredKeys: IKey[] = ["url"];
function LoginContainer() {
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<IKey | "">("");
  const [connectionError, setConnectionError] = React.useState("");
  const { connect } = useContext(AuthContext);

  return (
    <div className={"loginContainer content"}>
      <fieldset disabled={loading}>
        <form
          className={"box"}
          onSubmit={useCallback(
            (event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              event.stopPropagation();
              setValidationError("");
              setConnectionError("");
              setLoading(false);
              const data = new FormData(event.currentTarget);
              const parsed = Object.fromEntries(data.entries()) as Record<
                IKey,
                string
              >;

              for (const key of requiredKeys) {
                if (!parsed[key]) {
                  return setValidationError(key);
                }
              }
              setLoading(true);

              connect({
                ...parsed,
              })
                .catch((e) => {
                  setLoading(false);
                  setConnectionError(e.message);
                })
                .then(() => {
                  localStorage.setItem("url", parsed.url);
                  localStorage.setItem("database", parsed.database);
                  localStorage.setItem("username", parsed.username);
                });
            },
            [connect],
          )}
        >
          <div>
            <label className="label">Connect URL</label>
            <div className="field has-addons">
              <p className="control">
                <span className="select">
                  <select name={"protocol"}>
                    <option>neo4j://</option>
                    <option>bolt://</option>
                  </select>
                </span>
              </p>
              <div className="control is-expanded">
                <input
                  className={`input ${validationError === "url" && "is-danger"}`}
                  name={"url"}
                  type="text"
                  placeholder="URL"
                  defaultValue={localStorage.getItem("url") ?? undefined}
                />
              </div>
            </div>
            {validationError === "url" && (
              <p className="help is-danger">This field cannot be empty</p>
            )}
          </div>

          <div className="field">
            <label className="label">Database</label>
            <div className="control has-icons-left has-icons-right">
              <input
                className="input"
                name={"database"}
                type="text"
                placeholder="Database name"
                defaultValue={localStorage.getItem("database") ?? undefined}
              />
              <span className="icon is-small is-left">
                <i className="fas fa-database"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Username</label>
            <div className="control has-icons-left has-icons-right">
              <input
                className="input"
                name={"username"}
                type="text"
                placeholder="Username"
                defaultValue={localStorage.getItem("username") ?? undefined}
              />
              <span className="icon is-small is-left">
                <i className="fas fa-user"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Password</label>

            <p className="control has-icons-left">
              <input
                className="input"
                type="password"
                name="password"
                placeholder="Password"
              />
              <span className="icon is-small is-left">
                <i className="fas fa-lock"></i>
              </span>
            </p>
          </div>

          <div className="field">
            <div className="control">
              <button className="button is-link">Connect</button>
            </div>
          </div>
          {loading && (
            <div className={"field"}>
              <progress className="progress is-small is-primary" max="100">
                100%
              </progress>
            </div>
          )}
          {connectionError && (
            <p className="help is-danger">
              <span className="icon is-small is-left">
                <i className="fas fa-warning"></i>
              </span>
              {connectionError}
            </p>
          )}
        </form>
      </fieldset>
    </div>
  );
}

export default LoginContainer;
