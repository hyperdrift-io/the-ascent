import manifest from "../design/recraft/edge-tree.json";

export const EDGE_ASSET_STATES = [
  "quiet",
  "available",
  "edge",
  "loaded",
  "overloaded",
] as const;

export type EdgeAssetState = (typeof EDGE_ASSET_STATES)[number];

export type EdgeAsset = {
  src: string;
  parentId: string | null;
  transitionAnchor: string;
  alt: string;
};

type AssetNode = (typeof manifest.nodes)[number];

const NODE_BY_ID = new Map<string, AssetNode>(
  manifest.nodes.map((node) => [node.nodeId, node]),
);
const VALID_STATES = new Set<string>(EDGE_ASSET_STATES);

export function getEdgeAsset(nodeId: string, state: EdgeAssetState): EdgeAsset {
  const node = NODE_BY_ID.get(nodeId);
  if (!node) throw new Error(`Unknown Edge asset node: ${nodeId}`);
  if (!VALID_STATES.has(state) || !node.states.includes(state)) {
    throw new Error(`Unknown Edge asset state: ${state}`);
  }

  return {
    src: `/assets/edge/${node.nodeId}/${state}.webp`,
    parentId: node.parentId,
    transitionAnchor: node.transitionAnchor,
    alt: node.alt,
  };
}
