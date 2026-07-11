import { useEffect, useMemo, useRef, useState } from "react";
import {
  AIM_PACKS,
  advanceDay,
  applyMorningScan,
  clearRun,
  clearSummary,
  completeMissionRun,
  createMissionRun,
  getBossWindowLabel,
  getConditions,
  getProfileInsights,
  getTrailNote,
  getWorldScene,
  getWorldState,
  getWorldTint,
  isWeekOver,
  loadProfile,
  loadRun,
  loadSummary,
  resolveMove,
  saveRun,
  saveSummary,
  syncRunToToday,
  todayLocalISO,
  type AimPack,
  type CompletionTier,
  type FeltState,
  type HumanResource,
  type Lock,
  type MissionRunState,
  type MorningScanInput,
  type MoveCard,
  type PlayerProfile,
  type ProofType,
  type RunEnding,
  type RunStatus,
  type RunSummary,
  type ScanReading,
  type Zone,
} from "./edge";

// ------------------------------------------------------------------ constants

const SIGNALS_KEY = "edge.signals.v1";

// human resources in display order (matches the kernel's HUMAN_RESOURCES order)
const RESOURCE_ORDER: HumanResource[] = [
  "energy",
  "focus",
  "composure",
  "confidence",
  "recovery",
  "connection",
  "time",
];

const RESOURCE_LABEL: Record<HumanResource, string> = {
  energy: "Energy",
  focus: "Focus",
  composure: "Composure",
  confidence: "Confidence",
  recovery: "Recovery",
  connection: "Connection",
  time: "Time",
};

// the five edge zones, surfaced as the label under the marker on the Edge Line
const ZONE_LABEL: Record<Zone, string> = {
  idle: "IDLE",
  warmline: "WARMLINE",
  edge: "EDGE",
  redline: "REDLINE",
  overclock: "OVERCLOCK",
};

// quiet threshold ticks — the exact points where a condition changes the weather, so the
// meters read as the cause of what the mountain shows. Values mirror getConditions in the
// kernel (recovery 45/60, composure 55, connection 60); the UI only labels them, never
// re-derives the rule.
const METER_TICKS: Partial<Record<HumanResource, { at: number; title: string }[]>> = {
  recovery: [
    { at: 45, title: "Below 45: fog on the crest" },
    { at: 60, title: "60 and up: clear air holds (with composure 55+)" },
  ],
  composure: [{ at: 55, title: "55 and up: clear air holds (with recovery 60+)" }],
  connection: [{ at: 60, title: "60 and up: tailwind — support buffers the load" }],
};

// morning scan readings — information about how the day feels, never a judgment
const SCAN_READINGS: ScanReading[] = ["low", "steady", "strong"];
const SCAN_READING_LABEL: Record<ScanReading, string> = {
  low: "Low",
  steady: "Steady",
  strong: "Strong",
};

// every backdrop the mountain can wear — preloaded once so scene cross-fades never flash
const SCENE_ASSETS = [
  "ascent-aurora.png",
  "ascent-daybreak.png",
  "ascent-dawn.png",
  "ascent-dawn-fog.png",
  "ascent-dawn-wind.png",
  "ascent-dawn-golden.png",
];

const STATUS_LABEL: Record<RunStatus, string> = {
  ahead: "Ahead",
  "on-target": "On Target",
  "narrow-path": "Narrow Path",
  "route-shift": "Route Shift",
};

const TIER_OPTIONS: { value: CompletionTier; label: string }[] = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "spark", label: "Spark" },
  { value: "route-shift", label: "Route Changed" },
];

const PROOF_OPTIONS: { value: ProofType; label: string }[] = [
  { value: "quick-note", label: "Quick note" },
  { value: "photo-video", label: "Photo or video" },
  { value: "calendar-session", label: "Calendar or session" },
  { value: "wearable-signal", label: "Wearable signal" },
  { value: "honest-check-in", label: "Honest check-in" },
];

const FELT_OPTIONS: { value: FeltState; label: string }[] = [
  { value: "calmer", label: "Calmer" },
  { value: "sharper", label: "Sharper" },
  { value: "tired", label: "Tired" },
  { value: "charged", label: "Charged" },
];

// lock chips pinned to the summit gate (percentage anchors, matching the mock)
const LOCK_ANCHORS = [
  { x: "26%", y: "16%" },
  { x: "62%", y: "21%" },
  { x: "56%", y: "29%" },
];

const REST_LINE =
  "The camp is set. Recovery is converting yesterday's work into mastery — the path behind you is hardening into stone. Nothing is asked of you tonight.";
const SEND_LINE =
  "The window is open. Conditions and commitment align — one clean, committed attempt is available. The mountain is lit for it.";
const RECON_LINE = "You mapped the mountain. The next ascent starts with a clearer route.";
const SIGNALS_COPY = "Run Signals can alert you when the route changes or a window opens.";

const ENDING_LABEL: Record<RunEnding, string> = {
  "summit-attempt": "Summit Attempt",
  complete: "Ascent Complete",
  recon: "Recon",
};

// shown only when the week closed while the player was away (calendar auto-complete),
// replacing the standard non-summit line for that case
const AWAY_COMPLETE_LINE =
  "The week completed while you were away. The run produced signal — the next Ascent starts with a clearer map.";

const BASELINE_CAPTION = "Your baseline going into this Ascent";

const HAND_LOCKED_CUE = "Today's moves — unlocked by your scan.";

const NEXT_MAP_LINE = "The run produced signal. The next Ascent starts with a clearer map.";
const ENDING_LINE: Record<RunEnding, string> = {
  "summit-attempt": "The attempt is made. Whatever the mountain gives back becomes next week's signal.",
  complete: NEXT_MAP_LINE,
  recon: NEXT_MAP_LINE,
};

// ------------------------------------------------------------------ pure view helpers

function bandLabel(readiness: number): string {
  if (readiness >= 80) return "Send Window";
  if (readiness >= 65) return "Window Forming";
  if (readiness >= 45) return "Pressure Building";
  if (readiness >= 25) return "Contact";
  return "First Spark";
}

// interpolate the player light between a low anchor and the gate anchor
function playerPos(readiness: number): { px: string; py: string } {
  const t = Math.max(0, Math.min(100, readiness)) / 100;
  const left = 44 + (51 - 44) * t;
  const top = 78 - (78 - 33) * t;
  return { px: `${left.toFixed(1)}%`, py: `${top.toFixed(1)}%` };
}

function formatEffects(effects: Partial<Record<HumanResource, number>>): string {
  return Object.entries(effects)
    .map(([key, value]) => `${key} ${value >= 0 ? "+" : "−"}${Math.abs(value)}`)
    .join(" · ");
}

function toplineCopy(state: "night" | "dawn" | "send", day: number, bossLabel: string): string {
  if (state === "night") return "CAMP · RECOVERY CONVERTING";
  if (state === "send") return "SEND WINDOW · OPEN";
  return `ASCENT · DAY ${day} / 7 · BOSS WINDOW ${bossLabel}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Living Light: map the two 0-100 kernel readings onto CSS custom properties (data, not
// presentation). Warmth rotates the tint hue; low clarity raises a pale veil. Strain always
// reads cooler and quieter — never darker (the veil lightens, it never blacks out).
function tintVars(tint: { warmth: number; clarity: number }): Record<string, string> {
  const hue = ((tint.warmth - 50) * 0.8).toFixed(1);
  const veil = (((100 - tint.clarity) / 100) * 0.4).toFixed(3);
  const warmth = (0.55 + (tint.warmth / 100) * 0.6).toFixed(2);
  return {
    "--tint-hue": `${hue}deg`,
    "--tint-veil": veil,
    "--tint-warmth": warmth,
  };
}

function loadSignals(): boolean {
  try {
    return localStorage.getItem(SIGNALS_KEY) === "1";
  } catch {
    return false;
  }
}

function saveSignals(on: boolean): void {
  try {
    localStorage.setItem(SIGNALS_KEY, on ? "1" : "0");
  } catch {
    // storage unavailable — preference stays in memory
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ------------------------------------------------------------------ ritual type

interface RitualState {
  step: 1 | 2 | 3;
  tier: CompletionTier | null;
  proof: ProofType | null;
  felt: FeltState | null;
  note: string;
}

// ------------------------------------------------------------------ root

export default function EdgeGame() {
  const [run, setRun] = useState<MissionRunState | null>(() => loadRun());
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [aim, setAim] = useState("");
  const [chosenPackId, setChosenPackId] = useState<AimPack["id"] | null>(null);
  const [signalsOn, setSignalsOn] = useState<boolean>(() => loadSignals());
  const [ritual, setRitual] = useState<RitualState | null>(null);
  const [settingStone, setSettingStone] = useState(false);
  // Mirrors of ritual/settingStone for the visibilitychange listener below, which is
  // registered once on mount and would otherwise close over their stale initial values.
  const ritualRef = useRef(ritual);
  const settingStoneRef = useRef(settingStone);
  useEffect(() => {
    ritualRef.current = ritual;
    settingStoneRef.current = settingStone;
  }, [ritual, settingStone]);
  const [summary, setSummary] = useState<RunSummary | null>(() => loadSummary());
  // View-only flag (not persisted): the week closed while the player was away, so the
  // summary greets them with the away-completion line rather than the standard one.
  const [awayComplete, setAwayComplete] = useState(false);

  // Preload every backdrop once so scene-to-scene cross-fades never flash a blank layer.
  useEffect(() => {
    for (const asset of SCENE_ASSETS) {
      const img = new Image();
      img.src = `/art/${asset}`;
    }
  }, []);

  // The Ascent runs on real days: on mount and whenever the tab becomes visible again,
  // reconcile the saved run with today. A finished week auto-completes into the summary;
  // otherwise elapsed calendar days are folded in (idempotent same-day). `new Date()`
  // never leaves the App boundary — todayLocalISO is the single clock read.
  useEffect(() => {
    function syncToToday() {
      // Never sync mid-ritual: the cairn ritual and the stone-setting beat both depend on
      // the run state staying put until they resolve. A sync here would retarget the
      // ritual's resolve or clobber it with a stale persist. The next visibility event or
      // user action (which closes the ritual) re-syncs — no catch-up logic needed.
      if (ritualRef.current || settingStoneRef.current) return;
      const current = loadRun();
      if (!current) return;
      const todayISO = todayLocalISO();
      // Sync away days first — the kernel's day-7 cap bounds the walk — so a week-over
      // check afterward sees the caught-up state: quiet-day recovery drift and
      // dormant-XP-to-mastery conversion from the away walk land before completion.
      const synced = syncRunToToday(current, todayISO);
      if (isWeekOver(synced, todayISO)) {
        const nextProfile = completeMissionRun(synced, "complete", loadProfile());
        const nextSummary: RunSummary = {
          ending: "complete",
          aim: synced.aim,
          bossName: synced.bossName,
          cairns: synced.cairns.length,
          confidenceBank: synced.confidenceBank,
          mastery: synced.mastery,
        };
        saveSummary(nextSummary);
        clearRun();
        setRun(null);
        setSummary(nextSummary);
        setAwayComplete(true);
        setProfile(nextProfile);
        return;
      }
      if (synced !== current) persist(synced);
    }
    syncToToday();
    const onVisible = () => {
      if (document.visibilityState === "visible") syncToToday();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(next: MissionRunState) {
    saveRun(next);
    setRun(next);
  }

  function scanMorning(input: MorningScanInput) {
    if (!run) return;
    persist(applyMorningScan(run, input));
  }

  function updateAim(value: string) {
    setAim(value);
    setChosenPackId(null);
  }

  function selectSuggestion(pack: AimPack) {
    setAim(pack.suggestion);
    setChosenPackId(pack.id);
  }

  function startAscent() {
    const text = aim.trim();
    if (!text) return;
    persist(createMissionRun(text, profile.completedRuns > 0 ? profile : undefined, chosenPackId ?? undefined));
    setAim("");
    setChosenPackId(null);
  }

  function chooseCard(id: string) {
    if (!run) return;
    persist({ ...run, chosenCardId: id });
  }

  function breakCamp() {
    if (!run) return;
    persist(advanceDay(run));
  }

  function endRun(ending: RunEnding) {
    if (!run) return;
    const nextProfile = completeMissionRun(run, ending, profile);
    const nextSummary: RunSummary = {
      ending,
      aim: run.aim,
      bossName: run.bossName,
      cairns: run.cairns.length,
      confidenceBank: run.confidenceBank,
      mastery: run.mastery,
    };
    saveSummary(nextSummary);
    setSummary(nextSummary);
    clearRun();
    setRun(null);
    setProfile(nextProfile);
    setRitual(null);
    setAwayComplete(false);
  }

  function startNextAscent() {
    clearSummary();
    setSummary(null);
    setAwayComplete(false);
  }

  function commitRitual(r: RitualState) {
    if (!run || !r.tier || !r.proof || !r.felt) return;
    const commit = () => {
      persist(resolveMove(run, { tier: r.tier!, proof: r.proof!, felt: r.felt!, note: r.note.trim() || undefined }));
      setRitual(null);
      setSettingStone(false);
    };
    if (prefersReducedMotion()) {
      commit();
      return;
    }
    setSettingStone(true);
    window.setTimeout(commit, 620);
  }

  function toggleSignals() {
    setSignalsOn((on) => {
      const next = !on;
      saveSignals(next);
      return next;
    });
  }

  // Escape cancels the ritual at any step
  useEffect(() => {
    if (!ritual) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !settingStone) setRitual(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ritual, settingStone]);

  if (!run && summary) {
    return (
      <RunSummary
        summary={summary}
        profile={profile}
        awayComplete={awayComplete}
        onStartNext={startNextAscent}
      />
    );
  }

  if (!run) {
    return (
      <AimEntry
        aim={aim}
        setAim={updateAim}
        onSelectSuggestion={selectSuggestion}
        onStart={startAscent}
        profile={profile}
      />
    );
  }

  return (
    <Mountain
      run={run}
      profile={profile}
      signalsOn={signalsOn}
      settingStone={settingStone}
      onChooseCard={chooseCard}
      onScan={scanMorning}
      onOpenRitual={() => setRitual({ step: 1, tier: null, proof: null, felt: null, note: "" })}
      onBreakCamp={breakCamp}
      onAttempt={() => endRun("summit-attempt")}
      onComplete={() => endRun("complete")}
      onRecon={() => endRun("recon")}
      onToggleSignals={toggleSignals}
      ritual={ritual}
      setRitual={setRitual}
      onCommitRitual={commitRitual}
    />
  );
}

// ------------------------------------------------------------------ run summary

function RunSummary({
  summary,
  profile,
  awayComplete,
  onStartNext,
}: {
  summary: RunSummary;
  profile: PlayerProfile;
  awayComplete: boolean;
  onStartNext: () => void;
}) {
  const insights = getProfileInsights(profile);
  const lede = awayComplete && summary.ending === "complete" ? AWAY_COMPLETE_LINE : ENDING_LINE[summary.ending];
  return (
    <main className="aim-entry">
      <div className="aim-panel">
        <p className="brand">EDGE</p>
        <span className={summary.ending === "summit-attempt" ? "run-status" : "run-status route-shift"}>
          {ENDING_LABEL[summary.ending]}
        </span>
        <h1>{summary.aim}</h1>
        <p className="lede">{lede}</p>

        <div className="counters">
          <span className="stat">
            <b>{summary.cairns}</b>
            <span>{summary.cairns === 1 ? "cairn" : "cairns"} built</span>
          </span>
          <span className="stat">
            <b>+{summary.confidenceBank}</b>
            <span>confidence gained</span>
          </span>
          <span className="stat">
            <b>{summary.mastery}</b>
            <span>mastery</span>
          </span>
        </div>

        {insights.length > 0 && (
          <div className="insights">
            {insights.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}

        <button className="primary" type="button" onClick={onStartNext}>
          Start the next Ascent
        </button>
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ aim entry

function AimEntry({
  aim,
  setAim,
  onSelectSuggestion,
  onStart,
  profile,
}: {
  aim: string;
  setAim: (value: string) => void;
  onSelectSuggestion: (pack: AimPack) => void;
  onStart: () => void;
  profile: PlayerProfile;
}) {
  const insights = getProfileInsights(profile);
  // Non-persisted preview: createMissionRun folds the profile baselines into a full run
  // shape so the instrument and gauges can read edgeLoad/edgeControl/zone/resources BEFORE
  // the week begins. It is never saved — startAscent builds the real run from the typed aim.
  const preview = useMemo(
    () => createMissionRun("preview", profile.completedRuns > 0 ? profile : undefined),
    [profile],
  );
  const tint = getWorldTint(preview);
  return (
    <main className="aim-entry">
      <div className="living-light" style={tintVars(tint)} aria-hidden="true" />
      <div className="aim-panel">
        <p className="brand">EDGE</p>
        <div className="instrument">
          <EdgeLine edgeLoad={preview.edgeLoad} edgeControl={preview.edgeControl} zone={preview.zone} />
          <ResourceStrip resources={preview.resources} />
          <p className="baseline-caption">{BASELINE_CAPTION}</p>
        </div>
        <h1>Start this week's Ascent</h1>
        <p className="lede">Name the aim in your own words. The mountain shapes itself around it.</p>
        <input
          aria-label="Your aim for this week"
          placeholder="e.g. land a surface backroll"
          value={aim}
          onChange={(event) => setAim(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onStart();
          }}
        />
        <div className="suggestions">
          {AIM_PACKS.map((pack) => (
            <button key={pack.id} type="button" onClick={() => onSelectSuggestion(pack)}>
              <span className="pack">{pack.label}</span>
              {pack.suggestion}
            </button>
          ))}
        </div>

        {insights.length > 0 && (
          <p className="learned">
            <b>Start the next Ascent from what you learned</b>
            {insights[0]}
          </p>
        )}

        <button className="primary" type="button" onClick={onStart}>
          Begin the Ascent
        </button>
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ mountain

function Mountain({
  run,
  profile,
  signalsOn,
  settingStone,
  onChooseCard,
  onScan,
  onOpenRitual,
  onBreakCamp,
  onAttempt,
  onComplete,
  onRecon,
  onToggleSignals,
  ritual,
  setRitual,
  onCommitRitual,
}: {
  run: MissionRunState;
  profile: PlayerProfile;
  signalsOn: boolean;
  settingStone: boolean;
  onChooseCard: (id: string) => void;
  onScan: (input: MorningScanInput) => void;
  onOpenRitual: () => void;
  onBreakCamp: () => void;
  onAttempt: () => void;
  onComplete: () => void;
  onRecon: () => void;
  onToggleSignals: () => void;
  ritual: RitualState | null;
  setRitual: (r: RitualState | null) => void;
  onCommitRitual: (r: RitualState) => void;
}) {
  const world = getWorldState(run);
  const scene = getWorldScene(run);
  const conditions = useMemo(() => getConditions(run), [run]);
  const trailNote = getTrailNote(run);
  const pos = playerPos(run.readiness);
  const tint = getWorldTint(run);
  const bossLabel = getBossWindowLabel(run);

  return (
    <main className="mountain" data-state={world} data-scene={scene}>
      <div className="bg night" />
      <div className="bg send" />
      <div className="bg dawn-clear" />
      <div className="bg dawn-fog" />
      <div className="bg dawn-wind" />
      <div className="bg dawn-golden" />
      <div className="living-light" style={tintVars(tint)} aria-hidden="true" />
      <div className="scrim" />

      <div className="topline">
        <span>
          <b>EDGE</b>
        </span>
        <span>{toplineCopy(world, run.day, bossLabel)}</span>
      </div>

      <p className="run-aim">&ldquo;{run.aim}&rdquo;</p>

      <EdgeLine edgeLoad={run.edgeLoad} edgeControl={run.edgeControl} zone={run.zone} />

      {world === "dawn" && (
        <>
          {run.locks.map((lock, index) => (
            <LockChip key={lock.id} lock={lock} anchor={LOCK_ANCHORS[index] ?? LOCK_ANCHORS[0]} />
          ))}
          <span
            className="player-light"
            style={{ ["--px" as string]: pos.px, ["--py" as string]: pos.py }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="bottom">
        {world !== "night" && (
          <div className="readiness">
            <span>
              READINESS {run.readiness}% · {bandLabel(run.readiness).toUpperCase()}
            </span>
            <span className="bar">
              <i style={{ ["--w" as string]: `${run.readiness}%` }} />
            </span>
            <span className={`run-status ${run.status}`}>{STATUS_LABEL[run.status]}</span>
            <span className="boss-name">{run.bossName.toUpperCase()}</span>
          </div>
        )}

        {world !== "night" && <ResourceStrip resources={run.resources} />}

        {run.syncNote && <p className="syncnote">{run.syncNote}</p>}

        {world === "dawn" && run.scannedToday && conditions.length > 0 && (
          <div className="conditions">
            {conditions.map((condition) => (
              <span key={condition.kind}>{condition.line}</span>
            ))}
          </div>
        )}

        {world === "night" && (
          <>
            <p className="restline">{REST_LINE}</p>
            {trailNote && <p className="trailnote">{trailNote}</p>}
          </>
        )}

        {world === "send" && <p className="sendline">{SEND_LINE}</p>}

        <CairnRow cairns={run.cairns} day={run.day} settingStone={settingStone} />

        {world === "dawn" && (
          <div className={run.scannedToday ? "hand-region" : "hand-region locked"}>
            <div className="hand" aria-hidden={!run.scannedToday}>
              {run.hand.map((card) => (
                <MoveCardView
                  key={card.id}
                  card={card}
                  chosen={run.scannedToday && run.chosenCardId === card.id}
                  disabled={!run.scannedToday}
                  onChoose={() => onChooseCard(card.id)}
                />
              ))}
            </div>
            {run.scannedToday ? (
              <button className="primary cta" type="button" onClick={onOpenRitual}>
                RESOLVE TODAY'S MOVE
              </button>
            ) : (
              <p className="hand-cue">{HAND_LOCKED_CUE}</p>
            )}
          </div>
        )}

        {world === "dawn" && !run.scannedToday && <MorningScan onBegin={onScan} />}

        {world === "night" && run.day >= 7 && (
          <button className="primary cta" type="button" onClick={onComplete}>
            Complete this Ascent
          </button>
        )}

        {world === "night" && run.day < 7 && (
          <button className="primary cta" type="button" onClick={onBreakCamp}>
            Break camp — start day {run.day + 1}
          </button>
        )}

        {world === "send" && (
          <button className="primary cta" type="button" onClick={onAttempt}>
            Make the attempt
          </button>
        )}
      </div>

      <Footer
        run={run}
        profile={profile}
        signalsOn={signalsOn}
        onToggleSignals={onToggleSignals}
        onRecon={onRecon}
      />

      {ritual && (
        <Ritual
          ritual={ritual}
          setRitual={setRitual}
          settingStone={settingStone}
          onCommit={onCommitRitual}
        />
      )}
    </main>
  );
}

// ------------------------------------------------------------------ pieces

function LockChip({ lock, anchor }: { lock: Lock; anchor: { x: string; y: string } }) {
  return (
    <span
      className={lock.cracked ? "lock-chip" : "lock-chip dim"}
      style={{ ["--x" as string]: anchor.x, ["--y" as string]: anchor.y }}
    >
      <span className="dot" />
      {lock.label}
    </span>
  );
}

function MoveCardView({
  card,
  chosen,
  disabled = false,
  onChoose,
}: {
  card: MoveCard;
  chosen: boolean;
  disabled?: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      className={chosen ? "card chosen" : "card"}
      type="button"
      aria-pressed={chosen}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onChoose}
    >
      <span className="tier">TARGET · GOLD</span>
      <span className="name">{card.title}</span>
      <span className="preview">{card.gold.text}</span>
      <span className="fx">{formatEffects(card.gold.effects)}</span>
    </button>
  );
}

function ResourceStrip({ resources }: { resources: Record<HumanResource, number> }) {
  return (
    <div className="resource-strip" aria-label="Human resources">
      {RESOURCE_ORDER.map((key) => (
        <span
          key={key}
          className="resource-meter"
          title={`${RESOURCE_LABEL[key]} ${resources[key]}`}
        >
          <span className="meter-label">{RESOURCE_LABEL[key]}</span>
          <span className="meter-bar" aria-hidden="true">
            <i style={{ ["--w" as string]: `${resources[key]}%` }} />
            {(METER_TICKS[key] ?? []).map((tick) => (
              <b key={tick.at} className="tick" style={{ ["--at" as string]: `${tick.at}%` }} title={tick.title} />
            ))}
          </span>
          <span className="meter-value">{resources[key]}</span>
        </span>
      ))}
    </div>
  );
}

// The Edge Line — the signature instrument. The player's light rides a luminous crest
// cross-section: the valley (Idle) dips left, the exposed face (Overclock) sharpens right.
// Marker position is the load/control balance; zone is read straight from the kernel and
// drives the peak-luminosity styling — beauty crests in the `edge` zone, strain quiets it.
function EdgeLine({ edgeLoad, edgeControl, zone }: { edgeLoad: number; edgeControl: number; zone: Zone }) {
  const marker = clamp(50 + (edgeControl - edgeLoad), 5, 95);
  // Ride the marker along the crest: valley (left) sits low, the face (right) rides high.
  // Pure render geometry that matches the SVG path — no game rule lives here.
  const fraction = marker / 100;
  const markerTop = (3 + ((10.5 - 10 * fraction) / 12) * 14).toFixed(1);
  const markerStyle = { ["--m" as string]: `${marker}%`, ["--my" as string]: `${markerTop}px` };
  return (
    <div className="edge-line" data-zone={zone} aria-label={`Edge state: ${ZONE_LABEL[zone]}`}>
      <svg className="crest" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
        <path d="M1 10.5 C 20 10.2 34 9.4 50 7 C 66 4.6 82 2.4 99 0.5" />
      </svg>
      <span className="edge-marker" style={markerStyle} aria-hidden="true" />
      <span className="edge-zone" style={{ ["--m" as string]: `${marker}%` }}>
        {ZONE_LABEL[zone]}
      </span>
    </div>
  );
}

function MorningScan({ onBegin }: { onBegin: (input: MorningScanInput) => void }) {
  const [readings, setReadings] = useState<Record<HumanResource, ScanReading>>(() =>
    RESOURCE_ORDER.reduce((acc, key) => {
      acc[key] = "steady";
      return acc;
    }, {} as Record<HumanResource, ScanReading>),
  );

  const setReading = (key: HumanResource, reading: ScanReading) =>
    setReadings((prev) => ({ ...prev, [key]: reading }));

  return (
    <div className="morning-scan compact">
      <div className="scan-head">
        <h2>MORNING SCAN</h2>
        <p>A quick read on where you are today. Every answer is just information.</p>
      </div>
      <div className="scan-rows">
        {RESOURCE_ORDER.map((key) => (
          <div className="scan-row" key={key}>
            <span className="scan-label">{RESOURCE_LABEL[key]}</span>
            <span className="segmented" role="group" aria-label={RESOURCE_LABEL[key]}>
              {SCAN_READINGS.map((reading) => (
                <button
                  key={reading}
                  type="button"
                  className={readings[key] === reading ? "selected" : ""}
                  aria-pressed={readings[key] === reading}
                  onClick={() => setReading(key, reading)}
                >
                  {SCAN_READING_LABEL[reading]}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="scan-actions">
        <button className="primary" type="button" onClick={() => onBegin(readings)}>
          Begin the day
        </button>
        <button className="quiet" type="button" onClick={() => onBegin({})}>
          Skip — feel it out
        </button>
      </div>
    </div>
  );
}

function CairnRow({ cairns, day, settingStone }: { cairns: MissionRunState["cairns"]; day: number; settingStone: boolean }) {
  return (
    <div className="cairns" aria-label="Cairns — one stone per day">
      {Array.from({ length: 7 }, (_, index) => {
        const dayNumber = index + 1;
        const cairn = cairns.find((entry) => entry.day === dayNumber);
        const settingHere = settingStone && dayNumber === day && !cairn;
        const classes = ["cairn-slot"];
        if (cairn) classes.push(cairn.tier);
        if (settingHere) classes.push("gold", "setting");
        return <span key={dayNumber} className={classes.join(" ")} />;
      })}
    </div>
  );
}

function Footer({
  run,
  profile,
  signalsOn,
  onToggleSignals,
  onRecon,
}: {
  run: MissionRunState;
  profile: PlayerProfile;
  signalsOn: boolean;
  onToggleSignals: () => void;
  onRecon: () => void;
}) {
  const insights = getProfileInsights(profile);
  const [confirmingRecon, setConfirmingRecon] = useState(false);
  return (
    <section className="footer" aria-label="Run signals and profile">
      <div className="footer-handle">TRAIL LOG · SIGNALS</div>
      <div className="footer-body">
        <div className="counters">
          <span className="stat">
            <b>{profile.completedRuns}</b>
            <span>{profile.completedRuns === 1 ? "ascent" : "ascents"} completed</span>
          </span>
          <span className="stat">
            <b>{run.confidenceBank}</b>
            <span>confidence bank</span>
          </span>
          <span className="stat">
            <b>{run.mastery}</b>
            <span>mastery</span>
          </span>
        </div>

        {insights.length > 0 && (
          <div className="insights">
            {insights.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}

        <label className="signals">
          <input type="checkbox" checked={signalsOn} onChange={onToggleSignals} />
          <span>{SIGNALS_COPY}</span>
        </label>

        <div className="footer-actions">
          {confirmingRecon ? (
            <div className="recon-confirm">
              <p className="recon-line">{RECON_LINE}</p>
              <div className="recon-confirm-actions">
                <button className="ghost" type="button" onClick={() => setConfirmingRecon(false)}>
                  Keep climbing
                </button>
                <button className="primary" type="button" onClick={onRecon}>
                  End as recon
                </button>
              </div>
            </div>
          ) : (
            <button className="ghost" type="button" onClick={() => setConfirmingRecon(true)}>
              End this Ascent as recon
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ cairn ritual

function Ritual({
  ritual,
  setRitual,
  settingStone,
  onCommit,
}: {
  ritual: RitualState;
  setRitual: (r: RitualState | null) => void;
  settingStone: boolean;
  onCommit: (r: RitualState) => void;
}) {
  if (settingStone) {
    return (
      <div className="ritual-overlay">
        <div className="ritual">
          <p>Setting the stone…</p>
          <span className="stone-preview" aria-hidden="true" />
        </div>
      </div>
    );
  }

  const back = () => {
    if (ritual.step === 1) {
      setRitual(null);
    } else {
      setRitual({ ...ritual, step: (ritual.step - 1) as 1 | 2 | 3 });
    }
  };

  return (
    <div className="ritual-overlay" onClick={(event) => event.target === event.currentTarget && setRitual(null)}>
      <div className="ritual" role="dialog" aria-modal="true" aria-label="Resolve today's move">
        <div className="step-dots" aria-hidden="true">
          <i className={ritual.step >= 1 ? "on" : ""} />
          <i className={ritual.step >= 2 ? "on" : ""} />
          <i className={ritual.step >= 3 ? "on" : ""} />
        </div>

        {ritual.step === 1 && (
          <>
            <h2>What did you complete?</h2>
            <div className="options">
              {TIER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={ritual.tier === option.value ? "selected" : ""}
                  onClick={() => setRitual({ ...ritual, tier: option.value, step: 2 })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {ritual.step === 2 && (
          <>
            <h2>What proof do you have?</h2>
            <div className="options">
              {PROOF_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={ritual.proof === option.value ? "selected" : ""}
                  onClick={() => setRitual({ ...ritual, proof: option.value, step: 3 })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {ritual.step === 3 && (
          <>
            <h2>What changed in you?</h2>
            <div className="options">
              {FELT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={ritual.felt === option.value ? "selected" : ""}
                  onClick={() => setRitual({ ...ritual, felt: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              aria-label="Optional note"
              rows={2}
              placeholder="Add a note (optional)"
              value={ritual.note}
              onChange={(event) => setRitual({ ...ritual, note: event.target.value })}
            />
          </>
        )}

        <div className="controls">
          <button className="ghost" type="button" onClick={back}>
            {ritual.step === 1 ? "Cancel" : "Back"}
          </button>
          {ritual.step === 3 && (
            <button className="primary" type="button" disabled={!ritual.felt} onClick={() => onCommit(ritual)}>
              Set the stone
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
