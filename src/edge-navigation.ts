import { KPI_TREE } from "./edge-kpis";

export type CameraPose = {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
};

export type EdgeViewportState = {
  path: readonly string[];
  camera: CameraPose;
  history: readonly CameraPose[];
  selectedNodeId: string | null;
};

export type EdgeNavigationAction =
  | { type: "enter"; nodeId: string; camera?: CameraPose }
  | { type: "back" }
  | { type: "home" }
  | { type: "select"; nodeId: string | null }
  | { type: "camera"; camera: CameraPose };

const DEFAULT_CAMERA: CameraPose = {
  x: 0,
  y: 0,
  z: 8,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
};

function copyCamera(camera: CameraPose): CameraPose {
  return { ...camera };
}

export function createViewport(camera: CameraPose = DEFAULT_CAMERA): EdgeViewportState {
  return {
    path: ["edge"],
    camera: copyCamera(camera),
    history: [],
    selectedNodeId: null,
  };
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
      return {
        path: [...state.path, action.nodeId],
        camera: copyCamera(action.camera ?? state.camera),
        history: [...state.history, copyCamera(state.camera)],
        selectedNodeId: null,
      };
    case "back": {
      const parentCamera = state.history[state.history.length - 1];
      if (state.path.length === 1 || !parentCamera) return state;
      return {
        path: state.path.slice(0, -1),
        camera: copyCamera(parentCamera),
        history: state.history.slice(0, -1),
        selectedNodeId: null,
      };
    }
    case "home": {
      const rootCamera = state.history[0] ?? state.camera;
      return {
        path: ["edge"],
        camera: copyCamera(rootCamera),
        history: [],
        selectedNodeId: null,
      };
    }
    case "select":
      return { ...state, selectedNodeId: action.nodeId };
    case "camera":
      return { ...state, camera: copyCamera(action.camera) };
  }
}
