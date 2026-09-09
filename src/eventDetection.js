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

// Categories that are inherently notable regardless of point size - TDs,
// turnovers, defensive/special-teams plays. Anything not in here is routine
// accumulation (yardage, plain receptions) that only skill positions rack up
// gradually, so it needs a much bigger jump to earn a takeover (see
// YARDAGE_LIKE below).
const YARDAGE_LIKE = new Set(['pass_yd', 'rush_yd', 'rec_yd', 'rec']);

// Positions that routinely accumulate yardage/receptions in small chunks -
// this is who "1 point for 10 yards doesn't need a whole animation" applies
// to. Kickers, DSTs, etc. keep the normal threshold for everything.
const YARDAGE_ONLY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

// Finds which raw stat category contributed the most fantasy points to a
// player's live-score jump (e.g. a TD catch shows up as both `rec` and
// `rec_td` - the touchdown's point value dominates, so it wins over "just"
// a reception). Returns null if there's not enough data to tell.
function findDominantStatCategory(prevStats, currentStats, weights) {
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

  return bestKey;
}

function describePlayType(dominantKey) {
  return dominantKey ? SLEEPER_STAT_LABELS[dominantKey] || null : null;
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
        const dominantKey = findDominantStatCategory(prevPlayer.rawStats, player.rawStats, matchup.scoringWeights);

        // Routine yardage/reception accumulation for skill positions needs a
        // much bigger jump to count as "notable" - TDs and everything else
        // keep the normal threshold. Players with no rawStats (ESPN) or no
        // clear dominant category fall back to the normal threshold too.
        const isRoutineYardage = dominantKey && YARDAGE_LIKE.has(dominantKey) && YARDAGE_ONLY_POSITIONS.has(player.position);
        const requiredDelta = isRoutineYardage ? thresholdPoints * 2 : thresholdPoints;

        if (delta >= requiredDelta) {
          events.push({
            id: `${player.id}-${Date.now()}`,
            playerId: player.id,
            playerName: player.name,
            playerPhoto: player.photo,
            playerPosition: player.position,
            teamName: team.name,
            teamId: team.id,
            matchupId: matchup.id,
            matchup,
            delta,
            newLive: player.live,
            playType: describePlayType(dominantKey),
          });
        }
      }
    }
  }

  return events.sort((a, b) => b.delta - a.delta);
}
