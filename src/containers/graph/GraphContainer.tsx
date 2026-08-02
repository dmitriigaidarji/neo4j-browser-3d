import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GraphRenderer,
  type DagMode,
  type GraphSettings,
} from "../../graph/renderer";
import type { CaptionOverrides } from "../../graph/captions";
import {
  isGraphNode,
  type IGraph,
  type ILink,
  type INode,
  type NodeSizeMode,
} from "../../graph/types";
import {
  exportCanvasAsPng,
  exportGraphAsCsv,
  exportGraphAsJson,
} from "../../graph/exporters";
import useCachedValue, { CachedKey } from "../../hooks/useCachedValue";
import GraphToolbar from "./GraphToolbar";
import GraphLegend from "./GraphLegend";
import GraphSearch from "./GraphSearch";
import GraphSidePanel from "./GraphSidePanel";

const HEADER_ALLOWANCE = 56;
const MIN_HEIGHT = 560;

export default function GraphContainer({
  graph,
  sizeMode,
  onSizeModeChange,
  fetchLinksInBetween,
  onFetchLinksInBetweenChange,
  error,
  onDismissError,
}: {
  graph: IGraph;
  sizeMode: NodeSizeMode;
  onSizeModeChange: (mode: NodeSizeMode) => void;
  fetchLinksInBetween: boolean;
  onFetchLinksInBetweenChange: (value: boolean) => void;
  error: string | null;
  onDismissError: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Only the id is held in state; the entity itself is looked up from the
  // current graph. That keeps the inspector showing live data and removes the
  // effect that used to clear a selection after the node disappeared.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ------------------------------------------------------------- persisted UI
  const [showIcons, setShowIcons] = useCachedValue(CachedKey.showIcons, true);
  const [showNodeCaptions, setShowNodeCaptions] = useCachedValue(
    CachedKey.showNodeCaptions,
    true,
  );
  const [showLinkLabels, setShowLinkLabels] = useCachedValue(
    CachedKey.showLinkLabels,
    true,
  );
  const [showParticles, setShowParticles] = useCachedValue(
    CachedKey.showParticles,
    true,
  );
  const [bloom, setBloom] = useCachedValue(CachedKey.bloom, true);
  const [animate, setAnimate] = useCachedValue(CachedKey.animate, true);
  const [captionDistance, setCaptionDistance] = useCachedValue(
    CachedKey.captionDistance,
    500,
  );
  const [dagMode, setDagMode] = useCachedValue<DagMode>(
    CachedKey.dagMode,
    "default",
  );
  const [captionOverrides, setCaptionOverrides] =
    useCachedValue<CaptionOverrides>(CachedKey.captionOverrides, {});

  // Filters are scoped to this result frame, so they are deliberately not
  // persisted — a hidden label should not silently stay hidden in a later,
  // unrelated query.
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set());
  const [hiddenRelTypes, setHiddenRelTypes] = useState<Set<string>>(new Set());

  const settings = useMemo<GraphSettings>(
    () => ({
      showIcons,
      showNodeCaptions,
      showLinkLabels,
      showParticles,
      bloom,
      animate,
      captionDistance,
      dagMode,
    }),
    [
      showIcons,
      showNodeCaptions,
      showLinkLabels,
      showParticles,
      bloom,
      animate,
      captionDistance,
      dagMode,
    ],
  );

  const applySettings = useCallback(
    (next: GraphSettings) => {
      setShowIcons(next.showIcons);
      setShowNodeCaptions(next.showNodeCaptions);
      setShowLinkLabels(next.showLinkLabels);
      setShowParticles(next.showParticles);
      setBloom(next.bloom);
      setAnimate(next.animate);
      setCaptionDistance(next.captionDistance);
      setDagMode(next.dagMode);
    },
    [
      setShowIcons,
      setShowNodeCaptions,
      setShowLinkLabels,
      setShowParticles,
      setBloom,
      setAnimate,
      setCaptionDistance,
      setDagMode,
    ],
  );

  // --------------------------------------------------------------- renderer
  // Only read at construction time, so the initial value is all that matters;
  // afterwards `setSettings` pushes changes in without rebuilding the scene.
  const initialSettingsRef = useRef(settings);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const renderer = new GraphRenderer(mount, initialSettingsRef.current, {
      onSelect: (item) => setSelectedId(item?.elementId ?? null),
      onDagError: () => setDagMode("default"),
    });
    rendererRef.current = renderer;
    setReady(true);

    return () => {
      rendererRef.current = null;
      setReady(false);
      renderer.dispose();
    };
  }, [setDagMode]);

  useEffect(() => {
    rendererRef.current?.setGraph(graph);
  }, [graph, ready]);

  useEffect(() => {
    rendererRef.current?.setSettings(settings);
  }, [settings, ready]);

  useEffect(() => {
    rendererRef.current?.setCaptionOverrides(captionOverrides);
  }, [captionOverrides, ready]);

  useEffect(() => {
    rendererRef.current?.setFilters(hiddenLabels, hiddenRelTypes);
  }, [hiddenLabels, hiddenRelTypes, ready]);

  // Track the container size instead of relying on window resize events, so
  // collapsing the side panel or resizing a split view is picked up too.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !ready) {
      return;
    }

    const update = () => {
      const renderer = rendererRef.current;
      if (!renderer) {
        return;
      }
      if (expanded) {
        renderer.setSize(window.innerWidth, window.innerHeight);
      } else {
        const rect = mount.getBoundingClientRect();
        renderer.setSize(
          rect.width || mount.clientWidth,
          Math.max(MIN_HEIGHT, window.innerHeight - HEADER_ALLOWANCE * 3),
        );
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(mount);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [expanded, ready]);

  // Leaving full screen with Escape.
  useEffect(() => {
    if (!expanded) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const selected = useMemo<INode | ILink | null>(() => {
    if (!selectedId) {
      return null;
    }
    return (
      graph.nodes.find((node) => node.elementId === selectedId) ??
      graph.links.find((link) => link.elementId === selectedId) ??
      null
    );
  }, [graph, selectedId]);

  // Fly to a node when the selection changes — but not when the same node's
  // data is refreshed by a graph update.
  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || !isGraphNode(selected)) {
      focusedRef.current = null;
      return;
    }
    if (focusedRef.current === selected.elementId) {
      return;
    }
    focusedRef.current = selected.elementId;
    rendererRef.current?.focusNode(selected);
  }, [selected]);

  // ---------------------------------------------------------------- actions
  const toggleIn = useCallback(
    (setter: typeof setHiddenLabels) => (value: string) =>
      setter((current) => {
        const next = new Set(current);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
        return next;
      }),
    [],
  );

  const handleToggleLabel = useMemo(
    () => toggleIn(setHiddenLabels),
    [toggleIn],
  );
  const handleToggleRelType = useMemo(
    () => toggleIn(setHiddenRelTypes),
    [toggleIn],
  );

  const handleCaptionChange = useCallback(
    (labelKey: string, property: string) => {
      setCaptionOverrides((current) => {
        const next = { ...current };
        if (property) {
          next[labelKey] = property;
        } else {
          delete next[labelKey];
        }
        return next;
      });
    },
    [setCaptionOverrides],
  );

  const handleSearchMatches = useCallback((ids: Set<string>) => {
    rendererRef.current?.setSearchMatches(ids);
  }, []);

  const handleExportPng = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    // The drawing buffer is only guaranteed to hold pixels straight after a
    // render, so force one before reading the canvas.
    renderer.renderFrame();
    exportCanvasAsPng(renderer.canvas);
  }, []);

  return (
    <div className={`graph-view${expanded ? " is-expanded" : ""}`}>
      <GraphToolbar
        settings={settings}
        onSettingsChange={applySettings}
        sizeMode={sizeMode}
        onSizeModeChange={onSizeModeChange}
        fetchLinksInBetween={fetchLinksInBetween}
        onFetchLinksInBetweenChange={onFetchLinksInBetweenChange}
        nodeCount={graph.nodes.length}
        linkCount={graph.links.length}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((value) => !value)}
        onZoomToFit={() => rendererRef.current?.zoomToFit()}
        onUnpinAll={() => rendererRef.current?.unpinAll()}
        onExportPng={handleExportPng}
        onExportJson={() => exportGraphAsJson(graph)}
        onExportCsv={() => exportGraphAsCsv(graph)}
      />

      <div className="graph-view__canvas">
        <GraphSearch
          graph={graph}
          captionOverrides={captionOverrides}
          onMatchesChange={handleSearchMatches}
          onPick={(node) => setSelectedId(node.elementId)}
        />

        <GraphLegend
          graph={graph}
          hiddenLabels={hiddenLabels}
          onToggleLabel={handleToggleLabel}
          hiddenRelTypes={hiddenRelTypes}
          onToggleRelType={handleToggleRelType}
          captionOverrides={captionOverrides}
          onCaptionChange={handleCaptionChange}
        />

        {selected && (
          <GraphSidePanel
            item={selected}
            onClose={() => setSelectedId(null)}
            captionOverrides={captionOverrides}
          />
        )}

        {error && (
          <div className="graph-view__error">
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            <span className="u-truncate">{error}</span>
            <button type="button" onClick={onDismissError} aria-label="Dismiss">
              <i className="fas fa-xmark" aria-hidden="true" />
            </button>
          </div>
        )}

        <div ref={mountRef} className="graph-view__mount" />
      </div>
    </div>
  );
}
