import { MAX_SELECTED } from '../hooks/useSelectedMatchups.js';

export default function SettingsPanel({ matchups, selectedIds, onToggle, onClose }) {
  const byLeague = new Map();
  for (const m of matchups) {
    if (!byLeague.has(m.leagueName)) byLeague.set(m.leagueName, []);
    byLeague.get(m.leagueName).push(m);
  }

  const atMax = selectedIds.length >= MAX_SELECTED;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Choose up to {MAX_SELECTED} matchups</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>

        {matchups.length === 0 && (
          <p className="settings-empty">No matchups loaded yet - check the terminal running the server for league fetch errors.</p>
        )}

        {[...byLeague.entries()].map(([leagueName, leagueMatchups]) => (
          <div key={leagueName} className="settings-league">
            <h3>{leagueName}</h3>
            {leagueMatchups.map((m) => {
              const checked = selectedIds.includes(m.id);
              const disabled = !checked && atMax;
              return (
                <label key={m.id} className={`settings-row${disabled ? ' disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(m.id)}
                  />
                  <span className="settings-matchup">
                    <span className="settings-team team-a">
                      <span className="settings-team-name">{m.teamA.name}</span>
                      <span className="settings-team-score">{m.teamA.score.toFixed(2)}</span>
                    </span>
                    <span className="settings-sep">vs</span>
                    <span className="settings-team team-b">
                      <span className="settings-team-score">{m.teamB.score.toFixed(2)}</span>
                      <span className="settings-team-name">{m.teamB.name}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
