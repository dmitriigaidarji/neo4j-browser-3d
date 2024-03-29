import React from "react";
import "./App.css";
import AuthProvider from "./providers/AuthProvider";
import "bulma/bulma.scss";
import QueryTabsContainer from "./containers/query-tabs/QueryTabsContainer";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <QueryTabsContainer />
      </AuthProvider>
    </div>
  );
}

export default App;
