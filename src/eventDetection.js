// Diffs consecutive polls of the currently-displayed matchups to catch
// significant scoring plays (a starter's live points jumping - a TD, a big
// reception, etc). Only matchups present in both the previous and current
// snapshot are diffed, so swapping in a newly-selected matchup never
// produces a false "huge jump from zero" event on its first poll.

export const SIGNIFICANT_DELTA = 4; // fantasy points - roughly one TD or bigger
export const EVENT_DURATION_MS = 10000;
export const SUMMARY_DURATION_MS = 6000;

function round(n) {
  return Math.round(n * 100) / 100;
}

export function detectScoringEvents(prevMatchupsById, currentMatchups, selectedIds) {
  const events = [];

  for (const matchup of currentMatchups) {
    if (!selectedIds.includes(matchup.id)) continue;
    const prevMatchup = prevMatchupsById.get(matchup.id);
    if (!prevMatchup) continue; // no baseline yet

    for (const side of ['teamA', 'teamB']) {
      const team = matchup[side];
      const prevTeam = prevMatchup[side];
      const prevPlayersById = new Map(prevTeam.starters.map((p) => [p.id, p]));

      for (const player of team.starters) {
        const prevPlayer = prevPlayersById.get(player.id);
        if (!prevPlayer) continue;

        const delta = round(player.live - prevPlayer.live);
        if (delta >= SIGNIFICANT_DELTA) {
          events.push({
            id: `${player.id}-${Date.now()}`,
            playerId: player.id,
            playerName: player.name,
            playerPhoto: player.photo,
            playerPosition: player.position,
            teamName: team.name,
            matchupId: matchup.id,
            matchup,
            delta,
            newLive: player.live,
          });
        }
      }
    }
  }

  return events.sort((a, b) => b.delta - a.delta);
}
