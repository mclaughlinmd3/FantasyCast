import { useState } from 'react';
import { usePolling } from './hooks/usePolling.js';
import { useSelectedMatchups } from './hooks/useSelectedMatchups.js';
import Grid from './components/Grid.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import './App.css';

export default function App() {
  const { matchups, week, lastUpdated, error, loading } = usePolling();
  const { selectedIds, selectedMatchups, toggle } = useSelectedMatchups(matchups);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">FantasyCast</span>
        <span className="app-week">{week ? `Week ${week}` : ''}</span>
        <span className="app-updated">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}
        </span>
        <button
          className="settings-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Choose matchups"
        >
          &#9881;
        </button>
      </header>

      {error && (
        <div className="app-error">
          Couldn&apos;t load config.json - is the server running and set up? ({error})
        </div>
      )}
      {loading && !error && <div className="app-loading">Loading matchups&hellip;</div>}

      {!loading && !error && (
        <Grid matchups={selectedMatchups} onRemove={toggle} onOpenSettings={() => setSettingsOpen(true)} />
      )}

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
