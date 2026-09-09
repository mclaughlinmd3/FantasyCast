import { useState } from 'react';
import { getMatchupRoles, orderTeamsForDisplay } from '../teamRoles.js';
import { initials } from '../initials.js';

export default function EventTakeover({ event, goodGuyIds }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = event.playerPhoto && !photoFailed;

  const roles = goodGuyIds ? getMatchupRoles(event.matchup, goodGuyIds) : { teamA: 'a', teamB: 'b' };
  const { left, right } = orderTeamsForDisplay(event.matchup, roles);
  const isTeamA = event.teamId
    ? event.matchup.teamA.id === event.teamId
    : event.matchup.teamA.name === event.teamName;
  const scoringRole = isTeamA ? roles.teamA : roles.teamB;

  return (
    <div className={`event-takeover team-${scoringRole}`}>
      {event.playType && <div className="event-play-type">{event.playType}</div>}
      <div className="event-swing">+{event.delta.toFixed(1)} PTS</div>

      <div className="event-photo-wrap">
        {showPhoto ? (
          <img
            className="event-photo"
            src={event.playerPhoto}
            alt=""
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <div className="event-photo event-photo-fallback">{initials(event.playerName)}</div>
        )}
      </div>
      <div className="event-player-name">{event.playerName}</div>

      <div className={`event-team-name team-${scoringRole}`}>{event.teamName}</div>
      <div className="event-meta">
        {event.playerPosition ? `${event.playerPosition} · ` : ''}
        {event.matchup.leagueName}
      </div>

      <div className="event-matchup-score">
        <span className={`team-${left.role}`}>{left.team.name}</span>
        <span className="event-matchup-score-values">
          <span className={`team-${left.role}`}>{left.team.score.toFixed(2)}</span>
          {' – '}
          <span className={`team-${right.role}`}>{right.team.score.toFixed(2)}</span>
        </span>
        <span className={`team-${right.role}`}>{right.team.name}</span>
      </div>
    </div>
  );
}
