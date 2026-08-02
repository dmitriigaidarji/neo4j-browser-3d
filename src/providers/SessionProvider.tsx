import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import type { Driver, Session } from "neo4j-driver";
import type { EditorSupportSchema } from "@neo4j-cypher/editor-support";
import { neo4jSchema } from "./helpers/schema";
import { fetchSchema } from "../graph/queries";

interface ISessionContext {
  driver: Driver;
  getSession: () => Session;
  schema: EditorSupportSchema;
  databases: string[];
  database: string;
  setDatabase: Dispatch<SetStateAction<string>>;
  /** Non-fatal problems worth surfacing, e.g. schema introspection denied. */
  warning: string | null;
}

export const SessionContext = createContext<ISessionContext>(
  null as unknown as ISessionContext,
);

function SessionProvider({
  children,
  driver,
  database: defaultDatabase,
}: PropsWithChildren<{ driver: Driver; database: string }>) {
  const [database, setDatabase] = useState(defaultDatabase);
  const [databases, setDatabases] = useState<string[]>([defaultDatabase]);
  const [schema, setSchema] = useState<EditorSupportSchema>(neo4jSchema);
  const [warning, setWarning] = useState<string | null>(null);

  const getSession = useCallback(
    () => driver.session({ database }),
    [database, driver],
  );

  // Editor autocompletion data for the selected database.
  useEffect(() => {
    let cancelled = false;
    const session = driver.session({ database });

    fetchSchema(session)
      .then((result) => {
        if (!cancelled) {
          setSchema({ ...neo4jSchema, ...result });
          setWarning(null);
        }
      })
      .catch((error: Error) => {
        // Introspection needs privileges that a read-only user may not have.
        // Autocompletion degrades, the app keeps working.
        if (!cancelled) {
          setSchema(neo4jSchema);
          setWarning(`Schema unavailable: ${error.message}`);
        }
      })
      .finally(() => {
        session.close().catch(() => {});
      });

    return () => {
      cancelled = true;
    };
  }, [driver, database]);

  // `SHOW DATABASES` is unavailable on Community edition and to unprivileged
  // users; fall back to just the connected database instead of leaving an
  // unhandled rejection behind.
  useEffect(() => {
    let cancelled = false;
    const session = driver.session({ database });

    session
      .run("SHOW DATABASES YIELD name")
      .then((result) => {
        if (cancelled) {
          return;
        }
        const names = [
          ...new Set(
            result.records.map((record) => record.get("name") as string),
          ),
        ].sort();
        setDatabases(names.length > 0 ? names : [database]);
      })
      .catch(() => {
        if (!cancelled) {
          setDatabases([database]);
        }
      })
      .finally(() => {
        session.close().catch(() => {});
      });

    return () => {
      cancelled = true;
    };
  }, [driver, database]);

  const value = useMemo<ISessionContext>(
    () => ({
      driver,
      getSession,
      schema,
      databases,
      database,
      setDatabase,
      warning,
    }),
    [driver, getSession, schema, databases, database, warning],
  );

  return (
    <SessionContext.Provider value={value}>
      {/*
        Remounting on database change replaces the previous hack of a
        force-update plus a "did the value change" flag, and guarantees no
        frame keeps a session bound to the old database.
      */}
      <div key={database} className="session-root">
        {children}
      </div>
    </SessionContext.Provider>
  );
}

export default SessionProvider;
