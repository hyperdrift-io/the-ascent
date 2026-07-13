import { describe, expect, it } from "vitest";
import { getEdgeLinePoint } from "./edge-line";

describe("Edge Line geometry", () => {
  it("keeps every continuous marker on the signature cubic crest", () => {
    const low = getEdgeLinePoint(5);
    const middle = getEdgeLinePoint(50);
    const high = getEdgeLinePoint(95);

    expect(low.x).toBeGreaterThan(1);
    expect(high.x).toBeLessThan(99);
    expect(low.y).toBeGreaterThan(middle.y);
    expect(middle.y).toBeGreaterThan(high.y);
  });

  it("clamps out-of-range state to the crest endpoints", () => {
    expect(getEdgeLinePoint(-50)).toEqual(getEdgeLinePoint(0));
    expect(getEdgeLinePoint(150)).toEqual(getEdgeLinePoint(100));
  });
});
