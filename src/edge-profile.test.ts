import { beforeEach, describe, expect, it } from "vitest";
import {
  EDGE_PROFILE_KEY,
  completeAthleticWeekrun,
  confirmRecommendation,
  createEdgeProfile,
  loadEdgeProfile,
  saveDailyReading,
  setAthleticMode,
} from "./edge-profile";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("Edge profile", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: memoryStorage(),
    });
  });

  it("creates a versioned foundation with neutral resource baselines", () => {
    expect(createEdgeProfile("2026-07-12")).toEqual({
      version: 1,
      baselines: {
        energy: 60,
        focus: 60,
        composure: 60,
        confidence: 60,
        recovery: 60,
        connection: 60,
        time: 60,
      },
      daily: { "2026-07-12": {} },
      recommendations: [],
      athletic: { enabled: false, completed: 0, runIds: [] },
    });
  });

  it("stores daily readings without rewriting the baseline", () => {
    const profile = createEdgeProfile("2026-07-12");
    const next = saveDailyReading(profile, {
      date: "2026-07-12",
      path: "pressure.stress.anxiety",
      value: 68,
    });

    expect(next).not.toBe(profile);
    expect(next.baselines).toEqual(profile.baselines);
    expect(next.daily["2026-07-12"]["pressure.stress.anxiety"]).toBe(68);
    expect(loadEdgeProfile("2026-07-13")).toEqual(next);
  });

  it("clamps readings and preserves values recorded on other days", () => {
    const first = saveDailyReading(createEdgeProfile("2026-07-12"), {
      date: "2026-07-12",
      path: "recovery.sleep.quality",
      value: 120,
    });
    const second = saveDailyReading(first, {
      date: "2026-07-13",
      path: "body.health",
      value: -8,
    });

    expect(second.daily["2026-07-12"]["recovery.sleep.quality"]).toBe(100);
    expect(second.daily["2026-07-13"]["body.health"]).toBe(0);
  });

  it("confirms normalized recommendations and ignores exact duplicates", () => {
    const profile = createEdgeProfile("2026-07-12");
    const once = confirmRecommendation(profile, {
      date: "2026-07-12",
      paths: ["pressure.stress.anxiety", "recovery.sleep.quality", "pressure.stress.anxiety"],
      aim: "Deliver the talk",
    });
    const duplicate = confirmRecommendation(once, {
      date: "2026-07-12",
      paths: ["recovery.sleep.quality", "pressure.stress.anxiety"],
      aim: "Deliver the talk",
    });

    expect(once.recommendations).toEqual([{
      date: "2026-07-12",
      paths: ["pressure.stress.anxiety", "recovery.sleep.quality"],
      aim: "Deliver the talk",
    }]);
    expect(duplicate.recommendations).toEqual(once.recommendations);
    expect(loadEdgeProfile("2026-07-13")).toEqual(duplicate);
  });

  it("keeps distinct recommendation decisions in history", () => {
    const first = confirmRecommendation(createEdgeProfile("2026-07-12"), {
      date: "2026-07-12",
      paths: ["pressure.stress.anxiety"],
      aim: "Deliver the talk",
    });
    const second = confirmRecommendation(first, {
      date: "2026-07-13",
      paths: ["pressure.stress.anxiety"],
      aim: "Deliver the talk",
    });

    expect(second.recommendations).toHaveLength(2);
  });

  it("counts completed Weekruns only in Athletic Mode", () => {
    const defaultProfile = createEdgeProfile("2026-07-12");
    expect(completeAthleticWeekrun(defaultProfile, "run-1").athletic).toEqual({
      enabled: false,
      completed: 0,
      runIds: [],
    });

    const athletic = setAthleticMode(defaultProfile, true);
    expect(completeAthleticWeekrun(athletic, "run-1").athletic).toEqual({
      enabled: true,
      completed: 1,
      runIds: ["run-1"],
    });
  });

  it("does not double count a Weekrun", () => {
    const athletic = setAthleticMode(createEdgeProfile("2026-07-12"), true);
    const once = completeAthleticWeekrun(athletic, "run-1");

    expect(completeAthleticWeekrun(once, "run-1").athletic).toEqual(once.athletic);
  });

  it("preserves Athletic Mode history while disabled", () => {
    const enabled = setAthleticMode(createEdgeProfile("2026-07-12"), true);
    const completed = completeAthleticWeekrun(enabled, "run-1");
    const disabled = setAthleticMode(completed, false);
    const ignored = completeAthleticWeekrun(disabled, "run-2");

    expect(ignored.athletic).toEqual({ enabled: false, completed: 1, runIds: ["run-1"] });
    expect(setAthleticMode(ignored, true).athletic).toEqual({
      enabled: true,
      completed: 1,
      runIds: ["run-1"],
    });
  });

  it("loads valid versioned state", () => {
    const stored = completeAthleticWeekrun(
      setAthleticMode(createEdgeProfile("2026-07-12"), true),
      "run-1",
    );
    localStorage.setItem(EDGE_PROFILE_KEY, JSON.stringify(stored));

    expect(loadEdgeProfile("2026-07-13")).toEqual(stored);
  });

  it("uses the local day when loading without an explicit date", () => {
    expect(Object.keys(loadEdgeProfile().daily)).toEqual([
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ]);
  });

  it.each([
    ["invalid JSON", "{"],
    ["the wrong version", JSON.stringify({ version: 2 })],
    ["an invalid profile shape", JSON.stringify({ version: 1, baselines: {} })],
  ])("returns a fresh profile for %s", (_label, stored) => {
    localStorage.setItem(EDGE_PROFILE_KEY, stored);

    expect(loadEdgeProfile("2026-07-13")).toEqual(createEdgeProfile("2026-07-13"));
  });

  it("treats unavailable storage as nonfatal", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("storage unavailable");
      },
    });

    const profile = createEdgeProfile("2026-07-12");
    expect(() => saveDailyReading(profile, {
      date: "2026-07-12",
      path: "pressure.stress.anxiety",
      value: 68,
    })).not.toThrow();
    expect(loadEdgeProfile("2026-07-13")).toEqual(createEdgeProfile("2026-07-13"));
  });
});
