import { getMatchupRoles } from '../teamRoles.js';

function stillToPlay(team) {
  return team.starters.filter((p) => p.projected - p.live > 0);
}

function TeamColumn({ team, role }) {
  const remaining = stillToPlay(team);
  return (
    <div className={`summary-team-col team-${role}`}>
      <div className="summary-team-name">{team.name}</div>
      <div className="summary-team-score">{team.score.toFixed(2)}</div>
      <div className="summary-remaining-label">Still to play</div>
      {remaining.length > 0 ? (
        <ul className="summary-remaining-list">
          {remaining.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      ) : (
        <div className="summary-remaining-none">Nobody left</div>
      )}
    </div>
  );
}

export default function MatchupSummary({ matchup, goodGuyIds }) {
  const roles = goodGuyIds ? getMatchupRoles(matchup, goodGuyIds) : { teamA: 'a', teamB: 'b' };
  return (
    <div className="summary-screen">
      <div className="summary-league">{matchup.leagueName}</div>
      <div className="summary-teams">
        <TeamColumn team={matchup.teamA} role={roles.teamA} />
        <div className="summary-vs">VS</div>
        <TeamColumn team={matchup.teamB} role={roles.teamB} />
      </div>
    </div>
  );
}
