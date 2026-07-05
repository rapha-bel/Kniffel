'use strict';

/* ---------- Kategorien ---------- */
// type: 'upper' = oberer Teil, 'lower' = unterer Teil
// options: Schnellauswahl-Werte im Eingabedialog
const CATEGORIES = [
  { key: 'ones',   name: 'Einser',       hint: 'Summe aller 1er',  section: 'upper', options: [0,1,2,3,4,5] },
  { key: 'twos',   name: 'Zweier',       hint: 'Summe aller 2er',  section: 'upper', options: [0,2,4,6,8,10] },
  { key: 'threes', name: 'Dreier',       hint: 'Summe aller 3er',  section: 'upper', options: [0,3,6,9,12,15] },
  { key: 'fours',  name: 'Vierer',       hint: 'Summe aller 4er',  section: 'upper', options: [0,4,8,12,16,20] },
  { key: 'fives',  name: 'Fünfer',       hint: 'Summe aller 5er',  section: 'upper', options: [0,5,10,15,20,25] },
  { key: 'sixes',  name: 'Sechser',      hint: 'Summe aller 6er',  section: 'upper', options: [0,6,12,18,24,30] },

  { key: 'three',  name: 'Dreierpasch',  hint: 'Summe aller Würfel', section: 'lower', options: null },
  { key: 'four',   name: 'Viererpasch',  hint: 'Summe aller Würfel', section: 'lower', options: null },
  { key: 'full',   name: 'Full House',   hint: 'feste 25 Punkte',    section: 'lower', options: [25] },
  { key: 'small',  name: 'Kleine Straße',hint: 'feste 30 Punkte',    section: 'lower', options: [30] },
  { key: 'large',  name: 'Große Straße', hint: 'feste 40 Punkte',    section: 'lower', options: [40] },
  { key: 'kniffel',name: 'Kniffel',      hint: 'feste 50 Punkte',    section: 'lower', options: [50] },
  { key: 'chance', name: 'Chance',       hint: 'Summe aller Würfel', section: 'lower', options: null },
];
const UPPER_KEYS = CATEGORIES.filter(c => c.section === 'upper').map(c => c.key);
const LOWER_KEYS = CATEGORIES.filter(c => c.section === 'lower').map(c => c.key);
const BONUS_THRESHOLD = 63;
const BONUS_VALUE = 35;
const STORAGE_KEY = 'kniffel-state-v1';

/* ---------- State ---------- */
let state = load() || {
  players: [
    { id: uid(), name: 'Spieler 1', scores: {} },
    { id: uid(), name: 'Spieler 2', scores: {} },
  ],
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  catch { return null; }
}

/* ---------- Berechnungen ---------- */
// score-Wert: Zahl = eingetragen, 'x' = gestrichen (0), undefined = leer
function num(v) { return v === 'x' ? 0 : (typeof v === 'number' ? v : 0); }
function isSet(v) { return v === 'x' || typeof v === 'number'; }

function upperSum(p)  { return UPPER_KEYS.reduce((s,k)=> s + num(p.scores[k]), 0); }
function bonus(p)     { return upperSum(p) >= BONUS_THRESHOLD ? BONUS_VALUE : 0; }
function upperTotal(p){ return upperSum(p) + bonus(p); }
function lowerSum(p)  { return LOWER_KEYS.reduce((s,k)=> s + num(p.scores[k]), 0); }
function grandTotal(p){ return upperTotal(p) + lowerSum(p); }

/* ---------- Rendering ---------- */
const sheet = document.getElementById('sheet');

function render() {
  const players = state.players;
  const leader = leaderIndex();

  const head = `<tr>
    <th class="cat">Kategorie</th>
    ${players.map((p,i)=>`<th class="${i===leader?'winner':''}">${escapeHtml(p.name)}</th>`).join('')}
  </tr>`;

  const rows = [];
  rows.push(sectionRow('Oberer Teil', players.length));
  UPPER_KEYS.forEach(k => rows.push(catRow(k)));
  rows.push(computedRow('Zwischensumme', p => upperSum(p)));
  rows.push(bonusRow());
  rows.push(computedRow('Summe oberer Teil', p => upperTotal(p)));

  rows.push(sectionRow('Unterer Teil', players.length));
  LOWER_KEYS.forEach(k => rows.push(catRow(k)));
  rows.push(computedRow('Summe unterer Teil', p => lowerSum(p)));

  rows.push(totalRow());

  sheet.innerHTML = `<table class="score"><thead>${head}</thead><tbody>${rows.join('')}</tbody></table>`;

  // Zell-Handler
  sheet.querySelectorAll('.cell-btn').forEach(btn => {
    btn.addEventListener('click', () => openEntry(btn.dataset.player, btn.dataset.cat));
  });
  save();
}

function sectionRow(label, cols) {
  return `<tr class="section"><td colspan="${cols+1}">${label}</td></tr>`;
}

function catRow(key) {
  const cat = CATEGORIES.find(c => c.key === key);
  const cells = state.players.map((p,i) => {
    const v = p.scores[key];
    let cls = 'cell-btn', label;
    if (v === 'x') { cls += ' struck'; label = '×'; }
    else if (typeof v === 'number') { label = v; }
    else { cls += ' empty'; label = '–'; }
    return `<td class="cell"><button class="${cls}" data-player="${i}" data-cat="${key}">${label}</button></td>`;
  }).join('');
  return `<tr>
    <td class="cat"><span class="cat-name">${cat.name}</span><small>${cat.hint}</small></td>
    ${cells}
  </tr>`;
}

function computedRow(label, fn, extraClass='') {
  const cells = state.players.map(p => `<td><div class="val">${fn(p)}</div></td>`).join('');
  return `<tr class="computed ${extraClass}">
    <td class="cat"><span class="cat-name">${label}</span></td>${cells}</tr>`;
}

function bonusRow() {
  const cells = state.players.map(p => {
    const b = bonus(p);
    const rest = Math.max(0, BONUS_THRESHOLD - upperSum(p));
    const badge = b ? '' : `<span class="hint-badge">noch ${rest}</span>`;
    return `<td><div class="val">${b ? '+'+b : '–'} ${badge}</div></td>`;
  }).join('');
  return `<tr class="computed bonus">
    <td class="cat"><span class="cat-name">Bonus</span><small>ab ${BONUS_THRESHOLD} → +${BONUS_VALUE}</small></td>${cells}</tr>`;
}

function totalRow() {
  const cells = state.players.map(p => `<td><div class="val">${grandTotal(p)}</div></td>`).join('');
  return `<tr class="computed total"><td class="cat"><span class="cat-name">Gesamt</span></td>${cells}</tr>`;
}

function leaderIndex() {
  // Anführer nur zeigen, wenn irgendwo Punkte stehen
  let best = -1, bestVal = -1, any = false;
  state.players.forEach((p,i) => {
    if (Object.keys(p.scores).length) any = true;
    const t = grandTotal(p);
    if (t > bestVal) { bestVal = t; best = i; }
  });
  return any ? best : -1;
}

/* ---------- Eingabe-Dialog ---------- */
const entryBackdrop = document.getElementById('entry-backdrop');
const entryTitle = document.getElementById('entry-title');
const entryPlayer = document.getElementById('entry-player');
const entryOptions = document.getElementById('entry-options');
const entryInput = document.getElementById('entry-input');
let entryCtx = null; // { playerIdx, catKey }

function openEntry(playerIdx, catKey) {
  playerIdx = Number(playerIdx);
  entryCtx = { playerIdx, catKey };
  const cat = CATEGORIES.find(c => c.key === catKey);
  const player = state.players[playerIdx];

  entryTitle.textContent = cat.name;
  entryPlayer.textContent = player.name;
  entryInput.value = '';

  // Optionen bauen: Streichen + Schnellwerte
  const opts = [`<button class="opt strike" data-val="x">×</button>`];
  if (cat.options) {
    cat.options.forEach(v => opts.push(`<button class="opt" data-val="${v}">${v}</button>`));
  }
  entryOptions.innerHTML = opts.join('');
  entryOptions.querySelectorAll('.opt').forEach(o => {
    o.addEventListener('click', () => setScore(o.dataset.val));
  });

  entryBackdrop.hidden = false;
}

function setScore(raw) {
  const { playerIdx, catKey } = entryCtx;
  if (raw === 'x') {
    state.players[playerIdx].scores[catKey] = 'x';
  } else {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) return;
    state.players[playerIdx].scores[catKey] = n;
  }
  closeEntry();
  render();
}

function clearScore() {
  const { playerIdx, catKey } = entryCtx;
  delete state.players[playerIdx].scores[catKey];
  closeEntry();
  render();
}

function closeEntry() { entryBackdrop.hidden = true; entryCtx = null; }

document.getElementById('entry-save').addEventListener('click', () => {
  if (entryInput.value !== '') setScore(entryInput.value);
});
document.getElementById('entry-clear').addEventListener('click', clearScore);
document.getElementById('entry-cancel').addEventListener('click', closeEntry);
entryBackdrop.addEventListener('click', e => { if (e.target === entryBackdrop) closeEntry(); });
entryInput.addEventListener('keydown', e => { if (e.key === 'Enter' && entryInput.value !== '') setScore(entryInput.value); });

/* ---------- Spieler-Dialog ---------- */
const playersBackdrop = document.getElementById('players-backdrop');
const playersList = document.getElementById('players-list');
const playerNew = document.getElementById('player-new');

function openPlayers() {
  renderPlayersList();
  playersBackdrop.hidden = false;
}
function renderPlayersList() {
  playersList.innerHTML = state.players.map((p,i) => `
    <li>
      <input type="text" maxlength="12" value="${escapeHtml(p.name)}" data-idx="${i}" />
      ${state.players.length > 1 ? `<button class="del" data-idx="${i}">🗑</button>` : ''}
    </li>`).join('');
  playersList.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      state.players[Number(inp.dataset.idx)].name = inp.value || 'Spieler';
      save(); render();
    });
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
  state.players.push({ id: uid(), name, scores: {} });
  playerNew.value = '';
  renderPlayersList(); render();
});
document.getElementById('players-done').addEventListener('click', () => { playersBackdrop.hidden = true; });
playersBackdrop.addEventListener('click', e => { if (e.target === playersBackdrop) playersBackdrop.hidden = true; });
document.getElementById('btn-players').addEventListener('click', openPlayers);

/* ---------- Neues Spiel ---------- */
document.getElementById('btn-new').addEventListener('click', () => {
  if (confirm('Neues Spiel starten? Alle Punkte werden gelöscht (Spieler bleiben).')) {
    state.players.forEach(p => p.scores = {});
    render();
  }
});

/* ---------- Utils ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- Service Worker (offline) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

/* ---------- Start ---------- */
render();
