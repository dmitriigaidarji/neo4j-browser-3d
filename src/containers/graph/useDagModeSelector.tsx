import * as React from "react";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";
import { useCallback } from "react";

const modes: IDagMode[] = [
  "default",
  "td",
  "bu",
  "lr",
  "rl",
  "zout",
  "zin",
  "radialout",
  "radialin",
];
export type IDagMode =
  | "td"
  | "bu"
  | "lr"
  | "rl"
  | "zout"
  | "zin"
  | "radialout"
  | "radialin"
  | "default";

function getTitleForMode(mode: IDagMode) {
  switch (mode) {
    case "td":
      return "Top - Down";
    case "bu":
      return "Bottom - Up";
    case "lr":
      return "Left - Right";
    case "rl":
      return "Right - Left";
    case "zout":
      return "Near to Far";
    case "zin":
      return "Far to Near";
    case "radialout":
      return "Outwards - Radially";
    case "radialin":
      return "Inwards - Radially";
    default:
      return "Default";
  }
}
function useDagModeSelector() {
  const [mode, setMode] = useCachedValue(
    CachedKey.dagMode,
    "default" as IDagMode,
  );

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      setMode(event.target.value as IDagMode);
    },
    [setMode],
  );

  return {
    mode,
    setMode,
    node: (
      <select onChange={handleChange} value={mode}>
        {modes.map((t) => (
          <option value={t} key={t}>
            {getTitleForMode(t)}
          </option>
        ))}
      </select>
    ),
  };
}

export default useDagModeSelector;
