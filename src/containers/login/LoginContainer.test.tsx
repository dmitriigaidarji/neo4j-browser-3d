import { StrictMode, useCallback, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import LoginContainer from "./LoginContainer";
import { AuthContext } from "../../providers/AuthProvider";

function renderLogin(connect: () => Promise<void>) {
  return render(
    <StrictMode>
      <AuthContext.Provider
        value={{ connect, disconnect: () => {}, serverInfo: null }}
      >
        <LoginContainer />
      </AuthContext.Provider>
    </StrictMode>,
  );
}

/**
 * Mirrors AuthProvider: the moment a connection succeeds the login form is
 * swapped out for the session UI, so LoginContainer unmounts.
 */
function SwappingHarness() {
  const [connected, setConnected] = useState(false);
  const connect = useCallback(async () => {
    setConnected(true);
  }, []);

  return (
    <StrictMode>
      <AuthContext.Provider
        value={{ connect, disconnect: () => {}, serverInfo: null }}
      >
        {connected ? <div>connected</div> : <LoginContainer />}
      </AuthContext.Provider>
    </StrictMode>
  );
}

describe("LoginContainer", () => {
  beforeEach(() => localStorage.clear());

  it("remembers the host of a successful connection", async () => {
    const user = userEvent.setup();
    renderLogin(() => Promise.resolve());

    const url = screen.getByLabelText("Connect URL");
    await user.clear(url);
    await user.type(url, "100.104.107.118:7687");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() => {
      const stored = localStorage.getItem("n4j3d:connection");
      expect(JSON.parse(stored ?? "{}").url).toBe("100.104.107.118:7687");
    });
  });

  it("does not remember a host that failed to connect", async () => {
    const user = userEvent.setup();
    renderLogin(() => Promise.reject(new Error("nope")));

    const url = screen.getByLabelText("Connect URL");
    await user.clear(url);
    await user.type(url, "bad-host:7687");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await screen.findByText("nope");
    const stored = localStorage.getItem("n4j3d:connection");
    expect(JSON.parse(stored ?? "{}").url ?? "").not.toBe("bad-host:7687");
  });

  it("remembers the host even though connecting unmounts the form", async () => {
    const user = userEvent.setup();
    render(<SwappingHarness />);

    const url = screen.getByLabelText("Connect URL");
    await user.clear(url);
    await user.type(url, "100.104.107.118:7687");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await screen.findByText("connected");
    const stored = localStorage.getItem("n4j3d:connection");
    expect(JSON.parse(stored ?? "{}").url).toBe("100.104.107.118:7687");
  });
});
