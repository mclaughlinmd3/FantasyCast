import { useCallback, useEffect, useRef, useState } from 'react';
import { detectScoringEvents, EVENT_DURATION_MS, SUMMARY_DURATION_MS } from '../eventDetection.js';

const MAX_QUEUE = 10; // defensive cap, not expected to matter in normal use

export function useScoringEvents(matchups, selectedIds) {
  const prevMatchupsRef = useRef(new Map());
  const [queue, setQueue] = useState([]);
  const [phase, setPhase] = useState('grid'); // 'grid' | 'event' | 'summary'
  const [current, setCurrent] = useState(null);

  // Detect new events whenever a fresh poll lands, then update the
  // baseline snapshot (for every matchup, not just selected ones, so
  // swapping a matchup into the grid can start generating events on its
  // very next poll instead of needing to "warm up" first).
  useEffect(() => {
    if (matchups.length === 0) return;
    const newEvents = detectScoringEvents(prevMatchupsRef.current, matchups, selectedIds);
    if (newEvents.length > 0) {
      setQueue((q) => [...q, ...newEvents].sort((a, b) => b.delta - a.delta).slice(0, MAX_QUEUE));
    }
    prevMatchupsRef.current = new Map(matchups.map((m) => [m.id, m]));
    // Only re-run when a new poll actually lands, not on every selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchups]);

  // Pop the next queued event whenever we're idle on the grid.
  useEffect(() => {
    if (phase === 'grid' && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrent(next);
      setPhase('event');
    }
  }, [phase, queue]);

  // Advance event -> summary -> grid on a timer.
  useEffect(() => {
    if (phase === 'event') {
      const t = setTimeout(() => setPhase('summary'), EVENT_DURATION_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'summary') {
      const t = setTimeout(() => {
        setPhase('grid');
        setCurrent(null);
      }, SUMMARY_DURATION_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase]);

  const injectEvent = useCallback((event) => {
    setQueue((q) => [...q, event]);
  }, []);

  return { phase, currentEvent: current, queueLength: queue.length, injectEvent };
}
