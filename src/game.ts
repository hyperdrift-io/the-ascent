export type Criterion =
  | "sleep"
  | "stamina"
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

export type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type CriteriaGroup = "body" | "life";
export type Terrain = "recovery" | "craft" | "strain" | "movement" | "people" | "practice";
export type ProgramSource = "local" | "llm" | "fallback";
export type ResourceKey = "energy" | "focus" | "pressure" | "connection" | "progress";
export type RunStatus = "ready" | "running" | "won" | "needs-rest";

export type CriterionDefinition = {
  id: Criterion;
  label: string;
  group: CriteriaGroup;
  description: string;
};

export type LifeEvent = {
  id: string;
  day: DayName;
  title: string;
  category: Criterion;
  minutes: number;
  strain: number;
  recovery: number;
  meaning: number;
};

export type HealthLog = {
  day: DayName;
  sleepHours: number;
  stamina: number;
  stress: number;
  nutrition: number;
  cardioMinutes: number;
};

export type WeekData = {
  events: LifeEvent[];
  health: HealthLog[];
  source: string;
};

export type AimProfile = {
  id: string;
  name: string;
  summary: string;
  required: Partial<Record<Criterion, number>>;
  weights: Partial<Record<Criterion, number>>;
};

export type ResourceMap = Record<ResourceKey, number>;

export type ResourceEffect = Partial<Record<ResourceKey, number>>;

export type ProgramEncounter = {
  id: string;
  day: DayName;
  title: string;
  criterion: Criterion;
  terrain: Terrain;
  description: string;
  effects: ResourceEffect;
};

export type ActionCard = {
  id: string;
  label: string;
  description: string;
  effects: ResourceEffect;
  tags: Criterion[];
};

export type AimProgram = {
  schemaVersion: 1;
  id: string;
  aim: string;
  title: string;
  mission: string;
  profileName: string;
  source: ProgramSource;
  required: Partial<Record<Criterion, number>>;
  weights: Partial<Record<Criterion, number>>;
  winCondition: {
    progress: number;
    energyFloor: number;
    pressureCeiling: number;
  };
  route: ProgramEncounter[];
  cards: ActionCard[];
};

export type RunState = {
  dayIndex: number;
  resources: ResourceMap;
  selectedCardId: string;
  status: RunStatus;
  log: string[];
};

export type Scores = {
  criteria: Record<Criterion, number>;
  readiness: number;
  room: number;
  rhythm: number;
  support: number;
  friction: number;
  potential: number;
  priority: Array<{
    criterion: Criterion;
    label: string;
    score: number;
    target: number;
    gap: number;
  }>;
};

export const days: DayName[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const resourceLabels: Record<ResourceKey, string> = {
  energy: "Energy",
  focus: "Focus",
  pressure: "Pressure",
  connection: "Connection",
  progress: "Progress",
};

export const criteria: CriterionDefinition[] = [
  { id: "sleep", label: "Sleep", group: "body", description: "Stable sleep across the week." },
  { id: "stamina", label: "Stamina", group: "body", description: "Physical capacity left after effort." },
  { id: "stress", label: "Stress room", group: "body", description: "How much pressure the week can carry." },
  { id: "nutrition", label: "Nutrition", group: "body", description: "Food rhythm that supports energy." },
  { id: "cardio", label: "Cardio", group: "body", description: "Heart and breath work for the aim." },
  { id: "work", label: "Work", group: "life", description: "Workload that leaves room for the aim." },
  { id: "commute", label: "Commute", group: "life", description: "Travel friction around the workday." },
  { id: "routine", label: "Routine", group: "life", description: "Repeatable anchors that reduce decision load." },
  { id: "sport", label: "Sport", group: "life", description: "Movement practiced as part of life." },
  { id: "rest", label: "Rest", group: "life", description: "Open recovery time that keeps progress stable." },
  { id: "travel", label: "Travel", group: "life", description: "Movement between places without overload." },
  { id: "social", label: "Social", group: "life", description: "Human time that keeps the aim connected." },
  { id: "entertainment", label: "Entertainment", group: "life", description: "Leisure that restores more than it scatters." },
  { id: "family", label: "Family", group: "life", description: "Close commitments and support." },
];

const profileTemplates: AimProfile[] = [
  {
    id: "endurance",
    name: "Endurance route",
    summary: "Recovery, cardio, food rhythm, and manageable pressure.",
    required: { sleep: 78, rest: 72, cardio: 78, stamina: 76, nutrition: 68, sport: 68, stress: 62 },
    weights: { sleep: 1.2, rest: 1.2, cardio: 1.25, stamina: 1.1, nutrition: 0.8, sport: 0.85, stress: 0.9 },
  },
  {
    id: "career",
    name: "Craft route",
    summary: "Focused work, routine, sleep, and low-friction recovery.",
    required: { work: 76, routine: 74, sleep: 70, rest: 66, stress: 66, commute: 58, family: 48 },
    weights: { work: 1.25, routine: 1.15, sleep: 1.05, rest: 1, stress: 1, commute: 0.65, family: 0.45 },
  },
  {
    id: "calm",
    name: "Calm route",
    summary: "Sleep, open rest, gentle routine, and fewer sharp edges.",
    required: { sleep: 76, rest: 78, stress: 76, routine: 68, social: 54, entertainment: 60, nutrition: 58 },
    weights: { sleep: 1.2, rest: 1.3, stress: 1.25, routine: 0.9, social: 0.55, entertainment: 0.5, nutrition: 0.65 },
  },
  {
    id: "family",
    name: "Connection route",
    summary: "Room around close people, sustainable work, and protected recovery.",
    required: { family: 76, social: 64, rest: 70, sleep: 68, work: 58, stress: 64, entertainment: 50 },
    weights: { family: 1.35, social: 0.9, rest: 1.05, sleep: 0.95, work: 0.65, stress: 0.8, entertainment: 0.45 },
  },
  {
    id: "adventure",
    name: "Adventure route",
    summary: "Stamina, travel room, sleep, and social support.",
    required: { stamina: 72, travel: 70, sleep: 68, rest: 64, stress: 58, social: 58, nutrition: 58 },
    weights: { stamina: 1.1, travel: 1.15, sleep: 0.95, rest: 0.9, stress: 0.8, social: 0.75, nutrition: 0.65 },
  },
  {
    id: "potential",
    name: "Potential route",
    summary: "Balanced recovery, rhythm, health, work, and human support.",
    required: { sleep: 70, rest: 70, routine: 64, stress: 64, stamina: 62, work: 60, social: 54, family: 54 },
    weights: { sleep: 1.1, rest: 1.15, routine: 0.9, stress: 0.9, stamina: 0.8, work: 0.65, social: 0.55, family: 0.55 },
  },
];

export const sampleWeek: WeekData = {
  source: "Demo week",
  health: [
    { day: "Mon", sleepHours: 6.8, stamina: 62, stress: 54, nutrition: 58, cardioMinutes: 20 },
    { day: "Tue", sleepHours: 7.2, stamina: 68, stress: 46, nutrition: 64, cardioMinutes: 35 },
    { day: "Wed", sleepHours: 6.1, stamina: 56, stress: 68, nutrition: 52, cardioMinutes: 0 },
    { day: "Thu", sleepHours: 7.6, stamina: 71, stress: 42, nutrition: 70, cardioMinutes: 30 },
    { day: "Fri", sleepHours: 6.4, stamina: 58, stress: 64, nutrition: 55, cardioMinutes: 15 },
    { day: "Sat", sleepHours: 8.1, stamina: 76, stress: 34, nutrition: 72, cardioMinutes: 45 },
    { day: "Sun", sleepHours: 7.8, stamina: 72, stress: 36, nutrition: 68, cardioMinutes: 15 },
  ],
  events: [
    event("mon-work", "Mon", "Deep work block", "work", 240, 40, 0, 20),
    event("mon-commute", "Mon", "Commute", "commute", 70, 34, 0, 5),
    event("mon-family", "Mon", "Family dinner", "family", 80, 6, 18, 80),
    event("tue-run", "Tue", "Easy run", "sport", 45, 26, 14, 54),
    event("tue-social", "Tue", "Friend catch-up", "social", 90, 10, 18, 72),
    event("wed-work", "Wed", "Long delivery day", "work", 510, 75, 0, 18),
    event("wed-entertainment", "Wed", "Late show", "entertainment", 110, 28, 5, 20),
    event("thu-training", "Thu", "Cardio session", "sport", 50, 30, 16, 58),
    event("fri-travel", "Fri", "Cross-town travel", "travel", 120, 42, 0, 18),
    event("sat-rest", "Sat", "Quiet morning", "rest", 120, 0, 38, 36),
    event("sat-family", "Sat", "Family visit", "family", 150, 12, 18, 88),
    event("sun-routine", "Sun", "Plan and prep", "routine", 75, 4, 20, 42),
  ],
};

export function classifyAim(input: string): AimProfile {
  const aim = input.toLowerCase();
  if (/(run|marathon|race|cycle|triathlon|fitness|strong|cardio|sport|train)/.test(aim)) {
    return profileTemplates[0];
  }
  if (/(career|company|business|startup|work|promotion|job|write|build|ship|study|learn)/.test(aim)) {
    return profileTemplates[1];
  }
  if (/(calm|stress|peace|sleep|anxiety|burnout|recover|steady|present)/.test(aim)) {
    return profileTemplates[2];
  }
  if (/(family|partner|parent|child|friend|relationship|community|home)/.test(aim)) {
    return profileTemplates[3];
  }
  if (/(travel|adventure|move|relocate|explore|world)/.test(aim)) {
    return profileTemplates[4];
  }
  return profileTemplates[5];
}

export function generateLocalProgram(aim: string, week: WeekData, source: ProgramSource = "local"): AimProgram {
  const profile = classifyAim(aim);
  const scores = computeScores(week, profile);
  const priority = scores.priority.slice(0, 4).map((item) => item.criterion);
  const route = days.map((day, index) => buildEncounter(day, index, week, priority, profile));
  const cards = buildCards(profile, priority);

  return {
    schemaVersion: 1,
    id: `${profile.id}-${slugify(aim) || "aim"}`,
    aim,
    title: titleForAim(aim, profile),
    mission: `Carry ${shortAim(aim)} through one real week without spending the recovery the aim needs.`,
    profileName: profile.name,
    source,
    required: profile.required,
    weights: profile.weights,
    winCondition: {
      progress: profile.id === "calm" ? 86 : 92,
      energyFloor: profile.id === "endurance" ? 28 : 24,
      pressureCeiling: profile.id === "calm" ? 64 : 78,
    },
    route,
    cards,
  };
}

export function createRun(program: AimProgram, week: WeekData): RunState {
  const profile = classifyAim(program.aim);
  const scores = computeScores(week, profile);
  const energy = clamp((scores.criteria.sleep + scores.criteria.rest + scores.criteria.stamina) / 3, 38, 82);
  const focus = clamp((scores.criteria.routine + scores.criteria.work + scores.criteria.stress) / 3, 34, 78);
  const pressure = clamp(100 - scores.criteria.stress + (scores.friction < 70 ? 8 : 0), 18, 72);
  const connection = clamp((scores.criteria.family + scores.criteria.social + scores.support) / 3, 24, 82);

  return {
    dayIndex: 0,
    resources: { energy, focus, pressure, connection, progress: 0 },
    selectedCardId: program.cards[0]?.id ?? "",
    status: "ready",
    log: [`${program.title} is ready.`],
  };
}

export function playTurn(program: AimProgram, state: RunState): RunState {
  if (state.status === "won" || state.status === "needs-rest") {
    return state;
  }

  const encounter = program.route[state.dayIndex];
  const card = program.cards.find((item) => item.id === state.selectedCardId) ?? program.cards[0];
  if (!encounter || !card) {
    return finishRun(program, state);
  }

  const afterEncounter = applyEffects(state.resources, encounter.effects);
  const afterCard = applyEffects(afterEncounter, card.effects);
  const supported = afterCard.connection >= 68 && afterCard.pressure >= 24;
  const rested = afterCard.energy >= 42;
  const quietBonus = (supported ? 3 : 0) + (rested ? 2 : 0);
  const pressurePenalty = afterCard.pressure > 78 ? -6 : 0;
  const resources = clampResources({
    ...afterCard,
    progress: afterCard.progress + quietBonus + pressurePenalty,
    pressure: afterCard.pressure - (supported ? 3 : 0),
  });

  const nextDayIndex = state.dayIndex + 1;
  const logLine = `${encounter.day}: ${card.label} through ${encounter.title.toLowerCase()}.`;

  if (resources.energy <= 4 || resources.pressure >= 96) {
    return {
      ...state,
      resources,
      dayIndex: nextDayIndex,
      status: "needs-rest",
      log: [logLine, "The run asks for recovery before the next attempt.", ...state.log].slice(0, 8),
    };
  }

  if (nextDayIndex >= program.route.length) {
    return finishRun(program, {
      ...state,
      resources,
      dayIndex: nextDayIndex,
      status: "running",
      log: [logLine, ...state.log].slice(0, 8),
    });
  }

  return {
    ...state,
    resources,
    dayIndex: nextDayIndex,
    status: "running",
    log: [logLine, ...state.log].slice(0, 8),
  };
}

export function selectCard(state: RunState, selectedCardId: string): RunState {
  return { ...state, selectedCardId };
}

export function computeScores(week: WeekData, profile: AimProfile): Scores {
  const criteriaScores = computeCriteria(week);
  const weighted = weightedAverage(criteriaScores, profile.weights);
  const foundation = (criteriaScores.sleep + criteriaScores.rest) / 2;
  const bodyKeys: Criterion[] = ["sleep", "stamina", "stress", "nutrition", "cardio"];
  const lifeKeys: Criterion[] = ["work", "commute", "routine", "sport", "rest", "travel", "social", "entertainment", "family"];
  const readiness = average(bodyKeys.map((key) => criteriaScores[key]));
  const room = average(lifeKeys.map((key) => criteriaScores[key]));
  const rhythm = average([criteriaScores.routine, criteriaScores.sleep, criteriaScores.rest, criteriaScores.stress]);
  const support = average([criteriaScores.social, criteriaScores.family, hiddenMeaningSignal(week)]);
  const friction = clamp(100 - averageDeficit(criteriaScores, profile.required));
  const foundationGate = foundation < 58 ? 0.74 + foundation / 225 : 1;
  const supportLift = support > 62 && foundation > 56 ? (support - 62) * 0.12 : 0;
  const potential = clamp(weighted * foundationGate + supportLift - (100 - friction) * 0.08);

  const priority = Object.entries(profile.required)
    .map(([criterion, target]) => {
      const typedCriterion = criterion as Criterion;
      const score = criteriaScores[typedCriterion];
      return {
        criterion: typedCriterion,
        label: getCriterion(typedCriterion).label,
        score,
        target: target ?? 0,
        gap: Math.max(0, (target ?? 0) - score),
      };
    })
    .sort((a, b) => b.gap - a.gap);

  return {
    criteria: criteriaScores,
    readiness: clamp(readiness),
    room: clamp(room),
    rhythm: clamp(rhythm),
    support: clamp(support),
    friction,
    potential,
    priority,
  };
}

export function getCriterion(id: Criterion): CriterionDefinition {
  return criteria.find((criterion) => criterion.id === id) ?? criteria[0];
}

export function isCriterion(value: unknown): value is Criterion {
  return typeof value === "string" && criteria.some((criterion) => criterion.id === value);
}

export function sanitizeEffects(value: unknown): ResourceEffect {
  if (!value || typeof value !== "object") {
    return {};
  }

  const result: ResourceEffect = {};
  const input = value as Record<string, unknown>;
  for (const key of ["energy", "focus", "pressure", "connection", "progress"] satisfies ResourceKey[]) {
    const amount = input[key];
    if (typeof amount === "number" && Number.isFinite(amount)) {
      result[key] = Math.max(-40, Math.min(40, Math.round(amount)));
    }
  }
  return result;
}

export function summarizeWeek(week: WeekData) {
  return {
    source: week.source,
    events: week.events.map((item) => ({
      day: item.day,
      title: item.title,
      category: item.category,
      minutes: item.minutes,
    })),
    health: week.health,
  };
}

function finishRun(program: AimProgram, state: RunState): RunState {
  const { resources } = state;
  const won =
    resources.progress >= program.winCondition.progress &&
    resources.energy >= program.winCondition.energyFloor &&
    resources.pressure <= program.winCondition.pressureCeiling;

  return {
    ...state,
    status: won ? "won" : "needs-rest",
    log: [
      won ? program.winText ?? "The aim carried through the week." : "The route is close, but the week asks for a better base.",
      ...state.log,
    ].slice(0, 8),
  };
}

function buildEncounter(
  day: DayName,
  index: number,
  week: WeekData,
  priority: Criterion[],
  profile: AimProfile,
): ProgramEncounter {
  const events = week.events.filter((item) => item.day === day);
  const anchor = [...events].sort((a, b) => b.minutes + b.strain + b.meaning - (a.minutes + a.strain + a.meaning))[0];
  const criterion = anchor?.category ?? priority[index % Math.max(1, priority.length)] ?? firstRequired(profile);
  const terrain = terrainForCriterion(criterion);
  const title = anchor ? anchor.title : `${getCriterion(criterion).label} opening`;
  const description = anchor
    ? `${anchor.minutes} minutes of ${getCriterion(criterion).label.toLowerCase()} shape this day.`
    : `There is open room to shape ${getCriterion(criterion).label.toLowerCase()}.`;

  return {
    id: `${day.toLowerCase()}-${criterion}`,
    day,
    title,
    criterion,
    terrain,
    description,
    effects: encounterEffects(criterion, anchor?.minutes ?? 60, anchor?.strain ?? 12, anchor?.recovery ?? 8, anchor?.meaning ?? 24),
  };
}

function buildCards(profile: AimProfile, priority: Criterion[]): ActionCard[] {
  const coreCards: ActionCard[] = [
    {
      id: "protect-rest",
      label: "Protect rest",
      description: "Trade speed for a steadier base.",
      effects: { energy: 18, pressure: -14, focus: 4, progress: 5 },
      tags: ["rest", "sleep"],
    },
    {
      id: "deep-work",
      label: "Deep work",
      description: "Spend focus on a meaningful advance.",
      effects: { focus: -12, energy: -8, pressure: 7, progress: 22 },
      tags: ["work", "routine"],
    },
    {
      id: "train-body",
      label: "Train body",
      description: "Build capacity with a controlled effort.",
      effects: { energy: -11, pressure: 4, progress: 18, focus: 3 },
      tags: ["sport", "cardio", "stamina"],
    },
    {
      id: "prepare-food",
      label: "Prepare food",
      description: "Convert planning into energy.",
      effects: { energy: 13, focus: 6, pressure: -5, progress: 6 },
      tags: ["nutrition", "routine"],
    },
    {
      id: "show-up",
      label: "Show up",
      description: "Make the aim less solitary.",
      effects: { connection: 20, pressure: -5, energy: -3, progress: 9 },
      tags: ["family", "social"],
    },
    {
      id: "clear-noise",
      label: "Clear noise",
      description: "Cut one low-value demand.",
      effects: { focus: 12, pressure: -16, progress: 4 },
      tags: ["stress", "entertainment", "commute"],
    },
  ];

  if (profile.id === "endurance") {
    coreCards.unshift({
      id: "easy-base",
      label: "Easy base",
      description: "Move lightly enough to return tomorrow.",
      effects: { energy: -7, pressure: -2, progress: 20, focus: 3 },
      tags: ["cardio", "sport", "rest"],
    });
  }

  if (profile.id === "career") {
    coreCards.unshift({
      id: "one-shipped-thing",
      label: "Ship one thing",
      description: "Close a small loop instead of expanding the list.",
      effects: { focus: -8, energy: -6, pressure: -4, progress: 24 },
      tags: ["work", "routine", "rest"],
    });
  }

  if (profile.id === "calm") {
    coreCards.unshift({
      id: "slow-evening",
      label: "Slow evening",
      description: "Let tomorrow borrow from quiet instead of pressure.",
      effects: { energy: 16, pressure: -20, connection: 4, progress: 8 },
      tags: ["sleep", "rest", "stress"],
    });
  }

  return prioritizeCards(coreCards, priority).slice(0, 6);
}

function prioritizeCards(cards: ActionCard[], priority: Criterion[]): ActionCard[] {
  return [...cards].sort((a, b) => scoreCard(b, priority) - scoreCard(a, priority));
}

function scoreCard(card: ActionCard, priority: Criterion[]): number {
  return card.tags.reduce((score, tag) => score + (priority.includes(tag) ? 3 : 1), 0) + (card.effects.progress ?? 0) * 0.08;
}

function encounterEffects(
  criterion: Criterion,
  minutes: number,
  strainValue: number,
  recoveryValue: number,
  meaningValue: number,
): ResourceEffect {
  const load = Math.min(24, Math.round(minutes / 18 + strainValue / 8));
  const recovery = Math.min(20, Math.round(recoveryValue / 3));
  const meaning = Math.min(18, Math.round(meaningValue / 5));

  switch (criterion) {
    case "sleep":
    case "rest":
      return { energy: recovery + 10, pressure: -12, focus: 4, progress: 2 };
    case "family":
    case "social":
      return { connection: meaning + 7, pressure: -4, energy: -3, progress: 4 };
    case "sport":
    case "cardio":
      return { energy: -load, pressure: 3, focus: 5, progress: 8 };
    case "nutrition":
    case "routine":
      return { energy: 8, focus: 8, pressure: -5, progress: 4 };
    case "commute":
    case "travel":
      return { energy: -load, pressure: load, focus: -5 };
    case "entertainment":
      return { energy: -5, pressure: 4, focus: -7, connection: 2 };
    case "work":
      return { energy: -load, focus: -8, pressure: load, progress: 6 };
    default:
      return { energy: -6, pressure: 5, progress: 3 };
  }
}

function terrainForCriterion(criterion: Criterion): Terrain {
  if (criterion === "sleep" || criterion === "rest" || criterion === "nutrition") return "recovery";
  if (criterion === "work" || criterion === "routine") return "craft";
  if (criterion === "stress" || criterion === "commute" || criterion === "entertainment") return "strain";
  if (criterion === "travel") return "movement";
  if (criterion === "family" || criterion === "social") return "people";
  return "practice";
}

function computeCriteria(week: WeekData): Record<Criterion, number> {
  const health = week.health.length > 0 ? week.health : sampleWeek.health;
  const events = week.events;
  const eventMinutes = sumByCategory(events);
  const averageSleep = average(health.map((entry) => (entry.sleepHours / 8) * 100));
  const averageStressRoom = average(health.map((entry) => 100 - entry.stress));
  const workMinutes = eventMinutes.work;
  const commuteMinutes = eventMinutes.commute;
  const travelMinutes = eventMinutes.travel;
  const entertainmentMinutes = eventMinutes.entertainment;

  return {
    sleep: clamp(averageSleep),
    stamina: clamp(average(health.map((entry) => entry.stamina)) - strain(events) * 0.12 + recovery(events) * 0.08),
    stress: clamp(averageStressRoom - strain(events) * 0.18 + recovery(events) * 0.18),
    nutrition: clamp(average(health.map((entry) => entry.nutrition))),
    cardio: clamp(average(health.map((entry) => entry.cardioMinutes * 2.15)) + eventMinutes.sport * 0.08),
    work: clamp(85 - Math.abs(workMinutes / 5 - 420) * 0.09),
    commute: clamp(88 - commuteMinutes * 0.14),
    routine: clamp(46 + eventMinutes.routine * 0.2 + health.filter((entry) => entry.sleepHours >= 7).length * 4),
    sport: clamp(eventMinutes.sport * 0.34 + average(health.map((entry) => entry.cardioMinutes * 1.35))),
    rest: clamp(34 + eventMinutes.rest * 0.22 + recovery(events) * 0.28 + Math.max(0, averageSleep - 68) * 0.2),
    travel: clamp(55 + travelMinutes * 0.16 - Math.max(0, travelMinutes - 240) * 0.18),
    social: clamp(35 + eventMinutes.social * 0.18 + meaning(events, "social") * 0.18),
    entertainment: clamp(55 + Math.min(120, entertainmentMinutes) * 0.12 - Math.max(0, entertainmentMinutes - 180) * 0.16),
    family: clamp(34 + eventMinutes.family * 0.2 + meaning(events, "family") * 0.2),
  };
}

function event(
  id: string,
  day: DayName,
  title: string,
  category: Criterion,
  minutes: number,
  strainValue: number,
  recoveryValue: number,
  meaningValue: number,
): LifeEvent {
  return { id, day, title, category, minutes, strain: strainValue, recovery: recoveryValue, meaning: meaningValue };
}

function sumByCategory(events: LifeEvent[]): Record<Criterion, number> {
  const sums = Object.fromEntries(criteria.map((criterion) => [criterion.id, 0])) as Record<Criterion, number>;
  for (const item of events) {
    sums[item.category] += item.minutes;
  }
  return sums;
}

function applyEffects(resources: ResourceMap, effects: ResourceEffect): ResourceMap {
  return clampResources({
    energy: resources.energy + (effects.energy ?? 0),
    focus: resources.focus + (effects.focus ?? 0),
    pressure: resources.pressure + (effects.pressure ?? 0),
    connection: resources.connection + (effects.connection ?? 0),
    progress: resources.progress + (effects.progress ?? 0),
  });
}

function clampResources(resources: ResourceMap): ResourceMap {
  return {
    energy: clamp(resources.energy),
    focus: clamp(resources.focus),
    pressure: clamp(resources.pressure),
    connection: clamp(resources.connection),
    progress: clamp(resources.progress),
  };
}

function firstRequired(profile: AimProfile): Criterion {
  return (Object.keys(profile.required)[0] as Criterion | undefined) ?? "rest";
}

function weightedAverage(values: Record<Criterion, number>, weights: Partial<Record<Criterion, number>>): number {
  let total = 0;
  let weightTotal = 0;
  for (const [criterion, weight] of Object.entries(weights) as Array<[Criterion, number]>) {
    total += values[criterion] * weight;
    weightTotal += weight;
  }
  return weightTotal === 0 ? 0 : total / weightTotal;
}

function averageDeficit(values: Record<Criterion, number>, required: Partial<Record<Criterion, number>>): number {
  const gaps = Object.entries(required).map(([criterion, target]) => Math.max(0, (target ?? 0) - values[criterion as Criterion]));
  return gaps.length === 0 ? 0 : average(gaps);
}

function hiddenMeaningSignal(week: WeekData): number {
  const relationalEvents = week.events.filter((item) => item.category === "family" || item.category === "social");
  return relationalEvents.length > 0 ? average(relationalEvents.map((item) => item.meaning)) : 46;
}

function strain(events: LifeEvent[]): number {
  return events.reduce((total, item) => total + item.strain, 0);
}

function recovery(events: LifeEvent[]): number {
  return events.reduce((total, item) => total + item.recovery, 0);
}

function meaning(events: LifeEvent[], category: Criterion): number {
  return events.filter((item) => item.category === category).reduce((total, item) => total + item.meaning, 0);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function titleForAim(aim: string, profile: AimProfile): string {
  const cleaned = shortAim(aim);
  return cleaned ? `${cleaned} / ${profile.name}` : profile.name;
}

function shortAim(aim: string): string {
  const trimmed = aim.trim();
  if (trimmed.length <= 58) return trimmed;
  return `${trimmed.slice(0, 55).trim()}...`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
