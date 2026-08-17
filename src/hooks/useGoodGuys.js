import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fantasycast:good-guy-team-ids';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// Which specific teams (across any league/platform) are "yours" - lets the
// UI color a matchup by who you're rooting for instead of an arbitrary
// team-A/team-B split.
export function useGoodGuys() {
  const [goodGuyIds, setGoodGuyIds] = useState(loadStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...goodGuyIds]));
    } catch {
      // Storage full/unavailable - selection just won't persist across reloads.
    }
  }, [goodGuyIds]);

  const toggle = useCallback((teamId) => {
    setGoodGuyIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }, []);

  return { goodGuyIds, toggle };
}
