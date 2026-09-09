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

// Everywhere a matchup's two sides are laid out left-to-right, the green
// side (the 'good' guy, or 'a' in the neutral no-one-marked case) should
// always be on the left - teamA/teamB order in the underlying data doesn't
// determine layout, since teamB is just as likely to be the marked side.
export function orderTeamsForDisplay(matchup, roles) {
  const teamAIsLeft = roles.teamA === 'good' || roles.teamA === 'a';
  return teamAIsLeft
    ? { left: { team: matchup.teamA, role: roles.teamA }, right: { team: matchup.teamB, role: roles.teamB } }
    : { left: { team: matchup.teamB, role: roles.teamB }, right: { team: matchup.teamA, role: roles.teamA } };
}
