const socket = io();

const els = {
  leagueName: document.getElementById('league-name'),
  weekLabel: document.getElementById('week-label'),
  aAvatar: document.getElementById('a-avatar'),
  aName: document.getElementById('a-name'),
  aRecord: document.getElementById('a-record'),
  aScore: document.getElementById('a-score'),
  bAvatar: document.getElementById('b-avatar'),
  bName: document.getElementById('b-name'),
  bRecord: document.getElementById('b-record'),
  bScore: document.getElementById('b-score'),
  updatedAt: document.getElementById('updated-at'),
  rotateIndicator: document.getElementById('rotate-indicator'),
};

let latestState = { matchups: [], selectedId: null, autoRotate: false, week: null, updatedAt: null };

function setTeam(prefix, team) {
  els[`${prefix}Name`].textContent = team.name;
  els[`${prefix}Record`].textContent = team.record || '';
  els[`${prefix}Score`].textContent = team.score.toFixed(2);
  const avatar = els[`${prefix}Avatar`];
  if (team.avatar) {
    avatar.src = team.avatar;
    avatar.classList.add('visible');
  } else {
    avatar.classList.remove('visible');
    avatar.removeAttribute('src');
  }
}

function render(state) {
  els.weekLabel.textContent = state.week ? `Week ${state.week}` : '';
  els.rotateIndicator.textContent = state.autoRotate ? 'AUTO-ROTATE' : '';
  els.updatedAt.textContent = state.updatedAt
    ? `Updated ${new Date(state.updatedAt).toLocaleTimeString()}`
    : '';

  const matchup = state.matchups.find((m) => m.id === state.selectedId);
  if (!matchup) {
    els.leagueName.textContent = state.matchups.length ? 'Select a matchup' : 'No matchups loaded';
    return;
  }

  els.leagueName.textContent = matchup.leagueName;
  setTeam('a', matchup.teamA);
  setTeam('b', matchup.teamB);
}

socket.on('state', (state) => {
  latestState = state;
  render(state);
});

document.addEventListener('keydown', (e) => {
  if (!latestState.matchups.length) return;
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

  const idx = latestState.matchups.findIndex((m) => m.id === latestState.selectedId);
  const len = latestState.matchups.length;
  const nextIdx = e.key === 'ArrowRight' ? (idx + 1) % len : (idx - 1 + len) % len;
  socket.emit('select', latestState.matchups[nextIdx].id);
});
