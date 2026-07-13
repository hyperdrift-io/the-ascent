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

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects the non-finite reading %s without changing persisted history",
    (value) => {
      const stored = saveDailyReading(createEdgeProfile("2026-07-12"), {
        date: "2026-07-12",
        path: "recovery.sleep.quality",
        value: 72,
      });

      const result = saveDailyReading(stored, {
        date: "2026-07-13",
        path: "pressure.stress.anxiety",
        value,
      });

      expect(result).toBe(stored);
      expect(loadEdgeProfile("2026-07-13")).toEqual(stored);
    },
  );

  it.each([
    "pressure/stress/anxiety",
    "recovery.stress.anxiety",
    "pressure.stress.invented-signal",
  ])("rejects the non-canonical daily path %s without persisting it", (path) => {
    const stored = saveDailyReading(createEdgeProfile("2026-07-12"), {
      date: "2026-07-12",
      path: "recovery.sleep.quality",
      value: 72,
    });

    const result = saveDailyReading(stored, {
      date: "2026-07-13",
      path: path as never,
      value: 68,
    });

    expect(result).toBe(stored);
    expect(loadEdgeProfile("2026-07-13")).toEqual(stored);
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

  it.each([
    ["malformed path", { date: "2026-07-13", paths: ["pressure/stress/anxiety"], aim: "Deliver the talk" }],
    ["wrong-domain path", { date: "2026-07-13", paths: ["recovery.stress.anxiety"], aim: "Deliver the talk" }],
    ["invented path", { date: "2026-07-13", paths: ["pressure.stress.invented-signal"], aim: "Deliver the talk" }],
    ["empty paths", { date: "2026-07-13", paths: [], aim: "Deliver the talk" }],
    ["blank date", { date: "   ", paths: ["pressure.stress.anxiety"], aim: "Deliver the talk" }],
    ["blank aim", { date: "2026-07-13", paths: ["pressure.stress.anxiety"], aim: "   " }],
  ])("rejects an invalid recommendation write without persisting it: %s", (_label, recommendation) => {
    const stored = confirmRecommendation(createEdgeProfile("2026-07-12"), {
      date: "2026-07-12",
      paths: ["recovery.sleep.quality"],
      aim: "Recover well",
    });

    const result = confirmRecommendation(stored, {
      ...recommendation,
      paths: recommendation.paths as never,
    });

    expect(result).toBe(stored);
    expect(loadEdgeProfile("2026-07-13")).toEqual(stored);
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

  it("merges distinct completions from stale profile snapshots", () => {
    const enabled = setAthleticMode(createEdgeProfile("2026-07-12"), true);
    const stale = structuredClone(enabled);
    completeAthleticWeekrun(enabled, "run-1");

    const merged = completeAthleticWeekrun(stale, "run-2");

    expect(merged.athletic).toEqual({
      enabled: true,
      completed: 2,
      runIds: ["run-1", "run-2"],
    });
  });

  it("caps a single Athletic season at 52 completed Weekruns", () => {
    let profile = setAthleticMode(createEdgeProfile("2026-07-12"), true);
    for (let index = 1; index <= 53; index += 1) {
      profile = completeAthleticWeekrun(profile, `run-${index}`);
    }

    expect(profile.athletic.completed).toBe(52);
    expect(profile.athletic.runIds).toHaveLength(52);
    expect(profile.athletic.runIds).not.toContain("run-53");
  });

  it.each(["summit-attempt", "complete", "recon"])(
    "counts the stable ID from a %s ending exactly once",
    (ending) => {
      const athletic = setAthleticMode(createEdgeProfile("2026-07-12"), true);
      const runId = `run-${ending}`;
      const once = completeAthleticWeekrun(athletic, runId);
      const twice = completeAthleticWeekrun(once, runId);

      expect(twice.athletic).toEqual({ enabled: true, completed: 1, runIds: [runId] });
    },
  );

  it.each(["", "   "])("rejects the blank Weekrun ID %j without changing persisted history", (runId) => {
    const athletic = setAthleticMode(createEdgeProfile("2026-07-12"), true);

    const result = completeAthleticWeekrun(athletic, runId);

    expect(result).toBe(athletic);
    expect(loadEdgeProfile("2026-07-13")).toEqual(athletic);
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

  it.each([
    ["a malformed daily path", {
      daily: { "2026-07-12": { "pressure/stress/anxiety": 68 } },
    }],
    ["a wrong-domain daily path", {
      daily: { "2026-07-12": { "recovery.stress.anxiety": 68 } },
    }],
    ["an invented daily path", {
      daily: { "2026-07-12": { "pressure.stress.invented-signal": 68 } },
    }],
    ["a malformed recommendation path", {
      recommendations: [{
        date: "2026-07-12",
        paths: ["pressure/stress/anxiety"],
        aim: "Deliver the talk",
      }],
    }],
    ["a wrong-domain recommendation path", {
      recommendations: [{
        date: "2026-07-12",
        paths: ["recovery.stress.anxiety"],
        aim: "Deliver the talk",
      }],
    }],
    ["an invented recommendation path", {
      recommendations: [{
        date: "2026-07-12",
        paths: ["pressure.stress.invented-signal"],
        aim: "Deliver the talk",
      }],
    }],
    ["an empty recommendation path list", {
      recommendations: [{
        date: "2026-07-13",
        paths: [],
        aim: "Deliver the talk",
      }],
    }],
    ["a blank recommendation date", {
      recommendations: [{
        date: "   ",
        paths: ["pressure.stress.anxiety"],
        aim: "Deliver the talk",
      }],
    }],
    ["a blank recommendation aim", {
      recommendations: [{
        date: "2026-07-12",
        paths: ["pressure.stress.anxiety"],
        aim: "   ",
      }],
    }],
    ["a blank Weekrun ID", {
      athletic: { enabled: true, completed: 1, runIds: ["   "] },
    }],
  ])("returns a fresh profile for stored state containing %s", (_label, override) => {
    localStorage.setItem(EDGE_PROFILE_KEY, JSON.stringify({
      ...createEdgeProfile("2026-07-12"),
      ...override,
    }));

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
