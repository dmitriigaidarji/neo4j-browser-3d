import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FrameContainer from "./FrameContainer";
import { SessionContext } from "../../providers/SessionProvider";
import type { Session } from "neo4j-driver";

// The Cypher editor pulls in CodeMirror, which needs a real layout engine.
// The frame's result rendering is what these tests are about.
vi.mock("./FrameCypherEditor", () => ({
  default: ({ value }: { value: string }) => <div>{value}</div>,
}));
vi.mock("./FrameQueryContainer", () => ({
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="results">{data.length} rows rendered</div>
  ),
}));

function sessionStub(run: () => Promise<unknown>) {
  return {
    run,
    close: () => Promise.resolve(),
  } as unknown as Session;
}

function renderFrame(run: () => Promise<unknown>) {
  const contextValue = {
    getSession: () => sessionStub(run),
  } as unknown as React.ContextType<typeof SessionContext>;

  return render(
    // StrictMode reproduces the mount → unmount → remount cycle React runs in
    // development, which is what broke result rendering entirely.
    <StrictMode>
      <SessionContext.Provider value={contextValue}>
        <FrameContainer
          query={{ id: "1", query: "MATCH (n) RETURN n LIMIT 25" }}
          cacheQuery={() => {}}
          onClose={() => {}}
        />
      </SessionContext.Provider>
    </StrictMode>,
  );
}

describe("FrameContainer", () => {
  it("renders the records of a successful query", async () => {
    const record = { toObject: () => ({ n: 1 }), keys: ["n"] };
    renderFrame(() =>
      Promise.resolve({ records: [record], summary: { counters: null } }),
    );

    expect(await screen.findByTestId("results")).toHaveTextContent(
      "1 rows rendered",
    );
  });

  it("renders the message of a failing query", async () => {
    renderFrame(() => Promise.reject(new Error("Invalid input 'X'")));

    expect(await screen.findByText("Invalid input 'X'")).toBeInTheDocument();
  });
});
