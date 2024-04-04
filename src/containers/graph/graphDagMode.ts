import { ForceGraph3DInstance } from "3d-force-graph";
import { IDagMode } from "./useDagModeSelector";
function setGraphLinkTexts({
  graph,
  mode,
}: {
  graph: ForceGraph3DInstance;
  mode: IDagMode;
}) {
  const parsedMode = mode === "default" ? null : mode;
  graph.dagMode(parsedMode as Exclude<IDagMode, "default">);
}

export default setGraphLinkTexts;
