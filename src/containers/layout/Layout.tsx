import * as React from "react";
import "./layout.scss";
import LeftPanel from "../sidepanel/LeftPanel";
import QueryTabsContainer from "../query-tabs/QueryTabsContainer";
import QueryProvider from "../../providers/QueryProvider";
const Layout: React.FC = () => {
  return (
    <QueryProvider>
      <div className={"AppLayoutContainer"}>
        <LeftPanel />
        <QueryTabsContainer />
      </div>
    </QueryProvider>
  );
};

export default Layout;
