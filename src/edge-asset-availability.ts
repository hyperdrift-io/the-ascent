const AVAILABILITY_URL = "/assets/edge/availability.json";
const AVAILABILITY_SCHEMA = "https://hyperdrift.io/schemas/edge-asset-availability/v1";
const SAFE_NODE_ID = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const EDGE_ONLY = new Set<string>(["edge"]);

let cachedAvailability: Promise<ReadonlySet<string>> | null = null;

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

async function fetchAvailability(fetcher: typeof fetch): Promise<ReadonlySet<string>> {
  try {
    const response = await fetcher(AVAILABILITY_URL, { headers: { accept: "application/json" } });
    if (!response.ok) return EDGE_ONLY;
    return validateEdgeAssetAvailability(await response.json()) ?? EDGE_ONLY;
  } catch {
    return EDGE_ONLY;
  }
}

export function loadEdgeAssetAvailability(fetcher: typeof fetch = globalThis.fetch): Promise<ReadonlySet<string>> {
  if (fetcher !== globalThis.fetch) return fetchAvailability(fetcher);
  cachedAvailability ??= fetchAvailability(fetcher);
  return cachedAvailability;
}
