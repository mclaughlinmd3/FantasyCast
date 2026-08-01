const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const { fetchAllMatchups } = require('./aggregate');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

const state = {
  week: null,
  matchups: [],
  selectedId: null,
  autoRotate: false,
  updatedAt: null,
};

let rotateTimer = null;

function broadcastState() {
  io.emit('state', state);
}

async function refresh() {
  try {
    const { week, matchups } = await fetchAllMatchups(config, state.week);
    state.week = week;
    state.matchups = matchups;
    state.updatedAt = new Date().toISOString();

    const stillExists = state.selectedId && matchups.some((m) => m.id === state.selectedId);
    if (!stillExists) {
      state.selectedId = matchups[0]?.id || null;
    }

    broadcastState();
  } catch (err) {
    console.error('Refresh failed:', err);
  }
}

function stopRotate() {
  if (rotateTimer) clearInterval(rotateTimer);
  rotateTimer = null;
}

function startRotate() {
  stopRotate();
  const intervalMs = (config.rotateIntervalSeconds || 15) * 1000;
  rotateTimer = setInterval(() => {
    if (!state.matchups.length) return;
    const idx = state.matchups.findIndex((m) => m.id === state.selectedId);
    const next = state.matchups[(idx + 1) % state.matchups.length];
    state.selectedId = next.id;
    broadcastState();
  }, intervalMs);
}

io.on('connection', (socket) => {
  socket.emit('state', state);

  socket.on('select', (matchupId) => {
    if (!state.matchups.some((m) => m.id === matchupId)) return;
    state.selectedId = matchupId;
    state.autoRotate = false;
    stopRotate();
    broadcastState();
  });

  socket.on('toggle-rotate', () => {
    state.autoRotate = !state.autoRotate;
    if (state.autoRotate) startRotate();
    else stopRotate();
    broadcastState();
  });
});

refresh();
setInterval(refresh, (config.refreshIntervalSeconds || 20) * 1000);

const port = config.port || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`FantasyCast running on port ${port}`);
  console.log(`  TV view:      http://localhost:${port}/tv.html`);
  console.log(`  Control view: http://localhost:${port}/control.html`);
});
