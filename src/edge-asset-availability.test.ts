import { describe, expect, it, vi } from "vitest";
import { loadEdgeAssetAvailability, validateEdgeAssetAvailability } from "./edge-asset-availability";

const VALID = {
  schema: "https://hyperdrift.io/schemas/edge-asset-availability/v1",
  manifestVersion: "2.0.0",
  nodes: ["edge", "pressure", "pressure.stress"],
};

describe("Edge asset availability", () => {
  it("validates a safe versioned index", () => {
    expect([...validateEdgeAssetAvailability(VALID)!]).toEqual(VALID.nodes);
    expect(validateEdgeAssetAvailability({ ...VALID, nodes: ["edge", "../outside"] })).toBeNull();
    expect(validateEdgeAssetAvailability({ ...VALID, nodes: ["pressure"] })).toBeNull();
    expect(validateEdgeAssetAvailability({ ...VALID, manifestVersion: "1.0.0" })).toBeNull();
  });

  it("falls back to the truthful Edge root when fetching or validation fails", async () => {
    const invalid = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as Response);
    const failed = vi.fn(async () => { throw new Error("offline"); });
    expect([...(await loadEdgeAssetAvailability(invalid))]).toEqual(["edge"]);
    expect([...(await loadEdgeAssetAvailability(failed))]).toEqual(["edge"]);
    expect(invalid).toHaveBeenCalledOnce();
    expect(failed).toHaveBeenCalledOnce();
  });
});
