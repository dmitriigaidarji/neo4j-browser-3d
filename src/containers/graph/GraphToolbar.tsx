import { useCallback, useState, type ChangeEvent } from "react";
import type { DagMode, GraphSettings } from "../../graph/renderer";
import type { NodeSizeMode } from "../../graph/types";

const DAG_MODES: Array<{ value: DagMode; label: string }> = [
  { value: "default", label: "Force directed" },
  { value: "td", label: "Top → Down" },
  { value: "bu", label: "Bottom → Up" },
  { value: "lr", label: "Left → Right" },
  { value: "rl", label: "Right → Left" },
  { value: "zout", label: "Near → Far" },
  { value: "zin", label: "Far → Near" },
  { value: "radialout", label: "Radial outwards" },
  { value: "radialin", label: "Radial inwards" },
];

const SIZE_MODES: Array<{ value: NodeSizeMode; label: string }> = [
  { value: "uniform", label: "Uniform" },
  { value: "degree", label: "By degree" },
  { value: "value", label: "By relationship value" },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="graph-settings__toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export interface ToolbarProps {
  settings: GraphSettings;
  onSettingsChange: (next: GraphSettings) => void;
  sizeMode: NodeSizeMode;
  onSizeModeChange: (mode: NodeSizeMode) => void;
  fetchLinksInBetween: boolean;
  onFetchLinksInBetweenChange: (value: boolean) => void;
  nodeCount: number;
  linkCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onZoomToFit: () => void;
  onUnpinAll: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}

/**
 * Floating control bar. Replaces the previous inline row of nine unlabelled
 * checkboxes with grouped icon actions plus a settings popover.
 */
export default function GraphToolbar({
  settings,
  onSettingsChange,
  sizeMode,
  onSizeModeChange,
  fetchLinksInBetween,
  onFetchLinksInBetweenChange,
  nodeCount,
  linkCount,
  expanded,
  onToggleExpanded,
  onZoomToFit,
  onUnpinAll,
  onExportPng,
  onExportJson,
  onExportCsv,
}: ToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const patch = useCallback(
    (changes: Partial<GraphSettings>) =>
      onSettingsChange({ ...settings, ...changes }),
    [onSettingsChange, settings],
  );

  const handleDistance = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(event.target.value, 10);
      // An empty or malformed field used to store NaN, which hid every caption.
      patch({ captionDistance: Number.isFinite(parsed) ? parsed : 500 });
    },
    [patch],
  );

  return (
    <div className="graph-toolbar">
      <div
        className="graph-toolbar__group graph-toolbar__stats"
        title="Graph size"
      >
        <span>
          <i className="fas fa-circle" aria-hidden="true" /> {nodeCount}
        </span>
        <span>
          <i className="fas fa-arrow-right-long" aria-hidden="true" />{" "}
          {linkCount}
        </span>
      </div>

      <div className="graph-toolbar__group">
        <select
          className="graph-toolbar__select"
          value={settings.dagMode}
          onChange={(event) =>
            patch({ dagMode: event.target.value as DagMode })
          }
          aria-label="Layout"
        >
          {DAG_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      <div className="graph-toolbar__group">
        <button
          type="button"
          className="graph-toolbar__button"
          onClick={onZoomToFit}
          title="Zoom to fit"
          aria-label="Zoom to fit"
        >
          <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="graph-toolbar__button"
          onClick={onUnpinAll}
          title="Release pinned nodes"
          aria-label="Release pinned nodes"
        >
          <i className="fas fa-thumbtack-slash" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`graph-toolbar__button${settings.animate ? " is-active" : ""}`}
          onClick={() => patch({ animate: !settings.animate })}
          title={settings.animate ? "Pause layout" : "Resume layout"}
          aria-label={settings.animate ? "Pause layout" : "Resume layout"}
        >
          <i
            className={`fas fa-${settings.animate ? "pause" : "play"}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="graph-toolbar__group graph-toolbar__popover-host">
        <button
          type="button"
          className={`graph-toolbar__button${exportOpen ? " is-active" : ""}`}
          onClick={() => {
            setExportOpen((open) => !open);
            setSettingsOpen(false);
          }}
          title="Export"
          aria-label="Export"
          aria-expanded={exportOpen}
        >
          <i className="fas fa-download" aria-hidden="true" />
        </button>
        {exportOpen && (
          <div className="graph-popover">
            <button type="button" onClick={onExportPng}>
              <i className="fas fa-image" aria-hidden="true" /> PNG screenshot
            </button>
            <button type="button" onClick={onExportJson}>
              <i className="fas fa-code" aria-hidden="true" /> Graph as JSON
            </button>
            <button type="button" onClick={onExportCsv}>
              <i className="fas fa-file-csv" aria-hidden="true" /> Nodes as CSV
            </button>
          </div>
        )}
      </div>

      <div className="graph-toolbar__group graph-toolbar__popover-host">
        <button
          type="button"
          className={`graph-toolbar__button${settingsOpen ? " is-active" : ""}`}
          onClick={() => {
            setSettingsOpen((open) => !open);
            setExportOpen(false);
          }}
          title="Display settings"
          aria-label="Display settings"
          aria-expanded={settingsOpen}
        >
          <i className="fas fa-sliders" aria-hidden="true" />
        </button>
        {settingsOpen && (
          <div className="graph-popover graph-settings">
            <Toggle
              label="Node captions"
              checked={settings.showNodeCaptions}
              onChange={() =>
                patch({ showNodeCaptions: !settings.showNodeCaptions })
              }
            />
            <Toggle
              label="Node icons"
              checked={settings.showIcons}
              onChange={() => patch({ showIcons: !settings.showIcons })}
            />
            <Toggle
              label="Relationship labels"
              checked={settings.showLinkLabels}
              onChange={() =>
                patch({ showLinkLabels: !settings.showLinkLabels })
              }
            />
            <Toggle
              label="Flow particles"
              checked={settings.showParticles}
              onChange={() => patch({ showParticles: !settings.showParticles })}
            />
            <Toggle
              label="Bloom glow"
              checked={settings.bloom}
              onChange={() => patch({ bloom: !settings.bloom })}
            />
            <Toggle
              label="Fetch links between nodes"
              checked={fetchLinksInBetween}
              onChange={() => onFetchLinksInBetweenChange(!fetchLinksInBetween)}
            />

            <label className="graph-settings__field">
              <span>Caption distance</span>
              <input
                type="number"
                min={50}
                max={5000}
                step={50}
                value={settings.captionDistance}
                onChange={handleDistance}
              />
            </label>

            <label className="graph-settings__field">
              <span>Node size</span>
              <select
                value={sizeMode}
                onChange={(event) =>
                  onSizeModeChange(event.target.value as NodeSizeMode)
                }
              >
                {SIZE_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="graph-toolbar__group">
        <button
          type="button"
          className="graph-toolbar__button"
          onClick={onToggleExpanded}
          title={expanded ? "Exit full screen" : "Full screen"}
          aria-label={expanded ? "Exit full screen" : "Full screen"}
        >
          <i
            className={`fas fa-${expanded ? "compress" : "expand"}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
