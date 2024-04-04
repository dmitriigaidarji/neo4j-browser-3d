import FrameContainer from "../frame/FrameContainer";
import { FC, useCallback, useState, MouseEvent, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import "./tabs.scss";
function createSavedQuery(): ISavedQuery {
  return {
    id: uuidv4(),
    query: "",
  };
}
interface ISavedQuery {
  id: string;
  query: string;
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
function QueryTabsContainer() {
  const [queries, setQueries] = useState<ISavedQuery[]>(getDataFromCache());
  const [selected, setSelected] = useState(queries[0]);

  const handleUpdate = useCallback(
    (query: string) => {
      selected.query = query;
      localStorage.setItem(key, JSON.stringify(queries));
    },
    [queries, selected],
  );
  const handleDelete = useCallback((item: ISavedQuery) => {
    setQueries((old) => {
      if (old.length <= 1) {
        return old;
      }
      const copied = old.slice();
      const i = copied.findIndex((t) => t === item);
      copied.splice(i, 1);
      return copied;
    });
  }, []);
  useEffect(() => {
    if (queries.find((t) => t === selected) === undefined) {
      setSelected(queries[0]);
    }
  }, [selected, queries]);

  return (
    <div className={"MainView"}>
      <div className={"box block"}>
        <div className="tabs is-boxed">
          <ul>
            {queries.map((item) => (
              <Tab
                item={item}
                selected={selected.id}
                onClick={setSelected}
                key={item.id}
                onDelete={handleDelete}
              />
            ))}
            <li
              onClick={useCallback(() => {
                const q = createSavedQuery();
                setQueries((t) => {
                  const n = t.slice();
                  n.push(q);
                  return n;
                });
                setSelected(q);
              }, [])}
            >
              <a href={"#!"}>
                <span>+</span>
              </a>
            </li>
          </ul>
        </div>
        <FrameContainer
          defaultQuery={selected.query}
          cacheQuery={handleUpdate}
        />
      </div>
    </div>
  );
}

const Tab: FC<{
  item: ISavedQuery;
  selected: string;
  onClick: (value: ISavedQuery) => any;
  onDelete: (value: ISavedQuery) => any;
}> = ({ item, selected, onClick, onDelete }) => {
  const { id } = item;
  return (
    <li
      className={id === selected ? "is-active" : ""}
      onClick={useCallback(() => {
        onClick(item);
      }, [item, onClick])}
    >
      <a href={"#!"}>
        <span>{id.substring(0, 5)}..</span>
        <button
          className="delete is-small margin-left"
          onClick={useCallback(
            (event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(item);
            },
            [onDelete, item],
          )}
        ></button>
      </a>
    </li>
  );
};
export default QueryTabsContainer;
