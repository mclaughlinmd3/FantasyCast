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

// Forwards an upstream response as JSON - but actually checks it's JSON
// first. Blindly relabeling everything as application/json (the previous
// behavior) meant an upstream auth failure or error page (often HTML) got
// forwarded as if it were valid data, and the client's JSON.parse failure
// ("Unexpected token '<'") gave no clue what actually went wrong.
async function forwardJson(upstream, res, label, hint) {
  const contentType = upstream.headers.get('content-type') || '';
  const body = await upstream.text();

  if (!contentType.includes('application/json')) {
    console.error(
      `${label} returned non-JSON (status ${upstream.status}, content-type "${contentType}"): ${body.slice(0, 300)}`
    );
    res.status(502).json({
      error:
        `${label} returned an unexpected non-JSON response (status ${upstream.status}).` +
        (hint ? ` ${hint}` : ''),
    });
    return;
  }

  res.status(upstream.status).type('application/json').send(body);
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
      // Leave unset if config.json doesn't name it - the client falls back
      // to the league's real name fetched from Sleeper/ESPN, and only to a
      // generic placeholder if even that comes back empty. Resolving the
      // placeholder here would always win over the real name client-side.
      name: l.name || null,
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
    await forwardJson(upstream, res, 'Sleeper');
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
    await forwardJson(upstream, res, 'Sleeper projections');
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
    await forwardJson(upstream, res, 'Sleeper stats');
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
  // ESPN split read traffic off to this subdomain at some point; the older
  // fantasy.espn.com/apis/v3/... host now appears to serve its normal
  // website (HTML, status 200) for this path instead of the API response.
  const url =
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}` +
    (qs ? `?${qs}` : '');

  try {
    const upstream = await fetch(url, {
      headers: {
        Cookie: `espn_s2=${config.espn.s2}; SWID=${config.espn.swid}`,
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    await forwardJson(
      upstream,
      res,
      'ESPN',
      'This usually means the espn_s2/SWID cookies are wrong/expired, or the leagueId/season is wrong - double check config.json.'
    );
  } catch (err) {
    res.status(502).json({ error: `ESPN upstream request failed: ${err.message}` });
  }
});

// ESPN's public (non-fantasy, no-auth) scoreboard API - used only to know
// which NFL games are currently in progress, so the grid can show "active"
// players. Different host/API entirely from the fantasy endpoints above.
app.get('/api/nfl-scoreboard', async (req, res) => {
  try {
    const upstream = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
    );
    await forwardJson(upstream, res, 'NFL scoreboard');
  } catch (err) {
    res.status(502).json({ error: `NFL scoreboard request failed: ${err.message}` });
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
