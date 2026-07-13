import { describe, expect, it } from "vitest";
import type { HumanResource } from "./edge";
import { adaptMorningScanToEdge, buildEdgeRecommendations, buildWeekrunHeader, deriveTodayEdgeSnapshot } from "./weekrun-edge";

const RESOURCES: Record<HumanResource, number> = {
  energy: 68, focus: 64, composure: 66, confidence: 62, recovery: 70, connection: 65, time: 60,
};

describe("Weekrun Edge integration", () => {
  it("keeps route readiness separate from Edge state", () => {
    expect(buildWeekrunHeader({ edgeState: "balanced", edgeValue: 68, readiness: 31 })).toEqual({
      edgeLabel: "Balanced 68",
      readinessLabel: "Route readiness 31%",
    });
  });

  it("uses post-scan resources without inventing generic KPI readings", () => {
    const resources = { ...RESOURCES, recovery: 42 };
    const snapshot = adaptMorningScanToEdge(resources);
    expect(snapshot.resources.recovery).toBe(42);
    expect(snapshot.explicitReadingCount).toBe(0);
    expect(resources).toEqual({ ...RESOURCES, recovery: 42 });
  });

  it("reads explicit daily signals according to honest orientation", () => {
    const base = deriveTodayEdgeSnapshot({ resources: RESOURCES });
    const highAnxiety = deriveTodayEdgeSnapshot({
      resources: RESOURCES,
      explicitDailyReadings: { "pressure.stress.anxiety": 96 },
    });
    const lowIllnessLoad = deriveTodayEdgeSnapshot({
      resources: RESOURCES,
      explicitDailyReadings: { "body.health.illness-load": 5 },
    });
    expect(highAnxiety.orientationValue).toBeLessThan(base.orientationValue);
    expect(lowIllnessLoad.orientationValue).toBeGreaterThanOrEqual(base.orientationValue);
  });

  it("uses overextended only when present demand materially exceeds capacity", () => {
    const snapshot = deriveTodayEdgeSnapshot({
      resources: { energy: 35, focus: 30, composure: 20, confidence: 32, recovery: 20, connection: 45, time: 15 },
    });
    expect(snapshot.demand - snapshot.capacity).toBeGreaterThanOrEqual(18);
    expect(snapshot.state).toBe("overextended");
  });

  it("uses intuitive stable bands for high and usable-middle capacity", () => {
    expect(deriveTodayEdgeSnapshot({ resources: RESOURCES }).state).toBe("available");
    expect(deriveTodayEdgeSnapshot({
      resources: { energy: 58, focus: 58, composure: 58, confidence: 58, recovery: 58, connection: 58, time: 58 },
    }).state).toBe("balanced");
  });

  it("recommends at most three fixed paths with evidence", () => {
    const recommendations = buildEdgeRecommendations("Deliver the talk", { ...RESOURCES, composure: 38, recovery: 44 });
    expect(recommendations.length).toBeLessThanOrEqual(3);
    expect(recommendations.every((item) => item.path.includes(".") && item.evidence.length > 30)).toBe(true);
  });

  it("explains each recommendation with the resource that selected that path", () => {
    const recommendations = buildEdgeRecommendations("Prepare", {
      ...RESOURCES,
      composure: 20,
      recovery: 30,
    });

    expect(recommendations.map((item) => [item.path, item.evidence])).toEqual([
      ["pressure.stress.anxiety", expect.stringContaining("Composure is 20")],
      ["pressure.stress.tension", expect.stringContaining("Composure is 20")],
      ["recovery.rest.relaxation", expect.stringContaining("Composure is 20")],
    ]);
  });
});
