import { describe, expect, it, vi } from "vitest";
import { supportsWebGL } from "./edge-capabilities";

describe("Edge capabilities", () => {
  it("accepts WebGL2 or WebGL without importing the renderer", () => {
    expect(supportsWebGL(() => ({ getContext: (name) => name === "webgl2" ? {} : null }))).toBe(true);
    expect(supportsWebGL(() => ({ getContext: (name) => name === "webgl" ? {} : null }))).toBe(true);
  });

  it("returns semantic fallback for unsupported or blocked contexts", () => {
    expect(supportsWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(supportsWebGL(vi.fn(() => { throw new Error("blocked"); }))).toBe(false);
  });
});
