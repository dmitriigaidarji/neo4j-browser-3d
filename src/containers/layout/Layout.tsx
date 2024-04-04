import * as React from "react";
import "./layout.scss";
import LeftPanel from "../sidepanel/LeftPanel";
import QueryTabsContainer from "../query-tabs/QueryTabsContainer";
const Layout: React.FC = () => {
  return (
    <div className={"AppLayoutContainer"}>
      <LeftPanel />
      <QueryTabsContainer />
    </div>
  );
};

export default Layout;
