import { calculateWinProbability } from '../winProbability.js';

function Team({ team, align }) {
  return (
    <div className={`team team-${align}`}>
      <div className="team-name">{team.name}</div>
      {team.manager && <div className="team-manager">{team.manager}</div>}
      <div className="team-score">{team.score.toFixed(2)}</div>
    </div>
  );
}

function WinProbabilityBar({ probA, probB }) {
  return (
    <div className="win-prob">
      <div className="win-prob-labels">
        <span>{probA}%</span>
        <span>{probB}%</span>
      </div>
      <div className="win-prob-bar">
        <div className="win-prob-fill-a" style={{ width: `${probA}%` }} />
        <div className="win-prob-fill-b" style={{ width: `${probB}%` }} />
      </div>
    </div>
  );
}

export default function MatchupCard({ matchup, onRemove }) {
  const prob = calculateWinProbability(matchup);
  const probA = Math.round(prob.teamA * 100);
  const probB = 100 - probA;

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
        <Team team={matchup.teamA} align="a" />
        <div className="vs">VS</div>
        <Team team={matchup.teamB} align="b" />
      </div>
      <WinProbabilityBar probA={probA} probB={probB} />
    </div>
  );
}
