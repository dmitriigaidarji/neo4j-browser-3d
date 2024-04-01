import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { applyLinkValuesToGraph, IGraph, ILink, INode } from "./helpers";
import { cloneDeep } from "lodash-es";
// @ts-ignore
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import "./graph.scss";
import { createGraph } from "./graph";
import GraphSidePanel from "./GraphSidePanel";
import setGraphIcons from "./graphIcons";
import setGraphLinkTexts from "./graphLinkTexts";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";

function GraphContainer({
  graph,
  rerenderGraph,
}: {
  graph: IGraph;
  rerenderGraph: (props?: { [CachedKey.showLinkValues]?: boolean }) => void;
}) {
  const graphDomRef = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<INode | ILink | null>(null);
  const [showIcons, setShowIcons] = useCachedValue(
    CachedKey.showIcons,
    false as boolean,
  );
  const [showNodeTexts, setShowNodeTexts] = useCachedValue(
    CachedKey.showNodeTexts,
    false as boolean,
  );
  const [showLinkTexts, setShowLinkTexts] = useCachedValue(
    CachedKey.showLinkTexts,
    false as boolean,
  );
  const [showLinkValues, setShowLinkValues] = useCachedValue(
    CachedKey.showLinkValues,
    true as boolean,
  );

  useEffect(() => {
    rerenderGraph({ showLinkValues });
  }, [showLinkValues, rerenderGraph]);

  const graphInstance = useMemo(
    () =>
      createGraph({
        onSelect: setSelectedItem,
      }),
    [setSelectedItem],
  );

  useEffect(() => {
    setGraphIcons({
      graph: graphInstance,
      showNodeIcons: showIcons,
      showNodeTexts,
    });
  }, [graphInstance, showIcons, showNodeTexts]);

  useEffect(() => {
    setGraphLinkTexts({
      graph: graphInstance,
      showLinkTexts,
    });
  }, [graphInstance, showLinkTexts]);

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (graphDomRef.current) {
      graphInstance(graphDomRef.current);
      const bloomPass = new UnrealBloomPass();
      bloomPass.strength = 1.1;
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
    graphInstance.graphData(cloneDeep(graph));
  }, [graph, graphInstance]);

  return (
    <div
      className={`graph-container ${!expanded ? "" : "is-position-absolute"}`}
    >
      <div>
        <div className={"controls"}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showIcons}
              onChange={useCallback(() => {
                setShowIcons((t) => !t);
              }, [setShowIcons])}
            />
            Enable icons
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showNodeTexts}
              onChange={useCallback(() => {
                setShowNodeTexts((t) => !t);
              }, [setShowNodeTexts])}
            />
            Show node title
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={showLinkTexts}
              onChange={useCallback(() => {
                setShowLinkTexts((t) => !t);
              }, [setShowLinkTexts])}
            />
            Show link titles
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showLinkValues}
              onChange={useCallback(() => {
                setShowLinkValues((t) => !t);
              }, [setShowLinkValues])}
            />
            Apply link values
          </label>
        </div>
      </div>
      <div
        className="expand-button"
        onClick={useCallback(() => {
          setExpanded((t) => !t);
        }, [setExpanded])}
      >
        <div className="control">
          <i className={`fa-solid fa-${expanded ? "compress" : "expand"}`}></i>
        </div>
      </div>
      {selectedItem && <GraphSidePanel item={selectedItem} />}
      <div ref={graphDomRef} />
    </div>
  );
}

export default GraphContainer;
