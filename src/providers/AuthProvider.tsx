import React, { createContext, PropsWithChildren, useCallback } from "react";
import LoginContainer from "../containers/login/LoginContainer";
import neo4j, { Driver, ServerInfo } from "neo4j-driver";
import SessionProvider from "./SessionProvider";

interface IAuthContext {
  connect: (props: {
    url: string;
    username: string;
    password: string;
    protocol: string;
    database?: string;
  }) => Promise<ServerInfo>;
  disconnect: () => void;
  serverInfo: IConnectionInfo | null;
}

export interface IConnectionInfo extends ServerInfo {
  username: string;
  database: string;
}

export const AuthContext = createContext<IAuthContext>({
  connect: () => Promise.resolve({}),
  disconnect: () => {},
  serverInfo: null,
});

function AuthProvider({ children }: PropsWithChildren) {
  const [driver, setDriver] = React.useState<Driver | null>(null);
  const [serverInfo, setServerInfo] = React.useState<IConnectionInfo | null>(
    null,
  );

  const connect: IAuthContext["connect"] = useCallback(
    ({ url, username, password, database, protocol }) => {
      const driver = neo4j.driver(
        protocol + url,
        neo4j.auth.basic(username, password),
        {
          disableLosslessIntegers: true,
        },
      );
      return driver.verifyConnectivity({ database }).then((s) => {
        setServerInfo({
          ...s,
          username,
          database: database ?? "neo4j",
        });
        setDriver(driver);
        return s;
      });
    },
    [],
  );

  const disconnect = useCallback(() => {
    if (driver) {
      driver.close();
    }
    setDriver(null);
  }, [driver]);

  const value: IAuthContext = React.useMemo(
    () => ({
      connect,
      disconnect,
      serverInfo,
    }),
    [connect, disconnect, serverInfo],
  );

  React.useEffect(() => {
    if (!driver) {
      setServerInfo(null);
    }
    // return function cleanup() {
    //   if (driver) {
    //     driver.close();
    //   }
    // };
  }, [driver]);
  return (
    <AuthContext.Provider value={value}>
      {driver && serverInfo ? (
        <SessionProvider driver={driver} database={serverInfo.database}>
          {children}
        </SessionProvider>
      ) : (
        <LoginContainer />
      )}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
