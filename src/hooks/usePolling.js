import { useCallback, useEffect, useRef, useState } from 'react';
import * as sleeper from '../api/sleeper.js';
import * as espn from '../api/espn.js';
import { getTeamGameStatus, isGameLiveOrSoon } from '../api/nflSchedule.js';

const DEFAULT_REFRESH_SECONDS = 15;

function annotateActivePlayers(matchup, gameStatusByTeam) {
  const annotateTeam = (team) => ({
    ...team,
    starters: team.starters.map((p) => ({
      ...p,
      isActive: p.nflTeam ? isGameLiveOrSoon(gameStatusByTeam.get(p.nflTeam)) : false,
    })),
  });
  return { ...matchup, teamA: annotateTeam(matchup.teamA), teamB: annotateTeam(matchup.teamB) };
}

export function usePolling() {
  const [config, setConfig] = useState(null);
  const [matchups, setMatchups] = useState([]);
  const [week, setWeek] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const weekRef = useRef(null);

  const fetchAll = useCallback(async (leagues) => {
    try {
      weekRef.current = await sleeper.getCurrentWeek();
      setWeek(weekRef.current);
    } catch (err) {
      console.error('Failed to detect current NFL week, reusing previous value:', err.message);
      if (!weekRef.current) return; // nothing to fall back to yet, skip this cycle
    }
    const currentWeek = weekRef.current;

    const [perLeagueResults, gameStatusByTeam] = await Promise.all([
      Promise.all(
        leagues.map(async (league) => {
          try {
            if (league.platform === 'sleeper') {
              return await sleeper.getLeagueMatchups(league, currentWeek);
            }
            if (league.platform === 'espn') {
              return await espn.getLeagueMatchups(league, currentWeek);
            }
            console.error(`Unknown platform "${league.platform}" for league ${league.leagueId}`);
            return [];
          } catch (err) {
            console.error(`Failed to fetch league ${league.name}:`, err.message);
            return null; // null = keep whatever we had for this league last cycle
          }
        })
      ),
      getTeamGameStatus(),
    ]);

    setMatchups((prev) => {
      const flattened = [];
      leagues.forEach((league, idx) => {
        const leagueResult = perLeagueResults[idx];
        if (leagueResult === null) {
          flattened.push(
            ...prev.filter((m) => m.leagueId === league.leagueId && m.platform === league.platform)
          );
        } else {
          flattened.push(...leagueResult.map((m) => annotateActivePlayers(m, gameStatusByTeam)));
        }
      });
      return flattened;
    });

    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    let intervalId;
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        const cfg = await res.json();
        if (cancelled) return;
        setConfig(cfg);
        await fetchAll(cfg.leagues);
        if (cancelled) return;
        setLoading(false);
        const intervalMs = (cfg.refreshIntervalSeconds || DEFAULT_REFRESH_SECONDS) * 1000;
        intervalId = setInterval(() => fetchAll(cfg.leagues), intervalMs);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchAll]);

  return {
    matchups,
    week,
    lastUpdated,
    error,
    loading,
    leagues: config?.leagues || [],
    eventThresholdPoints: config?.eventThresholdPoints,
    eventDurationSeconds: config?.eventDurationSeconds,
    summaryDurationSeconds: config?.summaryDurationSeconds,
  };
}
