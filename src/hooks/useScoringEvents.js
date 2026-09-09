import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectScoringEvents,
  DEFAULT_SIGNIFICANT_DELTA,
  DEFAULT_EVENT_DURATION_MS,
  DEFAULT_SUMMARY_DURATION_MS,
} from '../eventDetection.js';

const MAX_QUEUE = 10; // defensive cap, not expected to matter in normal use

export function useScoringEvents(matchups, selectedIds, options = {}) {
  const thresholdPoints = options.thresholdPoints ?? DEFAULT_SIGNIFICANT_DELTA;
  const eventDurationMs = options.eventDurationMs ?? DEFAULT_EVENT_DURATION_MS;
  const summaryDurationMs = options.summaryDurationMs ?? DEFAULT_SUMMARY_DURATION_MS;

  const prevMatchupsRef = useRef(new Map());
  const [queue, setQueue] = useState([]);
  const [phase, setPhase] = useState('grid'); // 'grid' | 'event' | 'summary'
  const [current, setCurrent] = useState(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Detect new events whenever a fresh poll lands, then update the
  // baseline snapshot (for every matchup, not just selected ones, so
  // swapping a matchup into the grid can start generating events on its
  // very next poll instead of needing to "warm up" first).
  useEffect(() => {
    if (matchups.length === 0) return;
    const newEvents = detectScoringEvents(
      prevMatchupsRef.current,
      matchups,
      selectedIds,
      thresholdPoints
    );
    if (newEvents.length > 0) {
      setQueue((q) => [...q, ...newEvents].sort((a, b) => b.delta - a.delta).slice(0, MAX_QUEUE));
    }
    prevMatchupsRef.current = new Map(matchups.map((m) => [m.id, m]));
    // Only re-run when a new poll actually lands, not on every selection/threshold change.
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

  // Advance event -> summary -> grid on a timer. If more events are already
  // queued up by the time this one's takeover finishes, skip straight back
  // to 'grid' (which immediately pops the next event, below) instead of
  // also playing the summary screen - otherwise a burst of scores in a
  // short window stacks up full event+summary cycles and keeps the screen
  // away from the live grid for a long stretch.
  useEffect(() => {
    if (phase === 'event') {
      const t = setTimeout(() => {
        setPhase(queueRef.current.length > 0 ? 'grid' : 'summary');
      }, eventDurationMs);
      return () => clearTimeout(t);
    }
    if (phase === 'summary') {
      const t = setTimeout(() => {
        setPhase('grid');
        setCurrent(null);
      }, summaryDurationMs);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, eventDurationMs, summaryDurationMs]);

  const injectEvent = useCallback((event) => {
    setQueue((q) => [...q, event]);
  }, []);

  return { phase, currentEvent: current, queueLength: queue.length, injectEvent };
}
