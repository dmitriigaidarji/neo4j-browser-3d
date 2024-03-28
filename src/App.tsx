import React from "react";
import "./App.css";
import AuthProvider from "./providers/AuthProvider";
import "bulma/bulma.scss";
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <AuthProvider>SA</AuthProvider>
      </AuthProvider>
    </div>
  );
}

export default App;