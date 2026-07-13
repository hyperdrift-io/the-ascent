import type { KpiSearchResult } from "./edge-kpis";
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

function isReadingHistory(value: unknown): value is EdgeProfile["daily"] {
  if (!isRecord(value)) return false;

  return Object.values(value).every((day) => (
    isRecord(day) && Object.values(day).every((reading) => (
      typeof reading === "number" && Number.isFinite(reading) && reading >= 0 && reading <= 100
    ))
  ));
}

function isRecommendation(value: unknown): value is ConfirmedRecommendation {
  if (!isRecord(value)) return false;
  return (
    typeof value.date === "string" &&
    typeof value.aim === "string" &&
    Array.isArray(value.paths) &&
    value.paths.every((path) => typeof path === "string")
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
    !athletic.runIds.every((runId) => typeof runId === "string")
  ) return false;

  const uniqueRunIds = new Set(athletic.runIds);
  return uniqueRunIds.size === athletic.runIds.length && athletic.completed === athletic.runIds.length;
}

export function loadEdgeProfile(today: string = todayLocalISO()): EdgeProfile {
  try {
    const raw = globalThis.localStorage.getItem(EDGE_PROFILE_KEY);
    if (!raw) return createEdgeProfile(today);
    const parsed: unknown = JSON.parse(raw);
    return isEdgeProfile(parsed) ? parsed : createEdgeProfile(today);
  } catch {
    return createEdgeProfile(today);
  }
}

function clampReading(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function saveDailyReading(profile: EdgeProfile, reading: DailyReading): EdgeProfile {
  const next: EdgeProfile = {
    ...profile,
    daily: {
      ...profile.daily,
      [reading.date]: {
        ...profile.daily[reading.date],
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
  const normalized: ConfirmedRecommendation = {
    ...recommendation,
    paths: [...new Set(recommendation.paths)],
  };
  const key = recommendationKey(normalized);
  if (profile.recommendations.some((item) => recommendationKey(item) === key)) {
    persistEdgeProfile(profile);
    return profile;
  }

  const next: EdgeProfile = {
    ...profile,
    recommendations: [...profile.recommendations, normalized],
  };
  persistEdgeProfile(next);
  return next;
}

export function setAthleticMode(profile: EdgeProfile, enabled: boolean): EdgeProfile {
  if (profile.athletic.enabled === enabled) {
    persistEdgeProfile(profile);
    return profile;
  }

  const next: EdgeProfile = {
    ...profile,
    athletic: { ...profile.athletic, enabled },
  };
  persistEdgeProfile(next);
  return next;
}

export function completeAthleticWeekrun(profile: EdgeProfile, runId: string): EdgeProfile {
  if (!profile.athletic.enabled || profile.athletic.runIds.includes(runId)) {
    persistEdgeProfile(profile);
    return profile;
  }

  const runIds = [...profile.athletic.runIds, runId];
  const next: EdgeProfile = {
    ...profile,
    athletic: {
      ...profile.athletic,
      completed: runIds.length,
      runIds,
    },
  };
  persistEdgeProfile(next);
  return next;
}
