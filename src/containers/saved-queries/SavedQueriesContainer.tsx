import { useContext, type FC } from "react";
import {
  QueryContext,
  type IQueryContext,
  type ISavedQuery,
} from "../../providers/QueryProvider";
import PanelSection from "../../components/PanelSection";

const HistoryItem: FC<{
  item: ISavedQuery;
  onPlay: (item: ISavedQuery) => void;
  onDelete: (item: ISavedQuery) => void;
}> = ({ item, onPlay, onDelete }) => (
  <li className="history__item">
    <button
      type="button"
      className="history__query"
      onClick={() => onPlay(item)}
      title={item.query}
    >
      <i className="fas fa-play history__play" aria-hidden="true" />
      <code>{item.query}</code>
    </button>
    <button
      type="button"
      className="history__delete"
      onClick={() => onDelete(item)}
      aria-label="Remove from history"
    >
      <i className="fas fa-xmark" aria-hidden="true" />
    </button>
  </li>
);

export default function SavedQueriesContainer() {
  const {
    history: { queries, onQueryPlay, onQueryDelete, clear },
  }: IQueryContext = useContext(QueryContext);

  return (
    <PanelSection
      title="History"
      icon="clock-rotate-left"
      actions={
        queries.length > 0 && (
          <button
            type="button"
            className="panel-section__action"
            onClick={clear}
            title="Clear history"
            aria-label="Clear history"
          >
            <i className="fas fa-trash-can" aria-hidden="true" />
          </button>
        )
      }
    >
      {queries.length === 0 ? (
        <p className="u-muted is-size-7">
          Queries you run will be listed here.
        </p>
      ) : (
        <ul className="history u-scroll-y">
          {queries.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              onPlay={onQueryPlay}
              onDelete={onQueryDelete}
            />
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
