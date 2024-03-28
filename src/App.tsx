import React from "react";
import "./App.css";
import AuthProvider from "./providers/AuthProvider";
import "bulma/bulma.scss";
import FrameContainer from "./containers/frame/FrameContainer";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <FrameContainer />
      </AuthProvider>
    </div>
  );
}

export default App;
