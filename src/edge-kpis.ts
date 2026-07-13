export const CORE_KPI_IDS = Object.freeze([
  "health", "stamina", "sleep", "stress", "nutrition", "cardio",
  "work", "commute", "routine", "sport", "rest", "travel",
  "social", "entertainment", "family",
] as const);

export type CoreMetric = (typeof CORE_KPI_IDS)[number];
export type DomainId = "body" | "recovery" | "pressure" | "structure" | "connection" | "renewal";

export type SubKpi = {
  id: string;
  parentId: CoreMetric;
  label: string;
  synonyms: readonly string[];
  wikipedia: { title: string; href: `https://en.wikipedia.org/wiki/${string}` };
};

export type KpiNode = {
  id: CoreMetric;
  domainId: DomainId;
  label: string;
  children: readonly SubKpi[];
};

export type DomainNode = {
  id: DomainId;
  label: string;
  kpis: readonly KpiNode[];
};

export type KpiSearchResult = {
  path: `${DomainId}.${CoreMetric}` | `${DomainId}.${CoreMetric}.${string}`;
  label: string;
  parentLabel: string | null;
  source: "core" | "sub";
};

export type RecommendationResource = "energy" | "focus" | "composure" | "confidence" | "recovery" | "connection" | "time";

export type RecommendationContext = {
  aim: string;
  lowResources: readonly RecommendationResource[];
};

export type KpiRecommendationMatch = {
  result: KpiSearchResult;
  resources: readonly RecommendationResource[];
  aimMatched: boolean;
};

export type StudyResource = {
  path: KpiSearchResult["path"];
  label: string;
  title: string;
  href: `https://en.wikipedia.org/wiki/${string}`;
  source: "Wikipedia";
};

function freezeRegistry<Key extends PropertyKey, Value>(
  registry: Record<Key, readonly Value[]>,
): Record<Key, readonly Value[]> {
  for (const values of Object.values(registry)) Object.freeze(values);
  return Object.freeze(registry);
}

export const DOMAIN_KPIS: Record<DomainId, readonly CoreMetric[]> = freezeRegistry({
  body: ["health", "stamina", "nutrition", "cardio", "sport"],
  recovery: ["sleep", "rest"],
  pressure: ["stress"],
  structure: ["work", "commute", "routine", "travel"],
  connection: ["social", "family"],
  renewal: ["entertainment"],
});

export const SUB_KPI_IDS: Record<CoreMetric, readonly string[]> = freezeRegistry({
  health: ["general-wellbeing", "physical-comfort", "illness-load"],
  stamina: ["sustained-effort", "physical-endurance", "mental-endurance"],
  sleep: ["duration", "quality", "regularity"],
  stress: ["anxiety", "tension", "overwhelm"],
  nutrition: ["nourishment", "hydration", "regularity"],
  cardio: ["breath", "aerobic-capacity", "exertion-response"],
  work: ["workload", "motivation", "autonomy"],
  commute: ["duration", "friction", "predictability"],
  routine: ["consistency", "adaptability", "activation"],
  sport: ["movement", "motivation", "enjoyment"],
  rest: ["detachment", "relaxation", "quiet"],
  travel: ["disruption", "novelty", "recovery-cost"],
  social: ["support", "belonging", "relational-energy"],
  entertainment: ["enjoyment", "restoration", "stimulation"],
  family: ["support", "closeness", "responsibility-load"],
});

const DOMAIN_LABELS: Record<DomainId, string> = {
  body: "Body",
  recovery: "Recovery",
  pressure: "Pressure",
  structure: "Structure",
  connection: "Connection",
  renewal: "Renewal",
};

function child(
  parentId: CoreMetric,
  id: string,
  label: string,
  synonyms: readonly string[],
  wikipediaTitle: string,
  wikipediaSlug: string = wikipediaTitle.replace(/ /g, "_"),
): SubKpi {
  return Object.freeze({
    id,
    parentId,
    label,
    synonyms: Object.freeze([...synonyms]),
    wikipedia: Object.freeze({
      title: wikipediaTitle,
      href: `https://en.wikipedia.org/wiki/${wikipediaSlug}` as const,
    }),
  });
}

const KPI_DEFINITIONS: Record<CoreMetric, { label: string; children: readonly SubKpi[] }> = {
  health: {
    label: "Health",
    children: [
      child("health", "general-wellbeing", "General wellbeing", ["wellbeing", "well-being"], "Well-being"),
      child("health", "physical-comfort", "Physical comfort", ["comfort", "ease"], "Comfort"),
      child("health", "illness-load", "Illness load", ["health burden", "symptom load"], "Disease burden", "Disease_burden"),
    ],
  },
  stamina: {
    label: "Stamina",
    children: [
      child("stamina", "sustained-effort", "Sustained effort", ["persistence", "staying power"], "Endurance"),
      child("stamina", "physical-endurance", "Physical endurance", ["physical stamina"], "Endurance"),
      child("stamina", "mental-endurance", "Mental endurance", ["mental stamina", "cognitive endurance"], "Mental fatigue", "Mental_fatigue"),
    ],
  },
  sleep: {
    label: "Sleep",
    children: [
      child("sleep", "duration", "Duration", ["sleep length", "hours slept"], "Sleep"),
      child("sleep", "quality", "Quality", ["restful sleep", "sleep quality"], "Sleep quality", "Sleep_quality"),
      child("sleep", "regularity", "Regularity", ["sleep schedule", "sleep timing"], "Circadian rhythm", "Circadian_rhythm"),
    ],
  },
  stress: {
    label: "Stress",
    children: [
      child("stress", "anxiety", "Anxiety", ["nerves", "unease", "arousal"], "Arousal"),
      child("stress", "tension", "Tension", ["strain", "pressure"], "Stress (psychology)", "Stress_(psychology)"),
      child("stress", "overwhelm", "Overwhelm", ["overload", "too much"], "Stress management", "Stress_management"),
    ],
  },
  nutrition: {
    label: "Nutrition",
    children: [
      child("nutrition", "nourishment", "Nourishment", ["food", "fuel"], "Nutrition"),
      child("nutrition", "hydration", "Hydration", ["water", "fluids"], "Hydration"),
      child("nutrition", "regularity", "Regularity", ["meal timing", "regular meals"], "Meal"),
    ],
  },
  cardio: {
    label: "Cardio",
    children: [
      child("cardio", "breath", "Breath", ["breathing", "respiration"], "Breathing"),
      child("cardio", "aerobic-capacity", "Aerobic capacity", ["cardio capacity", "aerobic fitness"], "Aerobic exercise", "Aerobic_exercise"),
      child("cardio", "exertion-response", "Exertion response", ["effort response", "exercise response"], "Exercise physiology", "Exercise_physiology"),
    ],
  },
  work: {
    label: "Work",
    children: [
      child("work", "workload", "Workload", ["work load", "demand"], "Workload"),
      child("work", "motivation", "Motivation", ["drive", "willingness"], "Motivation"),
      child("work", "autonomy", "Autonomy", ["agency", "control"], "Autonomy"),
    ],
  },
  commute: {
    label: "Commute",
    children: [
      child("commute", "duration", "Duration", ["travel time", "commute time"], "Commuting"),
      child("commute", "friction", "Friction", ["difficulty", "hassle"], "Commuting"),
      child("commute", "predictability", "Predictability", ["reliability", "consistency"], "Commuting"),
    ],
  },
  routine: {
    label: "Routine",
    children: [
      child("routine", "consistency", "Consistency", ["regularity", "habit"], "Habit"),
      child("routine", "adaptability", "Adaptability", ["flexibility", "adjustment"], "Adaptation"),
      child("routine", "activation", "Activation", ["getting started", "initiation"], "Action (philosophy)", "Action_(philosophy)"),
    ],
  },
  sport: {
    label: "Sport",
    children: [
      child("sport", "movement", "Movement", ["activity", "exercise"], "Physical activity", "Physical_activity"),
      child("sport", "motivation", "Motivation", ["drive", "willingness"], "Motivation"),
      child("sport", "enjoyment", "Enjoyment", ["fun", "pleasure"], "Pleasure"),
    ],
  },
  rest: {
    label: "Rest",
    children: [
      child("rest", "detachment", "Detachment", ["switching off", "disengagement"], "Psychological detachment", "Psychological_detachment"),
      child("rest", "relaxation", "Relaxation", ["unwinding", "calm"], "Relaxation (psychology)", "Relaxation_(psychology)"),
      child("rest", "quiet", "Quiet", ["stillness", "silence"], "Silence"),
    ],
  },
  travel: {
    label: "Travel",
    children: [
      child("travel", "disruption", "Disruption", ["interruption", "change"], "Travel"),
      child("travel", "novelty", "Novelty", ["newness", "variety"], "Novelty"),
      child("travel", "recovery-cost", "Recovery cost", ["travel fatigue", "recovery demand"], "Fatigue"),
    ],
  },
  social: {
    label: "Social",
    children: [
      child("social", "support", "Support", ["help", "social support"], "Social support", "Social_support"),
      child("social", "belonging", "Belonging", ["inclusion", "community"], "Belongingness"),
      child("social", "relational-energy", "Relational energy", ["social energy", "interpersonal energy"], "Interpersonal relationship", "Interpersonal_relationship"),
    ],
  },
  entertainment: {
    label: "Entertainment",
    children: [
      child("entertainment", "enjoyment", "Enjoyment", ["fun", "pleasure"], "Entertainment"),
      child("entertainment", "restoration", "Restoration", ["recreation", "refreshment"], "Recreation"),
      child("entertainment", "stimulation", "Stimulation", ["interest", "engagement"], "Stimulation"),
    ],
  },
  family: {
    label: "Family",
    children: [
      child("family", "support", "Support", ["help", "family support"], "Social support", "Social_support"),
      child("family", "closeness", "Closeness", ["connection", "intimacy"], "Intimacy"),
      child("family", "responsibility-load", "Responsibility load", ["care load", "family duties"], "Responsibility"),
    ],
  },
};

const DOMAIN_ORDER = ["body", "recovery", "pressure", "structure", "connection", "renewal"] as const;

export const KPI_TREE: readonly DomainNode[] = Object.freeze(
  DOMAIN_ORDER.map((domainId) => Object.freeze({
    id: domainId,
    label: DOMAIN_LABELS[domainId],
    kpis: Object.freeze(DOMAIN_KPIS[domainId].map((id) => Object.freeze({
      id,
      domainId,
      label: KPI_DEFINITIONS[id].label,
      children: Object.freeze([...KPI_DEFINITIONS[id].children]),
    }))),
  })),
);

type IndexedResult = KpiSearchResult & {
  searchText: string;
  wikipedia?: SubKpi["wikipedia"];
};

const FLAT_KPIS: readonly IndexedResult[] = Object.freeze(KPI_TREE.flatMap((domain) =>
  domain.kpis.flatMap((kpi) => {
    const corePath = `${domain.id}.${kpi.id}` as KpiSearchResult["path"];
    const core: IndexedResult = {
      path: corePath,
      label: kpi.label,
      parentLabel: null,
      source: "core",
      searchText: `${corePath} ${kpi.label}`.toLowerCase(),
    };
    const children: IndexedResult[] = kpi.children.map((item) => {
      const path = `${domain.id}.${kpi.id}.${item.id}` as KpiSearchResult["path"];
      return {
        path,
        label: item.label,
        parentLabel: kpi.label,
        source: "sub",
        searchText: `${path} ${item.label} ${item.synonyms.join(" ")}`.toLowerCase(),
        wikipedia: item.wikipedia,
      };
    });
    return [core, ...children];
  }),
));

const RESULT_BY_PATH = new Map(FLAT_KPIS.map((item) => [item.path, item]));

function publicResult(item: IndexedResult): KpiSearchResult {
  return {
    path: item.path,
    label: item.label,
    parentLabel: item.parentLabel,
    source: item.source,
  };
}

export function searchKpis(query: string): KpiSearchResult[] {
  const normalized = query.trim().toLowerCase();
  return FLAT_KPIS
    .filter((item) => normalized === "" || item.searchText.includes(normalized))
    .map(publicResult);
}

const RESOURCE_PATHS: Record<RecommendationContext["lowResources"][number], readonly KpiSearchResult["path"][]> = {
  energy: ["body.stamina.sustained-effort", "recovery.sleep.quality", "body.nutrition.nourishment"],
  focus: ["structure.work.workload", "structure.routine.activation", "recovery.sleep.quality"],
  composure: ["pressure.stress.anxiety", "pressure.stress.tension", "recovery.rest.relaxation"],
  confidence: ["structure.work.motivation", "body.sport.motivation", "connection.social.support"],
  recovery: ["recovery.sleep.quality", "recovery.rest.detachment", "body.nutrition.hydration"],
  connection: ["connection.social.support", "connection.social.belonging", "connection.family.support"],
  time: ["structure.commute.duration", "structure.routine.consistency", "structure.work.workload"],
};

const AIM_RULES: readonly { terms: readonly string[]; paths: readonly KpiSearchResult["path"][] }[] = [
  {
    terms: ["talk", "speak", "present", "performance", "interview"],
    paths: ["pressure.stress.anxiety", "structure.work.motivation", "connection.social.support"],
  },
  {
    terms: ["sport", "train", "race", "run", "ride", "swim"],
    paths: ["body.sport.motivation", "body.stamina.physical-endurance", "recovery.rest.detachment"],
  },
  {
    terms: ["work", "project", "write", "build", "deliver"],
    paths: ["structure.work.workload", "structure.work.autonomy", "structure.routine.activation"],
  },
  {
    terms: ["family", "friend", "community", "connect"],
    paths: ["connection.family.support", "connection.social.belonging", "connection.social.relational-energy"],
  },
];

export function matchKpiRecommendations(context: RecommendationContext): KpiRecommendationMatch[] {
  const aim = context.aim.trim().toLowerCase();
  const candidates: { path: KpiSearchResult["path"]; resource: RecommendationResource | null }[] = [];

  for (const resource of context.lowResources) {
    for (const path of RESOURCE_PATHS[resource]) candidates.push({ path, resource });
  }
  for (const rule of AIM_RULES) {
    if (rule.terms.some((term) => aim.includes(term))) {
      for (const path of rule.paths) candidates.push({ path, resource: null });
    }
  }
  if (candidates.length === 0) candidates.push({ path: "body.health.general-wellbeing", resource: null });

  const selected = new Map<KpiSearchResult["path"], {
    item: IndexedResult;
    resources: Set<RecommendationResource>;
    aimMatched: boolean;
  }>();
  for (const candidate of candidates) {
    const item = RESULT_BY_PATH.get(candidate.path);
    if (!item) continue;
    const match = selected.get(candidate.path) ?? {
      item,
      resources: new Set<RecommendationResource>(),
      aimMatched: false,
    };
    if (candidate.resource) match.resources.add(candidate.resource);
    else match.aimMatched = true;
    selected.set(candidate.path, match);
    if (selected.size === 5) break;
  }
  return [...selected.values()].map((match) => ({
    result: publicResult(match.item),
    resources: Object.freeze([...match.resources]),
    aimMatched: match.aimMatched,
  }));
}

export function recommendKpiSubset(context: RecommendationContext): KpiSearchResult[] {
  return matchKpiRecommendations(context).map((match) => match.result);
}

export function getStudyResource(path: string): StudyResource | null {
  const item = RESULT_BY_PATH.get(path as KpiSearchResult["path"]);
  if (!item?.wikipedia) return null;
  return {
    path: item.path,
    label: item.label,
    title: item.wikipedia.title,
    href: item.wikipedia.href,
    source: "Wikipedia",
  };
}
