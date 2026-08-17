import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fantasycast:selected-matchups';
export const MAX_SELECTED = 4;

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useSelectedMatchups(matchups) {
  const [selectedIds, setSelectedIds] = useState(loadStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
    } catch {
      // Storage full/unavailable - selection just won't persist across reloads.
    }
  }, [selectedIds]);

  // Default to the first MAX_SELECTED matchups once data arrives, and drop
  // any previously-selected ids that no longer correspond to a live matchup.
  useEffect(() => {
    if (!matchups.length) return;
    setSelectedIds((prev) => {
      const stillValid = prev.filter((id) => matchups.some((m) => m.id === id));
      if (stillValid.length > 0) return stillValid;
      return matchups.slice(0, MAX_SELECTED).map((m) => m.id);
    });
  }, [matchups]);

  const toggle = useCallback((id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, id];
    });
  }, []);

  const orderedSelected = selectedIds.map((id) => matchups.find((m) => m.id === id)).filter(Boolean);

  return { selectedIds, selectedMatchups: orderedSelected, toggle };
}
