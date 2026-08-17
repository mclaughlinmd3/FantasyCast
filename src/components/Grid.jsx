import MatchupCard from './MatchupCard.jsx';
import { MAX_SELECTED } from '../hooks/useSelectedMatchups.js';

export default function Grid({ matchups, onRemove, onOpenSettings, goodGuyIds }) {
  const tiles = [...matchups];
  while (tiles.length < MAX_SELECTED) tiles.push(null);

  return (
    <div className="grid">
      {tiles.map((matchup, idx) =>
        matchup ? (
          <MatchupCard
            key={matchup.id}
            matchup={matchup}
            onRemove={onRemove}
            goodGuyIds={goodGuyIds}
          />
        ) : (
          <button key={`empty-${idx}`} className="empty-tile" onClick={onOpenSettings}>
            + Choose a matchup
          </button>
        )
      )}
    </div>
  );
}
