import { describe, expect, it } from "vitest";
import { COACH_LINES, getCoachLine, type CoachCall } from "./edge-voice";

describe("Edge coaching voice", () => {
  it("reserves Push Coach for Athletic Mode", () => {
    expect(getCoachLine("default", { capacity: "available", call: "act" })).toBe(
      "You have enough capacity for one demanding move. Choose it and begin.",
    );
    expect(getCoachLine("athletic", { capacity: "available", call: "act" })).toBe(
      "The capacity is there. Stop negotiating with the first move. Take it.",
    );
  });

  it("never pushes through overload", () => {
    expect(getCoachLine("athletic", { capacity: "overloaded", call: "restore" })).toBe(
      "Redline is not courage. Cut the load, recover, then return ready.",
    );
  });

  it("protects restoration in every mode and requested call", () => {
    const calls: CoachCall[] = ["act", "narrow", "restore", "connect", "create-space"];
    for (const call of calls) {
      expect(getCoachLine("athletic", { capacity: "restoring", call })).toBe(
        getCoachLine("default", { capacity: "restoring", call }),
      );
      expect(getCoachLine("athletic", { capacity: "overloaded", call })).toBe(
        getCoachLine("default", { capacity: "overloaded", call }),
      );
    }
  });

  it("keeps a complete fixed table for audit", () => {
    expect(Object.keys(COACH_LINES)).toEqual(["default", "athletic"]);
    for (const mode of Object.values(COACH_LINES)) {
      expect(Object.keys(mode)).toEqual(["available", "balanced", "loaded", "restoring", "overloaded"]);
      for (const capacity of Object.values(mode)) {
        expect(Object.keys(capacity)).toEqual(["act", "narrow", "restore", "connect", "create-space"]);
        expect(Object.values(capacity).every((line) => line.trim().length > 20)).toBe(true);
      }
    }
  });
});
