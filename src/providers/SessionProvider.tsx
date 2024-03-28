import React, { createContext, PropsWithChildren, useMemo } from "react";
import { Driver, Session } from "neo4j-driver";

interface ISessionActions {}
interface ISessionContext {
  driver: Driver;
  session: Session;
  actions: ISessionActions;
}

// @ts-ignore
export const SessionContext = createContext<ISessionContext>(null);
function SessionProvider({
  children,
  driver,
}: PropsWithChildren & { driver: Driver }) {
  const session = useMemo(() => {
    return driver.session();
  }, [driver]);

  const value: ISessionContext = React.useMemo(
    () => ({
      driver,
      session,
      actions: {},
    }),
    [session, driver],
  );

  React.useEffect(() => {
    return function cleanup() {
      session.close();
    };
  }, [session]);
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export default SessionProvider;
