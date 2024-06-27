import * as React from "react";
import "./layout.scss";
import LeftPanel from "../sidepanel/LeftPanel";
import QueryTabsContainer from "../query-tabs/QueryTabsContainer";
import QueryProvider from "../../providers/QueryProvider";
import { useEffect, useState } from "react";
const Layout: React.FC = () => {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 600);
  }, [leftPanelOpen]);
  return (
    <QueryProvider>
      <div className={"AppLayoutContainer"}>
        <LeftPanel open={leftPanelOpen} setOpen={setLeftPanelOpen} />
        <QueryTabsContainer leftPanelOpen={leftPanelOpen} />
      </div>
    </QueryProvider>
  );
};

export default Layout;
