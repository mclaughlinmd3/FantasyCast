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
                  <span>
                    {m.teamA.name} vs {m.teamB.name}
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
