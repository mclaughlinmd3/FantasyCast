import { useState } from 'react';
import { usePolling } from './hooks/usePolling.js';
import { useSelectedMatchups } from './hooks/useSelectedMatchups.js';
import { useScoringEvents } from './hooks/useScoringEvents.js';
import { useGoodGuys } from './hooks/useGoodGuys.js';
import { createPreviewEvent } from './demoData.js';
import { simulateActivePlayers } from './simulateActivePlayers.js';
import Grid from './components/Grid.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import EventTakeover from './components/EventTakeover.jsx';
import MatchupSummary from './components/MatchupSummary.jsx';
import './App.css';

export default function App() {
  const {
    matchups,
    week,
    lastUpdated,
    error,
    loading,
    eventThresholdPoints,
    eventDurationSeconds,
    summaryDurationSeconds,
  } = usePolling();
  const { selectedIds, selectedMatchups, toggle } = useSelectedMatchups(matchups);
  const { goodGuyIds, toggle: toggleGoodGuy } = useGoodGuys();
  const { phase, currentEvent, injectEvent } = useScoringEvents(matchups, selectedIds, {
    thresholdPoints: eventThresholdPoints,
    eventDurationMs: eventDurationSeconds != null ? eventDurationSeconds * 1000 : undefined,
    summaryDurationMs: summaryDurationSeconds != null ? summaryDurationSeconds * 1000 : undefined,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [simulateActive, setSimulateActive] = useState(false);
  const gridMatchups = simulateActive ? simulateActivePlayers(selectedMatchups) : selectedMatchups;

  // The event/summary screens capture a snapshot of the matchup at the
  // moment the event fired (needed so the triggering player's before/after
  // stats stay consistent) - but scores keep changing while that screen is
  // up, so look up the current live matchup by id to display instead of the
  // stale snapshot. Falls back to the snapshot for synthetic preview/demo
  // events that don't exist in real polling data.
  const liveMatchupFor = (event) => matchups.find((m) => m.id === event.matchupId) || event.matchup;

  return (
    <div className="app">
      {phase === 'grid' && (
        <header className="app-header">
          <span className="app-title">FantasyCast</span>
          <span className="app-week">{week ? `Week ${week}` : ''}</span>
          <span className="app-updated">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}
          </span>
          <button
            className={`preview-btn${simulateActive ? ' preview-btn-active' : ''}`}
            onClick={() => setSimulateActive((v) => !v)}
            title="Pretend every displayed starter is currently playing, to preview the active-players list before real games start"
          >
            {simulateActive ? 'Simulating active players' : 'Simulate active players'}
          </button>
          <button
            className="preview-btn"
            onClick={() => injectEvent(createPreviewEvent(matchups, selectedIds))}
            title="Preview the scoring-event takeover with sample data"
          >
            Preview event
          </button>
        </header>
      )}

      {/* Always available, even mid-takeover, so matchups can be swapped any time. */}
      <button
        className="settings-btn settings-btn-floating"
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
        title="Choose matchups"
      >
        &#9881;
      </button>

      {error && (
        <div className="app-error">
          Couldn&apos;t load config.json - is the server running and set up? ({error})
        </div>
      )}
      {loading && !error && <div className="app-loading">Loading matchups&hellip;</div>}

      {!loading && !error && (
        <div className="stage">
          {/* Stays mounted (just hidden) during a takeover instead of
              unmounting, so the active-players reorder animation keeps its
              last-known positions and can animate the moment it's visible
              again, instead of losing its baseline on every remount. */}
          <div className={`grid-stage${phase !== 'grid' ? ' grid-stage-hidden' : ''}`}>
            <Grid
              matchups={gridMatchups}
              onRemove={toggle}
              onOpenSettings={() => setSettingsOpen(true)}
              goodGuyIds={goodGuyIds}
            />
          </div>
          {phase === 'event' && currentEvent && (
            <EventTakeover
              event={{ ...currentEvent, matchup: liveMatchupFor(currentEvent) }}
              goodGuyIds={goodGuyIds}
            />
          )}
          {phase === 'summary' && currentEvent && (
            <MatchupSummary matchup={liveMatchupFor(currentEvent)} goodGuyIds={goodGuyIds} />
          )}
        </div>
      )}

      {settingsOpen && (
        <SettingsPanel
          matchups={matchups}
          selectedIds={selectedIds}
          onToggle={toggle}
          goodGuyIds={goodGuyIds}
          onToggleGoodGuy={toggleGoodGuy}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
