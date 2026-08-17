// Decides how to color each side of a matchup: if exactly one side is
// marked as a "good guy" team, that side is 'good' (green) and the other
// is 'bad' (red). Otherwise (both marked, neither marked - e.g. two
// roommates playing each other) falls back to the neutral green/blue
// team-a/team-b split used everywhere before good-guy marking existed.
export function getMatchupRoles(matchup, goodGuyIds) {
  const aIsGood = goodGuyIds.has(matchup.teamA.id);
  const bIsGood = goodGuyIds.has(matchup.teamB.id);

  if (aIsGood && !bIsGood) return { teamA: 'good', teamB: 'bad' };
  if (bIsGood && !aIsGood) return { teamA: 'bad', teamB: 'good' };
  return { teamA: 'a', teamB: 'b' };
}
