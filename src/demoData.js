// Lets the takeover flow be previewed before any real league is configured,
// or before any real touchdown has happened to trigger it naturally.

const PREVIEW_DELTA = 8.4;

// Randomized so repeated previews also show the graceful fallback (null)
// that real ESPN events currently use, alongside the labeled Sleeper-style
// case.
const PREVIEW_PLAY_TYPES = [
  'Receiving Touchdown',
  'Rushing Touchdown',
  'Passing Touchdown',
  null,
];

function round(n) {
  return Math.round(n * 100) / 100;
}

function demoMatchup() {
  return {
    id: 'demo-matchup',
    platform: 'demo',
    leagueId: 'demo',
    leagueName: 'Preview League',
    week: 1,
    teamA: {
      id: 'demo-team-a',
      name: 'Gridiron Gurus',
      manager: 'You',
      score: 84.6,
      avatar: null,
      record: '2-1',
      starters: [
        { id: 'demo-p1', name: "Ja'Marr Chase", position: 'WR', nflTeam: 'CIN', photo: null, live: 18.4, projected: 20.0, isActive: true },
        { id: 'demo-p2', name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', photo: null, live: 22.1, projected: 24.5, isActive: true },
        { id: 'demo-p3', name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', photo: null, live: 9.2, projected: 12.0, isActive: true },
        { id: 'demo-p4', name: 'Justin Jefferson', position: 'WR', nflTeam: 'MIN', photo: null, live: 0, projected: 18.0, isActive: false },
      ],
    },
    teamB: {
      id: 'demo-team-b',
      name: "Roommate's Revenge",
      manager: 'Roommate',
      score: 79.2,
      avatar: null,
      record: '1-2',
      starters: [
        { id: 'demo-p5', name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', photo: null, live: 14.0, projected: 19.0, isActive: true },
        { id: 'demo-p6', name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', photo: null, live: 16.8, projected: 22.0, isActive: true },
        { id: 'demo-p7', name: 'Saquon Barkley', position: 'RB', nflTeam: 'PHI', photo: null, live: 0, projected: 17.5, isActive: false },
      ],
    },
  };
}

// Picks a random starter from a random selected (or demo) matchup and
// applies the point swing to a cloned matchup, so the takeover screen and
// the summary screen that follows it agree with each other.
export function createPreviewEvent(matchups, selectedIds) {
  const selected = matchups.filter((m) => selectedIds.includes(m.id));
  const baseMatchup = selected[Math.floor(Math.random() * selected.length)] || demoMatchup();

  const candidates = baseMatchup.teamA.starters.concat(baseMatchup.teamB.starters);
  const player = candidates[Math.floor(Math.random() * candidates.length)];
  const isTeamA = baseMatchup.teamA.starters.some((p) => p.id === player.id);
  const teamKey = isTeamA ? 'teamA' : 'teamB';
  const team = baseMatchup[teamKey];

  const updatedMatchup = {
    ...baseMatchup,
    [teamKey]: {
      ...team,
      score: round(team.score + PREVIEW_DELTA),
      starters: team.starters.map((p) =>
        p.id === player.id ? { ...p, live: round(p.live + PREVIEW_DELTA) } : p
      ),
    },
  };

  return {
    id: `preview-${Date.now()}`,
    playerId: player.id,
    playerName: player.name,
    playerPhoto: player.photo,
    playerPosition: player.position,
    teamName: team.name,
    teamId: team.id,
    matchupId: updatedMatchup.id,
    matchup: updatedMatchup,
    delta: PREVIEW_DELTA,
    newLive: round(player.live + PREVIEW_DELTA),
    playType: PREVIEW_PLAY_TYPES[Math.floor(Math.random() * PREVIEW_PLAY_TYPES.length)],
  };
}
