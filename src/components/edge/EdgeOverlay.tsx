import { useEffect, useMemo, useRef, useState } from "react";
import { confirmRecommendation, saveDailyReading, type EdgeProfile } from "../../edge-profile";
import { getStudyResource, type KpiSearchResult } from "../../edge-kpis";
import { buildEdgeRecommendations, type TodayEdgeSnapshot } from "../../weekrun-edge";
import type { HumanResource } from "../../edge";
import { EdgeWorld } from "./EdgeWorld";
import { KpiReading } from "./KpiReading";
import { KpiSearch, formatKpiPath } from "./KpiSearch";
import { StudyResource } from "./StudyResource";
import { AthleticMode } from "./AthleticMode";

export function reconcileRecommendationPaths(
  current: readonly string[],
  available: readonly string[],
): string[] {
  const visible = current.filter((path) => available.includes(path));
  return [...visible, ...available.filter((path) => !visible.includes(path))].slice(0, 3);
}

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
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const recommendations = useMemo(() => buildEdgeRecommendations(aim, resources), [aim, resources]);
  const [pending, setPending] = useState<string[]>(() => recommendations.map((item) => item.path));
  const [active, setActive] = useState<KpiSearchResult | null>(() => recommendations[0] ?? null);
  const path = active?.source === "sub" ? active.path : null;
  const value = path ? profile.daily[today]?.[path] ?? null : null;
  const todayRecommendations = profile.recommendations.filter((item) => item.date === today);
  const studyPath = path ?? todayRecommendations[todayRecommendations.length - 1]?.paths[0] ?? null;

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const available = recommendations.map((item) => item.path);
    setPending((current) => reconcileRecommendationPaths(current, available));
    setActive((current) => current && available.includes(current.path) ? current : recommendations[0] ?? null);
  }, [recommendations]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (
        document.activeElement === last || !dialog.contains(document.activeElement)
      )) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

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
    <section
      ref={dialogRef}
      className="edge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Today's Edge"
      data-state={snapshot.state}
      tabIndex={-1}
    >
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
                    name="edge-recommendation"
                    value={item.path}
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
            <AthleticMode profile={profile} onChange={onProfile} />
          </div>
        }
      />
    </section>
  );
}
