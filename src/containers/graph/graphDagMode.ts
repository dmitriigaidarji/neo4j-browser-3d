import { ForceGraph3DInstance } from "3d-force-graph";
import { IDagMode } from "./useDagModeSelector";
function graphDagMode({
  graph,
  mode,
  onError,
}: {
  graph: ForceGraph3DInstance;
  mode: IDagMode;
  onError: () => void;
}) {
  const parsedMode = mode === "default" ? null : mode;
  graph
    .dagMode(parsedMode as Exclude<IDagMode, "default">)
    .onDagError((links) => {
      onError();
      console.error(
        `Cannot build a layout with recursive links: ${JSON.stringify(links)}. Resetting to default force layout`,
      );
    });
}

export default graphDagMode;
