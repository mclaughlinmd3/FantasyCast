// Testing aid: forces isActive=true on real matchup data so the
// active-players rows (photos, names, stat lines) can be checked before any
// NFL game has actually started. Doesn't fabricate scores or stats - if a
// player has 0 live points because nothing has happened yet, that's still
// shown as-is; only the isActive flag is overridden.
const MAX_SIMULATED = 5;

export function simulateActivePlayers(matchups) {
  return matchups.map((m) => ({
    ...m,
    teamA: simulateTeam(m.teamA),
    teamB: simulateTeam(m.teamB),
  }));
}

function simulateTeam(team) {
  return {
    ...team,
    starters: team.starters.map((p, idx) => (idx < MAX_SIMULATED ? { ...p, isActive: true } : p)),
  };
}
