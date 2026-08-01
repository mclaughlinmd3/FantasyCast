# FantasyCast

A live fantasy football scoreboard for a second screen. Pulls matchup scores from
Sleeper and private ESPN leagues, and lets you pick which matchup to display -
or auto-rotate through all of them.

- **TV view** (`/tv.html`) - fullscreen scoreboard showing one matchup at a time.
- **Control view** (`/control.html`) - list of every matchup across all your
  leagues; click one to send it to the TV view. Toggle auto-rotate to cycle
  through every matchup automatically.

## 1. Install

Requires Node.js 18+.

```bash
npm install
```

## 2. Configure your leagues

Copy the example config and fill in your leagues:

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

5. Add each ESPN league, with the season year and the numeric league ID from
   the league's URL:

```json
{ "platform": "espn", "leagueId": "123456", "season": 2026, "name": "Office League" }
```

These cookies are tied to your ESPN login - treat `config.json` like a
password file. It's already in `.gitignore`, so `git status` should never
show it as a tracked or staged file.

## 3. Run it

```bash
npm start
```

The server prints the local URLs, e.g.:

```
FantasyCast running on port 3000
  TV view:      http://localhost:3000/tv.html
  Control view: http://localhost:3000/control.html
```

## 4. Set up the two screens

Since everything runs on one laptop with an external monitor:

1. Plug in the monitor and extend your desktop (not mirror) in your OS display settings.
2. Open a browser window to `http://localhost:3000/tv.html`, drag it onto the
   extra monitor, and press F11 (or your browser's fullscreen shortcut) to
   go fullscreen.
3. Open a second browser window on your laptop's own screen to
   `http://localhost:3000/control.html` and use it to pick matchups.
4. On the TV view itself, left/right arrow keys also switch matchups if you'd
   rather not touch the control page.

Because the server binds to your whole network, you can also open the
control page from your phone at `http://<your-laptop's-lan-ip>:3000/control.html`
if you want to switch games without touching the laptop.

## Notes

- Scores refresh from Sleeper/ESPN every `refreshIntervalSeconds` (default 20s).
- The current NFL week is detected automatically via Sleeper's public
  `state/nfl` endpoint, even for leagues that are ESPN-only.
- If a league fails to load (bad ID, expired ESPN cookies, etc.) it's skipped
  and logged to the server console rather than crashing the whole app - check
  the terminal running `npm start` if a league's matchups don't show up.
- ESPN's `espn_s2` cookie is long-lived but not permanent; if ESPN matchups
  stop loading later in the season, refresh the cookie value in `config.json`.
