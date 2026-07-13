import { getKpiGuidance } from "../../edge-kpi-guidance";
import { formatKpiPath } from "./KpiSearch";

export function KpiReading({ path, value, onSave }: { path: string; value: number; onSave: (value: number) => void }) {
  const guidance = getKpiGuidance(path);
  if (!guidance) return null;
  return (
    <section className="kpi-reading" aria-label={`${formatKpiPath(path)} today`}>
      <header><h2>{formatKpiPath(path)}</h2><output>{value}</output></header>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        aria-label={`${formatKpiPath(path)} today`}
        onChange={(event) => onSave(Number(event.currentTarget.value))}
      />
      <div className="kpi-directions">
        <p><b>Lower</b>{guidance.lower}</p>
        <p><b>Higher</b>{guidance.higher}</p>
      </div>
    </section>
  );
}
