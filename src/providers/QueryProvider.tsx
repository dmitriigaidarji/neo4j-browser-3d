import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
export interface ISavedQuery {
  id: string;
  query: string;
}
function createSavedQuery(query: string): ISavedQuery {
  return {
    id: uuidv4(),
    query,
  };
}
const key = "SAVED_QUERIES";
function getDataFromCache(): ISavedQuery[] {
  const saved = localStorage.getItem(key);
  if (saved) {
    const parsed: ISavedQuery[] = (JSON.parse(saved) as ISavedQuery[]).filter(
      (t) => t.query.length > 0,
    );
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [];
}
export interface IQueryContextInfo {
  queries: ISavedQuery[];
  onQueryDelete: (query: ISavedQuery) => void;
  addQuery: (query: string) => void;
}
export interface IQueryContext {
  history: IQueryContextInfo & {
    onQueryPlay: (query: ISavedQuery) => void;
  };
  current: IQueryContextInfo;
}
export const QueryContext = createContext<IQueryContext>({
  history: {
    queries: getDataFromCache(),
    onQueryDelete: () => {},
    onQueryPlay: () => {},
    addQuery: () => {},
  },
  current: {
    queries: [],
    onQueryDelete: () => {},
    addQuery: () => {},
  },
});

function useQueries(defaultValues: ISavedQuery[]) {
  const [queries, setQueries] = useState<ISavedQuery[]>(defaultValues);
  const addQuery = useCallback((query: string) => {
    setQueries((old) => {
      const i = old.findIndex((t) => t.query === query);
      if (i !== -1) {
        return old;
      } else {
        const copied = old.slice();
        copied.unshift(createSavedQuery(query));
        return copied;
      }
    });
  }, []);
  const onQueryDelete = useCallback((q: ISavedQuery) => {
    setQueries((old) => {
      const i = old.findIndex((t) => t === q);
      if (i === -1) {
        return old;
      } else {
        const copied = old.slice();
        copied.splice(i, 1);
        return copied;
      }
    });
  }, []);
  return {
    queries,
    onQueryDelete,
    addQuery,
  };
}

const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  const history = useQueries(getDataFromCache());
  const current = useQueries([]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(history.queries.slice(0, 20)));
  }, [history.queries]);

  const onHistoryQueryPlay = useCallback(
    (q: ISavedQuery) => {
      current.addQuery(q.query);
    },
    [current],
  );

  const value: IQueryContext = useMemo(
    () => ({
      history: {
        ...history,
        onQueryPlay: onHistoryQueryPlay,
      },
      current,
    }),
    [history, current, onHistoryQueryPlay],
  );
  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
};

export default QueryProvider;
