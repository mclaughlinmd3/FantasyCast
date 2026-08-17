import { useState } from 'react';
import { calculateWinProbability } from '../winProbability.js';
import { getMatchupRoles } from '../teamRoles.js';
import { formatStatLine } from '../playerStats.js';
import { initials } from '../initials.js';

const MAX_ACTIVE_SHOWN = 5;

function Team({ team, role }) {
  return (
    <div className={`team team-${role}`}>
      <div className="team-name">{team.name}</div>
      {team.manager && <div className="team-manager">{team.manager}</div>}
      <div className="team-score">{team.score.toFixed(2)}</div>
    </div>
  );
}

function WinProbabilityBar({ probA, probB, roleA, roleB }) {
  return (
    <div className="win-prob">
      <div className="win-prob-labels">
        <span>{probA}%</span>
        <span>{probB}%</span>
      </div>
      <div className="win-prob-bar">
        <div className={`win-prob-fill win-prob-fill-${roleA}`} style={{ width: `${probA}%` }} />
        <div className={`win-prob-fill win-prob-fill-${roleB}`} style={{ width: `${probB}%` }} />
      </div>
    </div>
  );
}

function ActivePlayerRow({ player }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = player.photo && !photoFailed;
  const statLine = formatStatLine(player);

  return (
    <li>
      {showPhoto ? (
        <img
          className="active-player-photo"
          src={player.photo}
          alt=""
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <div className="active-player-photo active-player-photo-fallback">
          {initials(player.name)}
        </div>
      )}
      <div className="active-player-info">
        <div className="active-player-name">{player.name}</div>
        {statLine && <div className="active-player-stat-line">{statLine}</div>}
      </div>
      <span className="active-player-pts">{player.live.toFixed(1)}</span>
    </li>
  );
}

function ActivePlayers({ team, role }) {
  const active = team.starters
    .filter((p) => p.isActive)
    .sort((a, b) => b.live - a.live)
    .slice(0, MAX_ACTIVE_SHOWN);

  return (
    <div className={`active-players team-${role}`}>
      {active.length === 0 ? (
        <div className="active-players-empty">No active players</div>
      ) : (
        <ul className="active-players-list">
          {active.map((p) => (
            <ActivePlayerRow key={p.id} player={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MatchupCard({ matchup, onRemove, goodGuyIds }) {
  const prob = calculateWinProbability(matchup);
  const probA = Math.round(prob.teamA * 100);
  const probB = 100 - probA;
  const roles = goodGuyIds ? getMatchupRoles(matchup, goodGuyIds) : { teamA: 'a', teamB: 'b' };

  return (
    <div className="matchup-card">
      <div className="matchup-card-header">
        <span className="league-name">{matchup.leagueName}</span>
        {onRemove && (
          <button
            className="remove-btn"
            onClick={() => onRemove(matchup.id)}
            aria-label="Remove from grid"
            title="Remove from grid"
          >
            &times;
          </button>
        )}
      </div>
      <div className="teams">
        <Team team={matchup.teamA} role={roles.teamA} />
        <div className="vs">VS</div>
        <Team team={matchup.teamB} role={roles.teamB} />
      </div>
      <WinProbabilityBar probA={probA} probB={probB} roleA={roles.teamA} roleB={roles.teamB} />
      <div className="active-players-row">
        <ActivePlayers team={matchup.teamA} role={roles.teamA} />
        <ActivePlayers team={matchup.teamB} role={roles.teamB} />
      </div>
    </div>
  );
}
