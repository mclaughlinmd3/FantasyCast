// Normalizes ESPN's (undocumented) fantasy API into the shared matchup/player
// shape used by the rest of the app. ESPN has no official public docs for
// this API, so field names below are reverse-engineered and defensively
// optional-chained: a shape mismatch degrades gracefully (e.g. a missing
// league name falls back to a generic placeholder) rather than crashing.

const BENCH_SLOT_IDS = new Set([20, 21]); // BE, IR

async function fetchJson(leagueId, season, week) {
  const params = new URLSearchParams();
  params.append('season', season);
  params.append('scoringPeriodId', week);
  params.append('view', 'mMatchup');
  params.append('view', 'mTeam');
  params.append('view', 'mBoxscore');
  params.append('view', 'mSettings'); // needed for data.settings.name (the real league title)

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
  const memberById = new Map((data.members || []).map((m) => [m.id, m]));
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
      teamA: buildTeam(matchup.home, leagueId, teamsById, memberById, week),
      teamB: buildTeam(matchup.away, leagueId, teamsById, memberById, week),
    });
  }
  return result;
}

function buildTeam(side, leagueId, teamsById, memberById, week) {
  const team = teamsById.get(side.teamId);
  const wins = team?.record?.overall?.wins ?? 0;
  const losses = team?.record?.overall?.losses ?? 0;

  const entries =
    side.rosterForCurrentScoringPeriod?.entries || side.rosterForMatchupPeriod?.entries || [];

  const starters = entries
    .filter((e) => !BENCH_SLOT_IDS.has(e.lineupSlotId))
    .map((e) => buildPlayer(e, week));

  return {
    id: `espn-${leagueId}-${side.teamId}`,
    name: teamDisplayName(team, side.teamId),
    manager: teamManagerName(team, memberById),
    // Summed from the starters actually shown, rather than trusting ESPN's
    // own `totalPoints` field directly - that field can lag behind (or not
    // be populated yet) during live scoring even though individual players'
    // points are already live, which showed up as the team total sitting at
    // 0 while every player on the card clearly had points.
    score: round(starters.reduce((sum, p) => sum + p.live, 0)),
    // ESPN serves custom team logos from an authenticated API host, not a
    // plain public CDN - loading that URL directly as an <img src> fails
    // (no session for that host from the browser). Routed through our own
    // proxy, which re-fetches it with the espn_s2/SWID cookies attached,
    // the same way the main league-data requests already work.
    avatar: team?.logo ? `/api/espn-image?url=${encodeURIComponent(team.logo)}` : null,
    record: `${wins}-${losses}`,
    starters,
  };
}

// The `members` array (owner display names) comes bundled with the base
// league response - teams reference their owner(s) by id via `owners`.
// Defensive by construction: if that array or field isn't where expected,
// manager just stays unset like it did before, nothing breaks.
function teamManagerName(team, memberById) {
  const ownerId = team?.owners?.[0];
  if (!ownerId) return null;
  const member = memberById.get(ownerId);
  if (!member) return null;
  if (member.displayName) return member.displayName;
  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
  return fullName || null;
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
    nflTeam: proTeamAbbrev(player?.proTeamId),
    photo: player?.id ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png` : null,
    live: round(live),
    projected: round(projected?.appliedTotal ?? live),
    isActive: false, // filled in by usePolling once NFL game status is fetched
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

// Best-effort - ESPN has no public docs for this mapping, so it's
// reconstructed from memory/community reverse-engineering. Only used to
// match a player to their NFL game's live status; a wrong or missing entry
// just means that one player won't show up as "active," nothing breaks.
const PRO_TEAMS = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN',
  8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR',
  15: 'MIA', 16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI',
  22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WSH',
  29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
};

function proTeamAbbrev(proTeamId) {
  return PRO_TEAMS[proTeamId] || null;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

// ESPN has used a couple different shapes for team naming over time (a
// single `name` field vs. split `location`/`nickname` fields), and
// pre-draft teams may not have either set yet. Try each in order rather
// than assuming one and printing a literal "undefined" when it's missing.
function teamDisplayName(team, teamId) {
  if (!team) return `Team ${teamId}`;
  if (team.name) return team.name;
  const combined = `${team.location || ''} ${team.nickname || ''}`.trim();
  if (combined) return combined;
  if (team.abbrev) return team.abbrev;
  return `Team ${teamId}`;
}
