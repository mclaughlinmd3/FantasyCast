// ESPN's public game-schedule API (separate from, and much better documented
// in the community than, its fantasy API) reports each NFL game's live
// status. Used only to answer "is this player's game currently being played
// right now" for the active-players list - not fantasy scoring itself.

export async function getTeamGameStatus() {
  const statusByTeam = new Map();

  try {
    const res = await fetch('/api/nfl-scoreboard');
    if (!res.ok) {
      throw new Error(`NFL scoreboard request failed: ${res.status}`);
    }
    const data = await res.json();

    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      const state = competition?.status?.type?.state; // 'pre' | 'in' | 'post'
      for (const competitor of competition?.competitors || []) {
        const abbrev = competitor.team?.abbreviation;
        if (abbrev && state) statusByTeam.set(abbrev, state);
      }
    }
  } catch (err) {
    console.error('Failed to fetch NFL game status, active-players list will be empty:', err.message);
  }

  return statusByTeam;
}
