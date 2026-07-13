import { describe, expect, it } from "vitest";
import manifest from "../design/recraft/edge-tree.json";
import { getEdgeAsset } from "./edge-assets";
import { searchKpis } from "./edge-kpis";

const EXPECTED_STATES = ["quiet", "available", "edge", "loaded", "overloaded"];
const DOMAIN_IDS = ["body", "recovery", "pressure", "structure", "connection", "renewal"];

describe("Edge asset manifest", () => {
  it("inventories exactly the Edge, six domains, fifteen core KPIs, and forty-five sub-KPIs", () => {
    const ids = manifest.nodes.map((node) => node.nodeId);
    const ontologyPaths = searchKpis("").map((result) => result.path);

    expect(ids).toHaveLength(67);
    expect(new Set(ids).size).toBe(67);
    expect(ids).toEqual(expect.arrayContaining(["edge", ...DOMAIN_IDS, ...ontologyPaths]));
  });

  it("gives every non-root node its stable ontology parent", () => {
    const nodes = new Map(manifest.nodes.map((node) => [node.nodeId, node]));

    expect(nodes.get("edge")?.parentId).toBeNull();
    for (const domainId of DOMAIN_IDS) expect(nodes.get(domainId)?.parentId).toBe("edge");

    for (const result of searchKpis("")) {
      const parts = result.path.split(".");
      const parentId = parts.slice(0, -1).join(".");
      expect(nodes.get(result.path)?.parentId).toBe(parentId);
    }
  });

  it("documents complete visual DNA, study links, and the five exact states", () => {
    for (const node of manifest.nodes) {
      expect(node.force.trim().length).toBeGreaterThan(8);
      expect(node.fractalFamily.trim().length).toBeGreaterThan(15);
      expect(node.palette.length).toBeGreaterThanOrEqual(3);
      expect(new Set(node.palette).size).toBe(node.palette.length);
      expect(node.palette.every((colour) => colour.trim().length > 3)).toBe(true);
      expect(node.transitionAnchor.trim().length).toBeGreaterThan(10);
      expect(node.wikipedia).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      expect(node.states).toEqual(EXPECTED_STATES);
      expect(node.alt.trim().length).toBeGreaterThan(20);
      expect(node.alt.toLowerCase()).not.toMatch(/\byou\b/);
    }
  });

  it("inherits each child's fractal family from its parent", () => {
    const nodes = new Map(manifest.nodes.map((node) => [node.nodeId, node]));

    for (const node of manifest.nodes.filter((item) => item.parentId !== null)) {
      const parent = nodes.get(node.parentId);
      expect(parent).toBeDefined();
      expect(node.fractalFamily.startsWith(`${parent?.fractalFamily};`)).toBe(true);
    }
  });
});

describe("getEdgeAsset", () => {
  it("derives app-local paths and transition metadata from the manifest", () => {
    expect(getEdgeAsset("pressure.stress.anxiety", "loaded")).toEqual({
      src: "/assets/edge/pressure.stress.anxiety/loaded.webp",
      parentId: "pressure.stress",
      transitionAnchor: "the central spiral cloud boundary tightening into nested storm bands",
      alt: "Storm pressure gathers around a nested spiral cloud boundary.",
    });
  });

  it("uses useful scene descriptions without diagnosing the person", () => {
    const alt = getEdgeAsset("pressure.stress.anxiety", "overloaded").alt.toLowerCase();

    expect(alt).toContain("storm pressure");
    expect(alt).not.toContain("anxiety");
    expect(alt).not.toContain("diagnosis");
    expect(alt).not.toContain("you");
  });

  it("rejects unknown nodes and states without constructing unsafe paths", () => {
    expect(() => getEdgeAsset("../outside", "quiet")).toThrowError("Unknown Edge asset node");
    expect(() => getEdgeAsset("pressure.stress.anxiety", "unknown" as never)).toThrowError(
      "Unknown Edge asset state",
    );
  });
});
