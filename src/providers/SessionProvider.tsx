import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Driver, Session } from "neo4j-driver";
import { EditorSupportSchema } from "@neo4j-cypher/editor-support";
import { neo4jSchema } from "./hepers/schema";

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
      ]).then((response) => {
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
