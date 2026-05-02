import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchLineUp, fetchLeagueCoverage } from '../Utils/apiFootball';
import { SEASONS } from '../Config/leagues';

// Status: 'idle' | 'checking' | 'no-coverage' | 'pending' | 'partial' | 'ready'
export function useLineup(fixtureId, { leagueId, fixtureDate, auto = true } = {}) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [lastUpdated, setLastUpdated] = useState(null);
  const coverageRef = useRef(null);
  const pollRef = useRef(null);

  const computePhase = useCallback(() => {
    if (!fixtureDate) return 'unknown';
    const kickoff = new Date(fixtureDate).getTime();
    const now = Date.now();
    return kickoff - now; // ms until kickoff (negative after start)
  }, [fixtureDate]);

  const chooseInterval = useCallback(() => {
    const delta = computePhase();
    if (delta > 90 * 60 * 1000) return 15 * 60 * 1000; // >90m away: 15m
    if (delta > 60 * 60 * 1000) return 5 * 60 * 1000;  // 60-90m: 5m
    if (delta > 40 * 60 * 1000) return 2 * 60 * 1000;  // 40-60m: 2m
    if (delta > 15 * 60 * 1000) return 60 * 1000;      // 15-40m: 1m
    if (delta > -10 * 60 * 1000) return 30 * 1000;     // -10m to kickoff: 30s
    return 2 * 60 * 1000; // after start: slow down (stats more important)
  }, [computePhase]);

  const fetchOnce = useCallback(async () => {
    if (!fixtureId) return;
    try {
      if (coverageRef.current === null && leagueId) {
        setStatus('checking');
        // Attempt seasons list for coverage until found
        let covered = false;
        for (const year of SEASONS) {
          const cov = await fetchLeagueCoverage(leagueId, year).catch(()=>({ lineups:false }));
            if (cov.lineups) { covered = true; break; }
        }
        coverageRef.current = covered;
        if (!covered) { setStatus('no-coverage'); return; }
      }
      const rows = await fetchLineUp(fixtureId);
      if (!rows || !rows.length) {
        setStatus('pending');
        return;
      }
      if (rows.length < 2) {
        setData(rows);
        setStatus('partial');
        setLastUpdated(Date.now());
        return;
      }
      // Full lineup
      setData(rows);
      setStatus('ready');
      setLastUpdated(Date.now());
    } catch (e) {
      // Keep previous state; treat as transient
    }
  }, [fixtureId, leagueId]);

  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      const interval = chooseInterval();
      pollRef.current = setTimeout(async () => {
        await fetchOnce();
        schedule();
      }, interval);
    };
    fetchOnce().then(schedule);
    return () => { cancelled = true; if (pollRef.current) clearTimeout(pollRef.current); };
  }, [fetchOnce, chooseInterval, auto]);

  return { lineup: data, status, lastUpdated, refresh: fetchOnce };
}

export default useLineup;