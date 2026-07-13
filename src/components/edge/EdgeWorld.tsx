import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { EdgeSceneController } from "../../edge-scene";
import { loadEdgeAssetAvailability } from "../../edge-asset-availability";
import { supportsWebGL } from "../../edge-capabilities";
import { buildSceneComposition, getCameraPoseForEntry } from "../../edge-scene-model";
import {
  createViewport,
  edgeNavigationReducer,
  getVisibleNodeIds,
  type EdgeViewportState,
} from "../../edge-navigation";
import { EdgeSemanticTree } from "./EdgeSemanticTree";
import "../../edge-world.css";

const ROOT_VIEWPORT = createViewport();

function isFormControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, button, select, a"));
}

export function EdgeWorld({ aimEntry }: { aimEntry: ReactNode }) {
  const [viewport, dispatch] = useReducer(edgeNavigationReducer, ROOT_VIEWPORT);
  const [aimOpen, setAimOpen] = useState(false);
  const [rendererState, setRendererState] = useState<"loading" | "enhanced" | "fallback">("loading");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<EdgeSceneController | null>(null);
  const viewportRef = useRef<EdgeViewportState>(viewport);
  const transitionRef = useRef(false);
  const touchPoints = useRef(new Map<number, { x: number; y: number }>());
  const touchOrigin = useRef<{ x: number; y: number; distance: number | null } | null>(null);

  viewportRef.current = viewport;
  const composition = useMemo(() => buildSceneComposition(viewport), [viewport]);
  const atRoot = viewport.path.length === 1;

  const enter = useCallback((nodeId: string) => {
    const current = viewportRef.current;
    const index = getVisibleNodeIds(current).indexOf(nodeId);
    if (index < 0 || transitionRef.current) return;
    transitionRef.current = true;
    setAimOpen(false);
    dispatch({ type: "enter", nodeId, camera: getCameraPoseForEntry(current.path.length, index) });
    const transition = controllerRef.current?.enter(nodeId);
    if (transition) void transition.finally(() => { transitionRef.current = false; });
    else transitionRef.current = false;
  }, []);

  const back = useCallback(() => {
    if (viewportRef.current.path.length === 1 || transitionRef.current) return;
    transitionRef.current = true;
    dispatch({ type: "back" });
    const transition = controllerRef.current?.back();
    if (transition) void transition.finally(() => { transitionRef.current = false; });
    else transitionRef.current = false;
  }, []);

  const home = useCallback(() => {
    if (transitionRef.current) return;
    setAimOpen(false);
    transitionRef.current = true;
    dispatch({ type: "home" });
    const transition = controllerRef.current?.home();
    if (transition) void transition.finally(() => { transitionRef.current = false; });
    else transitionRef.current = false;
  }, []);

  const enterFirstBranch = useCallback(() => {
    const [first] = getVisibleNodeIds(viewportRef.current);
    if (first) enter(viewportRef.current.selectedNodeId ?? first);
  }, [enter]);

  const select = useCallback((nodeId: string | null) => {
    dispatch({ type: "select", nodeId });
    controllerRef.current?.setSelectedNode(nodeId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let controller: EdgeSceneController | null = null;
    let observer: ResizeObserver | null = null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => controller?.setReducedMotion(motion.matches);

    if (!supportsWebGL()) {
      setRendererState("fallback");
      return;
    }

    void Promise.all([import("../../edge-scene"), loadEdgeAssetAvailability()])
      .then(([{ createEdgeScene }, availableAssetIds]) => {
        if (cancelled) return;
        try {
          controller = createEdgeScene(canvas, viewportRef.current, enter, {
            reducedMotion: motion.matches,
            availableAssetIds,
            onPreview: (nodeId) => dispatch({ type: "select", nodeId }),
          });
        } catch {
          setRendererState("fallback");
          return;
        }
        controllerRef.current = controller;
        controller.setSelectedNode(viewportRef.current.selectedNodeId);
        const resize = () => {
          if (!controller) return;
          const bounds = canvas.getBoundingClientRect();
          controller.resize(bounds.width, bounds.height, window.devicePixelRatio);
        };
        observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();
        motion.addEventListener("change", syncMotion);
        setRendererState("enhanced");
      })
      .catch(() => {
        if (!cancelled) setRendererState("fallback");
      });

    return () => {
      cancelled = true;
      motion.removeEventListener("change", syncMotion);
      observer?.disconnect();
      controller?.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [enter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (aimOpen || isFormControl(event.target)) return;
      if (event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        enterFirstBranch();
      } else if (event.key === "Backspace" || event.key === "Escape" || event.key === "ArrowUp") {
        event.preventDefault();
        back();
      } else if (event.key === "Home") {
        event.preventDefault();
        home();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aimOpen, back, enterFirstBranch, home]);

  function onWheel(event: React.WheelEvent<HTMLElement>) {
    if (isFormControl(event.target) || Math.abs(event.deltaY) < 16) return;
    event.preventDefault();
    if (event.deltaY > 0) enterFirstBranch();
    else back();
  }

  function touchDistance(): number | null {
    const [first, second] = [...touchPoints.current.values()];
    if (!first || !second) return null;
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    touchOrigin.current ??= { x: event.clientX, y: event.clientY, distance: null };
    if (touchPoints.current.size === 2 && touchOrigin.current) touchOrigin.current.distance = touchDistance();
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType !== "touch" || !touchPoints.current.has(event.pointerId)) return;
    touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType !== "touch") return;
    const origin = touchOrigin.current;
    const distance = touchDistance();
    const deltaY = origin ? event.clientY - origin.y : 0;
    if (origin?.distance && distance && Math.abs(distance - origin.distance) > 28) {
      if (distance > origin.distance) enterFirstBranch();
      else back();
    } else if (Math.abs(deltaY) > 48) {
      if (deltaY < 0) enterFirstBranch();
      else back();
    }
    touchPoints.current.delete(event.pointerId);
    if (touchPoints.current.size === 0) touchOrigin.current = null;
  }

  function onPointerCancel(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType !== "touch") return;
    touchPoints.current.delete(event.pointerId);
    if (touchPoints.current.size === 0) touchOrigin.current = null;
  }

  return (
    <main className="edge-world" data-depth={viewport.path.length - 1} data-renderer={rendererState} onWheel={onWheel}>
      <canvas
        ref={canvasRef}
        className="edge-world-canvas"
        aria-label="The Edge living capacity matrix"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
      <header className="edge-world-heading">
        <p>THE EDGE</p>
        <h1>{composition.current.label}</h1>
        <span>{atRoot ? "AVAILABLE" : `DEPTH ${viewport.path.length - 1}`}</span>
      </header>

      {atRoot && !aimOpen && (
        <section className="edge-root-call" aria-label="Current call">
          <p>Capacity is present. Choose the branch that needs the clearest call.</p>
          <button type="button" className="edge-aim-action" onClick={() => setAimOpen(true)}>
            Set this Weekrun's aim
          </button>
        </section>
      )}

      {atRoot && aimOpen && (
        <section className="edge-aim-layer" aria-label="Set a Weekrun aim">
          <button type="button" className="edge-close-aim" onClick={() => setAimOpen(false)} aria-label="Close aim entry">
            Close
          </button>
          {aimEntry}
        </section>
      )}

      {!aimOpen && (
        <EdgeSemanticTree
          viewport={viewport}
          enter={enter}
          back={back}
          home={home}
          select={select}
        />
      )}
    </main>
  );
}
