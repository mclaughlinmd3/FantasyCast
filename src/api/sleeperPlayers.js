// Sleeper has no per-player lookup endpoint - the only way to turn a player
// id into a name is to download their full NFL player directory (multiple
// MB). That directory changes rarely, so it's cached in localStorage and
// only re-fetched once a day instead of every poll.

const CACHE_KEY = 'fantasycast:sleeper-players';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let inMemoryCache = null;

export async function getPlayerMap() {
  if (inMemoryCache) return inMemoryCache;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { fetchedAt, players } = JSON.parse(cached);
      if (Date.now() - fetchedAt < CACHE_TTL_MS) {
        inMemoryCache = new Map(Object.entries(players));
        return inMemoryCache;
      }
    }
  } catch {
    // Corrupt/unavailable cache - fall through and re-fetch.
  }

  const res = await fetch('/api/sleeper/players/nfl');
  if (!res.ok) {
    console.error('Failed to fetch Sleeper player directory:', res.status);
    inMemoryCache = new Map();
    return inMemoryCache;
  }
  const data = await res.json();

  const players = {};
  for (const [id, p] of Object.entries(data)) {
    players[id] = {
      name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || id,
      position: p.position || null,
      team: p.team || null,
    };
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), players }));
  } catch {
    // Storage full/unavailable - fine, it just won't persist across reloads.
  }

  inMemoryCache = new Map(Object.entries(players));
  return inMemoryCache;
}
