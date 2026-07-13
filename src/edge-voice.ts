export type CoachMode = "default" | "athletic";
export type CoachCapacity = "available" | "balanced" | "loaded" | "restoring" | "overloaded";
export type CoachCall = "act" | "narrow" | "restore" | "connect" | "create-space";
export type CoachContext = { capacity: CoachCapacity; call: CoachCall };

type CallTable = Readonly<Record<CoachCall, string>>;
type CapacityTable = Readonly<Record<CoachCapacity, CallTable>>;

const RESTORING_LINE = "The aim still stands. Restoration is the call that keeps tomorrow available.";
const OVERLOADED_LINE = "Redline is not courage. Cut the load, recover, then return ready.";

const protectedCalls = (line: string): CallTable => Object.freeze({
  act: line,
  narrow: line,
  restore: line,
  connect: line,
  "create-space": line,
});

export const COACH_LINES: Readonly<Record<CoachMode, CapacityTable>> = Object.freeze({
  default: Object.freeze({
    available: Object.freeze({
      act: "You have enough capacity for one demanding move. Choose it and begin.",
      narrow: "Capacity is available. Narrow the field, choose the useful move, and begin.",
      restore: "Capacity is available, and restoration can still protect what matters next.",
      connect: "Capacity is available. Bring in the person who can strengthen the next move.",
      "create-space": "Capacity is available. Clear one boundary and give the right move room.",
    }),
    balanced: Object.freeze({
      act: "The conditions can carry one honest move. Choose it and begin.",
      narrow: "The conditions are balanced. Keep the move bounded and make it real.",
      restore: "Balance includes recovery. Protect it where that keeps the day usable.",
      connect: "The conditions can carry connection. Ask clearly for the support that fits.",
      "create-space": "The conditions can carry a clear move once one distraction leaves the field.",
    }),
    loaded: Object.freeze({
      act: "The load is real. Choose the smallest move that still advances the aim.",
      narrow: "Narrow the call. One bounded move is enough under this load.",
      restore: "The load is asking for recovery. Restore before adding another demand.",
      connect: "The load is easier to carry with support. Ask for the help that changes the fit.",
      "create-space": "The load needs room. Remove one demand before choosing what remains.",
    }),
    restoring: protectedCalls(RESTORING_LINE),
    overloaded: protectedCalls(OVERLOADED_LINE),
  }),
  athletic: Object.freeze({
    available: Object.freeze({
      act: "The capacity is there. Stop negotiating with the first move. Take it.",
      narrow: "The capacity is there. Cut the options, name the move, and take it.",
      restore: "Recovery is part of serious practice. Choose it deliberately when it protects the next effort.",
      connect: "Use the support available. Make the ask, then move with it.",
      "create-space": "Clear the field. The useful move needs room, not another round of planning.",
    }),
    balanced: Object.freeze({
      act: "The conditions are workable. Commitment matters now; take the first move.",
      narrow: "One move fits. Remove the extras and commit to it.",
      restore: "Protecting recovery is training discipline when it keeps the next effort available.",
      connect: "Support is part of the practice. Ask clearly and use it well.",
      "create-space": "Make the space the move requires, then stop negotiating with the start.",
    }),
    loaded: Object.freeze({
      act: "The load allows one bounded move. Take that move and leave the rest.",
      narrow: "The field is too wide for this load. Cut it to one move and commit.",
      restore: "Serious practice protects recovery. Restore now so the aim remains available.",
      connect: "Do not carry avoidable load alone. Make the useful ask now.",
      "create-space": "The load needs a boundary. Remove one demand before you add effort.",
    }),
    restoring: protectedCalls(RESTORING_LINE),
    overloaded: protectedCalls(OVERLOADED_LINE),
  }),
});

export function getCoachLine(mode: CoachMode, context: CoachContext): string {
  return COACH_LINES[mode][context.capacity][context.call];
}
