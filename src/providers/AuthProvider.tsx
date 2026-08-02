import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import neo4j, { type Driver, type ServerInfo } from "neo4j-driver";
import LoginContainer from "../containers/login/LoginContainer";
import SessionProvider from "./SessionProvider";

export interface ConnectionParams {
  protocol: string;
  url: string;
  username: string;
  password: string;
  database?: string;
}

export interface IConnectionInfo extends ServerInfo {
  username: string;
  database: string;
  protocol: string;
  url: string;
}

interface IAuthContext {
  connect: (params: ConnectionParams) => Promise<void>;
  disconnect: () => void;
  serverInfo: IConnectionInfo | null;
}

export const AuthContext = createContext<IAuthContext>({
  connect: async () => {},
  disconnect: () => {},
  serverInfo: null,
});

function AuthProvider({ children }: PropsWithChildren) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [serverInfo, setServerInfo] = useState<IConnectionInfo | null>(null);
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  const connect: IAuthContext["connect"] = useCallback(
    async ({ protocol, url, username, password, database }) => {
      const candidate = neo4j.driver(
        protocol + url,
        neo4j.auth.basic(username, password),
        { disableLosslessIntegers: true },
      );

      try {
        // driver v6 changed `verifyConnectivity` to resolve with void, so the
        // server details come from `getServerInfo`, which also proves the
        // connection works.
        const info = await candidate.getServerInfo({ database });
        setServerInfo({
          ...info,
          username,
          protocol,
          url,
          database: database || "neo4j",
        });
        setDriver(candidate);
      } catch (error) {
        // A driver that never connected still holds a connection pool and a
        // keep-alive timer; the previous version leaked one per failed attempt.
        await candidate.close().catch(() => {});
        throw error;
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    driverRef.current?.close().catch(() => {});
    driverRef.current = null;
    setDriver(null);
    setServerInfo(null);
  }, []);

  // Close the driver when the app unmounts so sockets are not left open.
  useEffect(
    () => () => {
      driverRef.current?.close().catch(() => {});
    },
    [],
  );

  const value = useMemo<IAuthContext>(
    () => ({ connect, disconnect, serverInfo }),
    [connect, disconnect, serverInfo],
  );

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
