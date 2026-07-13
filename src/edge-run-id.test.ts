import { beforeEach, describe, expect, it } from "vitest";
import { createMissionRun, loadRun } from "./edge";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("Weekrun identity", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: memoryStorage(),
    });
  });

  it("keeps an explicitly supplied run ID for the full persisted run", () => {
    const run = createMissionRun("Deliver the talk", undefined, undefined, "2026-07-13", "run-stable-1");
    expect((run as unknown as { runId?: string }).runId).toBe("run-stable-1");
  });

  it("hydrates a deterministic ID into a legacy save without one", () => {
    const run = createMissionRun("Deliver the talk", undefined, undefined, "2026-07-13", "discarded");
    const legacy = { ...run } as Record<string, unknown>;
    delete legacy.runId;
    localStorage.setItem("edge.run.v1", JSON.stringify(legacy));

    const first = loadRun("2026-07-14");
    const second = loadRun("2026-07-14");
    expect(first?.runId).toMatch(/^legacy-/);
    expect(second?.runId).toBe(first?.runId);
  });
});
