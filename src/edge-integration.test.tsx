import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { HumanResource } from "./edge";
import { createEdgeProfile } from "./edge-profile";
import * as EdgeOverlayModule from "./components/edge/EdgeOverlay";
import { EdgeOverlay } from "./components/edge/EdgeOverlay";
import { KpiReading } from "./components/edge/KpiReading";
import * as KpiSearchModule from "./components/edge/KpiSearch";
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
  });

  it("reconciles recommendation choices when their identity changes", () => {
    const reconcile = (EdgeOverlayModule as unknown as {
      reconcileRecommendationPaths?: (current: readonly string[], available: readonly string[]) => string[];
    }).reconcileRecommendationPaths;
    expect(reconcile).toBeTypeOf("function");
    if (!reconcile) return;

    expect(reconcile(["pressure.stress.anxiety", "recovery.sleep.quality"], [
      "recovery.sleep.quality",
      "structure.work.workload",
    ])).toEqual(["recovery.sleep.quality", "structure.work.workload"]);
  });

  it("lets a new query take precedence over an open core drilldown", () => {
    const visibleResults = (KpiSearchModule as unknown as {
      getVisibleKpiResults?: (query: string, openCore: string | null) => readonly { path: string }[];
    }).getVisibleKpiResults;
    expect(visibleResults).toBeTypeOf("function");
    if (!visibleResults) return;

    expect(visibleResults("motivation", "pressure.stress").map((result) => result.path)).toEqual([
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
