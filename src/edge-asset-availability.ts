const AVAILABILITY_URL = "/assets/edge/availability.json";
const AVAILABILITY_SCHEMA = "https://hyperdrift.io/schemas/edge-asset-availability/v1";
const SAFE_NODE_ID = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const EDGE_ONLY = new Set<string>(["edge"]);
const DEFAULT_TIMEOUT_MS = 5_000;

let cachedAvailability: ReadonlySet<string> | null = null;
let pendingAvailability: Promise<ReadonlySet<string>> | null = null;

export type EdgeAssetAvailabilityOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export function validateEdgeAssetAvailability(value: unknown): ReadonlySet<string> | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { schema?: unknown; manifestVersion?: unknown; nodes?: unknown };
  if (candidate.schema !== AVAILABILITY_SCHEMA) return null;
  if (typeof candidate.manifestVersion !== "string" || !/^2\./.test(candidate.manifestVersion)) return null;
  if (!Array.isArray(candidate.nodes) || candidate.nodes.length === 0) return null;
  if (!candidate.nodes.every((node) => typeof node === "string" && SAFE_NODE_ID.test(node))) return null;
  if (candidate.nodes[0] !== "edge" || new Set(candidate.nodes).size !== candidate.nodes.length) return null;
  return new Set(candidate.nodes);
}

async function fetchAvailability(
  fetcher: typeof fetch,
  options: EdgeAssetAvailabilityOptions,
): Promise<{ availability: ReadonlySet<string>; validated: boolean }> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetcher(AVAILABILITY_URL, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return { availability: EDGE_ONLY, validated: false };
    const availability = validateEdgeAssetAvailability(await response.json());
    return availability
      ? { availability, validated: true }
      : { availability: EDGE_ONLY, validated: false };
  } catch {
    return { availability: EDGE_ONLY, validated: false };
  } finally {
    globalThis.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function loadEdgeAssetAvailability(
  fetcher: typeof fetch = globalThis.fetch,
  options: EdgeAssetAvailabilityOptions = {},
): Promise<ReadonlySet<string>> {
  const shared = fetcher === globalThis.fetch && !options.signal;
  if (!shared) return fetchAvailability(fetcher, options).then(({ availability }) => availability);
  if (cachedAvailability) return Promise.resolve(cachedAvailability);
  if (pendingAvailability) return pendingAvailability;

  pendingAvailability = fetchAvailability(fetcher, options)
    .then((result) => {
      if (result.validated) cachedAvailability = result.availability;
      return result.availability;
    })
    .finally(() => {
      pendingAvailability = null;
    });
  return pendingAvailability;
}
