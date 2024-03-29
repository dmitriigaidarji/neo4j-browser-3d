import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Driver, Session } from "neo4j-driver";
import { EditorSupportSchema } from "@neo4j-cypher/editor-support";

interface ISessionActions {}
interface ISessionContext {
  driver: Driver;
  session: Session;
  schema: EditorSupportSchema;
  actions: ISessionActions;
}

//call db.labels()

// @ts-ignore
export const SessionContext = createContext<ISessionContext>(null);
function SessionProvider({
  children,
  driver,
  database,
}: PropsWithChildren & { driver: Driver; database: string }) {
  const session = useMemo(() => {
    return driver.session({ database });
  }, [driver, database]);

  const [schema, setSchema] = useState<EditorSupportSchema>({});

  const value: ISessionContext = useMemo(
    () => ({
      driver,
      session,
      schema,
      actions: {},
    }),
    [session, driver, schema],
  );

  useEffect(() => {
    // fetch schema
    session.beginTransaction().then((tx) =>
      Promise.all([
        tx.run("call db.labels()"),
        tx.run("call db.relationshipTypes()"),
        tx.run("call db.propertyKeys()"),
        tx.run("SHOW FUNCTIONS"),
      ]).then((response) => {
        setSchema({
          labels: response[0].records.map((t) => t.toObject().label),
          relationshipTypes: response[1].records.map(
            (t) => t.toObject().relationshipType,
          ),
          propertyKeys: response[2].records.map(
            (t) => t.toObject().propertyKey,
          ),
          functions: response[3].records
            .map((t) => t.toObject())
            .map((t) => ({
              name: t.name,
              signature: t.name,
            })),
        });
        tx.close();
      }),
    );

    return function cleanup() {
      session.close();
    };
  }, [session]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export default SessionProvider;
