import { describe, expect, it } from "vitest";
import { createViewport, edgeNavigationReducer } from "./edge-navigation";
import availability from "../public/assets/edge/availability.json";
import {
  buildSceneComposition,
  getAssetFallbackIds,
  getCameraPoseForEntry,
  getEdgeNodeLabel,
  resolveAvailableAssetId,
  resolvePreviewNodeId,
} from "./edge-scene-model";

describe("Edge scene composition", () => {
  it("keeps the root current while exposing domains in ontology order", () => {
    const composition = buildSceneComposition(createViewport());

    expect(composition.current).toMatchObject({ id: "edge", assetId: "edge", label: "The Edge" });
    expect(composition.children.map((node) => node.id)).toEqual([
      "body",
      "recovery",
      "pressure",
      "structure",
      "connection",
      "renewal",
    ]);
    expect(composition.parent).toBeNull();
  });

  it("maps navigation identifiers onto their full Recraft lineage", () => {
    let viewport = createViewport();
    viewport = edgeNavigationReducer(viewport, { type: "enter", nodeId: "pressure" });
    viewport = edgeNavigationReducer(viewport, { type: "enter", nodeId: "stress" });

    const composition = buildSceneComposition(viewport);
    expect(composition.current.assetId).toBe("pressure.stress");
    expect(composition.children.map((node) => node.assetId)).toEqual([
      "pressure.stress.anxiety",
      "pressure.stress.tension",
      "pressure.stress.overwhelm",
    ]);
    expect(composition.parent?.assetId).toBe("pressure");
  });

  it("provides a truthful ancestor fallback chain for assets not generated yet", () => {
    expect(getAssetFallbackIds("pressure.stress.anxiety")).toEqual([
      "pressure.stress.anxiety",
      "pressure.stress",
      "pressure",
      "edge",
    ]);
    expect(getAssetFallbackIds("body.health.general-wellbeing")).toEqual([
      "body.health.general-wellbeing",
      "body.health",
      "body",
      "edge",
    ]);
  });

  it("resolves directly to the nearest indexed asset without probing missing paths", () => {
    const available = new Set(["edge", "pressure", "pressure.stress", "pressure.stress.anxiety"]);

    expect(resolveAvailableAssetId("body.health.general-wellbeing", available)).toBe("edge");
    expect(resolveAvailableAssetId("pressure.stress.tension", available)).toBe("pressure.stress");
    expect(resolveAvailableAssetId("pressure.stress.anxiety", available)).toBe("pressure.stress.anxiety");
  });

  it("uses the committed vertical-slice index for every current root request", () => {
    const root = buildSceneComposition(createViewport());
    const available = new Set(availability.nodes);
    expect(root.children.map((node) => resolveAvailableAssetId(node.assetId, available))).toEqual([
      "edge",
      "edge",
      "pressure",
      "edge",
      "edge",
      "edge",
    ]);
  });

  it("uses stable camera poses so reducer history can restore them exactly", () => {
    const domainCamera = getCameraPoseForEntry(1, 2);
    const kpiCamera = getCameraPoseForEntry(2, 0);
    let viewport = createViewport();
    viewport = edgeNavigationReducer(viewport, { type: "enter", nodeId: "pressure", camera: domainCamera });
    viewport = edgeNavigationReducer(viewport, { type: "enter", nodeId: "stress", camera: kpiCamera });
    viewport = edgeNavigationReducer(viewport, { type: "back" });

    expect(viewport.camera).toEqual(domainCamera);
    expect(Object.isFrozen(domainCamera)).toBe(true);
  });

  it("resolves labels at every implemented depth", () => {
    expect(getEdgeNodeLabel("edge")).toBe("The Edge");
    expect(getEdgeNodeLabel("pressure")).toBe("Pressure");
    expect(getEdgeNodeLabel("stress")).toBe("Stress");
    expect(getEdgeNodeLabel("pressure.stress.anxiety")).toBe("Anxiety");
  });

  it("exposes only a currently visible canvas node as a truthful preview", () => {
    const visible = ["body", "recovery", "pressure"];
    expect(resolvePreviewNodeId("pressure", visible)).toBe("pressure");
    expect(resolvePreviewNodeId("stress", visible)).toBeNull();
    expect(resolvePreviewNodeId(undefined, visible)).toBeNull();
  });
});
