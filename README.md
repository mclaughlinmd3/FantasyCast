# FantasyCast

A live fantasy football scoreboard for a second screen. Shows up to 4
matchups at once - team names, live scores, and a win-probability bar
computed from current score plus each team's remaining projected points -
pulled from Sleeper and private ESPN leagues.

## How it's built

- **`src/`** - a single-page React app (built with Vite) that does all the
  polling, normalization, and win-probability math client-side. No app
  state lives on the server.
- **`server/`** - a deliberately thin Express server. It exists only to (a)
  keep your ESPN login cookies out of the browser, and (b) avoid any CORS
  issues, by proxying `/api/sleeper/*` and `/api/espn/:leagueId` to the
  real APIs. It serves the built app in production too.

## 1. Install

Requires Node.js 18+.

```bash
npm install
```

## 2. Configure your leagues

```bash
cp config.example.json config.json
```

`config.json` is git-ignored - it holds your league IDs and (for ESPN) your
personal login cookies, so it never gets committed.

### Sleeper leagues

No auth needed. Find your league ID in the Sleeper app/website URL, e.g.
`sleeper.com/leagues/123456789012345678/...` -> that number is the `leagueId`.

```json
{ "platform": "sleeper", "leagueId": "123456789012345678", "name": "My League" }
```

### ESPN leagues (private)

Private ESPN leagues need two cookie values from your browser session:

1. Log in to your league at fantasy.espn.com.
2. Open browser DevTools -> Application (Chrome) or Storage (Firefox) -> Cookies -> `https://fantasy.espn.com`.
3. Copy the values of the `espn_s2` and `SWID` cookies (SWID includes the
   curly braces, e.g. `{ABCD1234-...}`).
4. Put them once in the top-level `espn` block of `config.json` - the same
   cookies work for every private ESPN league your account belongs to:

```json
"espn": {
  "s2": "paste espn_s2 value here",
  "swid": "{paste SWID value here}"
}
```

5. Add each ESPN league, with the season year and numeric league ID from
   the league's URL:

```json
{ "platform": "espn", "leagueId": "123456", "season": 2026, "name": "Office League" }
```

Treat `config.json` like a password file - it's already in `.gitignore`.
These cookies are long-lived but not permanent; if ESPN matchups stop
loading later in the season, refresh the values.

## 3. Run it

**Development** (hot reload, runs the Vite dev server + API proxy together):

```bash
npm run dev
```

Open `http://localhost:5173`.

**Production-ish** (single command, builds then serves everything from one
port - closer to what you'd actually leave running on the display laptop):

```bash
npm start
```

Open `http://localhost:4000`.

## 4. Set up the display

1. Plug in the extra monitor and extend your desktop (not mirror) in your
   OS display settings.
2. Open the app in a browser window, drag it onto the extra monitor, and
   press F11 (or your browser's fullscreen shortcut).
3. Click the gear icon to choose which 4 matchups (across all your leagues)
   show in the grid. Your picks are saved in the browser (`localStorage`),
   so they persist across reloads. Each card also has an `x` to quickly
   pull it out of the grid.

## How win probability is calculated

For each team: `estimated final = current score + sum of (projected - live)
for each starter who hasn't yet matched their projection`. That gap between
the two teams' estimated finals is run through a logistic curve whose
steepness relaxes as fewer starters are still "in doubt" - a big early lead
reads as close, a small lead with nobody left to play reads as
near-certain. It's a glanceable estimate for a TV screen, not a rigorous
model (see `src/winProbability.js`).

## Known rough edges

- **ESPN player-level data is reverse-engineered.** ESPN has no public API
  docs. Team names, records, and total scores are solid, but if
  projected/live *player* points don't populate for an ESPN matchup, the
  win-probability bar just falls back to being score-only for that
  matchup - the rest of the app still works. Flag it if you hit this and
  the parsing in `src/api/espn.js` can be adjusted.
- **Sleeper projections come from an undocumented endpoint.** If it ever
  changes shape, projections silently stop populating rather than crashing
  the app (same score-only fallback as above).
- A league that fails to fetch on a given poll (bad ID, expired ESPN
  cookie, transient network blip) is skipped for that cycle and logged to
  the browser console - it doesn't take down the other leagues.

## Event takeover

Every poll, the app diffs each displayed matchup's starters against the
previous poll. Any starter whose live points jumped by 4+ (`SIGNIFICANT_DELTA`
in `src/eventDetection.js`) queues an event. When the grid is idle, the
highest-point-swing event in the queue takes over the screen:

1. **~10s player takeover** - play-type headline (e.g. "RECEIVING
   TOUCHDOWN", Sleeper only for now - see below), point swing, player
   photo/name, and a big team-name callout color-matched to that team's
   side of the matchup, plus a compact score line for the whole matchup.
2. **~6s matchup summary** - full score plus who's still left to play on
   each team.
3. Back to the grid.

If more events land while one is playing, they queue and play in order
(biggest swing first) instead of being dropped. The settings gear is
always on screen (even mid-takeover) so the 4 displayed matchups can be
changed at any time, not just while looking at the grid.

**Preview button**: since real scoring events require a live game, click
"Preview event" in the header any time to fire a synthetic one - it uses a
real starter from one of your currently-selected matchups if data is
loaded, or built-in demo data if not, so you can see and tune the whole
flow before the season starts.

## Play-type detection (Sleeper only, for now)

For Sleeper players, the app also fetches raw per-category stats (another
undocumented endpoint, same caveats as projections) and the league's
scoring weights, then figures out which stat category contributed the
most points to a jump - e.g. a TD catch shows up as both `rec` and
`rec_td`, and the touchdown's higher point value wins, so it's correctly
labeled "Receiving Touchdown" rather than "Reception."

ESPN's equivalent uses a numeric stat-ID scheme that isn't reliably
reconstructable without live data to check against, so ESPN events
currently skip the play-type headline entirely and just show the point
swing - safer than risking a wrong label. Once you've got real ESPN data
next week, this is the first thing worth verifying so that mapping can be
filled in.

## Known limitations

- Event detection only watches the 4 currently-displayed matchups, not
  every matchup across all your leagues - swap a matchup into the grid and
  its scoring starts counting on the next poll after that.
- There's no persistent history across a full-page reload, so a big play
  that happened right before you reload the page won't retroactively
  trigger a takeover.
- Play-type headlines only appear for Sleeper events (see above).
