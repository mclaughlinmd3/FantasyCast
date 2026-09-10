# FantasyCast

A live fantasy football scoreboard for a second screen. Shows up to 4
matchups at once - team names, live scores, and each team's currently-active
players - pulled from Sleeper and private ESPN leagues.

## How it's built

- **`src/`** - a single-page React app (built with Vite) that does all the
  polling and normalization client-side. No app state lives on the server.
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

## Good guys / bad guys

Click the settings gear and open "Your teams" to mark which teams are
yours (and your roommates') across any league. A matchup where exactly one
side is marked colors that side green and the opponent red; a matchup
where both or neither side is marked (e.g. two roommates playing each
other) stays the neutral green/blue split. This applies everywhere - the
grid, the event takeover, and the matchup summary - and the green side is
always shown on the left in all three places, regardless of whether it
happens to be the platform's "team A" or "team B" for that matchup.

## Active players

Each matchup card shows up to 5 currently-active players per team (sorted
by live points, so the top performers show first if more than 5 are
playing), filling the space below the score instead of leaving it empty.
When the ranking changes between polls, players smoothly slide to their
new position instead of snapping (see `src/hooks/useFlipList.js`).
"Active" means their real NFL game is currently in progress, or kicks off
within the next 15 minutes - fantasy point totals alone can't tell a bye
week or "hasn't played yet" from "playing right now," so this is pulled
from ESPN's separate public game-schedule API (unauthenticated, not the
fantasy API) and matched to each player by their NFL team. Only rostered
starters are ever shown - bench/IR players are excluded before this check
even applies (Sleeper's own `starters` list, ESPN's non-bench lineup
slots). Before any game is live or imminent, or for players not currently
in that window, the card shows "No active players" for that team rather
than guessing.

Each active player shows a photo (falls back to initials if it fails to
load), name, live points, and - for Sleeper players only - a short
position-aware stat line (e.g. "8 REC · 112 YD · 1 TD" for a receiver,
"267 YD · 2 TD · 1 INT" for a QB). ESPN doesn't get a stat line for the
same reason it doesn't get play-type headlines (see below); it still
shows photo/name/points. Team defenses (DEF) don't have individual
headshots, so they show their NFL team's crest instead (from ESPN's
public logo CDN, unauthenticated - independent of which platform the
defense's league is on).

Each team's actual fantasy team logo/avatar shows too - Sleeper's
user-uploaded avatar, or ESPN's team logo - falling back to the team's
initials if it doesn't have one set or the image fails to load. On the
grid card it's a small icon flanking the "VS" divider rather than sized
above the team name, so it doesn't take space away from the name/score
or the active-players list below it; on the matchup summary screen
(more room to spare) it sits above the team name.

**Before the season starts** there's nothing to show here - real players
only count as "active" once their actual NFL game is underway, so this
section legitimately shows "No active players" and 0.00 scores until then.
To check that the layout/photos/stat lines actually work without waiting
for a live game, click "Simulate active players" in the header - it
forces your real starters to show as active (using their real, currently
0, stats) without touching any actual data. Click it again to turn it
off.

## Known rough edges

- **ESPN player-level data is reverse-engineered.** ESPN has no public API
  docs. Team names, records, and total scores are solid, but if
  projected/live *player* points don't populate for an ESPN matchup, the
  "still to play" list in the matchup-summary screen just comes up empty
  for that matchup - the rest of the app still works. Flag it if you hit
  this and the parsing in `src/api/espn.js` can be adjusted.
- **Sleeper projections come from an undocumented endpoint.** If it ever
  changes shape, projections silently stop populating rather than crashing
  the app (same empty-list fallback as above).
- **ESPN's NFL-team mapping (for the active-players feature) is also
  best-effort**, reconstructed from memory since ESPN doesn't document it.
  If ESPN players never show as "active" even during a live game, this
  mapping (`PRO_TEAMS` in `src/api/espn.js`) is the first place to check.
- A league that fails to fetch on a given poll (bad ID, expired ESPN
  cookie, transient network blip) is skipped for that cycle and logged to
  the browser console - it doesn't take down the other leagues.

## Event takeover

Every poll (every 15s by default - `refreshIntervalSeconds` in
`config.json` controls this), the app diffs each displayed matchup's
starters against the previous poll. Any starter whose live points jumped
by the threshold (default 4, see below) queues an event - except that for
QB/RB/WR/TE, routine yardage/reception accumulation (no touchdown or
turnover involved) needs *double* the threshold to queue, so a 1-point completion
or a 10-yard carry doesn't trigger a full-screen takeover the way an
actual touchdown does.

On top of that, a handful of specific plays always queue an event
regardless of how small the point swing is: any catch over 15 yards, any
run over 9 yards, any completed pass over 10 yards, and any first down.
These are approximated from the change in a raw stat category between
two polls (Sleeper reports cumulative totals, not individual plays), so
two smaller plays of the same type landing in the same poll window read
as one combined value rather than two separate ones - a reasonable
proxy, not exact play-by-play detection. First-down stats in particular
aren't as consistently documented as the scoring categories, so that
trigger may not fire for every league.

All of this - the routine-yardage double threshold and the explicit
play triggers alike - only applies to Sleeper players, since it relies
on the same raw per-category stats used for play-type detection (see
below). TDs, turnovers, and defensive/special-teams plays always use the
normal threshold, on any platform. When the grid is idle, the
highest-point-swing event in the queue takes over the screen:

1. **~5s player takeover** - a punchy pop-in animation, play-type
   headline (e.g. "RECEIVING TOUCHDOWN", Sleeper only for now - see
   below), point swing, player photo/name, and a big team-name callout
   color-matched to that team's side of the matchup, plus a compact score
   line for the whole matchup - kept live for the whole time it's on
   screen, not frozen at the moment the play happened.
2. **~3s matchup summary** - full score plus who's still left to play on
   each team, also kept live.
3. Back to the grid.

If more events land while one is playing, they queue and play in order
(biggest swing first) instead of being dropped. If the queue still has
events waiting when a player takeover finishes, it skips straight to the
next takeover instead of also playing the summary screen in between - so
a burst of real scoring plays doesn't stack up full-length cycles and
keep the screen away from the live grid for a long stretch. The settings
gear is always on screen (even mid-takeover) so the 4 displayed matchups
can be changed at any time, not just while looking at the grid - and the
settings list shows each matchup's live score so it's easy to see what's
actually close before picking.

The grid itself stays mounted (just visually hidden) behind the takeover
screens rather than unmounting, so the active-players list still has its
last-known positions on hand and animates the reorder the instant it's
visible again, instead of that first reorder after a takeover silently
snapping into place.

**Tuning the feel**: three optional `config.json` fields control this,
all with sane defaults if omitted:

```json
"eventThresholdPoints": 4,
"eventDurationSeconds": 5,
"summaryDurationSeconds": 3
```

Lower the threshold to catch smaller plays (e.g. a long completion without
a TD), or raise it to only interrupt for the biggest swings. Adjust the
durations to taste.

**Preview button**: since real scoring events require a live game, click
"Preview event" in the header any time to fire a synthetic one. It only
ever picks from players currently shown in the active-players list on the
grid (combine with "Simulate active players" to have candidates before any
real game is live) - falling back to built-in demo data if nothing
currently displayed has any active players - so the player it picks is
always one you can actually watch. The point swing itself isn't applied to
the grid until the takeover/summary screens finish and it's back on
screen, so the active-players reorder plays out for real right as you're
looking at it, instead of already having happened out of sight - a good
way to check the reorder animation (`src/hooks/useFlipList.js`) is working
without waiting for a real game.

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
