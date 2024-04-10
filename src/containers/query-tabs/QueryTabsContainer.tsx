import FrameContainer from "../frame/FrameContainer";
import "./tabs.scss";
import { useContext } from "react";
import { QueryContext } from "../../providers/QueryProvider";

function QueryTabsContainer() {
  const { currentQuery, addQuery } = useContext(QueryContext);

  return (
    <div className={"MainView"}>
      <div className={"box block"}>
        <FrameContainer
          defaultQuery={currentQuery?.query}
          cacheQuery={addQuery}
        />
      </div>
    </div>
  );
}

export default QueryTabsContainer;
