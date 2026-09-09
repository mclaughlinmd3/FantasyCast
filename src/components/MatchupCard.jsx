import { useState } from 'react';
import { getMatchupRoles, orderTeamsForDisplay } from '../teamRoles.js';
import { formatStatLine } from '../playerStats.js';
import { initials } from '../initials.js';
import { useFlipList } from '../hooks/useFlipList.js';

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

function ActivePlayerRow({ player, listRef }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = player.photo && !photoFailed;
  const statLine = formatStatLine(player);

  return (
    <li ref={listRef}>
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

  const registerNode = useFlipList(active.map((p) => p.id).join(','));

  return (
    <div className={`active-players team-${role}`}>
      {active.length === 0 ? (
        <div className="active-players-empty">No active players</div>
      ) : (
        <ul className="active-players-list">
          {active.map((p) => (
            <ActivePlayerRow key={p.id} player={p} listRef={registerNode(p.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MatchupCard({ matchup, onRemove, goodGuyIds }) {
  const roles = goodGuyIds ? getMatchupRoles(matchup, goodGuyIds) : { teamA: 'a', teamB: 'b' };
  const { left, right } = orderTeamsForDisplay(matchup, roles);

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
        <Team team={left.team} role={left.role} />
        <div className="vs">VS</div>
        <Team team={right.team} role={right.role} />
      </div>
      <div className="active-players-row">
        <ActivePlayers team={left.team} role={left.role} />
        <ActivePlayers team={right.team} role={right.role} />
      </div>
    </div>
  );
}
