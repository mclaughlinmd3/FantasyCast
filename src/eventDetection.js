// Diffs consecutive polls of the currently-displayed matchups to catch
// significant scoring plays (a starter's live points jumping - a TD, a big
// reception, etc). Only matchups present in both the previous and current
// snapshot are diffed, so swapping in a newly-selected matchup never
// produces a false "huge jump from zero" event on its first poll.

// Defaults, used when config.json doesn't override them (see /api/config).
export const DEFAULT_SIGNIFICANT_DELTA = 4; // fantasy points - roughly one TD or bigger
export const DEFAULT_EVENT_DURATION_MS = 10000;
export const DEFAULT_SUMMARY_DURATION_MS = 6000;

function round(n) {
  return Math.round(n * 100) / 100;
}

// Sleeper-only for now: ESPN's raw stats use a numeric stat-ID scheme that
// isn't reliably reconstructable from memory, so ESPN events just skip the
// headline rather than risk labeling a play wrong.
const SLEEPER_STAT_LABELS = {
  pass_td: 'Passing Touchdown',
  rush_td: 'Rushing Touchdown',
  rec_td: 'Receiving Touchdown',
  pass_2pt: '2-Point Conversion',
  rush_2pt: '2-Point Conversion',
  rec_2pt: '2-Point Conversion',
  rec: 'Reception',
  def_td: 'Defensive Touchdown',
  fum_rec_td: 'Fumble Return TD',
  int_td: 'Pick-Six',
  sack: 'Sack',
  int: 'Interception',
  ff: 'Forced Fumble',
  fum_rec: 'Fumble Recovery',
  safe: 'Safety',
  blk_kick: 'Blocked Kick',
  fg_made: 'Field Goal',
  xp_made: 'Extra Point',
};

// Finds which raw stat category contributed the most fantasy points to a
// player's live-score jump (e.g. a TD catch shows up as both `rec` and
// `rec_td` - the touchdown's point value dominates, so it wins over "just"
// a reception). Returns null if there's not enough data to tell.
function describePlayType(prevStats, currentStats, weights) {
  if (!prevStats || !currentStats || !weights) return null;

  let bestKey = null;
  let bestContribution = 0;
  for (const key of Object.keys(currentStats)) {
    const delta = (currentStats[key] || 0) - (prevStats[key] || 0);
    if (delta <= 0) continue;
    const weight = weights[key] || 0;
    const contribution = delta * weight;
    if (contribution > bestContribution) {
      bestContribution = contribution;
      bestKey = key;
    }
  }

  return bestKey ? SLEEPER_STAT_LABELS[bestKey] || null : null;
}

export function detectScoringEvents(
  prevMatchupsById,
  currentMatchups,
  selectedIds,
  thresholdPoints = DEFAULT_SIGNIFICANT_DELTA
) {
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
        if (delta >= thresholdPoints) {
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
            playType: describePlayType(prevPlayer.rawStats, player.rawStats, matchup.scoringWeights),
          });
        }
      }
    }
  }

  return events.sort((a, b) => b.delta - a.delta);
}
