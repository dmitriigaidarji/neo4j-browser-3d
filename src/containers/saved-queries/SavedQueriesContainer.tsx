import { FC, useCallback, useContext } from "react";
import "./queries.scss";
import { IQueryContext, QueryContext } from "../../providers/QueryProvider";

function SavedQueriesContainer() {
  const {
    history: { queries, onQueryPlay, onQueryDelete },
  } = useContext(QueryContext);
  if (queries.length === 0) {
    return null;
  }
  return (
    <div className={"SavedQueriesContainer block"}>
      <div className={"title has-text-primary-10-invert"}>History</div>
      <div className={"is-overflow-y-scroll scroll"}>
        {queries.map((t) => (
          <SavedQueryItem
            key={t.id}
            item={t}
            onDelete={onQueryDelete}
            onClick={onQueryPlay}
          />
        ))}
      </div>
    </div>
  );
}

const SavedQueryItem: FC<{
  item: IQueryContext["history"]["queries"][0];
  onDelete: IQueryContext["history"]["onQueryDelete"];
  onClick: IQueryContext["history"]["onQueryPlay"];
}> = ({ item, onDelete, onClick }) => {
  return (
    <div className={"block has-text-primary-20-invert"}>
      {item.query}{" "}
      <span
        className="icon is-medium is-right"
        onClick={useCallback(() => {
          onClick(item);
        }, [onClick, item])}
      >
        <i className="fas fa-play"></i>
      </span>
      <span
        className="icon is-medium is-right"
        onClick={useCallback(() => {
          onDelete(item);
        }, [onDelete, item])}
      >
        <i className="fas fa-close"></i>
      </span>
    </div>
  );
};

export default SavedQueriesContainer;
