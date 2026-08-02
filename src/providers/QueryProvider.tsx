import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
  type PropsWithChildren,
} from "react";
import useCachedValue, { CachedKey } from "../hooks/useCachedValue";

export interface ISavedQuery {
  id: string;
  query: string;
}

const HISTORY_LIMIT = 30;

function newId(): string {
  // `crypto.randomUUID` is available in every browser this app targets, so the
  // uuid dependency is no longer needed. The fallback covers insecure origins,
  // where the Web Crypto API is not exposed.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createSavedQuery(query: string): ISavedQuery {
  return { id: newId(), query };
}

export interface IQueryContextInfo {
  queries: ISavedQuery[];
  onQueryDelete: (query: ISavedQuery) => void;
  addQuery: (query: string) => void;
  clear: () => void;
}

export interface IQueryContext {
  history: IQueryContextInfo & { onQueryPlay: (query: ISavedQuery) => void };
  current: IQueryContextInfo;
}

const noop = () => {};

export const QueryContext = createContext<IQueryContext>({
  history: {
    queries: [],
    onQueryDelete: noop,
    onQueryPlay: noop,
    addQuery: noop,
    clear: noop,
  },
  current: { queries: [], onQueryDelete: noop, addQuery: noop, clear: noop },
});

function useQueries(
  initial: ISavedQuery[],
  { dedupe }: { dedupe: boolean },
): IQueryContextInfo & { queries: ISavedQuery[] } {
  const [queries, setQueries] = useState<ISavedQuery[]>(initial);

  const addQuery = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return;
      }
      setQueries((current) => {
        if (dedupe) {
          const existing = current.findIndex(
            (entry) => entry.query === trimmed,
          );
          if (existing !== -1) {
            // Move the repeat to the top instead of silently doing nothing.
            const reordered = current.slice();
            const [entry] = reordered.splice(existing, 1);
            return [entry, ...reordered];
          }
        }
        return [createSavedQuery(trimmed), ...current];
      });
    },
    [dedupe],
  );

  const onQueryDelete = useCallback((query: ISavedQuery) => {
    setQueries((current) => current.filter((entry) => entry.id !== query.id));
  }, []);

  const clear = useCallback(() => setQueries([]), []);

  return { queries, addQuery, onQueryDelete, clear };
}

const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  const [persistedHistory, setPersistedHistory] = useCachedValue<ISavedQuery[]>(
    CachedKey.history,
    [],
  );

  const history = useQueries(
    persistedHistory.filter((entry) => entry?.query?.length > 0),
    { dedupe: true },
  );
  // Result frames may legitimately repeat the same query side by side.
  const current = useQueries([], { dedupe: false });

  useEffect(() => {
    setPersistedHistory(history.queries.slice(0, HISTORY_LIMIT));
  }, [history.queries, setPersistedHistory]);

  const onHistoryQueryPlay = useCallback(
    (query: ISavedQuery) => current.addQuery(query.query),
    [current],
  );

  const value = useMemo<IQueryContext>(
    () => ({
      history: { ...history, onQueryPlay: onHistoryQueryPlay },
      current,
    }),
    [history, current, onHistoryQueryPlay],
  );

  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
};

export default QueryProvider;
