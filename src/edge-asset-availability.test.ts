import { afterEach, describe, expect, it, vi } from "vitest";
import { validateEdgeAssetAvailability } from "./edge-asset-availability";

const VALID = {
  schema: "https://hyperdrift.io/schemas/edge-asset-availability/v1",
  manifestVersion: "2.0.0",
  nodes: ["edge", "pressure", "pressure.stress"],
};

describe("Edge asset availability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("validates a safe versioned index", () => {
    expect([...validateEdgeAssetAvailability(VALID)!]).toEqual(VALID.nodes);
    expect(validateEdgeAssetAvailability({ ...VALID, nodes: ["edge", "../outside"] })).toBeNull();
    expect(validateEdgeAssetAvailability({ ...VALID, nodes: ["pressure"] })).toBeNull();
    expect(validateEdgeAssetAvailability({ ...VALID, manifestVersion: "1.0.0" })).toBeNull();
  });

  it("falls back to the truthful Edge root when fetching or validation fails", async () => {
    const { loadEdgeAssetAvailability } = await import("./edge-asset-availability");
    const invalid = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as Response);
    const failed = vi.fn(async () => { throw new Error("offline"); });
    expect([...(await loadEdgeAssetAvailability(invalid))]).toEqual(["edge"]);
    expect([...(await loadEdgeAssetAvailability(failed))]).toEqual(["edge"]);
    expect(invalid).toHaveBeenCalledOnce();
    expect(failed).toHaveBeenCalledOnce();
  });

  it("retries transient and invalid fallbacks, then caches only a validated success", async () => {
    vi.resetModules();
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => VALID } as Response);
    const { loadEdgeAssetAvailability } = await import("./edge-asset-availability");

    expect([...(await loadEdgeAssetAvailability())]).toEqual(["edge"]);
    expect([...(await loadEdgeAssetAvailability())]).toEqual(["edge"]);
    expect([...(await loadEdgeAssetAvailability())]).toEqual(VALID.nodes);
    expect([...(await loadEdgeAssetAvailability())]).toEqual(VALID.nodes);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("shares one successful in-flight request across concurrent callers", async () => {
    vi.resetModules();
    let resolveFetch!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    const fetcher = vi.spyOn(globalThis, "fetch").mockReturnValue(response);
    const { loadEdgeAssetAvailability } = await import("./edge-asset-availability");

    const first = loadEdgeAssetAvailability();
    const second = loadEdgeAssetAvailability();
    expect(fetcher).toHaveBeenCalledOnce();
    resolveFetch({ ok: true, json: async () => VALID } as Response);

    await expect(first).resolves.toEqual(new Set(VALID.nodes));
    await expect(second).resolves.toEqual(new Set(VALID.nodes));
  });

  it("times out a stalled request without caching the fallback", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const stalled = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const { loadEdgeAssetAvailability } = await import("./edge-asset-availability");

    const pending = loadEdgeAssetAvailability(stalled, { timeoutMs: 25 });
    await vi.advanceTimersByTimeAsync(25);

    expect([...(await pending)]).toEqual(["edge"]);
    expect(stalled).toHaveBeenCalledOnce();
  });
});
