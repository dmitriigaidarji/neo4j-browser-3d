import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Driver, Session } from "neo4j-driver";
import { EditorSupportSchema } from "@neo4j-cypher/editor-support";
import { neo4jSchema } from "./hepers/schema";

interface ISessionContext {
  driver: Driver;
  getSession: () => Session;
  schema: EditorSupportSchema;
}

export const SessionContext = createContext<ISessionContext>(
  null as unknown as any,
);
function SessionProvider({
  children,
  driver,
  database,
}: PropsWithChildren & { driver: Driver; database: string }) {
  const getSession = useCallback(
    () => driver.session({ database }),
    [database, driver],
  );

  const [schema, setSchema] = useState<EditorSupportSchema>({});

  const value: ISessionContext = useMemo(
    () => ({
      driver,
      getSession,
      schema,
    }),
    [driver, schema, getSession],
  );

  useEffect(() => {
    // fetch schema
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

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export default SessionProvider;
