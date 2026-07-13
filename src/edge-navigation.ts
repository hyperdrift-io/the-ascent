import { KPI_TREE } from "./edge-kpis";

export type CameraPose = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetZ: number;
};

export type EdgeViewportState = {
  readonly path: readonly string[];
  readonly camera: CameraPose;
  readonly history: readonly CameraPose[];
  readonly rootCamera: CameraPose;
  readonly selectedNodeId: string | null;
};

export type EdgeNavigationAction =
  | { type: "enter"; nodeId: string; camera?: CameraPose }
  | { type: "back" }
  | { type: "home" }
  | { type: "select"; nodeId: string | null }
  | { type: "camera"; camera: CameraPose };

export async function navigateEdgeLineage(options: {
  lineage: readonly string[];
  waitForIdle: () => Promise<void>;
  home: () => Promise<void>;
  enter: (nodeId: string) => Promise<void>;
  isCurrent: () => boolean;
}): Promise<void> {
  await options.waitForIdle();
  if (!options.isCurrent()) return;
  await options.home();
  for (const nodeId of options.lineage) {
    if (!options.isCurrent()) return;
    await options.enter(nodeId);
  }
}

const DEFAULT_CAMERA: CameraPose = Object.freeze({
  x: 0,
  y: 0,
  z: 8,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
});

function copyCamera(camera: CameraPose): CameraPose {
  return Object.freeze({ ...camera });
}

function freezePath(path: readonly string[]): readonly string[] {
  return Object.freeze([...path]);
}

function freezeHistory(history: readonly CameraPose[]): readonly CameraPose[] {
  return Object.freeze([...history]);
}

function freezeViewport(state: EdgeViewportState): EdgeViewportState {
  return Object.freeze(state);
}

export function createViewport(camera: CameraPose = DEFAULT_CAMERA): EdgeViewportState {
  const rootCamera = copyCamera(camera);
  return freezeViewport({
    path: freezePath(["edge"]),
    camera: rootCamera,
    history: freezeHistory([]),
    rootCamera,
    selectedNodeId: null,
  });
}

export function getVisibleNodeIds(state: EdgeViewportState): string[] {
  const [root, domainId, kpiId] = state.path;
  if (root !== "edge") return [];
  if (state.path.length === 1) return KPI_TREE.map((domain) => domain.id);

  const domain = KPI_TREE.find((item) => item.id === domainId);
  if (!domain) return [];
  if (state.path.length === 2) return domain.kpis.map((kpi) => kpi.id);

  const kpi = domain.kpis.find((item) => item.id === kpiId);
  if (!kpi) return [];
  if (state.path.length === 3) return kpi.children.map((child) => child.id);

  return [];
}

export function edgeNavigationReducer(
  state: EdgeViewportState,
  action: EdgeNavigationAction,
): EdgeViewportState {
  switch (action.type) {
    case "enter":
      if (!getVisibleNodeIds(state).includes(action.nodeId)) return state;
      return freezeViewport({
        path: freezePath([...state.path, action.nodeId]),
        camera: copyCamera(action.camera ?? state.camera),
        history: freezeHistory([...state.history, state.camera]),
        rootCamera: state.rootCamera,
        selectedNodeId: null,
      });
    case "back": {
      const parentCamera = state.history[state.history.length - 1];
      if (state.path.length === 1 || !parentCamera) return state;
      return freezeViewport({
        path: freezePath(state.path.slice(0, -1)),
        camera: parentCamera,
        history: freezeHistory(state.history.slice(0, -1)),
        rootCamera: state.rootCamera,
        selectedNodeId: null,
      });
    }
    case "home":
      return freezeViewport({
        path: freezePath(["edge"]),
        camera: state.rootCamera,
        history: freezeHistory([]),
        rootCamera: state.rootCamera,
        selectedNodeId: null,
      });
    case "select":
      return freezeViewport({ ...state, selectedNodeId: action.nodeId });
    case "camera":
      return freezeViewport({ ...state, camera: copyCamera(action.camera) });
  }
}
