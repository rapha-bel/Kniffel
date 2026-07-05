'use strict';

/* ---------- Tutto: Punkte-Tracker ---------- */
const TARGET = 6000;
const STORAGE_KEY = 'tutto-state-v1';
const QUICK = [0, 50, 100, 150, 200, 250, 300, 400, 500, 600, 1000];

const ICONS = {
  crown: `<svg class="ico-crown" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><rect x="4.5" y="18" width="15" height="2.4" rx="1"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ---------- State ---------- */
let state = load() || {
  players: [
    { id: uid(), name: 'Spieler 1' },
    { id: uid(), name: 'Spieler 2' },
  ],
  rounds: [ {} ],   // jede Runde: { playerId: punkte }
  leaderboard: {},  // pro Person: bester Gesamtwert
};
if (!state.rounds || !state.rounds.length) state.rounds = [ {} ];
if (!state.leaderboard) state.leaderboard = {};

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }

/* ---------- Berechnungen ---------- */
function total(playerId) {
  return state.rounds.reduce((s, r) => s + (typeof r[playerId] === 'number' ? r[playerId] : 0), 0);
}
function leaderIndex() {
  let best = -1, bestVal = -Infinity, any = false;
  state.players.forEach((p, i) => {
    const t = total(p.id);
    if (state.rounds.some(r => typeof r[p.id] === 'number')) any = true;
    if (t > bestVal) { bestVal = t; best = i; }
  });
  return any ? best : -1;
}
function winners() {
  return state.players.filter(p => total(p.id) >= TARGET);
}

/* ---------- Rendering ---------- */
const sheet = document.getElementById('sheet');
const banner = document.getElementById('tutto-banner');

function render() {
  const players = state.players;
  const leader = leaderIndex();

  const head = `<tr>
    <th class="cat cat-round">Runde</th>
    ${players.map((p, i) => `<th class="${i === leader ? 'winner' : ''}">${escapeHtml(p.name)}${i === leader ? ICONS.crown : ''}</th>`).join('')}
  </tr>`;

  const rows = state.rounds.map((r, ri) => {
    const cells = players.map((p, pi) => {
      const v = r[p.id];
      let cls = 'cell-btn', label;
      if (typeof v === 'number') { label = v; if (v < 0) cls += ' struck'; }
      else { cls += ' empty'; label = '–'; }
      return `<td class="cell"><button class="${cls}" data-round="${ri}" data-player="${p.id}">${label}</button></td>`;
    }).join('');
    return `<tr>
      <td class="cat cat-round"><button class="round-num" data-del="${ri}" title="Runde löschen">${ri + 1}</button></td>
      ${cells}
    </tr>`;
  }).join('');

  const totalCells = players.map(p => {
    const t = total(p.id);
    const done = t >= TARGET ? ' reached' : '';
    return `<td><div class="val${done}">${t}</div></td>`;
  }).join('');
  const totalRow = `<tr class="computed total">
    <td class="cat cat-round"><span class="cat-name">Gesamt</span></td>${totalCells}</tr>`;

  sheet.innerHTML = `<table class="score"><thead>${head}</thead><tbody>${rows}${totalRow}</tbody></table>`;

  sheet.querySelectorAll('.cell-btn').forEach(btn => {
    btn.addEventListener('click', () => openEntry(Number(btn.dataset.round), btn.dataset.player));
  });
  sheet.querySelectorAll('.round-num').forEach(btn => {
    btn.addEventListener('click', () => deleteRound(Number(btn.dataset.del)));
  });

  // Sieg-Banner + Konfetti
  const won = winners();
  if (won.length) {
    const names = won.map(p => escapeHtml(p.name)).join(' & ');
    banner.innerHTML = `${ICONS.crown} <span><strong>${names}</strong> ${won.length > 1 ? 'haben' : 'hat'} ${TARGET} erreicht!</span>`;
    banner.hidden = false;
    if (!celebrated) { celebrated = true; if (window.celebrate) window.celebrate(); }
  } else {
    banner.hidden = true;
    celebrated = false;
  }

  save();
}
let celebrated = false;

/* ---------- Rangliste ---------- */
function normName(n) { return String(n).trim().toLowerCase(); }
function medal(rank) {
  const cls = rank <= 3 ? `medal medal-${rank}` : 'medal medal-n';
  return `<span class="${cls}">${rank}</span>`;
}

// Platzierung im aktuellen Spiel (gleicher Rang bei Gleichstand)
function currentRanking() {
  const arr = state.players.map(p => ({
    name: p.name,
    total: total(p.id),
    any: state.rounds.some(r => typeof r[p.id] === 'number'),
  }));
  arr.sort((a, b) => b.total - a.total);
  let rank = 0, prev = null;
  arr.forEach((e, i) => {
    if (prev === null || e.total < prev) { rank = i + 1; prev = e.total; }
    e.rank = rank;
  });
  return arr;
}

// Bestenliste aktualisieren: je Person nur der beste Gesamtwert bleibt erhalten.
function recordGame() {
  let improved = false;
  state.players.forEach(p => {
    const t = total(p.id);
    const key = normName(p.name);
    const e = state.leaderboard[key] || { name: p.name, best: 0 };
    e.name = p.name;
    if (t > e.best) { e.best = t; improved = true; }
    state.leaderboard[key] = e;
  });
  save();
  return improved;
}

function bestRanking() {
  return Object.values(state.leaderboard).sort((a, b) => b.best - a.best);
}

const rankingBackdrop = document.getElementById('ranking-backdrop');
function openRanking() { renderRanking(); rankingBackdrop.hidden = false; }
function closeRanking() { rankingBackdrop.hidden = true; }

function renderRanking() {
  const cur = currentRanking();
  const anyScores = cur.some(e => e.any);

  const curHtml = anyScores
    ? cur.map(e => `<div class="rank-row">
        <span class="rank-pos">${medal(e.rank)}</span>
        <span class="rank-name">${escapeHtml(e.name)}</span>
        <span class="rank-score">${e.total}</span>
      </div>`).join('')
    : `<p class="rank-empty">Noch keine Punkte eingetragen.</p>`;

  const best = bestRanking();
  const bestHtml = best.length
    ? best.map((e, i) => `<div class="rank-row">
        <span class="rank-pos">${medal(i + 1)}</span>
        <span class="rank-name">${escapeHtml(e.name)}</span>
        <span class="rank-score">${e.best}</span>
      </div>`).join('')
    : `<p class="rank-empty">Noch keine Werte gespeichert. Beende unten ein Spiel, um die Bestenliste zu starten.</p>`;

  document.getElementById('ranking-body').innerHTML = `
    <div class="rank-section">
      <h3 class="rank-h">Aktuelles Spiel</h3>
      <div class="rank-list">${curHtml}</div>
      ${anyScores ? `<button id="rank-record" class="btn btn-primary rank-record">Spiel beenden &amp; werten</button>` : ''}
    </div>
    <div class="rank-section">
      <h3 class="rank-h">Bestenliste <small>höchste Punktzahl</small></h3>
      <div class="rank-list">${bestHtml}</div>
      ${best.length ? `<button id="rank-clear" class="btn btn-ghost rank-clear">Bestenliste zurücksetzen</button>` : ''}
    </div>`;

  const rec = document.getElementById('rank-record');
  if (rec) rec.addEventListener('click', () => {
    if (confirm('Spiel werten? Nur neue persönliche Bestwerte werden gespeichert, danach beginnt ein neues Spiel.')) {
      const improved = recordGame();
      state.rounds = [ {} ];
      render();
      renderRanking();
      if (improved) alert('Neuer Bestwert gespeichert!');
    }
  });
  const clr = document.getElementById('rank-clear');
  if (clr) clr.addEventListener('click', () => {
    if (confirm('Gesamte Bestenliste unwiderruflich löschen?')) {
      state.leaderboard = {};
      save();
      renderRanking();
    }
  });
}

document.getElementById('btn-ranking').addEventListener('click', openRanking);
document.getElementById('ranking-done').addEventListener('click', closeRanking);
rankingBackdrop.addEventListener('click', e => { if (e.target === rankingBackdrop) closeRanking(); });

/* ---------- Eingabe-Dialog ---------- */
const entryBackdrop = document.getElementById('entry-backdrop');
const entryTitle = document.getElementById('entry-title');
const entryPlayer = document.getElementById('entry-player');
const entryOptions = document.getElementById('entry-options');
const entryInput = document.getElementById('entry-input');
let entryCtx = null;

function openEntry(roundIdx, playerId) {
  entryCtx = { roundIdx, playerId };
  const player = state.players.find(p => p.id === playerId);
  entryTitle.textContent = 'Runde ' + (roundIdx + 1);
  entryPlayer.textContent = player ? player.name : '';
  const cur = state.rounds[roundIdx][playerId];
  entryInput.value = typeof cur === 'number' ? cur : '';

  entryOptions.innerHTML = QUICK.map(v => `<button class="opt" data-val="${v}">${v}</button>`).join('');
  entryOptions.querySelectorAll('.opt').forEach(o => o.addEventListener('click', () => setScore(o.dataset.val)));

  entryBackdrop.hidden = false;
}

function setScore(raw) {
  const { roundIdx, playerId } = entryCtx;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return;
  state.rounds[roundIdx][playerId] = n;
  closeEntry();
  render();
}
function clearScore() {
  const { roundIdx, playerId } = entryCtx;
  delete state.rounds[roundIdx][playerId];
  closeEntry();
  render();
}
function closeEntry() { entryBackdrop.hidden = true; entryCtx = null; }

document.getElementById('entry-save').addEventListener('click', () => { if (entryInput.value !== '') setScore(entryInput.value); });
document.getElementById('entry-clear').addEventListener('click', clearScore);
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
      const p = state.players[Number(btn.dataset.idx)];
      state.rounds.forEach(r => delete r[p.id]);   // Punkte des Spielers entfernen
      state.players.splice(Number(btn.dataset.idx), 1);
      renderPlayersList(); render();
    });
  });
}
document.getElementById('player-add').addEventListener('click', () => {
  const name = playerNew.value.trim() || `Spieler ${state.players.length + 1}`;
  state.players.push({ id: uid(), name });
  playerNew.value = '';
  renderPlayersList(); render();
});
document.getElementById('players-done').addEventListener('click', () => { playersBackdrop.hidden = true; });
playersBackdrop.addEventListener('click', e => { if (e.target === playersBackdrop) playersBackdrop.hidden = true; });
document.getElementById('btn-players').addEventListener('click', openPlayers);

/* ---------- Runde / Neues Spiel ---------- */
document.getElementById('btn-add-round').addEventListener('click', () => {
  state.rounds.push({});
  render();
  window.scrollTo(0, document.body.scrollHeight);
});
function deleteRound(idx) {
  if (state.rounds.length <= 1) {
    if (confirm('Letzte Runde leeren?')) { state.rounds = [ {} ]; render(); }
    return;
  }
  if (confirm(`Runde ${idx + 1} löschen?`)) { state.rounds.splice(idx, 1); render(); }
}
document.getElementById('btn-new').addEventListener('click', () => {
  if (confirm('Neues Spiel starten? Alle Runden werden gelöscht (Spieler bleiben).')) {
    state.rounds = [ {} ];
    render();
  }
});

/* ---------- Service Worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ---------- Start ---------- */
celebrated = winners().length > 0;   // beim Laden eines gewonnenen Spiels nicht feiern
render();
