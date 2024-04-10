import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Driver, Session } from "neo4j-driver";
import { EditorSupportSchema } from "@neo4j-cypher/editor-support";
import { neo4jSchema } from "./hepers/schema";
import useValueChangedFlag from "../hooks/useValueChangedFlag";
import useForceUpdate from "../hooks/useForceUpdate";

interface ISessionContext {
  driver: Driver;
  getSession: () => Session;
  schema: EditorSupportSchema;
  databases: string[];
  database: string;
  setDatabase: Dispatch<SetStateAction<string>>;
}

export const SessionContext = createContext<ISessionContext>(
  null as unknown as any,
);
function SessionProvider({
  children,
  driver,
  database: defaultDatabase,
}: PropsWithChildren & { driver: Driver; database: string }) {
  const [database, setDatabase] = useState(defaultDatabase);
  const [databases, setDatabases] = useState([database]);
  const getSession = useCallback(
    () => driver.session({ database }),
    [database, driver],
  );
  const isDbSame = useValueChangedFlag(database);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    forceUpdate();
  }, [isDbSame, forceUpdate]);
  const [schema, setSchema] = useState<EditorSupportSchema>({});

  const value: ISessionContext = useMemo(
    () => ({
      driver,
      getSession,
      schema,
      databases,
      setDatabase,
      database,
    }),
    [driver, database, schema, getSession, databases, setDatabase],
  );

  useEffect(() => {
    // fetch schema
    setSchema({});
    const session = getSession();
    session.beginTransaction().then((tx) =>
      Promise.all([
        tx.run("call db.labels()"),
        tx.run("call db.relationshipTypes()"),
        tx.run("call db.propertyKeys()"),
      ])
        .then((response) => {
          setSchema({
            ...neo4jSchema,
            labels: response[0].records.map((t) => t.toObject().label),
            relationshipTypes: response[1].records.map(
              (t) => t.toObject().relationshipType,
            ),
            propertyKeys: response[2].records.map(
              (t) => t.toObject().propertyKey,
            ),
          });
        })
        .finally(() => {
          session.close();
        }),
    );
  }, [getSession]);

  useEffect(() => {
    const session = getSession();
    session
      .run(`SHOW DATABASES yield name;`)
      .then((r) => r.records.map((t) => t.get("name")))
      .then(setDatabases);
  }, [getSession]);
  return (
    <SessionContext.Provider value={value}>
      {isDbSame && children}
    </SessionContext.Provider>
  );
}
export default SessionProvider;
