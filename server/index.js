import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// This server is intentionally "dumb": it holds no app state and does no
// aggregation. It exists only so the browser (a) never sees the ESPN
// cookies, and (b) never has to worry about CORS. All matchup/win-probability
// logic lives client-side in the React app.

function buildQueryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.append(key, value);
    }
  }
  return params.toString();
}

// Non-secret league list the client needs to know what to poll.
app.get('/api/config', (req, res) => {
  res.json({
    refreshIntervalSeconds: config.refreshIntervalSeconds || 30,
    eventThresholdPoints: config.eventThresholdPoints ?? 4,
    eventDurationSeconds: config.eventDurationSeconds ?? 10,
    summaryDurationSeconds: config.summaryDurationSeconds ?? 6,
    leagues: config.leagues.map((l) => ({
      id: `${l.platform}-${l.leagueId}`,
      platform: l.platform,
      leagueId: l.leagueId,
      season: l.season,
      name: l.name || `${l.platform} League ${l.leagueId}`,
    })),
  });
});

// Sleeper is a public API, but proxying keeps things CORS-safe and uniform.
app.get('/api/sleeper/*', async (req, res) => {
  const rest = req.params[0];
  const qs = buildQueryString(req.query);
  const url = `https://api.sleeper.app/v1/${rest}${qs ? `?${qs}` : ''}`;

  try {
    const upstream = await fetch(url);
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({ error: `Sleeper upstream request failed: ${err.message}` });
  }
});

// Sleeper's weekly projections live under a different (undocumented) path
// prefix than the rest of the v1 API.
app.get('/api/sleeper-projections/*', async (req, res) => {
  const rest = req.params[0];
  const qs = buildQueryString(req.query);
  const url = `https://api.sleeper.app/projections/${rest}${qs ? `?${qs}` : ''}`;

  try {
    const upstream = await fetch(url);
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({ error: `Sleeper projections request failed: ${err.message}` });
  }
});

// Same undocumented path family as projections, but for actual (live) stats.
app.get('/api/sleeper-stats/*', async (req, res) => {
  const rest = req.params[0];
  const qs = buildQueryString(req.query);
  const url = `https://api.sleeper.app/stats/${rest}${qs ? `?${qs}` : ''}`;

  try {
    const upstream = await fetch(url);
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({ error: `Sleeper stats request failed: ${err.message}` });
  }
});

// ESPN requires the espn_s2/SWID auth cookies, which must never reach the
// browser, so this route injects them server-side.
app.get('/api/espn/:leagueId', async (req, res) => {
  const { leagueId } = req.params;
  const { season, ...rest } = req.query;

  if (!season) {
    return res.status(400).json({ error: 'season query param is required' });
  }
  if (!config.espn || !config.espn.s2 || !config.espn.swid) {
    return res.status(500).json({ error: 'ESPN cookies are not configured in config.json' });
  }

  const qs = buildQueryString(rest);
  const url =
    `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}` +
    (qs ? `?${qs}` : '');

  try {
    const upstream = await fetch(url, {
      headers: {
        Cookie: `espn_s2=${config.espn.s2}; SWID=${config.espn.swid}`,
      },
    });
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({ error: `ESPN upstream request failed: ${err.message}` });
  }
});

const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const port = config.port || 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`FantasyCast proxy/server running on port ${port}`);
  if (!fs.existsSync(distPath)) {
    console.log('  No dist/ build found yet - run `npm run dev` for local development.');
  }
});
