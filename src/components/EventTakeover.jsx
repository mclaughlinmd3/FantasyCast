import { useState } from 'react';

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
}

export default function EventTakeover({ event }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = event.playerPhoto && !photoFailed;
  const isTeamA = event.matchup.teamA.name === event.teamName;

  return (
    <div className={`event-takeover ${isTeamA ? 'team-a' : 'team-b'}`}>
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

      <div className={`event-team-name ${isTeamA ? 'team-a' : 'team-b'}`}>{event.teamName}</div>
      <div className="event-meta">
        {event.playerPosition ? `${event.playerPosition} · ` : ''}
        {event.matchup.leagueName}
      </div>

      <div className="event-matchup-score">
        <span className="team-a">{event.matchup.teamA.name}</span>
        <span className="event-matchup-score-values">
          <span className="team-a">{event.matchup.teamA.score.toFixed(2)}</span>
          {' – '}
          <span className="team-b">{event.matchup.teamB.score.toFixed(2)}</span>
        </span>
        <span className="team-b">{event.matchup.teamB.name}</span>
      </div>
    </div>
  );
}
