import { describe, expect, it } from "vitest";
import manifest from "../design/recraft/edge-tree.json";
import { getEdgeAsset } from "./edge-assets";
import { searchKpis } from "./edge-kpis";

const EXPECTED_STATES = ["quiet", "available", "edge", "loaded", "overloaded"];
const DOMAIN_IDS = ["body", "recovery", "pressure", "structure", "connection", "renewal"];
const SUB_KPI_TEMPLATE_PHRASES = [
  /current within/i,
  /patterns repeat as finer living geography/i,
  /resolving into a smaller .* chamber/i,
  /appears as a natural current around/i,
];

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
      expect(node.palette.join(" ")).not.toMatch(/placeholder|primary|secondary|accent|colou?r\s*\d/i);
      expect(node.transitionAnchor.trim().length).toBeGreaterThan(10);
      expect(node.wikipedia).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      expect(node.states).toEqual(EXPECTED_STATES);
      expect(node.alt.trim().length).toBeGreaterThan(20);
      expect(node.alt.toLowerCase()).not.toMatch(/\byou\b/);
      expect(node.promptIntent.trim().length).toBeGreaterThan(30);
      expect(node.accessibilityPurpose.trim().length).toBeGreaterThan(30);
    }
  });

  it("declares reproducible generator and accessibility provenance", () => {
    expect(manifest.schema).toBe("https://hyperdrift.io/schemas/edge-recraft-tree/v2");
    expect(manifest.version).toMatch(/^2\./);
    expect(manifest.generator.path).toBe("../../../scripts/generate-recraft-asset.mjs");
    expect(manifest.generator.model).toBe("recraftv4");
    expect(manifest.generator.size).toBe("1024x1024");
    expect(manifest.generator.masterStrategy).toContain("one Recraft master composition per node");
    expect(manifest.generator.promptTemplateVersion).toMatch(/^2\./);
    expect(manifest.generator.promptTemplateIntent.length).toBeGreaterThan(40);
    expect(manifest.generator.outputPattern).toBe("public/assets/edge/{nodeId}/{state}.webp");
    expect(Object.keys(manifest.generator.stateTreatment)).toEqual(EXPECTED_STATES);
    expect(manifest.generator.accessibilityPurpose.length).toBeGreaterThan(40);
  });

  it("authors every sub-KPI as a distinct natural process rather than a label template", () => {
    const subKpis = manifest.nodes.filter((node) => node.nodeId.split(".").length === 3);
    expect(subKpis).toHaveLength(45);

    for (const node of subKpis) {
      const authoredFields = [node.force, node.fractalFamily, node.transitionAnchor, node.alt];
      for (const field of authoredFields) {
        for (const phrase of SUB_KPI_TEMPLATE_PHRASES) expect(field).not.toMatch(phrase);
      }
    }

    for (const field of ["force", "fractalFamily", "transitionAnchor", "alt", "promptIntent"] as const) {
      expect(new Set(subKpis.map((node) => node[field].trim().toLowerCase())).size).toBe(subKpis.length);
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
      transitionAnchor: "the central spiral cloud boundary extending into three forward-reaching wind arcs",
      alt: "Fine anticipatory winds reach ahead from a nested spiral storm boundary.",
    });
  });

  it("uses useful scene descriptions without diagnosing the person", () => {
    const alt = getEdgeAsset("pressure.stress.anxiety", "overloaded").alt.toLowerCase();

    expect(alt).toContain("anticipatory winds");
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
