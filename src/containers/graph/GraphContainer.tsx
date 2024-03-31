import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IGraph, ILink, INode } from "./helpers";
import { cloneDeep } from "lodash-es";
// @ts-ignore
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import "./graph.scss";
import { createGraph } from "./graph";
import GraphSidePanel from "./GraphSidePanel";

function GraphContainer({ graph }: { graph: IGraph }) {
  const graphDomRef = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<INode | ILink | null>(null);

  const graphInstance = useMemo(
    () =>
      createGraph({
        onSelect: setSelectedItem,
      }),
    [setSelectedItem],
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (graphDomRef.current) {
      graphInstance(graphDomRef.current);
      const bloomPass = new UnrealBloomPass();
      bloomPass.strength = 1.5;
      bloomPass.radius = 1;
      bloomPass.threshold = 0;
      graphInstance.postProcessingComposer().addPass(bloomPass);
    }
    return function cleanup() {
      graphInstance.renderer()?.dispose();
      graphInstance._destructor();
    };
  }, [graphDomRef, graphInstance]);

  useEffect(() => {
    function updateSize() {
      if (graphDomRef.current) {
        graphInstance
          .width(graphDomRef.current.getBoundingClientRect().width)
          .height(
            Math.max(600, graphDomRef.current.getBoundingClientRect().height),
          );
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return function cleanup() {
      window.removeEventListener("resize", updateSize);
    };
  }, [graphDomRef, graphInstance, expanded]);

  useEffect(() => {
    const cloned = cloneDeep(graph);
    graphInstance.graphData(cloned);
  }, [graph, graphInstance]);

  return (
    <div
      className={`graph-container ${!expanded ? "" : "is-position-absolute"}`}
    >
      <div
        className="expand-button"
        onClick={useCallback(() => {
          setExpanded((t) => !t);
        }, [])}
      >
        <div className="control">
          <i className={`fa-solid fa-${expanded ? "compress" : "expand"}`}></i>
        </div>
      </div>
      <GraphSidePanel item={selectedItem} />

      <div ref={graphDomRef} />
    </div>
  );
}

export default GraphContainer;
