// Rough live win-probability estimate: current score plus each starter's
// remaining upside (projected minus live, floored at 0 - once a player's
// live score reaches/passes their projection they're treated as "locked
// in" since we have no play-by-play/game-clock signal to know otherwise).
// The spread between the two teams' projected finals is run through a
// logistic curve whose steepness relaxes as fewer starters are still
// uncertain, so a big early lead reads as close while a small lead with
// nobody left to play reads as near-certain.

const PER_PLAYER_SIGMA = 6; // rough weekly stddev (fantasy pts) for one starter still in play
const MIN_PROB = 0.01;
const MAX_PROB = 0.99;

function remainingUpside(player) {
  return Math.max(0, player.projected - player.live);
}

function estimateFinal(team) {
  const upside = team.starters.reduce((sum, p) => sum + remainingUpside(p), 0);
  return team.score + upside;
}

function uncertainStarterCount(team) {
  return team.starters.filter((p) => remainingUpside(p) > 0).length;
}

export function calculateWinProbability(matchup) {
  const { teamA, teamB } = matchup;
  const estimatedFinalA = estimateFinal(teamA);
  const estimatedFinalB = estimateFinal(teamB);

  const uncertainCount = Math.max(1, uncertainStarterCount(teamA) + uncertainStarterCount(teamB));
  const sigma = PER_PLAYER_SIGMA * Math.sqrt(uncertainCount);

  const diff = estimatedFinalA - estimatedFinalB;
  const rawProbA = 1 / (1 + Math.exp(-diff / sigma));
  const probA = Math.min(MAX_PROB, Math.max(MIN_PROB, rawProbA));

  return {
    teamA: probA,
    teamB: 1 - probA,
    estimatedFinalA: round(estimatedFinalA),
    estimatedFinalB: round(estimatedFinalB),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
