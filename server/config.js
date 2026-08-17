import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '..', 'config.json');

if (!fs.existsSync(configPath)) {
  console.error(
    'Missing config.json. Copy config.example.json to config.json and fill in your league details.'
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

if (!Array.isArray(config.leagues) || config.leagues.length === 0) {
  console.error('config.json must include at least one league in "leagues".');
  process.exit(1);
}

const hasEspnLeague = config.leagues.some((l) => l.platform === 'espn');
if (hasEspnLeague && (!config.espn || !config.espn.s2 || !config.espn.swid)) {
  console.error(
    'config.json has an ESPN league but is missing espn.s2 / espn.swid cookie values.'
  );
  process.exit(1);
}

export default config;
