import { describe, expect, it } from "vitest";
import {
  createViewport,
  edgeNavigationReducer,
  getVisibleNodeIds,
  type CameraPose,
} from "./edge-navigation";
import { KPI_TREE } from "./edge-kpis";

const ROOT_CAMERA: CameraPose = {
  x: 0,
  y: 1,
  z: 8,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
};

function expectFrozenViewport(state: ReturnType<typeof createViewport>) {
  expect(Object.isFrozen(state)).toBe(true);
  expect(Object.isFrozen(state.path)).toBe(true);
  expect(Object.isFrozen(state.camera)).toBe(true);
  expect(Object.isFrozen(state.history)).toBe(true);
  expect(Object.isFrozen(state.rootCamera)).toBe(true);
  state.history.forEach((camera) => expect(Object.isFrozen(camera)).toBe(true));
}

describe("fractal navigation", () => {
  it("zooms through a stable KPI lineage", () => {
    let state = createViewport();
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure" });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "stress" });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "anxiety" });

    expect(state.path).toEqual(["edge", "pressure", "stress", "anxiety"]);
  });

  it("rejects unknown, non-direct, cross-branch, and leaf enter actions", () => {
    const root = createViewport();
    expect(edgeNavigationReducer(root, { type: "enter", nodeId: "stress" })).toBe(root);
    expect(edgeNavigationReducer(root, { type: "enter", nodeId: "unknown" })).toBe(root);

    const pressure = edgeNavigationReducer(root, { type: "enter", nodeId: "pressure" });
    expect(edgeNavigationReducer(pressure, { type: "enter", nodeId: "sleep" })).toBe(pressure);

    const stress = edgeNavigationReducer(pressure, { type: "enter", nodeId: "stress" });
    const anxiety = edgeNavigationReducer(stress, { type: "enter", nodeId: "anxiety" });
    expect(edgeNavigationReducer(anxiety, { type: "enter", nodeId: "tension" })).toBe(anxiety);
  });

  it("derives visible nodes from the KPI tree at every enterable level", () => {
    const root = createViewport();
    expect(getVisibleNodeIds(root)).toEqual(KPI_TREE.map((domain) => domain.id));

    const body = edgeNavigationReducer(root, { type: "enter", nodeId: "body" });
    expect(getVisibleNodeIds(body)).toEqual(KPI_TREE.find((domain) => domain.id === "body")?.kpis.map((kpi) => kpi.id));

    const health = edgeNavigationReducer(body, { type: "enter", nodeId: "health" });
    expect(getVisibleNodeIds(health)).toEqual(
      KPI_TREE.find((domain) => domain.id === "body")
        ?.kpis.find((kpi) => kpi.id === "health")
        ?.children.map((child) => child.id),
    );

    const wellbeing = edgeNavigationReducer(health, { type: "enter", nodeId: "general-wellbeing" });
    expect(getVisibleNodeIds(wellbeing)).toEqual([]);
  });

  it("updates selection without mutating the prior viewport", () => {
    const state = createViewport(ROOT_CAMERA);
    const next = edgeNavigationReducer(state, { type: "select", nodeId: "pressure" });

    expect(next).not.toBe(state);
    expect(next.selectedNodeId).toBe("pressure");
    expect(state.selectedNodeId).toBeNull();
    expect(next.path).toBe(state.path);
    expect(next.camera).toBe(state.camera);
    expect(next.history).toBe(state.history);
  });

  it("updates the camera without mutating the prior viewport or action pose", () => {
    const state = createViewport(ROOT_CAMERA);
    const camera: CameraPose = {
      x: 2,
      y: 3,
      z: 5,
      targetX: 1,
      targetY: 1,
      targetZ: 0,
    };
    const next = edgeNavigationReducer(state, { type: "camera", camera });

    expect(next).not.toBe(state);
    expect(next.camera).toEqual(camera);
    expect(next.camera).not.toBe(camera);
    expect(state.camera).toEqual(ROOT_CAMERA);
    expect(next.path).toBe(state.path);
    expect(next.history).toBe(state.history);
  });

  it("restores each exact camera pose through nested back actions", () => {
    const pressureCamera: CameraPose = {
      x: 4, y: 2, z: 6, targetX: 1, targetY: 0, targetZ: 0,
    };
    const adjustedPressureCamera: CameraPose = {
      x: 3, y: 2, z: 5, targetX: 1, targetY: 1, targetZ: 0,
    };
    const stressCamera: CameraPose = {
      x: 2, y: 1, z: 3, targetX: 0, targetY: 1, targetZ: 0,
    };
    const adjustedStressCamera: CameraPose = {
      x: 1, y: 1, z: 2, targetX: 0, targetY: 0, targetZ: 0,
    };
    const anxietyCamera: CameraPose = {
      x: 0, y: 0, z: 1, targetX: 0, targetY: 0, targetZ: 0,
    };

    let state = createViewport(ROOT_CAMERA);
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure", camera: pressureCamera });
    state = edgeNavigationReducer(state, { type: "camera", camera: adjustedPressureCamera });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "stress", camera: stressCamera });
    state = edgeNavigationReducer(state, { type: "camera", camera: adjustedStressCamera });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "anxiety", camera: anxietyCamera });

    state = edgeNavigationReducer(state, { type: "back" });
    expect(state.path).toEqual(["edge", "pressure", "stress"]);
    expect(state.camera).toEqual(adjustedStressCamera);

    state = edgeNavigationReducer(state, { type: "back" });
    expect(state.path).toEqual(["edge", "pressure"]);
    expect(state.camera).toEqual(adjustedPressureCamera);

    state = edgeNavigationReducer(state, { type: "back" });
    expect(state.path).toEqual(["edge"]);
    expect(state.camera).toEqual(ROOT_CAMERA);
    expect(state.history).toEqual([]);
  });

  it("returns home with the original root camera and cleared transient state", () => {
    const domainCamera: CameraPose = {
      x: 3, y: 2, z: 5, targetX: 1, targetY: 0, targetZ: 0,
    };
    const kpiCamera: CameraPose = {
      x: 1, y: 1, z: 2, targetX: 0, targetY: 0, targetZ: 0,
    };

    let state = createViewport(ROOT_CAMERA);
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure", camera: domainCamera });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "stress", camera: kpiCamera });
    state = edgeNavigationReducer(state, { type: "select", nodeId: "anxiety" });
    state = edgeNavigationReducer(state, { type: "camera", camera: { ...kpiCamera, z: 1 } });
    state = edgeNavigationReducer(state, { type: "home" });

    expect(state).toEqual({
      path: ["edge"],
      camera: ROOT_CAMERA,
      history: [],
      rootCamera: ROOT_CAMERA,
      selectedNodeId: null,
    });
  });

  it("restores the createViewport camera after a root camera change", () => {
    const adjustedRootCamera: CameraPose = {
      x: 4, y: 3, z: 7, targetX: 1, targetY: 1, targetZ: 0,
    };
    const secondAdjustedRootCamera: CameraPose = {
      x: 2, y: 4, z: 6, targetX: 0, targetY: 2, targetZ: 1,
    };
    let state = createViewport(ROOT_CAMERA);

    state = edgeNavigationReducer(state, { type: "camera", camera: adjustedRootCamera });
    state = edgeNavigationReducer(state, { type: "camera", camera: secondAdjustedRootCamera });
    state = edgeNavigationReducer(state, { type: "home" });

    expect(state.camera).toEqual(ROOT_CAMERA);
  });

  it("restores the createViewport camera when the root camera changed before first enter", () => {
    const adjustedRootCamera: CameraPose = {
      x: 4, y: 3, z: 7, targetX: 1, targetY: 1, targetZ: 0,
    };
    const pressureCamera: CameraPose = {
      x: 3, y: 2, z: 5, targetX: 1, targetY: 0, targetZ: 0,
    };
    let state = createViewport(ROOT_CAMERA);

    state = edgeNavigationReducer(state, { type: "camera", camera: adjustedRootCamera });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure", camera: pressureCamera });
    state = edgeNavigationReducer(state, { type: "home" });

    expect(state.camera).toEqual(ROOT_CAMERA);
  });

  it("freezes viewport state through every navigation transition", () => {
    const adjustedCamera: CameraPose = {
      x: 4, y: 3, z: 7, targetX: 1, targetY: 1, targetZ: 0,
    };
    let state = createViewport(ROOT_CAMERA);
    expectFrozenViewport(state);

    state = edgeNavigationReducer(state, { type: "select", nodeId: "pressure" });
    expectFrozenViewport(state);

    state = edgeNavigationReducer(state, { type: "camera", camera: adjustedCamera });
    expectFrozenViewport(state);

    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure" });
    expectFrozenViewport(state);

    state = edgeNavigationReducer(state, { type: "back" });
    expectFrozenViewport(state);

    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure" });
    state = edgeNavigationReducer(state, { type: "home" });
    expectFrozenViewport(state);
  });

  it("isolates viewport state from every caller-supplied camera", () => {
    const initialCamera = { ...ROOT_CAMERA };
    const enteredCamera = { x: 3, y: 2, z: 5, targetX: 1, targetY: 0, targetZ: 0 };
    const adjustedCamera = { x: 2, y: 1, z: 4, targetX: 0, targetY: 1, targetZ: 0 };
    let state = createViewport(initialCamera);

    initialCamera.z = 99;
    expect(state.camera).toEqual(ROOT_CAMERA);
    expect(state.rootCamera).toEqual(ROOT_CAMERA);

    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure", camera: enteredCamera });
    enteredCamera.z = 99;
    expect(state.camera.z).toBe(5);

    state = edgeNavigationReducer(state, { type: "camera", camera: adjustedCamera });
    adjustedCamera.z = 99;
    expect(state.camera.z).toBe(4);
  });
});
