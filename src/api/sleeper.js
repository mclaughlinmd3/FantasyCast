// Normalizes Sleeper data into the shared matchup/player shape used by the
// rest of the app (see src/api/model.js for the shape).

import { getPlayerMap } from './sleeperPlayers.js';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sleeper request failed (${url}): ${res.status}`);
  }
  return res.json();
}

export async function getCurrentWeek() {
  const state = await fetchJson('/api/sleeper/state/nfl');
  return state.week || 1;
}

// Projections come from an undocumented endpoint, so failures here are
// swallowed - a missing projection just means that player contributes no
// "remaining upside" to the win-probability estimate instead of crashing.
async function getProjectionsByPlayerId(season, week, scoringKey) {
  try {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const qs = positions.map((p) => `position[]=${p}`).join('&');
    const projections = await fetchJson(
      `/api/sleeper-projections/nfl/${season}/${week}?season_type=regular&${qs}&order_by=ppr`
    );
    const map = new Map();
    for (const entry of projections) {
      const pts =
        entry?.stats?.[scoringKey] ?? entry?.stats?.pts_ppr ?? entry?.stats?.pts_std ?? null;
      if (entry.player_id != null && pts != null) {
        map.set(String(entry.player_id), pts);
      }
    }
    return map;
  } catch (err) {
    console.error('Sleeper projections fetch failed, continuing without them:', err.message);
    return new Map();
  }
}

function scoringKeyFor(league) {
  const rec = league?.scoring_settings?.rec ?? 0;
  if (rec >= 1) return 'pts_ppr';
  if (rec > 0) return 'pts_half_ppr';
  return 'pts_std';
}

// Raw per-category stats (pass_td, rec, sack, etc), used to figure out what
// specifically happened when a player's points jump - not just by how much.
// Same undocumented-endpoint caveat as projections: failures degrade to "no
// stat breakdown" rather than crashing anything.
async function getStatsByPlayerId(season, week) {
  try {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const qs = positions.map((p) => `position[]=${p}`).join('&');
    const stats = await fetchJson(
      `/api/sleeper-stats/nfl/${season}/${week}?season_type=regular&${qs}`
    );
    const map = new Map();
    for (const entry of stats) {
      if (entry.player_id != null && entry.stats) {
        map.set(String(entry.player_id), entry.stats);
      }
    }
    return map;
  } catch (err) {
    console.error('Sleeper stats fetch failed, continuing without play-type detail:', err.message);
    return new Map();
  }
}

export async function getLeagueMatchups(leagueConfig, week) {
  const { leagueId, season, name } = leagueConfig;
  const [league, users, rosters, matchups, playerMap] = await Promise.all([
    fetchJson(`/api/sleeper/league/${leagueId}`),
    fetchJson(`/api/sleeper/league/${leagueId}/users`),
    fetchJson(`/api/sleeper/league/${leagueId}/rosters`),
    fetchJson(`/api/sleeper/league/${leagueId}/matchups/${week}`),
    getPlayerMap(),
  ]);

  const scoringKey = scoringKeyFor(league);
  const resolvedSeason = season || new Date().getFullYear();
  const [projections, rawStats] = await Promise.all([
    getProjectionsByPlayerId(resolvedSeason, week, scoringKey),
    getStatsByPlayerId(resolvedSeason, week),
  ]);

  const userById = new Map(users.map((u) => [u.user_id, u]));
  const rosterById = new Map(rosters.map((r) => [r.roster_id, r]));

  const grouped = new Map();
  for (const entry of matchups) {
    if (entry.matchup_id == null) continue;
    if (!grouped.has(entry.matchup_id)) grouped.set(entry.matchup_id, []);
    grouped.get(entry.matchup_id).push(entry);
  }

  const result = [];
  for (const [matchupId, entries] of grouped) {
    if (entries.length < 2) continue;
    const [a, b] = entries;
    result.push({
      id: `sleeper-${leagueId}-${matchupId}`,
      platform: 'sleeper',
      leagueId,
      leagueName: name || league.name || `Sleeper League ${leagueId}`,
      week,
      scoringWeights: league.scoring_settings || null,
      teamA: buildTeam(a, leagueId, rosterById, userById, projections, rawStats, playerMap),
      teamB: buildTeam(b, leagueId, rosterById, userById, projections, rawStats, playerMap),
    });
  }
  return result;
}

function buildTeam(entry, leagueId, rosterById, userById, projections, rawStats, playerMap) {
  const roster = rosterById.get(entry.roster_id);
  const user = roster ? userById.get(roster.owner_id) : null;
  const teamName = user?.metadata?.team_name || user?.display_name || `Roster ${entry.roster_id}`;
  const wins = roster?.settings?.wins ?? 0;
  const losses = roster?.settings?.losses ?? 0;
  const playersPoints = entry.players_points || {};

  const starters = (entry.starters || [])
    .filter((playerId) => playerId && playerId !== '0')
    .map((playerId) => {
      const info = playerMap.get(playerId);
      return {
        id: playerId,
        name: info?.name || playerId,
        position: info?.position || null,
        nflTeam: info?.team || null,
        photo: `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`,
        live: round(playersPoints[playerId] || 0),
        projected: round(projections.get(playerId) ?? playersPoints[playerId] ?? 0),
        rawStats: rawStats.get(playerId) || null,
        isActive: false, // filled in by usePolling once NFL game status is fetched
      };
    });

  return {
    id: `sleeper-${leagueId}-${entry.roster_id}`,
    name: teamName,
    manager: user?.display_name || null,
    // Summed from the starters actually shown, rather than trusting Sleeper's
    // own `points` field directly - that field can lag behind (or not be
    // populated yet) during live scoring even though individual players'
    // points are already live, which showed up as the team total sitting at
    // 0 while every player on the card clearly had points.
    score: round(starters.reduce((sum, p) => sum + p.live, 0)),
    avatar: user?.avatar ? `https://sleepercdn.com/avatars/${user.avatar}` : null,
    record: `${wins}-${losses}`,
    starters,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
