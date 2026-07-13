import availability from "../public/assets/edge/availability.json";
import { resolveAvailableAssetId } from "./edge-scene-model";

const AVAILABLE_ASSET_IDS = new Set<string>(availability.nodes);

export function resolveEdgeAssetId(assetId: string): string {
  return resolveAvailableAssetId(assetId, AVAILABLE_ASSET_IDS);
}
