function stillToPlay(team) {
  return team.starters.filter((p) => p.projected - p.live > 0);
}

function TeamColumn({ team, align }) {
  const remaining = stillToPlay(team);
  return (
    <div className={`summary-team-col team-${align}`}>
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

export default function MatchupSummary({ matchup }) {
  return (
    <div className="summary-screen">
      <div className="summary-league">{matchup.leagueName}</div>
      <div className="summary-teams">
        <TeamColumn team={matchup.teamA} align="a" />
        <div className="summary-vs">VS</div>
        <TeamColumn team={matchup.teamB} align="b" />
      </div>
    </div>
  );
}
