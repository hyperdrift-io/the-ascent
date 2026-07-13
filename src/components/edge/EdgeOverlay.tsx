import { useMemo, useState } from "react";
import { confirmRecommendation, saveDailyReading, type EdgeProfile } from "../../edge-profile";
import { getStudyResource, type KpiSearchResult } from "../../edge-kpis";
import { buildEdgeRecommendations, type TodayEdgeSnapshot } from "../../weekrun-edge";
import type { HumanResource } from "../../edge";
import { EdgeWorld } from "./EdgeWorld";
import { KpiReading } from "./KpiReading";
import { KpiSearch, formatKpiPath } from "./KpiSearch";
import { StudyResource } from "./StudyResource";

export function EdgeOverlay({
  aim, resources, snapshot, profile, today, onProfile, onClose,
}: {
  aim: string;
  resources: Record<HumanResource, number>;
  snapshot: TodayEdgeSnapshot;
  profile: EdgeProfile;
  today: string;
  onProfile: (profile: EdgeProfile) => void;
  onClose: () => void;
}) {
  const recommendations = useMemo(() => buildEdgeRecommendations(aim, resources), [aim, resources]);
  const [pending, setPending] = useState<string[]>(() => recommendations.map((item) => item.path));
  const [active, setActive] = useState<KpiSearchResult | null>(() => recommendations[0] ?? null);
  const path = active?.source === "sub" ? active.path : null;
  const value = path ? profile.daily[today]?.[path] ?? 50 : 50;
  const todayRecommendations = profile.recommendations.filter((item) => item.date === today);
  const studyPath = path ?? todayRecommendations[todayRecommendations.length - 1]?.paths[0] ?? null;

  function select(result: KpiSearchResult) {
    setActive(result);
  }

  function save(value: number) {
    if (!path) return;
    onProfile(saveDailyReading(profile, { date: today, path, value }));
  }

  function confirm() {
    if (pending.length === 0) return;
    onProfile(confirmRecommendation(profile, { date: today, aim, paths: pending as KpiSearchResult["path"][] }));
  }

  return (
    <section className="edge-overlay" aria-label="Today's Edge" data-state={snapshot.state}>
      <button type="button" className="edge-overlay-close" onClick={onClose}>Close Edge</button>
      <EdgeWorld
        embedded
        targetPath={active?.path ?? null}
        tools={
          <div className="edge-tools">
            <KpiSearch onSelect={select} />
            {path && <KpiReading path={path} value={value} onSave={save} />}
            <section className="edge-recommendations" aria-label="Recommended human KPIs">
              <h2>Confirm today's focus</h2>
              {recommendations.map((item) => (
                <label key={item.path}>
                  <input
                    type="checkbox"
                    checked={pending.includes(item.path)}
                    onChange={() => setPending((current) => current.includes(item.path)
                      ? current.filter((path) => path !== item.path)
                      : [...current, item.path].slice(0, 3))}
                  />
                  <span><b>{formatKpiPath(item.path)}</b>{item.evidence}</span>
                </label>
              ))}
              <button type="button" onClick={confirm} disabled={pending.length === 0}>Confirm Edge aim</button>
            </section>
            <StudyResource resource={studyPath ? getStudyResource(studyPath) : null} />
          </div>
        }
      />
    </section>
  );
}
