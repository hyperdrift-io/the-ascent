import { describe, expect, it } from "vitest";
import {
  CORE_KPI_IDS,
  DOMAIN_KPIS,
  KPI_TREE,
  SUB_KPI_IDS,
  getStudyResource,
  matchKpiRecommendations,
  recommendKpiSubset,
  searchKpis,
} from "./edge-kpis";
import { createMissionRun } from "./edge";

describe("The Edge KPI tree", () => {
  it("keeps the canonical root registry exact", () => {
    expect(CORE_KPI_IDS).toEqual([
      "health", "stamina", "sleep", "stress", "nutrition", "cardio",
      "work", "commute", "routine", "sport", "rest", "travel",
      "social", "entertainment", "family",
    ]);
  });

  it("uses the canonical registry for Weekrun core metrics", () => {
    expect(Object.keys(createMissionRun("Keep moving").coreMetrics)).toEqual(CORE_KPI_IDS);
  });

  it("keeps every sub-KPI attached to a canonical parent", () => {
    const treeKpiIds = KPI_TREE.flatMap((domain) => domain.kpis.map((kpi) => kpi.id));
    expect(treeKpiIds).toHaveLength(CORE_KPI_IDS.length);
    expect(new Set(treeKpiIds)).toEqual(new Set(CORE_KPI_IDS));

    for (const domain of KPI_TREE) {
      for (const kpi of domain.kpis) {
        expect(CORE_KPI_IDS).toContain(kpi.id);
        expect(kpi.children.map((child) => child.id)).toEqual(SUB_KPI_IDS[kpi.id]);
        for (const child of kpi.children) expect(child.parentId).toBe(kpi.id);
      }
    }
  });

  it("keeps every canonical domain and sub-KPI path exact", () => {
    expect(DOMAIN_KPIS).toEqual({
      body: ["health", "stamina", "nutrition", "cardio", "sport"],
      recovery: ["sleep", "rest"],
      pressure: ["stress"],
      structure: ["work", "commute", "routine", "travel"],
      connection: ["social", "family"],
      renewal: ["entertainment"],
    });
    expect(SUB_KPI_IDS).toEqual({
      health: ["general-wellbeing", "physical-comfort", "illness-load"],
      stamina: ["sustained-effort", "physical-endurance", "mental-endurance"],
      sleep: ["duration", "quality", "regularity"],
      stress: ["anxiety", "tension", "overwhelm"],
      nutrition: ["nourishment", "hydration", "regularity"],
      cardio: ["breath", "aerobic-capacity", "exertion-response"],
      work: ["workload", "motivation", "autonomy"],
      commute: ["duration", "friction", "predictability"],
      routine: ["consistency", "adaptability", "activation"],
      sport: ["movement", "motivation", "enjoyment"],
      rest: ["detachment", "relaxation", "quiet"],
      travel: ["disruption", "novelty", "recovery-cost"],
      social: ["support", "belonging", "relational-energy"],
      entertainment: ["enjoyment", "restoration", "stimulation"],
      family: ["support", "closeness", "responsibility-load"],
    });
  });

  it("freezes the fixed registries and complete tree at runtime", () => {
    expect(Object.isFrozen(CORE_KPI_IDS)).toBe(true);
    expect(Object.isFrozen(DOMAIN_KPIS)).toBe(true);
    expect(Object.values(DOMAIN_KPIS).every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(SUB_KPI_IDS)).toBe(true);
    expect(Object.values(SUB_KPI_IDS).every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(KPI_TREE)).toBe(true);

    for (const domain of KPI_TREE) {
      expect(Object.isFrozen(domain)).toBe(true);
      expect(Object.isFrozen(domain.kpis)).toBe(true);
      for (const kpi of domain.kpis) {
        expect(Object.isFrozen(kpi)).toBe(true);
        expect(Object.isFrozen(kpi.children)).toBe(true);
        expect(kpi.children.every(Object.isFrozen)).toBe(true);
      }
    }
  });

  it("returns contextual motivation branches", () => {
    expect(searchKpis("motivation").map((item) => item.path)).toEqual(
      expect.arrayContaining(["structure.work.motivation", "body.sport.motivation"]),
    );
  });

  it("searches labels, synonyms, and full paths case-insensitively", () => {
    expect(searchKpis("")).toHaveLength(60);
    expect(searchKpis("PHYSICAL COMFORT")[0].path).toBe("body.health.physical-comfort");
    expect(searchKpis("HOURS SLEPT")[0].path).toBe("recovery.sleep.duration");
    expect(searchKpis("PRESSURE.STRESS.ANXIETY")[0].path).toBe("pressure.stress.anxiety");
  });

  it("keeps anxiety under stress", () => {
    expect(searchKpis("anxiety")[0].path).toBe("pressure.stress.anxiety");
  });

  it("recommends only fixed tree nodes", () => {
    const context = { aim: "deliver a talk", lowResources: ["composure"] } as const;
    const results = recommendKpiSubset(context);
    const known = new Set(searchKpis("").map((item) => item.path));
    expect(results.every((item) => known.has(item.path))).toBe(true);
    expect(recommendKpiSubset(context)).toEqual(results);
  });

  it("prioritizes aim matches without losing their resource evidence", () => {
    const matches = matchKpiRecommendations({
      aim: "Deliver the talk",
      lowResources: ["energy", "focus", "composure", "confidence", "recovery", "connection", "time"],
    });

    expect(matches).toHaveLength(5);
    expect(matches.slice(0, 3).map((match) => match.result.path)).toEqual([
      "pressure.stress.anxiety",
      "structure.work.motivation",
      "connection.social.support",
    ]);
    expect(matches.slice(0, 3).every((match) => match.aimMatched)).toBe(true);
    expect(matches[0].resources).toContain("composure");
    expect(matches[1].resources).toContain("confidence");
    expect(matches[2].resources).toEqual(expect.arrayContaining(["confidence", "connection"]));
  });

  it("maps study links to Wikipedia without creating progression state", () => {
    expect(getStudyResource("pressure.stress.anxiety")).toMatchObject({
      href: "https://en.wikipedia.org/wiki/Arousal",
      source: "Wikipedia",
    });
  });
});
