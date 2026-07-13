import { useEffect, useId, useState } from "react";
import { getKpiGuidance } from "../../edge-kpi-guidance";
import { formatKpiPath } from "./KpiSearch";

export function KpiReading({ path, value, onSave }: { path: string; value: number | null; onSave: (value: number) => void }) {
  const guidance = getKpiGuidance(path);
  const inputId = useId();
  const [draft, setDraft] = useState(value ?? 50);

  useEffect(() => {
    setDraft(value ?? 50);
  }, [path, value]);

  if (!guidance) return null;

  function update(next: number) {
    setDraft(next);
    onSave(next);
  }

  return (
    <section className="kpi-reading" aria-label={`${formatKpiPath(path)} today`}>
      <header>
        <label htmlFor={inputId}>{formatKpiPath(path)}</label>
        <output htmlFor={inputId}>{value ?? "Not set"}</output>
      </header>
      <input
        id={inputId}
        name="edge-daily-reading"
        type="range"
        min="0"
        max="100"
        value={value ?? draft}
        aria-label={`${formatKpiPath(path)} today`}
        onChange={(event) => update(Number(event.currentTarget.value))}
      />
      {value === null && (
        <button type="button" className="quiet" onClick={() => update(50)}>Set 50</button>
      )}
      <div className="kpi-directions">
        <p><b>Lower</b>{guidance.lower}</p>
        <p><b>Higher</b>{guidance.higher}</p>
      </div>
    </section>
  );
}
