'use strict';

/* ---------- Generischer Punktezähler ---------- */
const STORAGE_KEY = 'counter-state-v1';
const STEPS = [1, 5, 10];

const ICONS = {
  crown: `<svg class="ico-crown" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><rect x="4.5" y="18" width="15" height="2.4" rx="1"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

let state = load() || {
  players: [
    { id: uid(), name: 'Spieler 1', score: 0 },
    { id: uid(), name: 'Spieler 2', score: 0 },
  ],
  step: 1,
};
if (!STEPS.includes(state.step)) state.step = 1;

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }

/* ---------- Rendering ---------- */
const board = document.getElementById('board');
const stepOptions = document.getElementById('step-options');

function leaderId() {
  const scores = state.players.map(p => p.score);
  const max = Math.max(...scores);
  const anyDiff = scores.some(s => s !== scores[0]) || scores.some(s => s !== 0);
  if (!anyDiff) return null;
  const leaders = state.players.filter(p => p.score === max);
  return leaders.length === 1 ? leaders[0].id : null;
}

function render() {
  const lead = leaderId();
  board.innerHTML = state.players.map(p => `
    <div class="counter-card">
      <span class="counter-card__name">${escapeHtml(p.name)}${p.id === lead ? ICONS.crown : ''}</span>
      <button class="counter-btn minus" data-id="${p.id}" data-dir="-1" aria-label="minus">−</button>
      <button class="counter-card__score" data-set="${p.id}">${p.score}</button>
      <button class="counter-btn plus" data-id="${p.id}" data-dir="1" aria-label="plus">+</button>
    </div>`).join('');

  board.querySelectorAll('.counter-btn').forEach(btn => {
    btn.addEventListener('click', () => changeScore(btn.dataset.id, Number(btn.dataset.dir) * state.step));
  });
  board.querySelectorAll('.counter-card__score').forEach(btn => {
    btn.addEventListener('click', () => openEntry(btn.dataset.set));
  });

  stepOptions.innerHTML = STEPS.map(s =>
    `<button class="step-opt${s === state.step ? ' active' : ''}" data-step="${s}">${s}</button>`).join('');
  stepOptions.querySelectorAll('.step-opt').forEach(o => {
    o.addEventListener('click', () => { state.step = Number(o.dataset.step); render(); });
  });

  save();
}

function changeScore(id, delta) {
  const p = state.players.find(x => x.id === id);
  if (p) { p.score += delta; render(); }
}

/* ---------- Eingabe-Dialog ---------- */
const entryBackdrop = document.getElementById('entry-backdrop');
const entryPlayer = document.getElementById('entry-player');
const entryInput = document.getElementById('entry-input');
let entryId = null;

function openEntry(id) {
  entryId = id;
  const p = state.players.find(x => x.id === id);
  entryPlayer.textContent = p ? p.name : '';
  entryInput.value = p ? p.score : '';
  entryBackdrop.hidden = false;
}
function setScore(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return;
  const p = state.players.find(x => x.id === entryId);
  if (p) p.score = n;
  closeEntry();
  render();
}
function closeEntry() { entryBackdrop.hidden = true; entryId = null; }

document.getElementById('entry-save').addEventListener('click', () => { if (entryInput.value !== '') setScore(entryInput.value); });
document.getElementById('entry-clear').addEventListener('click', () => setScore(0));
document.getElementById('entry-cancel').addEventListener('click', closeEntry);
document.getElementById('entry-sign').addEventListener('click', () => {
  const n = parseInt(entryInput.value, 10);
  if (!isNaN(n)) entryInput.value = -n;
});
entryBackdrop.addEventListener('click', e => { if (e.target === entryBackdrop) closeEntry(); });
entryInput.addEventListener('keydown', e => { if (e.key === 'Enter' && entryInput.value !== '') setScore(entryInput.value); });

/* ---------- Spieler-Dialog ---------- */
const playersBackdrop = document.getElementById('players-backdrop');
const playersList = document.getElementById('players-list');
const playerNew = document.getElementById('player-new');

function openPlayers() { renderPlayersList(); playersBackdrop.hidden = false; }
function renderPlayersList() {
  playersList.innerHTML = state.players.map((p, i) => `
    <li>
      <input type="text" maxlength="12" value="${escapeHtml(p.name)}" data-idx="${i}" />
      ${state.players.length > 1 ? `<button class="del" data-idx="${i}" aria-label="Löschen">${ICONS.trash}</button>` : ''}
    </li>`).join('');
  playersList.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => { state.players[Number(inp.dataset.idx)].name = inp.value || 'Spieler'; save(); render(); });
  });
  playersList.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.players.splice(Number(btn.dataset.idx), 1);
      renderPlayersList(); render();
    });
  });
}
document.getElementById('player-add').addEventListener('click', () => {
  const name = playerNew.value.trim() || `Spieler ${state.players.length + 1}`;
  state.players.push({ id: uid(), name, score: 0 });
  playerNew.value = '';
  renderPlayersList(); render();
});
document.getElementById('players-done').addEventListener('click', () => { playersBackdrop.hidden = true; });
playersBackdrop.addEventListener('click', e => { if (e.target === playersBackdrop) playersBackdrop.hidden = true; });
document.getElementById('btn-players').addEventListener('click', openPlayers);

/* ---------- Zurücksetzen ---------- */
document.getElementById('btn-new').addEventListener('click', () => {
  if (confirm('Alle Punkte auf 0 zurücksetzen? (Spieler bleiben)')) {
    state.players.forEach(p => p.score = 0);
    render();
  }
});

/* ---------- Service Worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
