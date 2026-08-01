const sleeper = require('./platforms/sleeper');
const espn = require('./platforms/espn');

async function fetchAllMatchups(config, previousWeek) {
  let week = previousWeek || 1;
  try {
    week = await sleeper.getCurrentWeek();
  } catch (err) {
    console.error('Failed to detect current NFL week, reusing previous value:', err.message);
  }

  const results = [];

  for (const league of config.leagues) {
    try {
      if (league.platform === 'sleeper') {
        results.push(...(await sleeper.getLeagueMatchups(league.leagueId, week)));
      } else if (league.platform === 'espn') {
        const season = league.season || new Date().getFullYear();
        results.push(...(await espn.getLeagueMatchups({ ...league, season }, week, config.espn)));
      } else {
        console.error(`Unknown platform "${league.platform}" for league ${league.leagueId}`);
      }
    } catch (err) {
      console.error(`Failed to fetch league ${league.name || league.leagueId}:`, err.message);
    }
  }

  return { week, matchups: results };
}

module.exports = { fetchAllMatchups };
