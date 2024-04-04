import React from "react";
import "./App.css";
import AuthProvider from "./providers/AuthProvider";
import "bulma/bulma.scss";
import Layout from "./containers/layout/Layout";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </div>
  );
}

export default App;
