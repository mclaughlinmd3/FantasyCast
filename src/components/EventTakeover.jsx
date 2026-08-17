import { useState } from 'react';

export default function EventTakeover({ event }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = event.playerPhoto && !photoFailed;

  return (
    <div className="event-takeover">
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
          <div className="event-photo event-photo-fallback">
            {event.playerName
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)}
          </div>
        )}
      </div>
      <div className="event-player-name">{event.playerName}</div>
      <div className="event-meta">
        {event.playerPosition ? `${event.playerPosition} · ` : ''}
        {event.teamName}
      </div>
      <div className="event-league">{event.matchup.leagueName}</div>
    </div>
  );
}
