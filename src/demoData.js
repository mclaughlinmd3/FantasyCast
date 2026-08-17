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
      name: 'Gridiron Gurus',
      manager: 'You',
      score: 84.6,
      avatar: null,
      record: '2-1',
      starters: [
        { id: 'demo-p1', name: "Ja'Marr Chase", position: 'WR', photo: null, live: 18.4, projected: 20.0 },
        { id: 'demo-p2', name: 'Christian McCaffrey', position: 'RB', photo: null, live: 22.1, projected: 24.5 },
      ],
    },
    teamB: {
      name: "Roommate's Revenge",
      manager: 'Roommate',
      score: 79.2,
      avatar: null,
      record: '1-2',
      starters: [
        { id: 'demo-p3', name: 'Tyreek Hill', position: 'WR', photo: null, live: 14.0, projected: 19.0 },
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
    matchupId: updatedMatchup.id,
    matchup: updatedMatchup,
    delta: PREVIEW_DELTA,
    newLive: round(player.live + PREVIEW_DELTA),
    playType: PREVIEW_PLAY_TYPES[Math.floor(Math.random() * PREVIEW_PLAY_TYPES.length)],
  };
}
