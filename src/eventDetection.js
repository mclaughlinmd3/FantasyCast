// Diffs consecutive polls of the currently-displayed matchups to catch
// significant scoring plays (a starter's live points jumping - a TD, a big
// reception, etc). Only matchups present in both the previous and current
// snapshot are diffed, so swapping in a newly-selected matchup never
// produces a false "huge jump from zero" event on its first poll.

// Defaults, used when config.json doesn't override them (see /api/config).
export const DEFAULT_SIGNIFICANT_DELTA = 4; // fantasy points - roughly one TD or bigger
export const DEFAULT_EVENT_DURATION_MS = 5000;
export const DEFAULT_SUMMARY_DURATION_MS = 3000;

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

// Explicit play-type triggers that always earn a takeover regardless of how
// small the resulting point swing is (bypassing the routine-yardage
// point-threshold above entirely) - a 15-yard catch on a non-PPR reception
// might only be worth a point or two, but it's still worth interrupting for.
// Approximated from the change in a raw stat category between two
// consecutive polls, since Sleeper's stats are cumulative totals rather
// than individual plays - if two plays of the same type land in the same
// poll window, this only sees their combined total, not each one
// separately. First-down stats (`rec_fd`/`rush_fd`/`pass_fd`) are less
// consistently documented than the scoring categories above, so that
// trigger may not fire if a league's raw stats don't include them.
const NOTABLE_PLAY_YARDAGE = {
  catch: { key: 'rec_yd', overYards: 15, label: 'Big Catch' },
  run: { key: 'rush_yd', overYards: 9, label: 'Big Run' },
  throw: { key: 'pass_yd', overYards: 10, label: 'Big Throw' },
};
const FIRST_DOWN_KEYS = ['rec_fd', 'rush_fd', 'pass_fd'];

function statDelta(prevStats, currentStats, key) {
  return (currentStats[key] || 0) - (prevStats[key] || 0);
}

// Checks the explicit yardage/first-down triggers above. Returns
// { type, label } for the first one that matches, or null.
function detectNotablePlay(prevStats, currentStats) {
  if (!prevStats || !currentStats) return null;

  for (const [type, { key, overYards, label }] of Object.entries(NOTABLE_PLAY_YARDAGE)) {
    if (statDelta(prevStats, currentStats, key) > overYards) {
      return { type, label };
    }
  }
  if (FIRST_DOWN_KEYS.some((key) => statDelta(prevStats, currentStats, key) > 0)) {
    return { type: 'firstDown', label: 'First Down' };
  }
  return null;
}

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

// A scoring-category label (touchdown, sack, etc) always wins if there is
// one; a notable-play label (Big Catch, First Down) only shows when the
// dominant category itself isn't separately labeled (plain yardage/receptions
// aren't in SLEEPER_STAT_LABELS on their own).
function describePlayType(dominantKey, notablePlay) {
  if (dominantKey && SLEEPER_STAT_LABELS[dominantKey]) return SLEEPER_STAT_LABELS[dominantKey];
  if (notablePlay) return notablePlay.label;
  return null;
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
        const notablePlay = detectNotablePlay(prevPlayer.rawStats, player.rawStats);

        // Routine yardage/reception accumulation for skill positions needs a
        // much bigger jump to count as "notable" - TDs and everything else
        // keep the normal threshold. Players with no rawStats (ESPN) or no
        // clear dominant category fall back to the normal threshold too.
        const isRoutineYardage = dominantKey && YARDAGE_LIKE.has(dominantKey) && YARDAGE_ONLY_POSITIONS.has(player.position);
        const requiredDelta = isRoutineYardage ? thresholdPoints * 2 : thresholdPoints;

        // A big catch/run/throw/first down always earns a takeover, even if
        // the resulting point swing itself is small enough it wouldn't have
        // cleared requiredDelta on its own.
        if (delta >= requiredDelta || notablePlay) {
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
            playType: describePlayType(dominantKey, notablePlay),
          });
        }
      }
    }
  }

  return events.sort((a, b) => b.delta - a.delta);
}
