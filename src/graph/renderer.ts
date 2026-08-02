import ForceGraph3D, { type ForceGraph3DInstance } from "3d-force-graph";
import SpriteText from "three-spritetext";
import { Vector2, Vector3 } from "three";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { Pass } from "three/addons/postprocessing/Pass.js";
import { getNodeCaption, type CaptionOverrides } from "./captions";
import { labelConfig } from "./config";
import type { IGraph, ILink, INode } from "./types";

export type DagMode =
  | "default"
  | "td"
  | "bu"
  | "lr"
  | "rl"
  | "zout"
  | "zin"
  | "radialout"
  | "radialin";

export interface GraphSettings {
  showIcons: boolean;
  showNodeCaptions: boolean;
  showLinkLabels: boolean;
  showParticles: boolean;
  bloom: boolean;
  animate: boolean;
  captionDistance: number;
  dagMode: DagMode;
}

export interface RendererCallbacks {
  onSelect: (item: INode | ILink | null) => void;
  onDagError: () => void;
}

/**
 * Above this many nodes the renderer drops to a cheaper configuration:
 * lower sphere resolution, no flow particles and no bloom pass. Those are the
 * three things that make large result sets unusable.
 */
const HEAVY_GRAPH_NODES = 400;

/** Cap on simultaneously rendered captions, so dense clusters stay responsive. */
const MAX_VISIBLE_CAPTIONS = 250;

const BLOOM_STRENGTH = 0.55;
const BLOOM_RADIUS = 0.35;
const BLOOM_THRESHOLD = 0.35;

const HIGHLIGHT_COLOR = "rgb(255,80,80)";
const NEIGHBOUR_COLOR = "rgba(255,170,40,0.9)";
const SEARCH_COLOR = "#ffffff";

function isEmojiIcon(icon: string): boolean {
  return !icon.includes("/") && !icon.includes(".") && icon.length <= 8;
}

/**
 * Owns the 3d-force-graph instance and everything three.js related.
 *
 * Keeping this outside React means the scene is built exactly once per mounted
 * graph; React only pushes state into it through the setters below.
 */
export class GraphRenderer {
  private readonly instance: ForceGraph3DInstance;
  private readonly callbacks: RendererCallbacks;
  private readonly container: HTMLElement;

  private graph: IGraph = { nodes: [], links: [] };
  private settings: GraphSettings;
  private captionOverrides: CaptionOverrides = {};
  private hiddenLabels = new Set<string>();
  private hiddenRelTypes = new Set<string>();
  private searchMatches = new Set<string>();

  private readonly highlightNodes = new Set<INode>();
  private readonly highlightLinks = new Set<ILink>();
  private hoveredNode: INode | null = null;

  /** Cached caption elements, keyed by node id, invalidated by generation. */
  private captionCache = new Map<string, CSS2DObject>();
  private captionGeneration = 0;
  private readonly linkSprites = new Set<SpriteText>();

  private bloomPass: UnrealBloomPass | null = null;
  private pendingAutoFit = false;
  private lastNodeSignature = "";
  private lastCaptionCamera = new Vector3(Infinity, Infinity, Infinity);
  private captionTimer: number | null = null;
  private autoFitTimer: number | null = null;
  private controlsListener: (() => void) | null = null;
  private interactionListener: (() => void) | null = null;
  private disposed = false;

  constructor(
    container: HTMLElement,
    settings: GraphSettings,
    callbacks: RendererCallbacks,
  ) {
    this.container = container;
    this.settings = settings;
    this.callbacks = callbacks;

    // 3d-force-graph >= 1.75 is a constructor that takes the mount element,
    // rather than the old factory-then-call-with-element form.
    this.instance = new ForceGraph3D(container, {
      extraRenderers: [new CSS2DRenderer() as never],
      rendererConfig: { antialias: true, preserveDrawingBuffer: true },
    })
      .backgroundColor("#05070d")
      .nodeId("elementId")
      .linkSource("startNodeElementId")
      .linkTarget("endNodeElementId")
      .nodeRelSize(4)
      .nodeColor((node) => this.nodeColor(node as unknown as INode))
      .nodeVisibility((node) => this.nodeVisible(node as unknown as INode))
      .linkVisibility((link) => this.linkVisible(link as unknown as ILink))
      .nodeLabel(() => "")
      .linkLabel(() => "")
      .linkColor((link) => this.linkColor(link as unknown as ILink))
      .linkWidth((link) =>
        this.highlightLinks.has(link as unknown as ILink) ? 3 : 0.5,
      )
      .linkOpacity(0.35)
      .linkDirectionalArrowLength(3.5)
      .linkDirectionalArrowRelPos(1)
      .linkCurvature("curvature")
      .linkCurveRotation("rotation")
      .linkDirectionalParticleWidth(2)
      .linkDirectionalParticleColor(() => "orange")
      .nodeThreeObjectExtend(true)
      .linkThreeObjectExtend(true)
      .onNodeClick((node) => this.callbacks.onSelect(node as unknown as INode))
      .onLinkClick((link) => this.callbacks.onSelect(link as unknown as ILink))
      .onBackgroundClick(() => this.callbacks.onSelect(null))
      .onNodeHover((node) => this.handleNodeHover(node as unknown as INode))
      .onLinkHover((link) => this.handleLinkHover(link as unknown as ILink))
      .onNodeDragEnd((node) => {
        // Pin a node where the user dropped it; clicking "unpin all" releases.
        const dragged = node as unknown as INode;
        dragged.fx = dragged.x;
        dragged.fy = dragged.y;
        dragged.fz = dragged.z;
        dragged.pinned = true;
      })
      .onDagError(() => this.callbacks.onDagError())
      // A settled layout re-frames itself, unless the user already moved the
      // camera. The default 15s cooldown is far too long to be the only cue,
      // so `scheduleAutoFit` also does an early pass.
      .onEngineStop(() => this.autoFit())
      .cooldownTime(8000);

    this.instance.d3Force("charge")?.strength(-140);
    this.applySettings(settings, true);
    this.watchCamera();
    this.watchUserInteraction();
  }

  /**
   * Any direct manipulation of the view hands camera control to the user and
   * cancels pending auto-framing. Pointer/wheel events are watched rather than
   * the controls' "change" event, which `zoomToFit` itself would trigger.
   */
  private watchUserInteraction() {
    const claim = () => {
      this.pendingAutoFit = false;
    };
    this.container.addEventListener("pointerdown", claim, { passive: true });
    this.container.addEventListener("wheel", claim, { passive: true });
    this.interactionListener = () => {
      this.container.removeEventListener("pointerdown", claim);
      this.container.removeEventListener("wheel", claim);
    };
  }

  private autoFit() {
    if (!this.pendingAutoFit || this.disposed) {
      return;
    }
    this.zoomToFit();
  }

  /** Frame a freshly loaded graph without waiting for the full cooldown. */
  private scheduleAutoFit() {
    if (this.autoFitTimer !== null) {
      window.clearTimeout(this.autoFitTimer);
    }
    this.autoFitTimer = window.setTimeout(() => {
      this.autoFitTimer = null;
      this.autoFit();
    }, 1500);
  }

  // ---------------------------------------------------------------- accessors

  get canvas(): HTMLCanvasElement | undefined {
    return this.instance.renderer()?.domElement;
  }

  private get heavy(): boolean {
    return this.graph.nodes.length > HEAVY_GRAPH_NODES;
  }

  // ------------------------------------------------------------------ styling

  private nodeColor(node: INode): string {
    if (this.searchMatches.has(node.elementId)) {
      return SEARCH_COLOR;
    }
    if (this.highlightNodes.has(node)) {
      return node === this.hoveredNode ? HIGHLIGHT_COLOR : NEIGHBOUR_COLOR;
    }
    return node.color;
  }

  private linkColor(link: ILink): string {
    return this.highlightLinks.has(link)
      ? "rgba(255,170,40,0.95)"
      : "rgba(160,180,210,0.5)";
  }

  private nodeVisible(node: INode): boolean {
    return !this.hiddenLabels.has(node.labelKey);
  }

  private linkVisible(link: ILink): boolean {
    if (this.hiddenRelTypes.has(link.type)) {
      return false;
    }
    // Hide relationships whose endpoints were filtered out.
    const source = link.source as INode | undefined;
    const target = link.target as INode | undefined;
    if (source && typeof source === "object" && !this.nodeVisible(source)) {
      return false;
    }
    if (target && typeof target === "object" && !this.nodeVisible(target)) {
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- highlight

  private handleNodeHover(node: INode | null) {
    if (this.hoveredNode === node) {
      return;
    }
    this.highlightNodes.clear();
    this.highlightLinks.clear();
    if (node) {
      this.highlightNodes.add(node);
      node.neighbors.forEach((neighbor) => this.highlightNodes.add(neighbor));
      node.links.forEach((link) => this.highlightLinks.add(link));
    }
    this.hoveredNode = node;
    this.refreshStyles();
    this.refreshCaptions();
  }

  private handleLinkHover(link: ILink | null) {
    this.highlightNodes.clear();
    this.highlightLinks.clear();
    if (link) {
      this.highlightLinks.add(link);
      if (link.source && typeof link.source === "object") {
        this.highlightNodes.add(link.source);
      }
      if (link.target && typeof link.target === "object") {
        this.highlightNodes.add(link.target);
      }
    }
    this.hoveredNode = null;
    this.refreshStyles();
  }

  /** Re-evaluate the styling accessors without rebuilding the scene graph. */
  private refreshStyles() {
    this.instance
      .nodeColor(this.instance.nodeColor())
      .linkColor(this.instance.linkColor())
      .linkWidth(this.instance.linkWidth())
      .linkDirectionalParticles(this.instance.linkDirectionalParticles());
  }

  // ----------------------------------------------------------------- captions

  private buildCaptionElement(node: INode): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = "graph-node-label";

    const icon = this.settings.showIcons
      ? labelConfig(node.labels)?.icon
      : undefined;
    if (icon) {
      if (isEmojiIcon(icon)) {
        const span = document.createElement("div");
        span.className = "graph-node-label__emoji";
        span.textContent = icon;
        wrapper.append(span);
      } else {
        const img = document.createElement("img");
        img.className = "graph-node-label__icon";
        img.src = icon;
        img.alt = "";
        img.loading = "lazy";
        wrapper.append(img);
      }
    }

    const isHovered = node === this.hoveredNode;
    if (this.settings.showNodeCaptions || isHovered) {
      const text = document.createElement("div");
      text.className = "graph-node-label__text";
      text.style.color = node.color;

      if (isHovered) {
        const labels = document.createElement("div");
        labels.className = "graph-node-label__labels";
        labels.textContent = node.labels.join("|");
        text.append(labels);
      }

      const caption = document.createElement("div");
      caption.textContent = getNodeCaption(node, this.captionOverrides);
      text.append(caption);
      wrapper.append(text);
    }

    return wrapper;
  }

  /**
   * Recompute which nodes get a caption.
   *
   * Captions are only drawn near the camera; the previous implementation
   * polled the camera on a 1s interval and rebuilt every DOM element on each
   * pass. Now the work is driven by actual camera movement (see `watchCamera`)
   * and the built elements are cached per node.
   */
  private refreshCaptions() {
    if (this.disposed) {
      return;
    }
    const wantsCaptions =
      this.settings.showIcons || this.settings.showNodeCaptions;

    if (!wantsCaptions && !this.hoveredNode) {
      this.clearCaptionCache();
      this.instance.nodeThreeObject(() => false as never);
      return;
    }

    const camera = this.instance.cameraPosition();
    const cameraVec = new Vector3(camera.x, camera.y, camera.z);
    const maxDistance = this.settings.captionDistance;

    // Rank by distance so a dense cluster shows the nearest labels rather than
    // whichever ones happen to come first in the array.
    const withinRange: Array<{ node: INode; distance: number }> = [];
    for (const node of this.graph.nodes) {
      if (!this.nodeVisible(node)) {
        continue;
      }
      const distance = cameraVec.distanceTo(
        new Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0),
      );
      if (distance < maxDistance) {
        withinRange.push({ node, distance });
      }
    }
    withinRange.sort((a, b) => a.distance - b.distance);

    const visible = new Set(
      withinRange.slice(0, MAX_VISIBLE_CAPTIONS).map((entry) => entry.node),
    );
    if (this.hoveredNode) {
      visible.add(this.hoveredNode);
    }

    const generation = this.captionGeneration;
    this.instance.nodeThreeObject(((input: unknown) => {
      const node = input as INode;
      if (!visible.has(node)) {
        return false as never;
      }
      // The hovered node's label carries extra content, so never serve it
      // from cache.
      const cacheKey = `${generation}:${node.elementId}`;
      if (node !== this.hoveredNode) {
        const cached = this.captionCache.get(cacheKey);
        if (cached) {
          return cached as never;
        }
      }
      const object = new CSS2DObject(this.buildCaptionElement(node));
      if (node !== this.hoveredNode) {
        this.captionCache.set(cacheKey, object);
      }
      return object as never;
    }) as never);
  }

  private clearCaptionCache() {
    this.captionCache.forEach((object) => object.element.remove());
    this.captionCache.clear();
  }

  /** Invalidate cached caption DOM after a setting or caption change. */
  private invalidateCaptions() {
    this.captionGeneration += 1;
    this.clearCaptionCache();
    this.refreshCaptions();
  }

  /**
   * Recompute captions when the camera actually moves, debounced so a
   * continuous orbit does not thrash the DOM.
   */
  private watchCamera() {
    const controls = this.instance.controls() as {
      addEventListener?: (event: string, fn: () => void) => void;
      removeEventListener?: (event: string, fn: () => void) => void;
    };

    const onChange = () => {
      if (this.captionTimer !== null) {
        return;
      }
      this.captionTimer = window.setTimeout(() => {
        this.captionTimer = null;
        if (this.disposed) {
          return;
        }
        const camera = this.instance.cameraPosition();
        const current = new Vector3(camera.x, camera.y, camera.z);
        if (current.distanceTo(this.lastCaptionCamera) > 25) {
          this.lastCaptionCamera = current;
          this.refreshCaptions();
        }
      }, 200);
    };

    if (controls?.addEventListener) {
      controls.addEventListener("change", onChange);
      this.controlsListener = () =>
        controls.removeEventListener?.("change", onChange);
    }
  }

  // -------------------------------------------------------------- link labels

  private applyLinkLabels() {
    this.disposeLinkSprites();

    if (!this.settings.showLinkLabels) {
      this.instance.linkThreeObject(() => false as never);
      return;
    }

    this.instance
      .linkThreeObject(((input: unknown) => {
        const link = input as ILink;
        const sprite = new SpriteText(link.type);
        sprite.color = "rgba(220,230,245,0.9)";
        sprite.textHeight = 1.6;
        this.linkSprites.add(sprite);
        return sprite as never;
      }) as never)
      .linkPositionUpdate(((
        sprite: SpriteText | undefined,
        coords: { start: Vector3; end: Vector3 },
        input: unknown,
      ) => {
        if (!sprite) {
          return;
        }
        const link = input as ILink;
        const { start, end } = coords;
        const middle = new Vector3(
          start.x + (end.x - start.x) / 2,
          start.y + (end.y - start.y) / 2,
          start.z + (end.z - start.z) / 2,
        );

        if (link.curvature > 0) {
          // Offset the label onto the bent line rather than the chord.
          const direction = new Vector3().subVectors(end, start).normalize();
          const perpendicular = new Vector3(
            direction.y + direction.x * direction.z,
            direction.y * direction.z - direction.x,
            -(direction.x * direction.x) - direction.y * direction.y,
          );
          const offset = perpendicular
            .applyAxisAngle(direction, link.rotation / link.curvature - 0.5)
            .applyAxisAngle(
              new Vector3()
                .multiplyVectors(perpendicular, direction)
                .normalize(),
              (15 * Math.PI) / 180,
            )
            .multiplyScalar(link.curvature * 10);
          middle.add(offset);
        }

        sprite.position.copy(middle);
      }) as never);
  }

  private disposeLinkSprites() {
    this.linkSprites.forEach((sprite) => {
      sprite.material?.map?.dispose();
      sprite.material?.dispose();
    });
    this.linkSprites.clear();
  }

  // ------------------------------------------------------------------ setters

  setGraph(graph: IGraph) {
    // Only auto-frame when the node set actually changes; re-deriving sizes or
    // adding a few discovered relationships should not move the camera.
    const signature = graph.nodes.map((node) => node.elementId).join("|");
    if (signature !== this.lastNodeSignature) {
      this.lastNodeSignature = signature;
      this.pendingAutoFit = true;
      this.scheduleAutoFit();
    }
    this.graph = graph;
    this.instance.graphData(graph as never);
    this.applyQuality();
    this.invalidateCaptions();
  }

  setSettings(settings: GraphSettings) {
    const previous = this.settings;
    this.settings = settings;
    this.applySettings(settings, false, previous);
  }

  private applySettings(
    settings: GraphSettings,
    initial: boolean,
    previous?: GraphSettings,
  ) {
    if (initial || previous?.dagMode !== settings.dagMode) {
      this.instance.dagMode(
        (settings.dagMode === "default" ? null : settings.dagMode) as never,
      );
    }

    if (initial || previous?.bloom !== settings.bloom) {
      this.applyBloom(settings.bloom);
    }

    if (initial || previous?.showLinkLabels !== settings.showLinkLabels) {
      this.applyLinkLabels();
    }

    if (initial || previous?.showParticles !== settings.showParticles) {
      this.applyQuality();
    }

    if (initial || previous?.animate !== settings.animate) {
      if (settings.animate) {
        this.instance.resumeAnimation();
      } else {
        this.instance.pauseAnimation();
      }
    }

    if (
      !initial &&
      (previous?.showIcons !== settings.showIcons ||
        previous?.showNodeCaptions !== settings.showNodeCaptions ||
        previous?.captionDistance !== settings.captionDistance)
    ) {
      this.invalidateCaptions();
    }
  }

  /** Scale visual cost to graph size. */
  private applyQuality() {
    const heavy = this.heavy;
    this.instance
      .nodeResolution(heavy ? 8 : 16)
      .linkDirectionalParticles((link) => {
        if (!this.settings.showParticles || heavy) {
          return this.highlightLinks.has(link as unknown as ILink) ? 3 : 0;
        }
        return this.highlightLinks.has(link as unknown as ILink) ? 4 : 1;
      });

    if (heavy && this.bloomPass) {
      this.applyBloom(false);
    } else if (!heavy && this.settings.bloom && !this.bloomPass) {
      this.applyBloom(true);
    }
  }

  private applyBloom(enabled: boolean) {
    const composer = this.instance.postProcessingComposer();
    if (enabled && !this.bloomPass) {
      // Resolution must match the canvas and the threshold must sit above the
      // background luminance. Left at the defaults (a 256x256 buffer with a
      // zero threshold) the blur is so coarse that the whole scene blooms and
      // the near-black canvas washes out to grey-blue.
      const pass = new UnrealBloomPass(
        this.currentResolution(),
        BLOOM_STRENGTH,
        BLOOM_RADIUS,
        BLOOM_THRESHOLD,
      );
      composer.addPass(pass as unknown as Pass);
      this.bloomPass = pass;
    } else if (!enabled && this.bloomPass) {
      composer.removePass(this.bloomPass as unknown as Pass);
      this.bloomPass.dispose();
      this.bloomPass = null;
    }
  }

  private currentResolution(): Vector2 {
    return new Vector2(
      Math.max(1, this.instance.width()),
      Math.max(1, this.instance.height()),
    );
  }

  setCaptionOverrides(overrides: CaptionOverrides) {
    this.captionOverrides = overrides;
    this.invalidateCaptions();
  }

  setFilters(hiddenLabels: Set<string>, hiddenRelTypes: Set<string>) {
    this.hiddenLabels = hiddenLabels;
    this.hiddenRelTypes = hiddenRelTypes;
    this.instance
      .nodeVisibility(this.instance.nodeVisibility())
      .linkVisibility(this.instance.linkVisibility());
    this.refreshCaptions();
  }

  setSearchMatches(matches: Set<string>) {
    this.searchMatches = matches;
    this.refreshStyles();
  }

  setSize(width: number, height: number) {
    this.instance.width(width).height(height);
    this.bloomPass?.setSize(width, height);
  }

  // ------------------------------------------------------------------ actions

  focusNode(node: INode) {
    const distance = 60 + (node.val ?? 0);
    const magnitude = Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    const target =
      magnitude > 0
        ? {
            x: (node.x ?? 0) * (1 + distance / magnitude),
            y: (node.y ?? 0) * (1 + distance / magnitude),
            z: (node.z ?? 0) * (1 + distance / magnitude),
          }
        : { x: 0, y: 0, z: distance };

    this.instance.cameraPosition(
      target,
      { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
      1200,
    );
  }

  zoomToFit() {
    this.instance.zoomToFit(600, 60, (node) =>
      this.nodeVisible(node as unknown as INode),
    );
  }

  reheat() {
    this.instance.d3ReheatSimulation();
  }

  unpinAll() {
    this.graph.nodes.forEach((node) => {
      node.fx = undefined;
      node.fy = undefined;
      node.fz = undefined;
      node.pinned = false;
    });
    this.reheat();
  }

  /** Force a synchronous frame so the canvas holds pixels for a screenshot. */
  renderFrame() {
    const renderer = this.instance.renderer();
    const scene = this.instance.scene();
    const camera = this.instance.camera();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  dispose() {
    this.disposed = true;
    if (this.captionTimer !== null) {
      window.clearTimeout(this.captionTimer);
      this.captionTimer = null;
    }
    if (this.autoFitTimer !== null) {
      window.clearTimeout(this.autoFitTimer);
      this.autoFitTimer = null;
    }
    this.controlsListener?.();
    this.controlsListener = null;
    this.interactionListener?.();
    this.interactionListener = null;
    this.clearCaptionCache();
    this.disposeLinkSprites();
    if (this.bloomPass) {
      this.bloomPass.dispose();
      this.bloomPass = null;
    }
    this.instance.pauseAnimation();
    this.instance._destructor();
    this.instance.renderer()?.dispose();
    // The CSS2D renderer appends its own layer next to the canvas.
    this.container.replaceChildren();
  }
}
