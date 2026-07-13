import type { KpiSearchResult } from "./edge-kpis";

export type KpiOrientation = "higher-supports" | "lower-supports" | "balanced";

export type KpiGuidance = {
  path: KpiSearchResult["path"];
  orientation: KpiOrientation;
  lower: string;
  higher: string;
};

function guidance(
  path: KpiSearchResult["path"],
  orientation: KpiOrientation,
  lower: string,
  higher: string,
): KpiGuidance {
  return Object.freeze({ path, orientation, lower, higher });
}

export const EDGE_KPI_GUIDANCE: readonly KpiGuidance[] = Object.freeze([
  guidance("body.health.general-wellbeing", "higher-supports", "A quieter baseline invites a smaller call and a wider margin.", "A steady baseline can carry a clear move without borrowing from later."),
  guidance("body.health.physical-comfort", "higher-supports", "Discomfort asks the plan to make room for the body.", "Physical ease frees attention for deliberate effort."),
  guidance("body.health.illness-load", "lower-supports", "Low illness load leaves more room for chosen demands.", "A heavier illness load makes protection and support the stronger call."),
  guidance("body.stamina.sustained-effort", "higher-supports", "Shorter reserves favour one bounded effort over a long push.", "Durable reserves make patient continuation available."),
  guidance("body.stamina.physical-endurance", "higher-supports", "Limited endurance calls for measured movement and earlier recovery.", "Physical endurance can hold a longer useful rhythm."),
  guidance("body.stamina.mental-endurance", "higher-supports", "A tiring mind benefits from fewer switches and a clean finish line.", "Mental endurance supports deeper attention without needless urgency."),
  guidance("body.nutrition.nourishment", "higher-supports", "Thin fuel makes replenishment part of the move.", "Reliable nourishment gives effort a steadier foundation."),
  guidance("body.nutrition.hydration", "higher-supports", "Low hydration invites a pause before intensity.", "Steady hydration supports clearer, more sustained action."),
  guidance("body.nutrition.regularity", "higher-supports", "Irregular fuel asks the day to stay flexible.", "Regular fuel can make energy easier to predict."),
  guidance("body.cardio.breath", "higher-supports", "Restricted breath invites pace, space, and a gentler start.", "An easy breath makes composed exertion more available."),
  guidance("body.cardio.aerobic-capacity", "higher-supports", "Lower aerobic room favours intervals and honest limits.", "Aerobic room supports effort that stays controlled."),
  guidance("body.cardio.exertion-response", "balanced", "Too little activation may need a deliberate warm-up.", "A sharp exertion response asks intensity to rise with care."),
  guidance("body.sport.movement", "higher-supports", "Less movement can make a brief reset more useful than another demand.", "Regular movement often leaves more usable energy in circulation."),
  guidance("body.sport.motivation", "higher-supports", "Low sporting drive invites an easier entry, not a verdict.", "Strong sporting drive can carry a purposeful session with restraint."),
  guidance("body.sport.enjoyment", "higher-supports", "Low enjoyment asks whether the form of movement still fits today.", "Enjoyment can turn effort into restoration as well as progress."),
  guidance("recovery.sleep.duration", "balanced", "Short sleep narrows the load worth carrying today.", "Very long sleep can also signal that the day needs recovery and margin."),
  guidance("recovery.sleep.quality", "higher-supports", "Interrupted sleep asks for simpler decisions and more margin.", "Restorative sleep supports clarity, regulation, and follow-through."),
  guidance("recovery.sleep.regularity", "higher-supports", "An uneven rhythm makes energy timing less predictable.", "A stable sleep rhythm gives the day a firmer cadence."),
  guidance("recovery.rest.detachment", "higher-supports", "When work still follows you, recovery needs a clearer boundary.", "Real detachment lets effort settle into restored capacity."),
  guidance("recovery.rest.relaxation", "higher-supports", "Persistent activation invites a slower transition before the next demand.", "Relaxation creates room for energy to return."),
  guidance("recovery.rest.quiet", "higher-supports", "Too little quiet can leave every signal competing at once.", "Enough quiet makes the important signal easier to hear."),
  guidance("pressure.stress.anxiety", "balanced", "Very low arousal may need a clear reason to engage.", "High arousal asks for a smaller call, firmer support, and more room."),
  guidance("pressure.stress.tension", "balanced", "Very little tension can signal that the move has not yet become real.", "High tension invites release before additional load."),
  guidance("pressure.stress.overwhelm", "lower-supports", "Low overwhelm leaves space to choose deliberately.", "Overwhelm is a cue to reduce, sequence, or ask for support."),
  guidance("structure.work.workload", "balanced", "Too little load can leave ability unused and direction vague.", "Heavy load asks for ruthless sequence and a protected stopping point."),
  guidance("structure.work.motivation", "higher-supports", "Low work drive invites a smaller honest beginning or a better reason.", "Strong work drive can power a demanding move when recovery still fits."),
  guidance("structure.work.autonomy", "higher-supports", "Limited agency makes boundaries and support more important.", "Real agency lets the call reflect values as well as demand."),
  guidance("structure.commute.duration", "lower-supports", "A short journey preserves more of the day for chosen use.", "A long journey asks the plan to account for its real cost."),
  guidance("structure.commute.friction", "lower-supports", "A smooth journey keeps attention available for what follows.", "Travel friction deserves recovery space instead of being ignored."),
  guidance("structure.commute.predictability", "higher-supports", "Uncertain travel calls for buffers and fewer brittle commitments.", "Predictable travel makes time easier to place with confidence."),
  guidance("structure.routine.consistency", "higher-supports", "An uneven rhythm invites one dependable anchor, not a total reset.", "A reliable rhythm reduces the cost of beginning."),
  guidance("structure.routine.adaptability", "higher-supports", "A rigid routine can turn surprise into unnecessary strain.", "An adaptable routine protects direction when conditions change."),
  guidance("structure.routine.activation", "higher-supports", "Slow activation favours a visible first step with low friction.", "Ready activation makes decisive beginnings easier."),
  guidance("structure.travel.disruption", "lower-supports", "Low disruption leaves routines and recovery intact.", "High disruption asks for a lighter plan and flexible timing."),
  guidance("structure.travel.novelty", "balanced", "Too little novelty may leave curiosity underfed.", "Too much novelty can scatter attention that needs an anchor."),
  guidance("structure.travel.recovery-cost", "lower-supports", "A low recovery cost keeps travel compatible with normal load.", "A high recovery cost makes restoration part of the itinerary."),
  guidance("connection.social.support", "higher-supports", "Thin support makes asking clearly a capable move.", "Strong support can buffer load without removing ownership."),
  guidance("connection.social.belonging", "higher-supports", "Low belonging invites one honest point of connection.", "Belonging gives difficult effort a wider human ground."),
  guidance("connection.social.relational-energy", "balanced", "Low relational energy asks for space or gentler company.", "High relational energy can support connection while still needing boundaries."),
  guidance("connection.family.support", "higher-supports", "Limited family support makes outside help and clear limits more valuable.", "Family support can make sustained effort safer to carry."),
  guidance("connection.family.closeness", "higher-supports", "Distance invites a small act of presence rather than forced intensity.", "Closeness can restore perspective and shared strength."),
  guidance("connection.family.responsibility-load", "balanced", "Too little shared responsibility may leave contribution out of balance.", "Heavy responsibility asks the plan to honour care and capacity together."),
  guidance("renewal.entertainment.enjoyment", "higher-supports", "Low enjoyment asks whether the chosen escape is actually renewing.", "Genuine enjoyment can return lightness to the day."),
  guidance("renewal.entertainment.restoration", "higher-supports", "Entertainment that does not restore may need a different form or limit.", "Restorative entertainment can replenish without becoming another target."),
  guidance("renewal.entertainment.stimulation", "balanced", "Too little stimulation may leave renewal flat and disengaged.", "Too much stimulation can crowd out quiet and sleep."),
]);

const GUIDANCE_BY_PATH = new Map(EDGE_KPI_GUIDANCE.map((item) => [item.path, item]));

export function getKpiGuidance(path: string): KpiGuidance | null {
  return GUIDANCE_BY_PATH.get(path as KpiSearchResult["path"]) ?? null;
}
