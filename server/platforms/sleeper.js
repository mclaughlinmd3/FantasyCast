const BASE = 'https://api.sleeper.app/v1';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sleeper request failed (${url}): ${res.status}`);
  }
  return res.json();
}

async function getCurrentWeek() {
  const state = await fetchJson(`${BASE}/state/nfl`);
  return state.week || 1;
}

async function getLeagueMatchups(leagueId, week) {
  const [league, users, rosters, matchups] = await Promise.all([
    fetchJson(`${BASE}/league/${leagueId}`),
    fetchJson(`${BASE}/league/${leagueId}/users`),
    fetchJson(`${BASE}/league/${leagueId}/rosters`),
    fetchJson(`${BASE}/league/${leagueId}/matchups/${week}`),
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
      leagueName: league.name,
      week,
      teamA: buildTeam(a, rosterById, userById),
      teamB: buildTeam(b, rosterById, userById),
    });
  }
  return result;
}

function buildTeam(entry, rosterById, userById) {
  const roster = rosterById.get(entry.roster_id);
  const user = roster ? userById.get(roster.owner_id) : null;
  const teamName = user?.metadata?.team_name || user?.display_name || `Roster ${entry.roster_id}`;
  const wins = roster?.settings?.wins ?? 0;
  const losses = roster?.settings?.losses ?? 0;
  return {
    name: teamName,
    owner: user?.display_name || null,
    score: round(entry.points || 0),
    avatar: user?.avatar ? `https://sleepercdn.com/avatars/${user.avatar}` : null,
    record: `${wins}-${losses}`,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { getCurrentWeek, getLeagueMatchups };
