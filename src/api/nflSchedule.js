// ESPN's public game-schedule API (separate from, and much better documented
// in the community than, its fantasy API) reports each NFL game's live
// status and kickoff time. Used only to answer "is this player's game live,
// or about to be" for the active-players list - not fantasy scoring itself.
// It also carries a live "situation" (down/distance/possession/red zone)
// while a game is in progress, used for the red-zone highlight.

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
      // `situation` only exists while a game is actually in progress. Only
      // the team currently on offense (possession) can be "in the red
      // zone" - the defense isn't, even though they're in the same game.
      const situation = competition?.situation;
      const possessionTeamId = situation?.possession != null ? String(situation.possession) : null;
      const isRedZone = Boolean(situation?.isRedZone);

      for (const competitor of competition?.competitors || []) {
        const abbrev = competitor.team?.abbreviation;
        if (!abbrev || !state) continue;
        const hasPossession = possessionTeamId != null && String(competitor.id) === possessionTeamId;
        statusByTeam.set(abbrev, { state, startTime, isRedZone: isRedZone && hasPossession });
      }
    }
  } catch (err) {
    console.error('Failed to fetch NFL game status, active-players list will be empty:', err.message);
  }

  return statusByTeam;
}

// Whether this player's NFL team currently has the ball in the red zone -
// best-effort from ESPN's public scoreboard feed; if that feed doesn't
// carry a `situation` for this game (not live, or ESPN just hasn't posted
// one yet), this is simply false rather than guessing.
export function isTeamInRedZone(gameInfo) {
  return Boolean(gameInfo?.isRedZone);
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
