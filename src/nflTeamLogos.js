// Public, unauthenticated ESPN team-crest CDN. Keyed by the same NFL team
// abbreviation format already used everywhere else in the app to match a
// player's team (see nflTeam in src/api/sleeper.js / src/api/espn.js, and
// the matching in src/api/nflSchedule.js) - so this works for defenses from
// either platform without needing a separate abbreviation-alias map.
export function nflTeamLogoUrl(abbrev) {
  if (!abbrev) return null;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbrev.toLowerCase()}.png`;
}
