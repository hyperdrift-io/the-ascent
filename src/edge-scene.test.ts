import { describe, expect, it } from "vitest";
import { createViewport, edgeNavigationReducer } from "./edge-navigation";
import {
  buildSceneComposition,
  getAssetFallbackIds,
  getCameraPoseForEntry,
  getEdgeNodeLabel,
} from "./edge-scene";

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
});
