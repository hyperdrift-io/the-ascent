// Edge — the Ascent game kernel.
// Pure, deterministic state transitions for a weekly "Ascent" toward a summit-gate boss.
// The UI (Task 3) renders this; nothing here touches the DOM except the localStorage helpers.

import { CORE_KPI_IDS, type CoreMetric } from "./edge-kpis";

export type { CoreMetric } from "./edge-kpis";

export type HumanResource = "energy" | "focus" | "composure" | "confidence" | "recovery" | "connection" | "time";
export type RunStatus = "ahead" | "on-target" | "narrow-path" | "route-shift";
export type CompletionTier = "gold" | "silver" | "spark" | "route-shift";
export type ProofType = "quick-note" | "photo-video" | "calendar-session" | "wearable-signal" | "honest-check-in";
export type FeltState = "calmer" | "sharper" | "tired" | "charged";
export type WorldState = "night" | "dawn" | "send";
export type RunEnding = "summit-attempt" | "complete" | "recon";
export type Zone = "idle" | "warmline" | "edge" | "redline" | "overclock";
export type ScanReading = "low" | "steady" | "strong";
export type MorningScanInput = Partial<Record<HumanResource, ScanReading>>;
export type SceneKey = "night" | "send" | "dawn-clear" | "dawn-fog" | "dawn-wind" | "dawn-golden";

export interface Condition {
  kind: "clear-air" | "fog" | "headwind" | "tailwind";
  line: string;
}
export interface Lock {
  id: string;
  label: string;
  cracked: boolean;
  crackAt: number; // crackAt = readiness threshold
}
export interface MoveTier {
  tier: Exclude<CompletionTier, "route-shift">;
  text: string;
  effects: Partial<Record<HumanResource, number>>;
}
export interface MoveCard {
  id: string;
  title: string;
  gold: MoveTier;
  silver: MoveTier;
  spark: MoveTier;
}
export interface CairnEntry {
  day: number;
  tier: CompletionTier;
  proof: ProofType;
  felt: FeltState;
  note?: string;
}
export interface ResolveInput {
  tier: CompletionTier;
  proof: ProofType;
  felt: FeltState;
  note?: string;
}
export interface AimPack {
  id: "sport-skill" | "public-performance" | "career-interview" | "open-aim";
  label: string;
  bossName: string;
  suggestion: string;
  locks: Omit<Lock, "cracked">[];
  skills: string[];
  cards: MoveCard[];
}
export interface MissionRunState {
  aim: string;
  packId: AimPack["id"];
  bossName: string;
  day: number;
  readiness: number;
  status: RunStatus;
  zone: Zone;
  locks: Lock[];
  resources: Record<HumanResource, number>;
  coreMetrics: Record<CoreMetric, number>;
  edgeLoad: number;
  edgeControl: number;
  hand: MoveCard[];
  chosenCardId: string | null;
  cairns: CairnEntry[];
  confidenceBank: number;
  mastery: number;
  dormantXp: number;
  resolvedToday: boolean;
  scannedToday: boolean;
  startedOn: string;
  lastSyncedOn: string;
  syncNote: string | null;
}
export interface PlayerProfile {
  completedRuns: number;
  baselines: Record<HumanResource, number>;
  strongestProofType: ProofType | null;
  recurringPressure: CoreMetric | null;
  insights: string[];
}
export interface RunSummary {
  ending: RunEnding;
  aim: string;
  bossName: string;
  cairns: number;
  confidenceBank: number;
  mastery: number;
}

const HUMAN_RESOURCES: HumanResource[] = ["energy", "focus", "composure", "confidence", "recovery", "connection", "time"];

// -----------------------------------------------------------------------------------------
// Aim packs
// -----------------------------------------------------------------------------------------

const SPORT_SKILL_PACK: AimPack = {
  id: "sport-skill",
  label: "Sport Skill",
  bossName: "The Rotation",
  suggestion: "Land the backroll clean, on your terms, by the end of the week.",
  locks: [
    { id: "approach-trusted", label: "Approach is trusted", crackAt: 40 },
    { id: "anxiety-usable", label: "Anxiety is usable", crackAt: 60 },
    { id: "conditions-commitment-align", label: "Conditions and commitment align", crackAt: 80 },
  ],
  skills: ["Reading the takeoff", "Committing through the blind spot", "Debriefing without judgment"],
  cards: [
    {
      id: "edge-without-sending",
      title: "Edge Without Sending",
      gold: {
        tier: "gold",
        text: "Held the edge cleanly through the whole approach, no bail.",
        effects: { energy: -8, confidence: 7 },
      },
      silver: {
        tier: "silver",
        text: "Held the edge through most of the approach, one wobble.",
        effects: { energy: -6, confidence: 4 },
      },
      spark: {
        tier: "spark",
        text: "Touched the edge and logged what it felt like.",
        effects: { energy: -3, confidence: 2 },
      },
    },
    {
      id: "clean-entry",
      title: "Clean Entry",
      gold: {
        tier: "gold",
        text: "Entry was square and repeatable, three for three.",
        effects: { focus: 6, composure: 5 },
      },
      silver: {
        tier: "silver",
        text: "Entry held on two attempts out of three.",
        effects: { focus: 4, composure: 3 },
      },
      spark: {
        tier: "spark",
        text: "One entry logged clean, the rest were sketch reps.",
        effects: { focus: 2, composure: 1 },
      },
    },
    {
      id: "video-review",
      title: "Video Review",
      gold: {
        tier: "gold",
        text: "Reviewed footage and named the exact fix for next session.",
        effects: { confidence: 5, time: -6, focus: 4 },
      },
      silver: {
        tier: "silver",
        text: "Watched the footage and caught the main pattern.",
        effects: { confidence: 3, time: -4, focus: 2 },
      },
      spark: {
        tier: "spark",
        text: "Skimmed the clip, one thing stood out.",
        effects: { confidence: 1, time: -2 },
      },
    },
  ],
};

const PUBLIC_PERFORMANCE_PACK: AimPack = {
  id: "public-performance",
  label: "Public Performance",
  bossName: "The Room",
  suggestion: "Deliver the opening two minutes cold, in front of one real person, by Friday.",
  locks: [
    { id: "opening-lands-without-script", label: "Opening lands without a script", crackAt: 40 },
    { id: "nerves-translate-to-energy", label: "Nerves translate to energy, not noise", crackAt: 60 },
    { id: "room-and-message-align", label: "The room and the message align", crackAt: 80 },
  ],
  skills: ["Reading the room's energy", "Landing an opening cold", "Recovering from a stumble live"],
  cards: [
    {
      id: "run-it-live",
      title: "Run It Live",
      gold: {
        tier: "gold",
        text: "Ran the full piece live, no notes, and stayed with the room.",
        effects: { energy: -8, confidence: 7 },
      },
      silver: {
        tier: "silver",
        text: "Ran most of the piece live, checked notes twice.",
        effects: { energy: -6, confidence: 4 },
      },
      spark: {
        tier: "spark",
        text: "Ran the opening two minutes live and logged the feel.",
        effects: { energy: -3, confidence: 2 },
      },
    },
    {
      id: "cold-open",
      title: "Cold Open",
      gold: {
        tier: "gold",
        text: "Opened cold in front of a real audience, no warm-up.",
        effects: { composure: 5, focus: 6 },
      },
      silver: {
        tier: "silver",
        text: "Opened cold for a smaller group, held composure.",
        effects: { composure: 3, focus: 4 },
      },
      spark: {
        tier: "spark",
        text: "Practiced the opening line out loud, alone.",
        effects: { composure: 1, focus: 2 },
      },
    },
    {
      id: "recording-review",
      title: "Recording Review",
      gold: {
        tier: "gold",
        text: "Reviewed the recording and named the exact fix for next time.",
        effects: { confidence: 5, time: -6, focus: 4 },
      },
      silver: {
        tier: "silver",
        text: "Watched the recording and caught the main pattern.",
        effects: { confidence: 3, time: -4, focus: 2 },
      },
      spark: {
        tier: "spark",
        text: "Skimmed the recording, one thing stood out.",
        effects: { confidence: 1, time: -2 },
      },
    },
  ],
};

const CAREER_INTERVIEW_PACK: AimPack = {
  id: "career-interview",
  label: "Career Interview",
  bossName: "The Conversation",
  suggestion: "Answer the hardest likely question out loud, to one real person, by Friday.",
  locks: [
    { id: "story-bank-ready", label: "Story bank is ready on demand", crackAt: 40 },
    { id: "nerves-translate-to-clarity", label: "Nerves translate to clarity, not rambling", crackAt: 60 },
    { id: "questions-and-offer-align", label: "Questions and offer align", crackAt: 80 },
  ],
  skills: ["Answering without rambling", "Naming the ask directly", "Recovering from a hard question"],
  cards: [
    {
      id: "mock-interview",
      title: "Mock Interview",
      gold: {
        tier: "gold",
        text: "Ran a full mock interview live, no notes, stayed sharp.",
        effects: { energy: -8, confidence: 7 },
      },
      silver: {
        tier: "silver",
        text: "Ran most of the mock interview, checked notes twice.",
        effects: { energy: -6, confidence: 4 },
      },
      spark: {
        tier: "spark",
        text: "Answered three questions out loud and logged the feel.",
        effects: { energy: -3, confidence: 2 },
      },
    },
    {
      id: "tight-answer",
      title: "Tight Answer",
      gold: {
        tier: "gold",
        text: "Answered the hardest question in under ninety seconds, three for three.",
        effects: { focus: 6, composure: 5 },
      },
      silver: {
        tier: "silver",
        text: "Two of three answers landed tight and clear.",
        effects: { focus: 4, composure: 3 },
      },
      spark: {
        tier: "spark",
        text: "One answer logged tight, the rest ran long.",
        effects: { focus: 2, composure: 1 },
      },
    },
    {
      id: "debrief-review",
      title: "Debrief Review",
      gold: {
        tier: "gold",
        text: "Reviewed the transcript and named the exact fix for next round.",
        effects: { confidence: 5, time: -6, focus: 4 },
      },
      silver: {
        tier: "silver",
        text: "Read back the notes and caught the main pattern.",
        effects: { confidence: 3, time: -4, focus: 2 },
      },
      spark: {
        tier: "spark",
        text: "Skimmed the notes, one thing stood out.",
        effects: { confidence: 1, time: -2 },
      },
    },
  ],
};

export const OPEN_AIM_PACK: AimPack = {
  id: "open-aim",
  label: "Open Aim",
  bossName: "The Gate",
  suggestion: "Take the one committed step that matters most, on your terms, by the end of the week.",
  locks: [
    { id: "first-move-trusted", label: "The first move is trusted", crackAt: 40 },
    { id: "hard-part-has-shape", label: "The hard part has a shape", crackAt: 60 },
    { id: "conditions-commitment-align", label: "Conditions and commitment align", crackAt: 80 },
  ],
  skills: ["Contact", "Shape", "Commitment"],
  cards: [
    {
      id: "open-hardest",
      title: "The Hardest Part",
      gold: {
        tier: "gold",
        text: "One full committed attempt at the hardest part",
        effects: { energy: -8, confidence: 7 },
      },
      silver: {
        tier: "silver",
        text: "One focused rep with the friction named",
        effects: { energy: -6, confidence: 4 },
      },
      spark: {
        tier: "spark",
        text: "Ten minutes in contact with the work",
        effects: { energy: -3, confidence: 2 },
      },
    },
    {
      id: "open-shape",
      title: "Shape the Work",
      gold: {
        tier: "gold",
        text: "Break the aim into three concrete moves and finish the first",
        effects: { focus: -6, composure: 5 },
      },
      silver: {
        tier: "silver",
        text: "Sketch what done looks like this week",
        effects: { focus: -4, composure: 3 },
      },
      spark: {
        tier: "spark",
        text: "Write one sentence naming what the aim really asks",
        effects: { focus: -1, confidence: 2 },
      },
    },
    {
      id: "open-witness",
      title: "Show Someone",
      gold: {
        tier: "gold",
        text: "Share the work in progress with one person who cares",
        effects: { connection: 8, confidence: 5, energy: -4 },
      },
      silver: {
        tier: "silver",
        text: "Tell someone what you are attempting this week",
        effects: { connection: 5, confidence: 3 },
      },
      spark: {
        tier: "spark",
        text: "Note who could help and what you would ask them",
        effects: { connection: 2, focus: -1 },
      },
    },
  ],
};

export const AIM_PACKS: AimPack[] = [SPORT_SKILL_PACK, PUBLIC_PERFORMANCE_PACK, CAREER_INTERVIEW_PACK, OPEN_AIM_PACK];

// -----------------------------------------------------------------------------------------
// Kernel constants
// -----------------------------------------------------------------------------------------

const TIER_READINESS_GAIN: Record<CompletionTier, number> = {
  gold: 11,
  silver: 7,
  spark: 3,
  "route-shift": 2,
};

const TIER_DORMANT_XP: Partial<Record<CompletionTier, number>> = {
  gold: 6,
  silver: 4,
  spark: 2,
};

const PROOF_MULTIPLIER: Record<ProofType, number> = {
  "quick-note": 1,
  "photo-video": 1.25,
  "calendar-session": 1.25,
  "wearable-signal": 1.25,
  "honest-check-in": 1,
};

const SCAN_READING_DELTA: Record<ScanReading, number> = {
  low: -10,
  steady: 0,
  strong: 8,
};

const FELT_RESOURCE_NUDGE: Record<FeltState, Partial<Record<HumanResource, number>>> = {
  calmer: { composure: 4 },
  sharper: { focus: 4 },
  tired: { recovery: -6 },
  charged: { energy: 4 },
};

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// The mountain moves while the player is away — quiet (away) days are rest, never
// failure, so the sync note only ever reports gentle, positive drift.
const QUIET_SYNC_NOTE = "The mountain moved while you were away — recovery converted, and the route held.";

// -----------------------------------------------------------------------------------------
// Kernel helpers
// -----------------------------------------------------------------------------------------

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

// Date-only math on ISO (`YYYY-MM-DD`) strings, timezone-safe: every calendar day is
// parsed/formatted against UTC midnight so local-timezone Date parsing never drifts
// the day count. `now` never enters here — see `todayLocalISO` for the only real clock read.
function isoToUTCTimestamp(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function timestampToISO(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetweenISO(fromISO: string, toISO: string): number {
  return Math.round((isoToUTCTimestamp(toISO) - isoToUTCTimestamp(fromISO)) / 86_400_000);
}

function addDaysISO(iso: string, days: number): string {
  return timestampToISO(isoToUTCTimestamp(iso) + days * 86_400_000);
}

function defaultResources(value: number): Record<HumanResource, number> {
  return HUMAN_RESOURCES.reduce((acc, key) => {
    acc[key] = value;
    return acc;
  }, {} as Record<HumanResource, number>);
}

function defaultCoreMetrics(value: number): Record<CoreMetric, number> {
  return CORE_KPI_IDS.reduce((acc, key) => {
    acc[key] = value;
    return acc;
  }, {} as Record<CoreMetric, number>);
}

function applyResourceDelta(
  resources: Record<HumanResource, number>,
  delta: Partial<Record<HumanResource, number>>,
): Record<HumanResource, number> {
  const next = { ...resources };
  for (const key of HUMAN_RESOURCES) {
    const change = delta[key];
    if (change) next[key] = clamp(next[key] + change);
  }
  return next;
}

function pickPack(aim: string): AimPack {
  const text = aim.toLowerCase();
  if (/(interview|career|job|hire|hiring|resume|cv|offer|promotion)/.test(text)) {
    return CAREER_INTERVIEW_PACK;
  }
  if (/(speech|talk|present|presentation|performance|stage|public speak|pitch|audience|the room)/.test(text)) {
    return PUBLIC_PERFORMANCE_PACK;
  }
  if (/\b(backroll|kite|surf|skate|ski|climb|swim|sprint|run|lift|trick|jump|serve|race|board|goal)\b/.test(text)) {
    return SPORT_SKILL_PACK;
  }
  return OPEN_AIM_PACK;
}

function deriveZone(edgeLoad: number, edgeControl: number): Zone {
  // Most-specific / most-extreme conditions are checked first so a severe overclock
  // reading can never be masked by the broader redline check.
  if (edgeControl >= edgeLoad + 15) return "edge";
  if (edgeLoad >= edgeControl + 25) return "overclock";
  if (edgeLoad >= edgeControl + 10) return "redline";
  if (edgeLoad < 35) return "idle";
  if (edgeLoad < 50) return "warmline";
  return "warmline";
}

function computeEdge(
  resources: Record<HumanResource, number>,
  coreMetrics: Record<CoreMetric, number>,
): { edgeLoad: number; edgeControl: number; zone: Zone } {
  const stressProxy = 100 - resources.composure;
  const edgeLoad = clamp(mean([coreMetrics.work, coreMetrics.commute, stressProxy]));
  const edgeControl = clamp(mean([resources.recovery, resources.composure, resources.confidence, resources.focus]));
  return { edgeLoad, edgeControl, zone: deriveZone(edgeLoad, edgeControl) };
}

function computeReadinessGain(
  tier: CompletionTier,
  proof: ProofType,
  resources: Record<HumanResource, number>,
): number {
  let tierGain = TIER_READINESS_GAIN[tier];
  if (resources.energy < 35) {
    tierGain = Math.round(tierGain * 0.8);
  }
  let gain = tierGain * PROOF_MULTIPLIER[proof];
  if (resources.energy >= 60 && resources.focus >= 55) {
    gain += 2;
  }
  return gain;
}

function deriveStatus(tier: CompletionTier, readiness: number, day: number): RunStatus {
  if (tier === "route-shift") return "route-shift";
  if (day >= 3 && readiness < 45) return "narrow-path";
  if (readiness >= 20 + day * 10) return "ahead";
  return "on-target";
}

// -----------------------------------------------------------------------------------------
// Public kernel API
// -----------------------------------------------------------------------------------------

export function createMissionRun(
  aim: string,
  previousProfile?: PlayerProfile,
  packId?: AimPack["id"],
  todayISO: string = todayLocalISO(),
): MissionRunState {
  const pack = packId ? AIM_PACKS.find((candidate) => candidate.id === packId) ?? pickPack(aim) : pickPack(aim);
  const resources = previousProfile ? { ...previousProfile.baselines } : defaultResources(60);
  const coreMetrics = defaultCoreMetrics(55);
  const locks: Lock[] = pack.locks.map((lock) => ({ ...lock, cracked: false }));
  const { edgeLoad, edgeControl, zone } = computeEdge(resources, coreMetrics);

  return {
    aim,
    packId: pack.id,
    bossName: pack.bossName,
    day: 1,
    readiness: 15,
    status: "on-target",
    zone,
    locks,
    resources,
    coreMetrics,
    edgeLoad,
    edgeControl,
    hand: pack.cards,
    chosenCardId: null,
    cairns: [],
    confidenceBank: 0,
    mastery: 0,
    dormantXp: 0,
    resolvedToday: false,
    scannedToday: false,
    startedOn: todayISO,
    lastSyncedOn: todayISO,
    syncNote: null,
  };
}

export function resolveMove(state: MissionRunState, input: ResolveInput): MissionRunState {
  const card = state.hand.find((item) => item.id === state.chosenCardId) ?? state.hand[0];
  const moveTier = input.tier === "route-shift" ? null : card?.[input.tier];

  const readiness = clamp(state.readiness + computeReadinessGain(input.tier, input.proof, state.resources));

  let resources = state.resources;
  if (moveTier) {
    resources = applyResourceDelta(resources, moveTier.effects);
  }
  resources = applyResourceDelta(resources, FELT_RESOURCE_NUDGE[input.felt]);

  // Every resolve accrues dormant XP; it converts to mastery at camp (see `advanceDay`)
  // once recovery is high enough to turn effort into skill.
  const dormantXp =
    state.dormantXp + (TIER_DORMANT_XP[input.tier] ?? 0) + (input.felt === "tired" ? 4 : 0);
  const mastery = state.mastery;

  const confidenceBank = state.confidenceBank + 2 + (input.proof === "photo-video" ? 2 : 0);

  const locks = state.locks.map((lock) => (lock.cracked ? lock : { ...lock, cracked: lock.crackAt <= readiness }));

  const status = deriveStatus(input.tier, readiness, state.day);

  const { edgeLoad, edgeControl, zone } = computeEdge(resources, state.coreMetrics);

  const cairns: CairnEntry[] = [
    ...state.cairns,
    { day: state.day, tier: input.tier, proof: input.proof, felt: input.felt, note: input.note },
  ];

  return {
    ...state,
    readiness,
    resources,
    locks,
    status,
    zone,
    edgeLoad,
    edgeControl,
    dormantXp,
    mastery,
    confidenceBank,
    cairns,
    resolvedToday: true,
    syncNote: null,
  };
}

export function advanceDay(state: MissionRunState): MissionRunState {
  const lastFelt = state.cairns[state.cairns.length - 1]?.felt;

  let resources = applyResourceDelta(state.resources, { energy: 3 });
  if (lastFelt === "tired") {
    resources = applyResourceDelta(resources, { recovery: 6 });
  }

  const coreMetrics = { ...state.coreMetrics, sleep: clamp(state.coreMetrics.sleep + 4) };

  // Recovery converts yesterday's dormant effort into mastery — the camp is where
  // the work settles, per the product thesis (recovery ≥ 55 unlocks conversion).
  let dormantXp = state.dormantXp;
  let mastery = state.mastery;
  if (resources.recovery >= 55) {
    mastery += Math.floor(dormantXp / 8);
    dormantXp %= 8;
  }

  return {
    ...state,
    day: Math.min(7, state.day + 1),
    resolvedToday: false,
    scannedToday: false,
    chosenCardId: null,
    resources,
    coreMetrics,
    dormantXp,
    mastery,
    syncNote: null,
  };
}

// A quiet (away) day is rest, never failure: no cairn is set, but the mountain still
// moves gently — recovery/energy/sleep drift up and dormant effort still converts once
// recovery clears the same threshold `advanceDay` uses. Mirrors `advanceDay`'s camp
// conversion but without the resolve-day resource/cairn changes.
function applyQuietDay(state: MissionRunState): MissionRunState {
  const resources = applyResourceDelta(state.resources, { recovery: 4, energy: 2 });
  const coreMetrics = { ...state.coreMetrics, sleep: clamp(state.coreMetrics.sleep + 2) };

  let dormantXp = state.dormantXp;
  let mastery = state.mastery;
  if (resources.recovery >= 55) {
    mastery += Math.floor(dormantXp / 8);
    dormantXp %= 8;
  }

  return {
    ...state,
    day: Math.min(7, state.day + 1),
    resolvedToday: false,
    scannedToday: false,
    chosenCardId: null,
    resources,
    coreMetrics,
    dormantXp,
    mastery,
    syncNote: null,
  };
}

// The only place `new Date()` (the current-clock read) is touched — every other kernel
// function takes ISO `YYYY-MM-DD` strings so it stays pure and testable.
export function todayLocalISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Binds the ascent to real days: a player who steps away returns to a mountain that
// moved without them, gently. Idempotent same-day; walks each elapsed calendar day,
// applying `advanceDay`'s existing semantics for a pending resolve on the first elapsed
// day (their resolve still counts) and quiet-day drift for every day after, up to the
// day-7 cap — `isWeekOver` governs the ending, not this function.
export function syncRunToToday(state: MissionRunState, todayISO: string): MissionRunState {
  if (todayISO <= state.lastSyncedOn) return state;

  const elapsedDays = daysBetweenISO(state.lastSyncedOn, todayISO);
  let next = state;
  let quietDays = 0;

  for (let i = 0; i < elapsedDays; i++) {
    if (next.day >= 7) break;
    if (i === 0 && next.resolvedToday) {
      next = advanceDay(next);
    } else {
      next = applyQuietDay(next);
      quietDays += 1;
    }
  }

  return {
    ...next,
    lastSyncedOn: todayISO,
    syncNote: quietDays > 0 ? QUIET_SYNC_NOTE : null,
  };
}

// True once a full week has elapsed since `startedOn` — the App calls
// `completeMissionRun(run, "complete", profile)` when this flips; the kernel never
// auto-ends a run on its own.
export function isWeekOver(state: MissionRunState, todayISO: string): boolean {
  return daysBetweenISO(state.startedOn, todayISO) >= 7;
}

// The summit-gate window closes on the 3-letter weekday six days after `startedOn`.
export function getBossWindowLabel(state: MissionRunState): string {
  const bossDayISO = addDaysISO(state.startedOn, 6);
  const weekday = new Date(isoToUTCTimestamp(bossDayISO)).getUTCDay();
  return WEEKDAY_LABELS[weekday];
}

// World tint: no CSS/presentation values here, just the two 0-100 readings the UI
// (Task 10) maps onto color. Warmth reads energy/confidence/connection; clarity reads
// recovery/composure/focus.
export function getWorldTint(state: MissionRunState): { warmth: number; clarity: number } {
  const { energy, confidence, connection, recovery, composure, focus } = state.resources;
  return {
    warmth: clamp(mean([energy, confidence, connection])),
    clarity: clamp(mean([recovery, composure, focus])),
  };
}

// Morning Scan makes the player the data source: three quick readings on the resources
// that matter most (recovery, connection, composure, time, ...) update the state directly,
// with sympathetic effects on sleep/rest/social, before the day's conditions are drawn.
export function applyMorningScan(state: MissionRunState, input: MorningScanInput): MissionRunState {
  if (state.scannedToday) return state;

  let resources = state.resources;
  for (const key of HUMAN_RESOURCES) {
    const reading = input[key];
    if (reading) {
      resources = applyResourceDelta(resources, { [key]: SCAN_READING_DELTA[reading] });
    }
  }

  const recoveryDelta = input.recovery ? SCAN_READING_DELTA[input.recovery] : 0;
  const connectionDelta = input.connection ? SCAN_READING_DELTA[input.connection] : 0;

  const coreMetrics = {
    ...state.coreMetrics,
    sleep: clamp(state.coreMetrics.sleep + Math.round(0.8 * recoveryDelta)),
    rest: clamp(state.coreMetrics.rest + Math.round(0.5 * recoveryDelta)),
    social: clamp(state.coreMetrics.social + Math.round(0.6 * connectionDelta)),
  };

  const { edgeLoad, edgeControl, zone } = computeEdge(resources, coreMetrics);

  return {
    ...state,
    resources,
    coreMetrics,
    edgeLoad,
    edgeControl,
    zone,
    scannedToday: true,
    syncNote: null,
  };
}

export function getWorldState(state: MissionRunState): WorldState {
  if (state.readiness >= 80) return "send";
  if (state.resolvedToday) return "night";
  return "dawn";
}

// `getWorldScene` refines `getWorldState`'s dawn bucket into the four scene keys the UI
// (Task 7) renders — driven by the same scan-adjusted resources that drive `getConditions`.
export function getWorldScene(state: MissionRunState): SceneKey {
  const world = getWorldState(state);
  if (world === "night") return "night";
  if (world === "send") return "send";

  const conditions = getConditions(state);
  if (conditions.some((condition) => condition.kind === "fog")) return "dawn-fog";
  if (conditions.some((condition) => condition.kind === "headwind")) return "dawn-wind";

  const lastCairn = state.cairns[state.cairns.length - 1];
  if (lastCairn && (lastCairn.tier === "gold" || lastCairn.tier === "silver")) return "dawn-golden";

  return "dawn-clear";
}

export function getConditions(state: MissionRunState): Condition[] {
  const conditions: Condition[] = [];
  const { recovery, composure, connection, time } = state.resources;

  if (recovery < 45) {
    conditions.push({ kind: "fog", line: "Fog on the crest — short nights compressed recovery." });
  }
  if (time < 40 || composure < 40) {
    conditions.push({ kind: "headwind", line: "Headwind today — work pressure is leaning on the route." });
  }
  if (recovery >= 60 && composure >= 55) {
    conditions.push({ kind: "clear-air", line: "Clear air — a protected morning is holding." });
  }
  if (connection >= 60) {
    conditions.push({ kind: "tailwind", line: "Tailwind — support is buffering the pressure." });
  }

  return conditions.slice(0, 2);
}

const TIER_TRAIL_PHRASE: Record<CompletionTier, string> = {
  gold: "The gold move set the pace.",
  silver: "The silver move held steady.",
  spark: "The spark move held the route.",
  "route-shift": "The route shifted, and the plan adapted.",
};

const CONDITION_TRAIL_CLAUSE: Record<Condition["kind"], string> = {
  fog: "Short sleep narrowed the window — recovery converts best tonight.",
  headwind: "Work pressure crowded the slot — the next block can carry less.",
  "clear-air": "A protected morning held — that room compounds tomorrow.",
  tailwind: "Support buffered the load — lean on it again.",
};

export function getTrailNote(state: MissionRunState): string | null {
  if (!state.resolvedToday) return null;

  const lastCairn = state.cairns[state.cairns.length - 1];
  if (!lastCairn) return null;

  const tierPhrase = TIER_TRAIL_PHRASE[lastCairn.tier];
  const strongestCondition = getConditions(state)[0];
  const clause = strongestCondition
    ? CONDITION_TRAIL_CLAUSE[strongestCondition.kind]
    : "The day logged clean — one more entry sharpens the read.";

  return `${tierPhrase} ${clause}`;
}

// -----------------------------------------------------------------------------------------
// Profile — carries forward across Ascents
// -----------------------------------------------------------------------------------------

function defaultProfile(): PlayerProfile {
  return {
    completedRuns: 0,
    baselines: defaultResources(60),
    strongestProofType: null,
    recurringPressure: null,
    insights: [],
  };
}

function modeProofType(cairns: CairnEntry[]): ProofType | null {
  if (cairns.length === 0) return null;
  const counts = new Map<ProofType, number>();
  for (const cairn of cairns) {
    counts.set(cairn.proof, (counts.get(cairn.proof) ?? 0) + 1);
  }
  let best: ProofType | null = null;
  let bestCount = 0;
  for (const cairn of cairns) {
    const count = counts.get(cairn.proof) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = cairn.proof;
    }
  }
  return best;
}

function lowestPressureMetric(coreMetrics: Record<CoreMetric, number>): CoreMetric {
  const candidates: CoreMetric[] = ["sleep", "stress", "commute", "work"];
  return candidates.reduce((lowest, metric) => (coreMetrics[metric] < coreMetrics[lowest] ? metric : lowest), candidates[0]);
}

const PROOF_INSIGHT: Record<ProofType, string> = {
  "quick-note": "You keep the log moving even on light days — that consistency compounds.",
  "photo-video": "You build confidence fastest after visible proof.",
  "calendar-session": "Scheduled sessions are where your readiness climbs quickest.",
  "wearable-signal": "Wearable signal days show your steadiest gains.",
  "honest-check-in": "Honest check-ins keep your read of the week accurate.",
};

const PRESSURE_INSIGHT: Partial<Record<CoreMetric, string>> = {
  sleep: "Sleep is the lever worth protecting first — it moves the most on the route.",
  stress: "Stress room is the tightest margin right now — small trims open real space.",
  commute: "Commute is quietly the biggest drag on the week — worth one change.",
  work: "Work load is the recurring pressure point — a lighter day resets it.",
};

export function getProfileInsights(profile: PlayerProfile): string[] {
  const lines: string[] = [];

  if (profile.strongestProofType) {
    lines.push(PROOF_INSIGHT[profile.strongestProofType]);
  }
  if (profile.recurringPressure) {
    lines.push(PRESSURE_INSIGHT[profile.recurringPressure] ?? "This is the pattern worth watching next ascent.");
  }
  if (profile.completedRuns > 0) {
    const plural = profile.completedRuns === 1 ? "" : "s";
    lines.push(`${profile.completedRuns} ascent${plural} logged — the baseline is getting sharper.`);
  }

  return lines.slice(0, 3);
}

// `ending` is part of the contract — recon endings still update the profile the same way
// as any other ending, so there is no branch on its value today.
export function completeMissionRun(
  state: MissionRunState,
  ending: RunEnding,
  previousProfile?: PlayerProfile,
): PlayerProfile {
  const previous = previousProfile ?? loadProfile();
  const n = previous.completedRuns;

  const baselines = HUMAN_RESOURCES.reduce((acc, key) => {
    acc[key] = clamp((previous.baselines[key] * n + state.resources[key]) / (n + 1));
    return acc;
  }, {} as Record<HumanResource, number>);

  const strongestProofType = modeProofType(state.cairns) ?? previous.strongestProofType;
  // Recon endings still update the profile fully — no branching on `ending`.
  const recurringPressure = lowestPressureMetric(state.coreMetrics);

  const profile: PlayerProfile = {
    completedRuns: n + 1,
    baselines,
    strongestProofType,
    recurringPressure,
    insights: [],
  };
  profile.insights = getProfileInsights(profile);

  saveProfile(profile);
  return profile;
}

// -----------------------------------------------------------------------------------------
// localStorage
// -----------------------------------------------------------------------------------------

const RUN_STORAGE_KEY = "edge.run.v1";
const PROFILE_STORAGE_KEY = "edge.profile.v1";
const SUMMARY_STORAGE_KEY = "edge.summary.v1";

export function loadRun(todayISO: string = todayLocalISO()): MissionRunState | null {
  try {
    const raw = localStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (
      !Array.isArray(parsed.locks) ||
      !Array.isArray(parsed.cairns) ||
      !Array.isArray(parsed.hand) ||
      typeof parsed.day !== "number" ||
      typeof parsed.readiness !== "number"
    ) {
      return null;
    }
    const state = parsed as MissionRunState;
    // Old saves (`edge.run.v1` from before Morning Scan) never wrote `scannedToday` —
    // missing means the player hasn't scanned yet today.
    if (typeof state.scannedToday !== "boolean") {
      state.scannedToday = false;
    }
    // Old saves (from before calendar binding) never wrote `startedOn`/`lastSyncedOn`/
    // `syncNote` — back-fill a plausible start date from the in-run day counter so
    // `isWeekOver`/`getBossWindowLabel` have something timezone-safe to work with.
    if (typeof state.startedOn !== "string") {
      state.startedOn = addDaysISO(todayISO, -(state.day - 1));
    }
    if (typeof state.lastSyncedOn !== "string") {
      state.lastSyncedOn = todayISO;
    }
    if (state.syncNote === undefined) {
      state.syncNote = null;
    }
    return state;
  } catch {
    return null;
  }
}

export function saveRun(state: MissionRunState): void {
  try {
    localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota) — the run stays in memory only.
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(RUN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultProfile();
    return { ...defaultProfile(), ...(parsed as Partial<PlayerProfile>) };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function loadSummary(): RunSummary | null {
  try {
    const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.ending !== "string") return null;
    return parsed as RunSummary;
  } catch {
    return null;
  }
}

export function saveSummary(summary: RunSummary): void {
  try {
    localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summary));
  } catch {
    // localStorage unavailable (private mode, quota) — the summary stays in memory only.
  }
}

export function clearSummary(): void {
  try {
    localStorage.removeItem(SUMMARY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
