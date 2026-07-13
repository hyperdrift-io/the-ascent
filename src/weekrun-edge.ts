import type { HumanResource } from "./edge";
import { getKpiGuidance } from "./edge-kpi-guidance";
import { recommendKpiSubset, type KpiSearchResult, type RecommendationContext } from "./edge-kpis";

export type EdgeCapacityState = "balanced" | "available" | "loaded" | "restoring" | "overextended";

export type EdgeDomainPreview = {
  id: string;
  label: string;
  value: number;
  resources: readonly HumanResource[];
};

export type TodayEdgeSnapshot = {
  state: EdgeCapacityState;
  orientationValue: number;
  capacity: number;
  demand: number;
  resources: Readonly<Record<HumanResource, number>>;
  domains: readonly EdgeDomainPreview[];
  explicitReadingCount: number;
};

export type EdgeRecommendation = KpiSearchResult & { evidence: string };

const RESOURCE_ORDER: readonly HumanResource[] = [
  "energy", "focus", "composure", "confidence", "recovery", "connection", "time",
];

const DOMAIN_RESOURCES: readonly { id: string; label: string; resources: readonly HumanResource[] }[] = [
  { id: "body", label: "Body", resources: ["energy", "recovery"] },
  { id: "recovery", label: "Recovery", resources: ["recovery", "energy"] },
  { id: "pressure", label: "Pressure", resources: ["composure", "focus"] },
  { id: "structure", label: "Structure", resources: ["time", "focus", "confidence"] },
  { id: "connection", label: "Connection", resources: ["connection", "composure"] },
  { id: "renewal", label: "Renewal", resources: ["recovery", "connection"] },
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function readingFit(path: string, value: number): number | null {
  const definition = getKpiGuidance(path);
  if (!definition || !Number.isFinite(value)) return null;
  const reading = clamp(value);
  if (definition.orientation === "higher-supports") return reading;
  if (definition.orientation === "lower-supports") return 100 - reading;
  return 100 - Math.abs(reading - 50) * 2;
}

export function deriveTodayEdgeSnapshot(input: {
  resources: Record<HumanResource, number>;
  explicitDailyReadings?: Readonly<Record<string, number>>;
}): TodayEdgeSnapshot {
  const resources = Object.freeze({ ...input.resources });
  const resourceCapacity = mean(RESOURCE_ORDER.map((resource) => clamp(resources[resource])));
  const readingFits = Object.entries(input.explicitDailyReadings ?? {})
    .map(([path, value]) => readingFit(path, value))
    .filter((value): value is number => value !== null);
  const capacity = clamp(readingFits.length > 0 ? resourceCapacity * 0.8 + mean(readingFits) * 0.2 : resourceCapacity);
  const demand = clamp(100 - mean([resources.recovery, resources.composure, resources.time]));
  const gap = demand - capacity;
  const state: EdgeCapacityState = gap >= 18
    ? "overextended"
    : resources.recovery < 45 || capacity < 45
      ? "restoring"
      : gap >= 8
        ? "loaded"
        : capacity >= 64
          ? "available"
          : "balanced";
  const domains = DOMAIN_RESOURCES.map((domain) => Object.freeze({
    ...domain,
    value: clamp(mean(domain.resources.map((resource) => resources[resource]))),
  }));
  return Object.freeze({
    state,
    orientationValue: capacity,
    capacity,
    demand,
    resources,
    domains: Object.freeze(domains),
    explicitReadingCount: readingFits.length,
  });
}

export function adaptMorningScanToEdge(
  postScanResources: Record<HumanResource, number>,
  explicitDailyReadings: Readonly<Record<string, number>> = {},
): TodayEdgeSnapshot {
  return deriveTodayEdgeSnapshot({ resources: postScanResources, explicitDailyReadings });
}

export function buildWeekrunHeader(input: {
  edgeState: string;
  edgeValue: number;
  readiness: number;
}): { edgeLabel: string; readinessLabel: string } {
  return {
    edgeLabel: `${input.edgeState[0].toUpperCase()}${input.edgeState.slice(1)} ${input.edgeValue}`,
    readinessLabel: `Route readiness ${input.readiness}%`,
  };
}

export function buildEdgeRecommendations(
  aim: string,
  resources: Record<HumanResource, number>,
): EdgeRecommendation[] {
  const lowResources = RESOURCE_ORDER
    .filter((resource) => resources[resource] < 55)
    .sort((left, right) => resources[left] - resources[right]) as RecommendationContext["lowResources"][number][];
  return recommendKpiSubset({ aim, lowResources }).slice(0, 3).map((result, index) => {
    const resource = lowResources[index % Math.max(1, lowResources.length)];
    const evidence = resource
      ? `${resource[0].toUpperCase()}${resource.slice(1)} is ${resources[resource]} today; this signal may help fit the next call.`
      : `This fixed signal is relevant to the declared aim; confirm it only if it fits today.`;
    return { ...result, evidence };
  });
}
