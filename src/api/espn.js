// Normalizes ESPN's (undocumented) fantasy API into the shared matchup/player
// shape used by the rest of the app. ESPN has no official public docs for
// this API, so field names below are reverse-engineered and defensively
// optional-chained: a shape mismatch degrades the win-probability estimate
// (falls back to score-only) rather than crashing the app.

const BENCH_SLOT_IDS = new Set([20, 21]); // BE, IR

async function fetchJson(leagueId, season, week) {
  const params = new URLSearchParams();
  params.append('season', season);
  params.append('scoringPeriodId', week);
  params.append('view', 'mMatchup');
  params.append('view', 'mTeam');
  params.append('view', 'mBoxscore');

  const res = await fetch(`/api/espn/${leagueId}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`ESPN request failed for league ${leagueId}: ${res.status}`);
  }
  return res.json();
}

export async function getLeagueMatchups(leagueConfig, week) {
  const { leagueId, name } = leagueConfig;
  const season = leagueConfig.season || new Date().getFullYear();
  const data = await fetchJson(leagueId, season, week);

  const teamsById = new Map((data.teams || []).map((t) => [t.id, t]));
  const leagueName = name || data.settings?.name || `ESPN League ${leagueId}`;

  const result = [];
  for (const matchup of data.schedule || []) {
    if (matchup.matchupPeriodId !== week) continue;
    if (!matchup.home || !matchup.away) continue; // bye week

    result.push({
      id: `espn-${leagueId}-${matchup.id}`,
      platform: 'espn',
      leagueId,
      leagueName,
      week,
      teamA: buildTeam(matchup.home, teamsById, week),
      teamB: buildTeam(matchup.away, teamsById, week),
    });
  }
  return result;
}

function buildTeam(side, teamsById, week) {
  const team = teamsById.get(side.teamId);
  const wins = team?.record?.overall?.wins ?? 0;
  const losses = team?.record?.overall?.losses ?? 0;

  const entries =
    side.rosterForCurrentScoringPeriod?.entries || side.rosterForMatchupPeriod?.entries || [];

  const starters = entries
    .filter((e) => !BENCH_SLOT_IDS.has(e.lineupSlotId))
    .map((e) => buildPlayer(e, week));

  return {
    name: team ? `${team.location} ${team.nickname}`.trim() : `Team ${side.teamId}`,
    manager: null,
    score: round(side.totalPoints || 0),
    avatar: team?.logo || null,
    record: `${wins}-${losses}`,
    starters,
  };
}

function buildPlayer(entry, week) {
  const player = entry.playerPoolEntry?.player;
  const stats = player?.stats || [];

  const actual = stats.find((s) => s.scoringPeriodId === week && s.statSourceId === 0);
  const projected = stats.find((s) => s.scoringPeriodId === week && s.statSourceId === 1);
  const live = actual?.appliedTotal ?? 0;

  return {
    id: String(player?.id ?? entry.playerId ?? ''),
    name: player?.fullName || 'Unknown Player',
    position: positionAbbrev(player?.defaultPositionId),
    photo: player?.id ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png` : null,
    live: round(live),
    projected: round(projected?.appliedTotal ?? live),
  };
}

const POSITIONS = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'DEF',
};

function positionAbbrev(defaultPositionId) {
  return POSITIONS[defaultPositionId] || null;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
