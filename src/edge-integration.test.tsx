import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { HumanResource } from "./edge";
import { createEdgeProfile } from "./edge-profile";
import { EdgeOverlay, reconcileRecommendationPaths } from "./components/edge/EdgeOverlay";
import { KpiReading } from "./components/edge/KpiReading";
import { StudyResource } from "./components/edge/StudyResource";
import { getVisibleKpiResults } from "./components/edge/KpiSearch";
import { deriveTodayEdgeSnapshot } from "./weekrun-edge";

const RESOURCES: Record<HumanResource, number> = {
  energy: 68,
  focus: 64,
  composure: 66,
  confidence: 62,
  recovery: 70,
  connection: 65,
  time: 60,
};

describe("Edge integration UI contracts", () => {
  it("renders an absent reading as Not set with a midpoint draft action", () => {
    const markup = renderToStaticMarkup(
      <KpiReading path="pressure.stress.anxiety" value={null as never} onSave={() => {}} />,
    );

    expect(markup).toContain("Not set");
    expect(markup).toContain('value="50"');
    expect(markup).toContain("Set 50");
    expect(markup).toContain("<b>Lower:</b>");
    expect(markup).toContain("<b>Higher:</b>");
  });

  it("announces the Wikipedia link's new browsing context", () => {
    const markup = renderToStaticMarkup(<StudyResource resource={{
      path: "pressure.stress.anxiety",
      label: "Anxiety",
      title: "Arousal",
      href: "https://en.wikipedia.org/wiki/Arousal",
      source: "Wikipedia",
    }} />);

    expect(markup).toContain("opens in a new tab");
  });

  it("reconciles recommendation choices when their identity changes", () => {
    expect(reconcileRecommendationPaths(["pressure.stress.anxiety", "recovery.sleep.quality"], [
      "recovery.sleep.quality",
      "structure.work.workload",
    ])).toEqual(["recovery.sleep.quality", "structure.work.workload"]);
  });

  it("lets a new query take precedence over an open core drilldown", () => {
    expect(getVisibleKpiResults("motivation", "pressure.stress").map((result) => result.path)).toEqual([
      "body.sport.motivation",
      "structure.work.motivation",
    ]);
  });

  it("exposes the full-screen Edge layer as a modal dialog", () => {
    const profile = createEdgeProfile("2026-07-13");
    const markup = renderToStaticMarkup(
      <EdgeOverlay
        aim="Deliver the talk"
        resources={RESOURCES}
        snapshot={deriveTodayEdgeSnapshot({ resources: RESOURCES })}
        profile={profile}
        today="2026-07-13"
        onProfile={() => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
  });
});
