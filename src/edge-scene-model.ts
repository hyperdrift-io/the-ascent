import { KPI_TREE } from "./edge-kpis";
import { getVisibleNodeIds, type CameraPose, type EdgeViewportState } from "./edge-navigation";

export type EdgeSceneNode = {
  id: string;
  assetId: string;
  label: string;
};

export type EdgeSceneComposition = {
  current: EdgeSceneNode;
  parent: EdgeSceneNode | null;
  children: EdgeSceneNode[];
};

const DOMAIN_BY_ID = new Map<string, (typeof KPI_TREE)[number]>(KPI_TREE.map((domain) => [domain.id, domain]));
const KPI_BY_ID = new Map<string, (typeof KPI_TREE)[number]["kpis"][number]>(
  KPI_TREE.flatMap((domain) => domain.kpis.map((kpi) => [kpi.id, kpi] as const)),
);
const SUB_KPI_BY_PATH = new Map<string, (typeof KPI_TREE)[number]["kpis"][number]["children"][number]>(
  KPI_TREE.flatMap((domain) => domain.kpis.flatMap((kpi) => (
    kpi.children.map((child) => [`${domain.id}.${kpi.id}.${child.id}`, child] as const)
  ))),
);

export function getEdgeNodeLabel(nodeId: string): string {
  if (nodeId === "edge") return "The Edge";
  const parts = nodeId.split(".");
  const localId = parts[parts.length - 1] ?? nodeId;
  return DOMAIN_BY_ID.get(localId)?.label ?? KPI_BY_ID.get(localId)?.label ?? SUB_KPI_BY_PATH.get(nodeId)?.label ?? nodeId;
}

function toAssetId(path: readonly string[], nodeId: string): string {
  if (path[0] !== "edge") throw new Error(`Edge scene paths must start at the Edge root: ${path.join(".")}`);
  if (nodeId === "edge" || nodeId.includes(".")) return nodeId;
  return path.length > 1 ? path.slice(1).join(".") : nodeId;
}

function describeNode(path: readonly string[], nodeId: string): EdgeSceneNode {
  const assetId = toAssetId(path, nodeId);
  return { id: nodeId, assetId, label: getEdgeNodeLabel(assetId) };
}

export function buildSceneComposition(viewport: EdgeViewportState): EdgeSceneComposition {
  const currentId = viewport.path[viewport.path.length - 1] ?? "edge";
  const parentId = viewport.path.length > 1 ? viewport.path[viewport.path.length - 2] : null;
  return {
    current: describeNode(viewport.path, currentId),
    parent: parentId ? describeNode(viewport.path.slice(0, -1), parentId) : null,
    children: getVisibleNodeIds(viewport).map((nodeId) => describeNode([...viewport.path, nodeId], nodeId)),
  };
}

export function getAssetFallbackIds(assetId: string): string[] {
  if (assetId === "edge") return ["edge"];
  const parts = assetId.split(".");
  const ids: string[] = [];
  for (let length = parts.length; length > 0; length -= 1) ids.push(parts.slice(0, length).join("."));
  ids.push("edge");
  return ids;
}

export function resolveAvailableAssetId(assetId: string, availableIds: ReadonlySet<string>): string {
  return getAssetFallbackIds(assetId).find((candidate) => availableIds.has(candidate)) ?? "edge";
}

export function resolvePreviewNodeId(candidate: unknown, visibleNodeIds: readonly string[]): string | null {
  return typeof candidate === "string" && visibleNodeIds.includes(candidate) ? candidate : null;
}

export function getCameraPoseForEntry(depth: number, siblingIndex: number): CameraPose {
  const angle = siblingIndex * 0.72;
  const drift = Math.min(depth, 3) * 0.16;
  return Object.freeze({
    x: Number((Math.cos(angle) * drift).toFixed(3)),
    y: Number((Math.sin(angle) * drift).toFixed(3)),
    z: Number(Math.max(4.45, 8 - depth * 1.15).toFixed(3)),
    targetX: Number((Math.cos(angle) * drift * 0.35).toFixed(3)),
    targetY: Number((Math.sin(angle) * drift * 0.35).toFixed(3)),
    targetZ: 0,
  });
}
