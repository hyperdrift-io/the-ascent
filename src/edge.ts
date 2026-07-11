// Edge — the Ascent game kernel.
// Pure, deterministic state transitions for a weekly "Ascent" toward a summit-gate boss.
// The UI (Task 3) renders this; nothing here touches the DOM except the localStorage helpers.

export type HumanResource = "energy" | "focus" | "composure" | "confidence" | "recovery" | "connection" | "time";
export type CoreMetric =
  | "health"
  | "stamina"
  | "sleep"
  | "stress"
  | "nutrition"
  | "cardio"
  | "work"
  | "commute"
  | "routine"
  | "sport"
  | "rest"
  | "travel"
  | "social"
  | "entertainment"
  | "family";
export type RunStatus = "ahead" | "on-target" | "narrow-path" | "route-shift";
export type CompletionTier = "gold" | "silver" | "spark" | "route-shift";
export type ProofType = "quick-note" | "photo-video" | "calendar-session" | "wearable-signal" | "honest-check-in";
export type FeltState = "calmer" | "sharper" | "tired" | "charged";
export type WorldState = "night" | "dawn" | "send";
export type RunEnding = "summit-attempt" | "complete" | "recon";
export type Zone = "idle" | "warmline" | "edge" | "redline" | "overclock";

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
  readinessGain: number;
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
  id: "sport-skill" | "public-performance" | "career-interview";
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
const CORE_METRICS: CoreMetric[] = [
  "health",
  "stamina",
  "sleep",
  "stress",
  "nutrition",
  "cardio",
  "work",
  "commute",
  "routine",
  "sport",
  "rest",
  "travel",
  "social",
  "entertainment",
  "family",
];

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
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Held the edge through most of the approach, one wobble.",
        effects: { energy: -6, confidence: 4 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "Touched the edge and logged what it felt like.",
        effects: { energy: -3, confidence: 2 },
        readinessGain: 3,
      },
    },
    {
      id: "clean-entry",
      title: "Clean Entry",
      gold: {
        tier: "gold",
        text: "Entry was square and repeatable, three for three.",
        effects: { focus: 6, composure: 5 },
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Entry held on two attempts out of three.",
        effects: { focus: 4, composure: 3 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "One entry logged clean, the rest were sketch reps.",
        effects: { focus: 2, composure: 1 },
        readinessGain: 3,
      },
    },
    {
      id: "video-review",
      title: "Video Review",
      gold: {
        tier: "gold",
        text: "Reviewed footage and named the exact fix for next session.",
        effects: { confidence: 5, time: -6, focus: 4 },
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Watched the footage and caught the main pattern.",
        effects: { confidence: 3, time: -4, focus: 2 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "Skimmed the clip, one thing stood out.",
        effects: { confidence: 1, time: -2 },
        readinessGain: 3,
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
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Ran most of the piece live, checked notes twice.",
        effects: { energy: -6, confidence: 4 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "Ran the opening two minutes live and logged the feel.",
        effects: { energy: -3, confidence: 2 },
        readinessGain: 3,
      },
    },
    {
      id: "cold-open",
      title: "Cold Open",
      gold: {
        tier: "gold",
        text: "Opened cold in front of a real audience, no warm-up.",
        effects: { composure: 5, focus: 6 },
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Opened cold for a smaller group, held composure.",
        effects: { composure: 3, focus: 4 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "Practiced the opening line out loud, alone.",
        effects: { composure: 1, focus: 2 },
        readinessGain: 3,
      },
    },
    {
      id: "recording-review",
      title: "Recording Review",
      gold: {
        tier: "gold",
        text: "Reviewed the recording and named the exact fix for next time.",
        effects: { confidence: 5, time: -6, focus: 4 },
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Watched the recording and caught the main pattern.",
        effects: { confidence: 3, time: -4, focus: 2 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "Skimmed the recording, one thing stood out.",
        effects: { confidence: 1, time: -2 },
        readinessGain: 3,
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
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Ran most of the mock interview, checked notes twice.",
        effects: { energy: -6, confidence: 4 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "Answered three questions out loud and logged the feel.",
        effects: { energy: -3, confidence: 2 },
        readinessGain: 3,
      },
    },
    {
      id: "tight-answer",
      title: "Tight Answer",
      gold: {
        tier: "gold",
        text: "Answered the hardest question in under ninety seconds, three for three.",
        effects: { focus: 6, composure: 5 },
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Two of three answers landed tight and clear.",
        effects: { focus: 4, composure: 3 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "One answer logged tight, the rest ran long.",
        effects: { focus: 2, composure: 1 },
        readinessGain: 3,
      },
    },
    {
      id: "debrief-review",
      title: "Debrief Review",
      gold: {
        tier: "gold",
        text: "Reviewed the transcript and named the exact fix for next round.",
        effects: { confidence: 5, time: -6, focus: 4 },
        readinessGain: 9,
      },
      silver: {
        tier: "silver",
        text: "Read back the notes and caught the main pattern.",
        effects: { confidence: 3, time: -4, focus: 2 },
        readinessGain: 6,
      },
      spark: {
        tier: "spark",
        text: "Skimmed the notes, one thing stood out.",
        effects: { confidence: 1, time: -2 },
        readinessGain: 3,
      },
    },
  ],
};

export const AIM_PACKS: AimPack[] = [SPORT_SKILL_PACK, PUBLIC_PERFORMANCE_PACK, CAREER_INTERVIEW_PACK];

// -----------------------------------------------------------------------------------------
// Kernel constants
// -----------------------------------------------------------------------------------------

const TIER_READINESS_GAIN: Record<CompletionTier, number> = {
  gold: 9,
  silver: 6,
  spark: 3,
  "route-shift": 2,
};

const PROOF_MULTIPLIER: Record<ProofType, number> = {
  "quick-note": 1,
  "photo-video": 1.25,
  "calendar-session": 1.25,
  "wearable-signal": 1.25,
  "honest-check-in": 1,
};

const FELT_RESOURCE_NUDGE: Record<FeltState, Partial<Record<HumanResource, number>>> = {
  calmer: { composure: 4 },
  sharper: { focus: 4 },
  tired: { recovery: -6 },
  charged: { energy: 4 },
};

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

function defaultResources(value: number): Record<HumanResource, number> {
  return HUMAN_RESOURCES.reduce((acc, key) => {
    acc[key] = value;
    return acc;
  }, {} as Record<HumanResource, number>);
}

function defaultCoreMetrics(value: number): Record<CoreMetric, number> {
  return CORE_METRICS.reduce((acc, key) => {
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
  return SPORT_SKILL_PACK;
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

function deriveStatus(tier: CompletionTier, readiness: number, day: number): RunStatus {
  if (tier === "route-shift") return "route-shift";
  if (day >= 3 && readiness < 45) return "narrow-path";
  if (readiness >= 20 + day * 10) return "ahead";
  return "on-target";
}

// -----------------------------------------------------------------------------------------
// Public kernel API
// -----------------------------------------------------------------------------------------

export function createMissionRun(aim: string, previousProfile?: PlayerProfile): MissionRunState {
  const pack = pickPack(aim);
  const resources = previousProfile ? { ...previousProfile.baselines } : defaultResources(60);
  const coreMetrics = defaultCoreMetrics(55);
  const locks: Lock[] = pack.locks.map((lock) => ({ ...lock, cracked: false }));
  const { edgeLoad, edgeControl, zone } = computeEdge(resources, coreMetrics);

  return {
    aim,
    packId: pack.id,
    bossName: pack.bossName,
    day: 1,
    readiness: 12,
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
  };
}

export function resolveMove(state: MissionRunState, input: ResolveInput): MissionRunState {
  const card = state.hand.find((item) => item.id === state.chosenCardId) ?? state.hand[0];
  const moveTier = input.tier === "route-shift" ? null : card?.[input.tier];

  const readiness = clamp(state.readiness + TIER_READINESS_GAIN[input.tier] * PROOF_MULTIPLIER[input.proof]);

  let resources = state.resources;
  if (moveTier) {
    resources = applyResourceDelta(resources, moveTier.effects);
  }
  resources = applyResourceDelta(resources, FELT_RESOURCE_NUDGE[input.felt]);

  let dormantXp = state.dormantXp;
  let mastery = state.mastery;
  if (input.felt === "tired") {
    dormantXp += 4;
  } else {
    const converted = Math.floor(dormantXp / 8);
    mastery += converted;
    dormantXp -= converted * 8;
  }

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
  };
}

export function advanceDay(state: MissionRunState): MissionRunState {
  const lastFelt = state.cairns[state.cairns.length - 1]?.felt;

  let resources = applyResourceDelta(state.resources, { energy: 3 });
  if (lastFelt === "tired") {
    resources = applyResourceDelta(resources, { recovery: 6 });
  }

  const coreMetrics = { ...state.coreMetrics, sleep: clamp(state.coreMetrics.sleep + 4) };

  return {
    ...state,
    day: Math.min(7, state.day + 1),
    resolvedToday: false,
    chosenCardId: null,
    resources,
    coreMetrics,
  };
}

export function getWorldState(state: MissionRunState): WorldState {
  if (state.readiness >= 80) return "send";
  if (state.resolvedToday) return "night";
  return "dawn";
}

export function getConditions(state: MissionRunState): Condition[] {
  const conditions: Condition[] = [];

  if (state.coreMetrics.sleep < 50) {
    conditions.push({ kind: "fog", line: "Fog on the crest — short nights compressed recovery." });
  }
  if (state.coreMetrics.work + state.coreMetrics.commute > 120) {
    conditions.push({ kind: "headwind", line: "Headwind today — work pressure is leaning on the route." });
  }
  if (state.resources.recovery >= 65) {
    conditions.push({ kind: "clear-air", line: "Clear air — a protected morning is holding." });
  }
  if (state.resources.connection >= 65) {
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

export function loadRun(): MissionRunState | null {
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
    return parsed as MissionRunState;
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
