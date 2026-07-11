import { useMemo, useState } from "react";
import { parseCalendarFile, parseJsonFile } from "./dataAdapters";
import {
  choices,
  classifyAim,
  computeScores,
  criteria,
  days,
  getCriterion,
  sampleWeek,
  type Criterion,
  type WeekData,
} from "./game";

const starterAims = [
  "Run a half marathon with energy left",
  "Build a calmer work rhythm",
  "Be more present with family",
  "Change career without burning out",
];

export function CitizenGame() {
  const [aim, setAim] = useState(starterAims[0]);
  const [week, setWeek] = useState<WeekData>(sampleWeek);
  const [activeChoiceIds, setActiveChoiceIds] = useState<string[]>(["protect-sleep", "prepare-food"]);
  const [importMessage, setImportMessage] = useState("Demo week loaded");

  const profile = useMemo(() => classifyAim(aim), [aim]);
  const scores = useMemo(() => computeScores(week, profile, activeChoiceIds), [week, profile, activeChoiceIds]);
  const activeCriteria = Object.keys(profile.required) as Criterion[];

  async function handleCalendarImport(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const imported = await parseCalendarFile(file);
      setWeek((current) => ({ ...current, events: imported.events, source: imported.source }));
      setImportMessage(`Imported ${imported.events.length} calendar events`);
    } catch {
      setImportMessage("The calendar file could not be read");
    }
  }

  async function handleJsonImport(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const imported = await parseJsonFile(file);
      setWeek(imported);
      setImportMessage(`Imported ${imported.health.length} health days and ${imported.events.length} events`);
    } catch {
      setImportMessage("The JSON file could not be read");
    }
  }

  function toggleChoice(id: string) {
    setActiveChoiceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <main className="game-shell">
      <section className="hero" aria-labelledby="citizen-title">
        <div className="hero-copy">
          <p className="eyebrow">Citizen Game</p>
          <h1 id="citizen-title">Shape a week that can carry the aim.</h1>
          <p className="lede">
            Set a goal, bring in real events, and adjust the rhythm until the board shows a life that can support the work.
          </p>
        </div>
        <div className="hero-board" aria-label="Current potential score">
          <img src="/citizen-mark.svg" alt="" />
          <div className="score-orbit">
            <span>{scores.potential}</span>
            <small>potential</small>
          </div>
        </div>
      </section>

      <section className="control-panel" aria-labelledby="aim-heading">
        <div className="aim-card">
          <label htmlFor="aim-input" id="aim-heading">
            Aim
          </label>
          <textarea
            id="aim-input"
            value={aim}
            onChange={(event) => setAim(event.target.value)}
            rows={3}
            placeholder="Write the aim in your own words"
          />
          <div className="starter-aims" aria-label="Starter aims">
            {starterAims.map((starterAim) => (
              <button className="quiet" key={starterAim} type="button" onClick={() => setAim(starterAim)}>
                {starterAim}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-card">
          <p className="eyebrow">Balance profile</p>
          <h2>{profile.name}</h2>
          <p>{profile.summary}</p>
          <div className="profile-metrics">
            {activeCriteria.map((criterion) => (
              <span key={criterion}>{getCriterion(criterion).label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="data-panel" aria-labelledby="data-heading">
        <div>
          <p className="eyebrow" id="data-heading">
            Real week
          </p>
          <h2>{week.source}</h2>
          <p>{importMessage}</p>
        </div>
        <div className="import-grid">
          <label className="file-import">
            <span>Import calendar .ics</span>
            <input accept=".ics,text/calendar" type="file" onChange={(event) => handleCalendarImport(event.target.files?.[0])} />
          </label>
          <label className="file-import">
            <span>Import health JSON</span>
            <input accept=".json,application/json" type="file" onChange={(event) => handleJsonImport(event.target.files?.[0])} />
          </label>
          <button className="secondary" type="button" onClick={() => setWeek(sampleWeek)}>
            Reset demo week
          </button>
        </div>
      </section>

      <section className="score-grid" aria-label="Game scores">
        <ScoreTile label="Readiness" value={scores.readiness} />
        <ScoreTile label="Room" value={scores.room} />
        <ScoreTile label="Rhythm" value={scores.rhythm} />
        <ScoreTile label="Support" value={scores.support} />
        <ScoreTile label="Friction" value={scores.friction} />
      </section>

      <section className="board-layout">
        <div className="week-board" aria-labelledby="week-heading">
          <div className="section-heading">
            <p className="eyebrow" id="week-heading">
              Week board
            </p>
            <h2>Events become pressure, recovery, and support.</h2>
          </div>
          <div className="days-grid">
            {days.map((day) => {
              const events = week.events.filter((item) => item.day === day);
              return (
                <article className="day-column" key={day}>
                  <h3>{day}</h3>
                  {events.length > 0 ? (
                    events.map((item) => (
                      <div className={`event-chip ${item.category}`} key={item.id}>
                        <span>{item.title}</span>
                        <small>
                          {getCriterion(item.category).label} / {item.minutes}m
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className="empty-day">Open room</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <aside className="priority-panel" aria-labelledby="priority-heading">
          <p className="eyebrow" id="priority-heading">
            Next balance
          </p>
          <h2>Closest useful moves</h2>
          <div className="priority-list">
            {scores.priority.slice(0, 5).map((item) => (
              <div className="priority-item" key={item.criterion}>
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    {item.score} / {item.target}
                  </span>
                </div>
                <meter min={0} max={100} value={item.score} aria-label={`${item.label} score`} />
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="choice-panel" aria-labelledby="choice-heading">
        <div className="section-heading">
          <p className="eyebrow" id="choice-heading">
            Moves
          </p>
          <h2>Try small changes before forcing bigger effort.</h2>
        </div>
        <div className="choice-grid">
          {choices.map((choice) => {
            const isActive = activeChoiceIds.includes(choice.id);
            return (
              <button
                className={isActive ? "choice active" : "choice"}
                key={choice.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleChoice(choice.id)}
              >
                <span>{choice.label}</span>
                <small>{choice.effect}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="criteria-panel" aria-labelledby="criteria-heading">
        <div className="section-heading">
          <p className="eyebrow" id="criteria-heading">
            Criteria
          </p>
          <h2>The board uses these signals.</h2>
        </div>
        <div className="criteria-grid">
          {criteria.map((criterion) => (
            <article className={activeCriteria.includes(criterion.id) ? "criterion active" : "criterion"} key={criterion.id}>
              <span>{criterion.group}</span>
              <h3>{criterion.label}</h3>
              <p>{criterion.description}</p>
              <meter min={0} max={100} value={scores.criteria[criterion.id]} aria-label={`${criterion.label} current score`} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <article className="score-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <meter min={0} max={100} value={value} aria-label={`${label} score`} />
    </article>
  );
}
