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
// @ts-ignore
import { Vector3 } from "three";
import "./graph.scss";
import { createGraph } from "./graph";
import GraphSidePanel from "./GraphSidePanel";
import setGraphIcons from "./graphIcons";
import setGraphLinkTexts from "./graphLinkTexts";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";
import useDagModeSelector from "./useDagModeSelector";
import graphDagMode from "./graphDagMode";
import { isNode } from "neo4j-driver";

function GraphContainer({
  graph,
  rerenderGraph,
  buttonsNode,
}: {
  graph: IGraph;
  rerenderGraph: (props?: { [CachedKey.showLinkValues]?: boolean }) => void;
  buttonsNode: React.ReactNode;
}) {
  const graphDomRef = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<INode | ILink | null>(null);

  const [highlight] = useState<{
    nodes: Set<any>;
    links: Set<any>;
    node: object | null;
  }>({
    nodes: new Set(),
    links: new Set(),
    node: null,
  });
  const [showIcons, setShowIcons] = useCachedValue(
    CachedKey.showIcons,
    true as boolean,
  );
  const [showNodeTexts, setShowNodeTexts] = useCachedValue(
    CachedKey.showNodeTexts,
    true as boolean,
  );
  const [showLinkTexts, setShowLinkTexts] = useCachedValue(
    CachedKey.showLinkTexts,
    true as boolean,
  );
  const [showLinkValues, setShowLinkValues] = useCachedValue(
    CachedKey.showLinkValues,
    true as boolean,
  );

  const [doAnimation, setDoAnimation] = useCachedValue(
    CachedKey.doAnimation,
    true as boolean,
  );
  const [visibleTextDistance, setVisibleTextDistance] = useCachedValue(
    CachedKey.visibleTextDistance,
    500 as number,
  );

  const { mode, setMode, node: layoutNode } = useDagModeSelector();

  useEffect(() => {
    rerenderGraph({ showLinkValues });
  }, [showLinkValues, rerenderGraph]);

  const graphInstance = useMemo(
    () =>
      createGraph({
        onSelect: setSelectedItem,
        highlight,
      }),
    [highlight, setSelectedItem],
  );

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
      bloomPass.strength = 0.5;
      bloomPass.radius = 0.5;
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
          .width(
            expanded
              ? window.innerWidth
              : graphDomRef.current.getBoundingClientRect().width,
          )
          .height(
            expanded
              ? window.innerHeight - 54
              : Math.max(
                  600,
                  graphDomRef.current.getBoundingClientRect().height,
                ),
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
    if (doAnimation) {
      graphInstance.resumeAnimation();
    } else {
      graphInstance.pauseAnimation();
    }
  }, [graphInstance, doAnimation]);

  useEffect(() => {
    const d = cloneDeep(graph);
    graphInstance.graphData(d);
  }, [graph, graphInstance]);

  useEffect(() => {
    if (selectedItem && isNode(selectedItem)) {
      const node = selectedItem as any;
      const distance = 60 + (node.val ?? 0);
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      const newPos =
        node.x || node.y || node.z
          ? {
              x: node.x * distRatio,
              y: node.y * distRatio,
              z: node.z * distRatio,
            }
          : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

      graphInstance.cameraPosition(
        newPos, // new position
        node, // lookAt ({ x, y, z })
        2000, // ms transition duration
      );
    }
  }, [graphInstance, selectedItem, graph]);

  useEffect(() => {
    graphDagMode({
      graph: graphInstance,
      mode,
      onError: () => {
        setMode("default");
      },
    });
  }, [graphInstance, mode, setMode]);

  useEffect(() => {
    let camera = graphInstance.cameraPosition();

    function setIcons() {
      setGraphIcons({
        graph: graphInstance,
        showNodeIcons: showIcons,
        showNodeTexts,
        highlight,
        visibleTextDistance,
      });
    }
    const interval = setInterval(() => {
      const new_camera = graphInstance.cameraPosition();
      const distance = new Vector3(camera.x, camera.y, camera.z).distanceTo(
        new Vector3(new_camera.x, new_camera.y, new_camera.z),
      );
      if (distance > 100) {
        camera = new_camera;
        setIcons();
      }
    }, 1000);

    setIcons();
    return function () {
      clearInterval(interval);
    };
  }, [highlight, graphInstance, showIcons, showNodeTexts, visibleTextDistance]);

  // clear selected item if its no longer available
  useEffect(() => {
    if (
      graph.nodes.find((t) => t.elementId === selectedItem?.elementId) ===
        undefined &&
      graph.links.find((t) => t.elementId === selectedItem?.elementId) ===
        undefined
    ) {
      setSelectedItem(null);
    }
  }, [graph, selectedItem]);
  return (
    <div
      className={`graph-container ${!expanded ? "" : "is-position-absolute"}`}
    >
      <div>
        <div className={"controls"}>
          <label>
            {layoutNode}
            Layout
          </label>
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
              type="number"
              value={visibleTextDistance}
              onChange={useCallback(
                (event: React.ChangeEvent<HTMLInputElement>) => {
                  setVisibleTextDistance(parseInt(event.currentTarget.value));
                },
                [setVisibleTextDistance],
              )}
            />
            Distance to node to show titles
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

          <label className="checkbox">
            <input
              type="checkbox"
              checked={doAnimation}
              onChange={useCallback(() => {
                setDoAnimation((t) => !t);
              }, [setDoAnimation])}
            />
            Animate
          </label>
          {buttonsNode}
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
//
// match path1=(mb_start:MaterialBatch)-[:FEEDS*0..5]->(mb:MaterialBatch {batch_id: "R66011", first_receipt_site_id: "GU09", material_id: "F00573015020P" })-[:FEEDS*0..5]->(mb_end:MaterialBatch)
// where length(path1) >= 1
//  optional match path2=(start:Vendor)-->(mb_start)
//     optional match path3=(mb_end)-->(end:Customer)
//     with apoc.path.combine(apoc.path.combine(path2 , path1) , path3) as path
//     unwind nodes(path) as n
//     unwind relationships(path) as r
//     WITH collect(DISTINCT n) as nodes, collect(DISTINCT r) as rels
//     return {nodes: nodes, rels:rels} as r

// match path1=(mb_start:MaterialBatch)-[:FEEDS*0..5]->(mb:MaterialBatch {batch_id: "323100", first_receipt_site_id: "IT03", material_id: "F000129372" })-[:FEEDS*0..5]->(mb_end:MaterialBatch)
