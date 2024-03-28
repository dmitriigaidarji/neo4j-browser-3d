import React, { createContext, PropsWithChildren, useCallback } from "react";
import LoginContainer from "../containers/login/LoginContainer";
import neo4j, { Driver, ServerInfo } from "neo4j-driver";

interface IAuthContextActions {
  connect: (props: {
    url: string;
    username: string;
    password: string;
    protocol: string;
    database?: string;
  }) => Promise<ServerInfo>;
}
interface IAuthContext {
  driver: Driver | null;
  actions: IAuthContextActions;
}

// @ts-ignore
export const AuthContext = createContext<IAuthContext>(null);
function AuthProvider({ children }: PropsWithChildren) {
  const [driver, setDriver] = React.useState<Driver | null>(null);
  const connect: IAuthContextActions["connect"] = useCallback(
    ({ url, username, password, database, protocol }) => {
      const driver = neo4j.driver(
        protocol + url,
        neo4j.auth.basic(username, password),
      );
      return driver.verifyConnectivity({ database }).then((s) => {
        console.log(s);
        setDriver(driver);
        return s;
      });
    },
    [],
  );
  const value: IAuthContext = React.useMemo(
    () => ({
      driver,
      actions: {
        connect,
      },
    }),
    [driver, connect],
  );
  return (
    <AuthContext.Provider value={value}>
      {!value.driver && <LoginContainer />}
      {children}
    </AuthContext.Provider>
  );
}
export default AuthProvider;
