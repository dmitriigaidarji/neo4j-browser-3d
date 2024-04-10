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
function createSavedQuery(query = ""): ISavedQuery {
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
  return [createSavedQuery()];
}
export interface IQueryContext {
  queries: ISavedQuery[];
  onQueryDelete: (query: ISavedQuery) => void;
  onQueryPlay: (query: ISavedQuery) => void;
  addQuery: (query: string) => void;
  currentQuery: ISavedQuery | null;
}
export const QueryContext = createContext<IQueryContext>({
  queries: getDataFromCache(),
  onQueryDelete: () => {},
  onQueryPlay: () => {},
  addQuery: () => {},
  currentQuery: null,
});
const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  const [queries, setQueries] = useState<ISavedQuery[]>(getDataFromCache());
  const [currentQuery, setCurrentQuery] = useState<ISavedQuery | null>(null);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(queries));
  }, [queries]);

  const addQuery: IQueryContext["addQuery"] = useCallback((query) => {
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
  const onQueryPlay = useCallback((q: ISavedQuery) => {
    setCurrentQuery(q);
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

  const value: IQueryContext = useMemo(
    () => ({
      queries,
      onQueryDelete,
      onQueryPlay,
      currentQuery,
      addQuery,
    }),
    [queries, onQueryDelete, onQueryPlay, currentQuery, addQuery],
  );
  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
};

export default QueryProvider;
