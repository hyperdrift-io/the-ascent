import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AthleticMode } from "./components/edge/AthleticMode";
import { completeAthleticWeekrun, createEdgeProfile, setAthleticMode } from "./edge-profile";

describe("Athletic Mode opt-in", () => {
  it("explains the complete practice before explicit enablement", () => {
    const markup = renderToStaticMarkup(
      <AthleticMode profile={createEdgeProfile("2026-07-13")} onChange={() => {}} />,
    );

    expect(markup).toContain("Athletic Mode");
    expect(markup).toContain("52 completed Weekruns");
    expect(markup).toContain("Breaks are allowed");
    expect(markup).toContain("No next Weekrun starts automatically");
    expect(markup).toContain("Recovery belongs to the practice");
    expect(markup).toContain("Push Coach");
    expect(markup).toContain("Enable Athletic Mode");
  });

  it("shows progress and promises history preservation while enabled", () => {
    const enabled = setAthleticMode(createEdgeProfile("2026-07-13"), true);
    const profile = completeAthleticWeekrun(enabled, "run-1");
    const markup = renderToStaticMarkup(<AthleticMode profile={profile} onChange={() => {}} />);

    expect(markup).toContain("1 / 52");
    expect(markup).toContain("Disable Athletic Mode");
    expect(markup).toContain("Your completed Weekruns stay in history");
  });
});
