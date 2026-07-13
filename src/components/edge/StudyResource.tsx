import type { StudyResource as StudyResourceModel } from "../../edge-kpis";
import { formatKpiPath } from "./KpiSearch";

export function StudyResource({ resource }: { resource: StudyResourceModel | null }) {
  if (!resource) return null;
  return (
    <aside className="study-resource" aria-label="Study today's ability">
      <span>Wikipedia</span>
      <h2>{resource.title}</h2>
      <p>{formatKpiPath(resource.path)} may help clarify today's call.</p>
      <a href={resource.href} target="_blank" rel="noreferrer noopener">
        Read on Wikipedia <span className="visually-hidden">(opens in a new tab)</span>
      </a>
    </aside>
  );
}
