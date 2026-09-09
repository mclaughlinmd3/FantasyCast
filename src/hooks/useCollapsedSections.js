import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fantasycast:collapsed-settings-sections';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// Tracks which league groups in the settings panel are collapsed, keyed by
// an arbitrary string (e.g. "teams:My League") so the "Your teams" and
// "Choose matchups" sections can each collapse independently even though
// they're grouped by the same league names. Persisted so it doesn't reset
// every time the panel is reopened during game day.
export function useCollapsedSections() {
  const [collapsed, setCollapsed] = useState(loadStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
    } catch {
      // Storage full/unavailable - collapse state just won't persist.
    }
  }, [collapsed]);

  const toggle = useCallback((key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
