import { MAX_SELECTED } from '../hooks/useSelectedMatchups.js';
import { getMatchupRoles } from '../teamRoles.js';

function collectDistinctTeams(matchups) {
  const byId = new Map();
  for (const m of matchups) {
    for (const team of [m.teamA, m.teamB]) {
      if (!byId.has(team.id)) {
        byId.set(team.id, { id: team.id, name: team.name, leagueName: m.leagueName });
      }
    }
  }
  return [...byId.values()];
}

function groupByLeague(items) {
  const byLeague = new Map();
  for (const item of items) {
    if (!byLeague.has(item.leagueName)) byLeague.set(item.leagueName, []);
    byLeague.get(item.leagueName).push(item);
  }
  return byLeague;
}

export default function SettingsPanel({ matchups, selectedIds, onToggle, goodGuyIds, onToggleGoodGuy, onClose }) {
  const matchupsByLeague = groupByLeague(matchups);
  const teamsByLeague = groupByLeague(collectDistinctTeams(matchups));
  const atMax = selectedIds.length >= MAX_SELECTED;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>

        {matchups.length === 0 && (
          <p className="settings-empty">No matchups loaded yet - check the terminal running the server for league fetch errors.</p>
        )}

        {matchups.length > 0 && (
          <>
            <section className="settings-section">
              <h2 className="settings-section-title">Your teams</h2>
              <p className="settings-hint">
                Mark your (and your roommates') teams - matchups will color them green and
                opponents red. Matchups where both or neither side is marked stay green/blue.
              </p>
              {[...teamsByLeague.entries()].map(([leagueName, teams]) => (
                <div key={leagueName} className="settings-league">
                  <h3>{leagueName}</h3>
                  {teams.map((team) => (
                    <label key={team.id} className="settings-row">
                      <input
                        type="checkbox"
                        checked={goodGuyIds.has(team.id)}
                        onChange={() => onToggleGoodGuy(team.id)}
                      />
                      <span>{team.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </section>

            <section className="settings-section">
              <h2 className="settings-section-title">Choose up to {MAX_SELECTED} matchups</h2>
              {[...matchupsByLeague.entries()].map(([leagueName, leagueMatchups]) => (
                <div key={leagueName} className="settings-league">
                  <h3>{leagueName}</h3>
                  {leagueMatchups.map((m) => {
                    const checked = selectedIds.includes(m.id);
                    const disabled = !checked && atMax;
                    const roles = getMatchupRoles(m, goodGuyIds);
                    return (
                      <label key={m.id} className={`settings-row${disabled ? ' disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => onToggle(m.id)}
                        />
                        <span className="settings-matchup">
                          <span className={`settings-team pos-a team-${roles.teamA}`}>
                            <span className="settings-team-name">{m.teamA.name}</span>
                            <span className="settings-team-score">{m.teamA.score.toFixed(2)}</span>
                          </span>
                          <span className="settings-sep">vs</span>
                          <span className={`settings-team pos-b team-${roles.teamB}`}>
                            <span className="settings-team-score">{m.teamB.score.toFixed(2)}</span>
                            <span className="settings-team-name">{m.teamB.name}</span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
