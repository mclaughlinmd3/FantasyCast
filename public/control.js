const socket = io();
const listEl = document.getElementById('matchup-list');
const weekLabel = document.getElementById('week-label');
const rotateCheckbox = document.getElementById('rotate-checkbox');

let suppressRotateEvent = false;

rotateCheckbox.addEventListener('change', () => {
  if (suppressRotateEvent) {
    suppressRotateEvent = false;
    return;
  }
  socket.emit('toggle-rotate');
});

function span(className, text) {
  const el = document.createElement('span');
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function buildMatchupCard(matchup, selectedId) {
  const card = document.createElement('button');
  card.className = 'matchup-card';
  if (matchup.id === selectedId) card.classList.add('selected');

  card.appendChild(span('team-name', matchup.teamA.name));
  card.appendChild(span('score', matchup.teamA.score.toFixed(2)));
  card.appendChild(span('sep', 'vs'));
  card.appendChild(span('score', matchup.teamB.score.toFixed(2)));
  card.appendChild(span('team-name', matchup.teamB.name));

  card.addEventListener('click', () => socket.emit('select', matchup.id));
  return card;
}

function render(state) {
  weekLabel.textContent = state.week ? `Week ${state.week}` : 'Loading...';

  suppressRotateEvent = true;
  rotateCheckbox.checked = state.autoRotate;

  listEl.innerHTML = '';

  if (!state.matchups.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No matchups loaded yet. Check the server logs for league fetch errors.';
    listEl.appendChild(empty);
    return;
  }

  const byLeague = new Map();
  for (const m of state.matchups) {
    if (!byLeague.has(m.leagueName)) byLeague.set(m.leagueName, []);
    byLeague.get(m.leagueName).push(m);
  }

  for (const [leagueName, matchups] of byLeague) {
    const section = document.createElement('div');
    section.className = 'league-section';

    const heading = document.createElement('h2');
    heading.textContent = leagueName;
    section.appendChild(heading);

    for (const m of matchups) {
      section.appendChild(buildMatchupCard(m, state.selectedId));
    }
    listEl.appendChild(section);
  }
}

socket.on('state', render);
