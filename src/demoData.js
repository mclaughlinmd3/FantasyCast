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

function activePlayers(matchup) {
  return matchup.teamA.starters.filter((p) => p.isActive).concat(
    matchup.teamB.starters.filter((p) => p.isActive)
  );
}

// Picks a random currently-active starter from a random displayed matchup
// (falling back to the built-in demo matchup if none of the displayed ones
// have any active players right now) and applies the point swing to a
// cloned matchup. Only picking from active starters matters because those
// are the only players shown in the grid's active-players list - picking a
// benched/inactive one would fire a takeover for someone who was never on
// screen to begin with, making it impossible to see the reorder animation
// this is often used to preview. Pass the same matchups the grid is
// actually rendering (including the "Simulate active players" override) so
// this stays in sync with what's on screen.
export function createPreviewEvent(displayedMatchups) {
  const withActivePlayers = displayedMatchups.filter((m) => activePlayers(m).length > 0);
  const baseMatchup =
    withActivePlayers[Math.floor(Math.random() * withActivePlayers.length)] || demoMatchup();

  const candidates = activePlayers(baseMatchup);
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
    isPreview: true,
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

// The takeover/summary screens get their boosted score from the event
// object above, but that's just a snapshot for those two screens - it
// doesn't touch the real matchup data the grid renders from. Without this,
// returning to the grid after a preview would show the player back at
// their original point total, with nothing to reorder. This re-applies the
// same point bump to the real (or demo) matchup so the grid's
// active-players list actually reflects it too, and the reorder animation
// can be watched for real. Call it with the previewed event whenever
// deriving what the grid should render.
export function applyPreviewBoost(displayedMatchups, event) {
  if (!event) return displayedMatchups;

  const bumpTeam = (team) => ({
    ...team,
    score: round(team.score + event.delta),
    starters: team.starters.map((p) =>
      p.id === event.playerId ? { ...p, live: round(p.live + event.delta) } : p
    ),
  });

  let matched = false;
  const result = displayedMatchups.map((m) => {
    if (m.id !== event.matchupId) return m;
    const isTeamA = m.teamA.starters.some((p) => p.id === event.playerId);
    if (!isTeamA && !m.teamB.starters.some((p) => p.id === event.playerId)) return m;
    matched = true;
    return isTeamA ? { ...m, teamA: bumpTeam(m.teamA) } : { ...m, teamB: bumpTeam(m.teamB) };
  });

  // The demo matchup isn't part of the real grid, so there's nothing to
  // boost - the takeover/summary screens still show it correctly either way.
  return matched ? result : displayedMatchups;
}
