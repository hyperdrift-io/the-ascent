import { setAthleticMode, type EdgeProfile } from "../../edge-profile";

export function AthleticMode({
  profile,
  onChange,
}: {
  profile: EdgeProfile;
  onChange: (profile: EdgeProfile) => void;
}) {
  const { athletic } = profile;
  const completed = Math.min(52, athletic.completed);
  return (
    <section className="athletic-mode" aria-labelledby="athletic-mode-title">
      <header>
        <div>
          <p>Optional practice</p>
          <h2 id="athletic-mode-title">Athletic Mode</h2>
        </div>
        <strong>{completed} / 52</strong>
      </header>
      <progress
        max={52}
        value={completed}
        aria-label={`${completed} of 52 completed Weekruns`}
      />
      <p>A practice of 52 completed Weekruns, not 52 calendar weeks.</p>
      <ul>
        <li>Breaks are allowed and remain neutral.</li>
        <li>No next Weekrun starts automatically.</li>
        <li>Recovery belongs to the practice.</li>
        <li>Push Coach is more direct when capacity is available and still protects restoration.</li>
      </ul>
      {athletic.enabled ? (
        <>
          <p>Your completed Weekruns stay in history if you disable the mode.</p>
          <button type="button" className="quiet" onClick={() => onChange(setAthleticMode(profile, false))}>
            Disable Athletic Mode
          </button>
        </>
      ) : (
        <button type="button" onClick={() => onChange(setAthleticMode(profile, true))}>
          Enable Athletic Mode
        </button>
      )}
    </section>
  );
}
