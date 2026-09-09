// ESPN's public game-schedule API (separate from, and much better documented
// in the community than, its fantasy API) reports each NFL game's live
// status and kickoff time. Used only to answer "is this player's game live,
// or about to be" for the active-players list - not fantasy scoring itself.

const SHOW_BEFORE_KICKOFF_MS = 15 * 60 * 1000;

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
      const dateStr = event.date || competition?.date || null;
      const startTime = dateStr ? new Date(dateStr) : null;

      for (const competitor of competition?.competitors || []) {
        const abbrev = competitor.team?.abbreviation;
        if (abbrev && state) statusByTeam.set(abbrev, { state, startTime });
      }
    }
  } catch (err) {
    console.error('Failed to fetch NFL game status, active-players list will be empty:', err.message);
  }

  return statusByTeam;
}

// A player is worth showing if their game is currently being played, or
// kicks off within the next 15 minutes - so the card isn't sitting empty
// right up until the whistle. Once a game is final, it's excluded even if
// the status feed is slow to update the "post" state.
export function isGameLiveOrSoon(gameInfo) {
  if (!gameInfo) return false;
  if (gameInfo.state === 'post') return false;
  if (gameInfo.state === 'in') return true;
  if (gameInfo.state === 'pre' && gameInfo.startTime) {
    const msUntilStart = gameInfo.startTime.getTime() - Date.now();
    return msUntilStart <= SHOW_BEFORE_KICKOFF_MS;
  }
  return false;
}
