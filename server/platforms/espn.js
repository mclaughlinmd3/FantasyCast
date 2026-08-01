async function getLeagueMatchups(league, week, cookies) {
  const { leagueId, season, name } = league;
  const url =
    `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}` +
    `?view=mMatchup&view=mTeam&scoringPeriodId=${week}`;

  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${cookies.s2}; SWID=${cookies.swid}`,
    },
  });
  if (!res.ok) {
    throw new Error(`ESPN request failed for league ${leagueId}: ${res.status}`);
  }
  const data = await res.json();
  const teamsById = new Map((data.teams || []).map((t) => [t.id, t]));

  const result = [];
  for (const matchup of data.schedule || []) {
    if (matchup.matchupPeriodId !== week) continue;
    if (!matchup.away || !matchup.home) continue; // bye week
    result.push({
      id: `espn-${leagueId}-${matchup.id}`,
      platform: 'espn',
      leagueId,
      leagueName: name || data.settings?.name || `ESPN League ${leagueId}`,
      week,
      teamA: buildTeam(matchup.home, teamsById),
      teamB: buildTeam(matchup.away, teamsById),
    });
  }
  return result;
}

function buildTeam(side, teamsById) {
  const team = teamsById.get(side.teamId);
  const wins = team?.record?.overall?.wins ?? 0;
  const losses = team?.record?.overall?.losses ?? 0;
  return {
    name: team ? `${team.location} ${team.nickname}`.trim() : `Team ${side.teamId}`,
    owner: null,
    score: round(side.totalPoints || 0),
    avatar: team?.logo || null,
    record: `${wins}-${losses}`,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { getLeagueMatchups };
