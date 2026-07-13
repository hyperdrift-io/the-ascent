import { searchKpis, type KpiSearchResult } from "./edge-kpis";
import type { HumanResource } from "./edge";

export type DailyReading = {
  date: string;
  path: KpiSearchResult["path"];
  value: number;
};

export type ConfirmedRecommendation = {
  date: string;
  paths: readonly KpiSearchResult["path"][];
  aim: string;
};

export type EdgeProfile = {
  version: 1;
  baselines: Record<HumanResource, number>;
  daily: Record<string, Record<string, number>>;
  recommendations: readonly ConfirmedRecommendation[];
  athletic: {
    enabled: boolean;
    completed: number;
    runIds: readonly string[];
  };
};

export const EDGE_PROFILE_KEY = "edge.foundation.v1";

const HUMAN_RESOURCES: readonly HumanResource[] = [
  "energy",
  "focus",
  "composure",
  "confidence",
  "recovery",
  "connection",
  "time",
];

const CANONICAL_KPI_PATHS = new Set(searchKpis("").map((result) => result.path));

function createBaselines(): Record<HumanResource, number> {
  return HUMAN_RESOURCES.reduce((baselines, resource) => {
    baselines[resource] = 60;
    return baselines;
  }, {} as Record<HumanResource, number>);
}

export function createEdgeProfile(today: string): EdgeProfile {
  return {
    version: 1,
    baselines: createBaselines(),
    daily: { [today]: {} },
    recommendations: [],
    athletic: { enabled: false, completed: 0, runIds: [] },
  };
}

function todayLocalISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function persistEdgeProfile(profile: EdgeProfile): void {
  try {
    globalThis.localStorage.setItem(EDGE_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage can be unavailable or full; callers still retain the in-memory profile.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCanonicalKpiPath(value: unknown): value is KpiSearchResult["path"] {
  return typeof value === "string" && CANONICAL_KPI_PATHS.has(value as KpiSearchResult["path"]);
}

function isReadingHistory(value: unknown): value is EdgeProfile["daily"] {
  if (!isRecord(value)) return false;

  return Object.values(value).every((day) => (
    isRecord(day) && Object.entries(day).every(([path, reading]) => (
      isCanonicalKpiPath(path) &&
      typeof reading === "number" &&
      Number.isFinite(reading) &&
      reading >= 0 &&
      reading <= 100
    ))
  ));
}

function isRecommendation(value: unknown): value is ConfirmedRecommendation {
  if (!isRecord(value)) return false;
  return (
    isNonBlankString(value.date) &&
    isNonBlankString(value.aim) &&
    Array.isArray(value.paths) &&
    value.paths.every(isCanonicalKpiPath)
  );
}

function isEdgeProfile(value: unknown): value is EdgeProfile {
  if (!isRecord(value) || value.version !== 1) return false;
  const baselines = value.baselines;
  if (!isRecord(baselines)) return false;
  if (!HUMAN_RESOURCES.every((resource) => (
    typeof baselines[resource] === "number" &&
    Number.isFinite(baselines[resource]) &&
    baselines[resource] >= 0 &&
    baselines[resource] <= 100
  ))) return false;
  if (!isReadingHistory(value.daily)) return false;
  if (!Array.isArray(value.recommendations) || !value.recommendations.every(isRecommendation)) return false;
  if (!isRecord(value.athletic)) return false;

  const { athletic } = value;
  if (
    typeof athletic.enabled !== "boolean" ||
    typeof athletic.completed !== "number" ||
    !Number.isInteger(athletic.completed) ||
    athletic.completed < 0 ||
    !Array.isArray(athletic.runIds) ||
    !athletic.runIds.every(isNonBlankString)
  ) return false;

  const uniqueRunIds = new Set(athletic.runIds);
  return uniqueRunIds.size === athletic.runIds.length && athletic.completed === athletic.runIds.length;
}

function readStoredEdgeProfile(): EdgeProfile | null {
  try {
    const raw = globalThis.localStorage.getItem(EDGE_PROFILE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isEdgeProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadEdgeProfile(today: string = todayLocalISO()): EdgeProfile {
  return readStoredEdgeProfile() ?? createEdgeProfile(today);
}

function mergeRecommendations(
  left: readonly ConfirmedRecommendation[],
  right: readonly ConfirmedRecommendation[],
): readonly ConfirmedRecommendation[] {
  const merged = new Map<string, ConfirmedRecommendation>();
  for (const recommendation of [...left, ...right]) {
    merged.set(recommendationKey(recommendation), recommendation);
  }
  return [...merged.values()];
}

function mergeReadingHistory(
  left: EdgeProfile["daily"],
  right: EdgeProfile["daily"],
): EdgeProfile["daily"] {
  const dates = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Object.fromEntries([...dates].map((date) => [date, {
    ...left[date],
    ...right[date],
  }]));
}

function mergeWithStoredProfile(profile: EdgeProfile): EdgeProfile {
  const stored = readStoredEdgeProfile();
  const runIds = [...new Set([
    ...(stored?.athletic.runIds ?? []),
    ...profile.athletic.runIds,
  ])].slice(0, 52);
  return {
    ...profile,
    baselines: { ...profile.baselines, ...stored?.baselines },
    daily: mergeReadingHistory(profile.daily, stored?.daily ?? {}),
    recommendations: mergeRecommendations(profile.recommendations, stored?.recommendations ?? []),
    athletic: {
      enabled: stored?.athletic.enabled ?? profile.athletic.enabled,
      completed: runIds.length,
      runIds,
    },
  };
}

function clampReading(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function saveDailyReading(profile: EdgeProfile, reading: DailyReading): EdgeProfile {
  if (!isCanonicalKpiPath(reading.path) || !Number.isFinite(reading.value)) return profile;
  const current = mergeWithStoredProfile(profile);

  const next: EdgeProfile = {
    ...current,
    daily: {
      ...current.daily,
      [reading.date]: {
        ...current.daily[reading.date],
        [reading.path]: clampReading(reading.value),
      },
    },
  };
  persistEdgeProfile(next);
  return next;
}

function recommendationKey(recommendation: ConfirmedRecommendation): string {
  return JSON.stringify([
    recommendation.date,
    recommendation.aim,
    [...recommendation.paths].sort(),
  ]);
}

export function confirmRecommendation(
  profile: EdgeProfile,
  recommendation: ConfirmedRecommendation,
): EdgeProfile {
  if (!isRecommendation(recommendation)) return profile;
  const current = mergeWithStoredProfile(profile);

  const normalized: ConfirmedRecommendation = {
    ...recommendation,
    paths: [...new Set(recommendation.paths)],
  };
  const key = recommendationKey(normalized);
  if (current.recommendations.some((item) => recommendationKey(item) === key)) {
    persistEdgeProfile(current);
    return current;
  }

  const next: EdgeProfile = {
    ...current,
    recommendations: [...current.recommendations, normalized],
  };
  persistEdgeProfile(next);
  return next;
}

export function setAthleticMode(profile: EdgeProfile, enabled: boolean): EdgeProfile {
  const current = mergeWithStoredProfile(profile);
  if (current.athletic.enabled === enabled) {
    persistEdgeProfile(current);
    return current;
  }

  const next: EdgeProfile = {
    ...current,
    athletic: { ...current.athletic, enabled },
  };
  persistEdgeProfile(next);
  return next;
}

export function completeAthleticWeekrun(profile: EdgeProfile, runId: string): EdgeProfile {
  if (!isNonBlankString(runId)) return profile;
  const current = mergeWithStoredProfile(profile);

  if (
    !current.athletic.enabled ||
    current.athletic.runIds.includes(runId) ||
    current.athletic.runIds.length >= 52
  ) {
    persistEdgeProfile(current);
    return current;
  }

  const runIds = [...current.athletic.runIds, runId];
  const next: EdgeProfile = {
    ...current,
    athletic: {
      ...current.athletic,
      completed: runIds.length,
      runIds,
    },
  };
  persistEdgeProfile(next);
  return next;
}
