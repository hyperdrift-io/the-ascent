import { useMemo, useState } from "react";
import { KPI_TREE, searchKpis, type KpiSearchResult } from "../../edge-kpis";
import "../../edge-integration.css";

const LABELS = new Map<string, string>([
  ["edge", "The Edge"],
  ...KPI_TREE.flatMap((domain) => [
    [domain.id, domain.label] as const,
    ...domain.kpis.flatMap((kpi) => [
      [kpi.id, kpi.label] as const,
      ...kpi.children.map((child) => [child.id, child.label] as const),
    ]),
  ]),
]);

export function formatKpiPath(path: string): string {
  return path.split(".").map((part) => LABELS.get(part) ?? part).join(" / ");
}

export function KpiSearch({ onSelect }: { onSelect: (result: KpiSearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [openCore, setOpenCore] = useState<string | null>(null);
  const results = useMemo(() => query.trim() ? searchKpis(query).slice(0, 8) : [], [query]);
  const children = openCore
    ? searchKpis("").filter((result) => result.source === "sub" && result.path.startsWith(`${openCore}.`))
    : [];

  function select(result: KpiSearchResult) {
    if (result.source === "core") setOpenCore(result.path);
    onSelect(result);
  }

  return (
    <section className="kpi-search" aria-label="Search human KPIs">
      <label>
        <span>Human KPI</span>
        <input
          type="search"
          value={query}
          placeholder="Search motivation, rest, anxiety"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      <div className="kpi-results">
        {(children.length > 0 ? children : results).map((result) => (
          <button type="button" key={result.path} onClick={() => select(result)}>
            {formatKpiPath(result.path)}
          </button>
        ))}
      </div>
      {children.length > 0 && (
        <button type="button" className="quiet" onClick={() => setOpenCore(null)}>All human KPIs</button>
      )}
    </section>
  );
}
