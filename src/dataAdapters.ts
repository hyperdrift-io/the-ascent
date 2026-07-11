import type { Criterion, DayName, HealthLog, LifeEvent, WeekData } from "./game";
import { days, sampleWeek } from "./game";

type RawEvent = {
  day?: string;
  title?: string;
  category?: string;
  minutes?: number;
};

type RawHealth = {
  day?: string;
  sleepHours?: number;
  stamina?: number;
  stress?: number;
  nutrition?: number;
  cardioMinutes?: number;
};

export async function parseCalendarFile(file: File): Promise<WeekData> {
  const text = await file.text();
  const events = parseIcs(text);
  return {
    health: sampleWeek.health,
    events,
    source: `${file.name} calendar`,
  };
}

export async function parseJsonFile(file: File): Promise<WeekData> {
  const text = await file.text();
  const parsed = JSON.parse(text) as { events?: RawEvent[]; health?: RawHealth[] } | RawHealth[];
  const rawHealth = Array.isArray(parsed) ? parsed : parsed.health ?? [];
  const rawEvents = Array.isArray(parsed) ? [] : parsed.events ?? [];

  return {
    health: normalizeHealth(rawHealth),
    events: normalizeEvents(rawEvents),
    source: `${file.name} import`,
  };
}

function parseIcs(text: string): LifeEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  return blocks
    .map((block, index) => {
      const title = readIcsField(block, "SUMMARY") || "Calendar event";
      const start = readIcsField(block, "DTSTART");
      const end = readIcsField(block, "DTEND");
      const startDate = parseIcsDate(start);
      const endDate = parseIcsDate(end);
      const minutes = startDate && endDate ? Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / 60000)) : 60;
      const category = categorize(title);
      const day = startDate ? dayFromDate(startDate) : days[index % days.length];
      const eventShape = shapeForCategory(category, minutes);

      return {
        id: `ics-${index}-${title.slice(0, 12)}`,
        day,
        title,
        category,
        minutes,
        ...eventShape,
      };
    })
    .filter((event) => event.minutes > 0);
}

function normalizeHealth(rawHealth: RawHealth[]): HealthLog[] {
  const health = rawHealth
    .map((entry, index) => ({
      day: normalizeDay(entry.day) ?? days[index % days.length],
      sleepHours: numberOr(entry.sleepHours, 7),
      stamina: numberOr(entry.stamina, 62),
      stress: numberOr(entry.stress, 50),
      nutrition: numberOr(entry.nutrition, 60),
      cardioMinutes: numberOr(entry.cardioMinutes, 0),
    }))
    .slice(0, 7);

  return health.length > 0 ? health : sampleWeek.health;
}

function normalizeEvents(rawEvents: RawEvent[]): LifeEvent[] {
  return rawEvents.map((entry, index) => {
    const category = normalizeCategory(entry.category) ?? categorize(entry.title ?? "");
    const minutes = numberOr(entry.minutes, 60);
    return {
      id: `json-${index}-${entry.title ?? "event"}`,
      day: normalizeDay(entry.day) ?? days[index % days.length],
      title: entry.title ?? "Imported event",
      category,
      minutes,
      ...shapeForCategory(category, minutes),
    };
  });
}

function readIcsField(block: string, field: string): string {
  const match = block.match(new RegExp(`^${field}(?:;[^:]*)?:(.*)$`, "m"));
  return match ? decodeIcsText(match[1].trim()) : "";
}

function parseIcsDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const clean = value.replace(/Z$/, "");
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function decodeIcsText(value: string): string {
  return value.replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\\\/g, "\\").trim();
}

function dayFromDate(date: Date): DayName {
  const index = date.getDay();
  return (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as DayName[])[index];
}

function normalizeDay(day: string | undefined): DayName | null {
  if (!day) {
    return null;
  }
  const found = days.find((candidate) => candidate.toLowerCase() === day.slice(0, 3).toLowerCase());
  return found ?? null;
}

function normalizeCategory(category: string | undefined): Criterion | null {
  if (!category) {
    return null;
  }
  const normalized = category.toLowerCase().trim();
  const valid: Criterion[] = [
    "sleep",
    "stamina",
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
  return valid.find((item) => item === normalized) ?? null;
}

function categorize(title: string): Criterion {
  const text = title.toLowerCase();
  if (/(sleep|bed|nap)/.test(text)) return "sleep";
  if (/(run|gym|ride|cycle|swim|sport|training|workout|match)/.test(text)) return "sport";
  if (/(cardio|zone 2|interval)/.test(text)) return "cardio";
  if (/(family|partner|child|children|parent|home dinner)/.test(text)) return "family";
  if (/(friend|coffee|dinner|social|club|community|date)/.test(text)) return "social";
  if (/(commute|train to work|drive|tube|metro)/.test(text)) return "commute";
  if (/(flight|hotel|travel|trip|station|airport)/.test(text)) return "travel";
  if (/(movie|show|game|stream|concert|entertainment)/.test(text)) return "entertainment";
  if (/(rest|quiet|recover|walk|reading)/.test(text)) return "rest";
  if (/(plan|prep|review|routine|admin)/.test(text)) return "routine";
  if (/(lunch|meal|food|cook|grocer)/.test(text)) return "nutrition";
  return "work";
}

function shapeForCategory(category: Criterion, minutes: number): Pick<LifeEvent, "strain" | "recovery" | "meaning"> {
  const scaled = Math.min(100, minutes / 4);
  switch (category) {
    case "sleep":
      return { strain: 0, recovery: Math.min(60, scaled), meaning: 20 };
    case "sport":
    case "cardio":
      return { strain: Math.min(48, scaled), recovery: Math.min(28, scaled * 0.45), meaning: 52 };
    case "family":
      return { strain: Math.min(24, scaled * 0.28), recovery: Math.min(28, scaled * 0.25), meaning: 82 };
    case "social":
      return { strain: Math.min(28, scaled * 0.32), recovery: Math.min(26, scaled * 0.25), meaning: 68 };
    case "rest":
      return { strain: 0, recovery: Math.min(56, scaled * 0.6), meaning: 38 };
    case "commute":
    case "travel":
      return { strain: Math.min(58, scaled * 0.7), recovery: 0, meaning: 18 };
    case "entertainment":
      return { strain: Math.min(36, scaled * 0.32), recovery: Math.min(20, scaled * 0.12), meaning: 22 };
    case "nutrition":
    case "routine":
      return { strain: Math.min(12, scaled * 0.12), recovery: Math.min(24, scaled * 0.25), meaning: 38 };
    default:
      return { strain: Math.min(72, scaled * 0.72), recovery: 0, meaning: 18 };
  }
}

function numberOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
