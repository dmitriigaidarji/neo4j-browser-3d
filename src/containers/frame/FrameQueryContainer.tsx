import { IFrameQueryResult } from "./FrameContainer";
import { memo, useCallback, useMemo, useState, FC } from "react";
import JSONDisplay from "./JSONDisplay";
import GraphContainer from "../graph/GraphContainer";
import { processQueryResultsForGraph } from "../graph/helpers";

interface IProps {
  data: IFrameQueryResult[];
}

enum TabMode {
  json,
  graph,
}
interface IMode {
  value: TabMode;
  text: string;
  icon: string;
}
const graphMode: IMode = {
  value: TabMode.graph,
  text: "Graph",
  icon: "diagram-project",
};
const modes: IMode[] = [
  {
    value: TabMode.json,
    text: "JSON",
    icon: "code",
  },
];

//match (n) return n limit 2
function FrameQueryContainer({ data }: IProps) {
  const graph = useMemo(() => {
    return processQueryResultsForGraph(data);
  }, [data]);

  const showGraphTab = graph.nodes.length > 0;

  const [mode, setMode] = useState(showGraphTab ? TabMode.graph : TabMode.json);

  const node = useMemo(() => {
    switch (mode) {
      case TabMode.json:
        return <JSONDisplay data={data} />;
      case TabMode.graph:
        return <GraphContainer graph={graph} />;
    }
  }, [data, mode, graph]);
  const handleTabClick = useCallback((newMode: TabMode) => {
    setMode(newMode);
  }, []);
  return (
    <div className={"box block"}>
      <div className="tabs is-boxed">
        <ul>
          {showGraphTab && (
            <Tab
              item={graphMode}
              selected={mode}
              onClick={handleTabClick}
              key={graphMode.value}
            />
          )}
          {modes.map((item) => (
            <Tab
              item={item}
              selected={mode}
              onClick={handleTabClick}
              key={item.value}
            />
          ))}
        </ul>
      </div>
      {node}
    </div>
  );
}

const Tab: FC<{
  item: IMode;
  selected: TabMode;
  onClick: (value: TabMode) => any;
}> = ({ item, selected, onClick }) => {
  const { value, icon, text } = item;
  return (
    <li
      className={value === selected ? "is-active" : ""}
      onClick={useCallback(() => {
        onClick(value);
      }, [value])}
    >
      <a>
        <span className="icon is-small">
          <i className={`fas fa-${icon}`} aria-hidden="true"></i>
        </span>
        <span>{text}</span>
      </a>
    </li>
  );
};

export default memo(FrameQueryContainer);