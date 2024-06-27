import FrameContainer from "../frame/FrameContainer";
import "./tabs.scss";
import { useContext } from "react";
import { QueryContext } from "../../providers/QueryProvider";
import FrameCypherEditor from "../frame/FrameCypherEditor";

function QueryTabsContainer({ leftPanelOpen }: { leftPanelOpen: boolean }) {
  const {
    current: { queries, addQuery: addQueryFrame, onQueryDelete },
    history: { addQuery },
  } = useContext(QueryContext);

  return (
    <div className={`resultContainer${leftPanelOpen ? "" : " large"}`}>
      <div className={"box block"}>
        <FrameCypherEditor onSubmit={addQueryFrame} />
      </div>
      {queries.map((t) => (
        <div key={t.id} className={"box no-shadow"}>
          <FrameContainer
            query={t}
            cacheQuery={addQuery}
            onClose={onQueryDelete}
          />
        </div>
      ))}
    </div>
  );
}

export default QueryTabsContainer;
