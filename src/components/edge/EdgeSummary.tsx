import type { TodayEdgeSnapshot } from "../../weekrun-edge";
import "../../edge-integration.css";

const RESOURCE_LABELS: Record<string, string> = {
  energy: "Energy", focus: "Focus", composure: "Composure", confidence: "Confidence",
  recovery: "Recovery", connection: "Connection", time: "Time",
};

export function EdgeSummary({ snapshot, onOpen }: { snapshot: TodayEdgeSnapshot; onOpen: () => void }) {
  return (
    <button className="edge-summary" type="button" data-state={snapshot.state} onClick={onOpen}>
      <span><b>{snapshot.state}</b><strong>{snapshot.orientationValue}<small>orientation</small></strong></span>
      <span className="edge-summary-preview">
        {Object.entries(snapshot.resources).map(([resource, value]) => (
          <i key={resource}>{RESOURCE_LABELS[resource]} {value}</i>
        ))}
        <em>{snapshot.domains.map((domain) => `${domain.label} ${domain.value}`).join(" · ")}</em>
      </span>
    </button>
  );
}
