import { useState } from 'react';
import { usePolling } from './hooks/usePolling.js';
import { useSelectedMatchups } from './hooks/useSelectedMatchups.js';
import { useScoringEvents } from './hooks/useScoringEvents.js';
import { createPreviewEvent } from './demoData.js';
import Grid from './components/Grid.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import EventTakeover from './components/EventTakeover.jsx';
import MatchupSummary from './components/MatchupSummary.jsx';
import './App.css';

export default function App() {
  const { matchups, week, lastUpdated, error, loading } = usePolling();
  const { selectedIds, selectedMatchups, toggle } = useSelectedMatchups(matchups);
  const { phase, currentEvent, injectEvent } = useScoringEvents(matchups, selectedIds);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
            className="preview-btn"
            onClick={() => injectEvent(createPreviewEvent(matchups, selectedIds))}
            title="Preview the scoring-event takeover with sample data"
          >
            Preview event
          </button>
          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Choose matchups"
          >
            &#9881;
          </button>
        </header>
      )}

      {error && (
        <div className="app-error">
          Couldn&apos;t load config.json - is the server running and set up? ({error})
        </div>
      )}
      {loading && !error && <div className="app-loading">Loading matchups&hellip;</div>}

      {!loading && !error && phase === 'grid' && (
        <Grid
          matchups={selectedMatchups}
          onRemove={toggle}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {phase === 'event' && currentEvent && <EventTakeover event={currentEvent} />}
      {phase === 'summary' && currentEvent && <MatchupSummary matchup={currentEvent.matchup} />}

      {settingsOpen && (
        <SettingsPanel
          matchups={matchups}
          selectedIds={selectedIds}
          onToggle={toggle}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
