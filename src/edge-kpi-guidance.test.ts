import { describe, expect, it } from "vitest";
import { EDGE_KPI_GUIDANCE } from "./edge-kpi-guidance";
import { searchKpis } from "./edge-kpis";

describe("fixed sub-KPI guidance", () => {
  const subPaths = searchKpis("").filter((result) => result.source === "sub").map((result) => result.path).sort();

  it("covers every immutable sub-KPI exactly once", () => {
    expect(EDGE_KPI_GUIDANCE).toHaveLength(45);
    expect(EDGE_KPI_GUIDANCE.map((item) => item.path).sort()).toEqual(subPaths);
    expect(new Set(EDGE_KPI_GUIDANCE.map((item) => item.path)).size).toBe(45);
  });

  it("uses individually authored directional guidance without placeholders", () => {
    const lines = EDGE_KPI_GUIDANCE.flatMap((item) => [item.lower, item.higher]);
    expect(new Set(lines).size).toBe(90);
    expect(lines.every((line) => line.length >= 38 && !/lorem|good|bad|improve this|generic/i.test(line))).toBe(true);
  });

  it("keeps pressure and load signals honest rather than scoring high as good", () => {
    const byPath = new Map(EDGE_KPI_GUIDANCE.map((item) => [item.path, item.orientation]));
    expect(byPath.get("pressure.stress.anxiety")).toBe("balanced");
    expect(byPath.get("pressure.stress.overwhelm")).toBe("lower-supports");
    expect(byPath.get("recovery.sleep.duration")).toBe("balanced");
    expect(byPath.get("structure.work.workload")).toBe("balanced");
    expect(byPath.get("body.health.illness-load")).toBe("lower-supports");
  });

  it("speaks about conditions and calls without diagnosis or shame", () => {
    const copy = EDGE_KPI_GUIDANCE.flatMap((item) => [item.lower, item.higher]).join(" ").toLowerCase();
    expect(copy).not.toMatch(/diagnos|disorder|you failed|lazy|weak|broken|falling behind|wrong with you/);
  });
});
