'use strict';

/* ---------- Impostor: Pass-and-Play Partyspiel ---------- */
const STORAGE_KEY = 'imposter-state-v1';

// Wörter je Kategorie: { w: geheimes Wort, h: Hinweis für den Impostor }
const WORDS = {
  'Essen & Trinken': [
    { w: 'Pizza', h: 'Essen' }, { w: 'Sushi', h: 'Japan' }, { w: 'Schokolade', h: 'süß' },
    { w: 'Kaffee', h: 'Getränk' }, { w: 'Spaghetti', h: 'Nudeln' }, { w: 'Döner', h: 'Fast Food' },
    { w: 'Apfel', h: 'Obst' }, { w: 'Käse', h: 'Milchprodukt' }, { w: 'Bier', h: 'Alkohol' },
    { w: 'Popcorn', h: 'Kino' }, { w: 'Suppe', h: 'warm' }, { w: 'Eis', h: 'Sommer' },
  ],
  'Tiere': [
    { w: 'Elefant', h: 'groß' }, { w: 'Pinguin', h: 'Vogel' }, { w: 'Hai', h: 'Meer' },
    { w: 'Katze', h: 'Haustier' }, { w: 'Löwe', h: 'Raubtier' }, { w: 'Biene', h: 'Insekt' },
    { w: 'Delfin', h: 'schwimmt' }, { w: 'Adler', h: 'fliegt' }, { w: 'Schlange', h: 'kriecht' },
    { w: 'Affe', h: 'Dschungel' }, { w: 'Pferd', h: 'reiten' }, { w: 'Frosch', h: 'grün' },
  ],
  'Orte': [
    { w: 'Strand', h: 'Urlaub' }, { w: 'Krankenhaus', h: 'Gesundheit' }, { w: 'Schule', h: 'lernen' },
    { w: 'Flughafen', h: 'reisen' }, { w: 'Supermarkt', h: 'einkaufen' }, { w: 'Kino', h: 'Film' },
    { w: 'Bibliothek', h: 'Bücher' }, { w: 'Stadion', h: 'Sport' }, { w: 'Berg', h: 'Natur' },
    { w: 'Museum', h: 'Kunst' }, { w: 'Bahnhof', h: 'Zug' }, { w: 'Zoo', h: 'Tiere' },
  ],
  'Sport': [
    { w: 'Fußball', h: 'Ball' }, { w: 'Schwimmen', h: 'Wasser' }, { w: 'Tennis', h: 'Schläger' },
    { w: 'Skifahren', h: 'Winter' }, { w: 'Boxen', h: 'Kampf' }, { w: 'Yoga', h: 'ruhig' },
    { w: 'Basketball', h: 'Korb' }, { w: 'Klettern', h: 'hoch' }, { w: 'Golf', h: 'Rasen' },
    { w: 'Reiten', h: 'Pferd' }, { w: 'Radfahren', h: 'Rad' }, { w: 'Tanzen', h: 'Musik' },
  ],
  'Alltag': [
    { w: 'Regenschirm', h: 'Regen' }, { w: 'Zahnbürste', h: 'Bad' }, { w: 'Wecker', h: 'Morgen' },
    { w: 'Schlüssel', h: 'Tür' }, { w: 'Brille', h: 'sehen' }, { w: 'Handy', h: 'Technik' },
    { w: 'Kissen', h: 'schlafen' }, { w: 'Geldbeutel', h: 'Geld' }, { w: 'Staubsauger', h: 'putzen' },
    { w: 'Fernseher', h: 'Wohnzimmer' }, { w: 'Waschmaschine', h: 'Wäsche' }, { w: 'Kerze', h: 'Licht' },
  ],
  'Berufe': [
    { w: 'Arzt', h: 'Gesundheit' }, { w: 'Lehrer', h: 'Schule' }, { w: 'Polizist', h: 'Gesetz' },
    { w: 'Koch', h: 'Küche' }, { w: 'Pilot', h: 'Flugzeug' }, { w: 'Feuerwehrmann', h: 'Feuer' },
    { w: 'Friseur', h: 'Haare' }, { w: 'Bauer', h: 'Feld' }, { w: 'Musiker', h: 'Bühne' },
    { w: 'Programmierer', h: 'Computer' }, { w: 'Astronaut', h: 'Weltall' }, { w: 'Richter', h: 'Gericht' },
  ],
};
const CATEGORIES = Object.keys(WORDS);
const RANDOM_CAT = '__random__';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(arr) { return arr[Math.random() * arr.length | 0]; }

/* ---------- State (persistiert: Spieler + Einstellungen) ---------- */
let state = load() || {
  players: ['Anna', 'Ben', 'Cara', 'David'],
  numImpostors: 1,
  hint: false,
  category: RANDOM_CAT,
};
if (!Array.isArray(state.players) || state.players.length < 1) state.players = ['Anna', 'Ben', 'Cara'];

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }

/* ---------- Runde (flüchtig) ---------- */
let round = null;   // { word, hintWord, category, impostors:Set, pos }
let phase = 'setup';

function maxImpostors() { return Math.max(1, state.players.length - 2); }

function startRound() {
  const cat = state.category === RANDOM_CAT ? sample(CATEGORIES) : state.category;
  const entry = sample(WORDS[cat]);
  const n = state.players.length;
  const num = Math.min(state.numImpostors, maxImpostors());
  const idx = shuffle(state.players.map((_, i) => i)).slice(0, num);
  round = { word: entry.w, hintWord: entry.h, category: cat, impostors: new Set(idx), pos: 0 };
  phase = 'reveal-cover';
  render();
}

/* ---------- Rendering ---------- */
const screen = document.getElementById('screen');

function render() {
  if (phase === 'setup') return renderSetup();
  if (phase === 'reveal-cover') return renderCover();
  if (phase === 'reveal-card') return renderCard();
  if (phase === 'discuss') return renderDiscuss();
  if (phase === 'result') return renderResult();
}

/* --- Setup --- */
function renderSetup() {
  const canStart = state.players.length >= 3;
  const maxImp = maxImpostors();
  if (state.numImpostors > maxImp) state.numImpostors = maxImp;

  screen.innerHTML = `
    <div class="imp-setup">
      <h2 class="imp-h">Spieler</h2>
      <ul class="players-list" id="players-list">
        ${state.players.map((name, i) => `
          <li>
            <input type="text" maxlength="14" value="${escapeHtml(name)}" data-idx="${i}" />
            ${state.players.length > 1 ? `<button class="del" data-idx="${i}" aria-label="Löschen">${trashIcon()}</button>` : ''}
          </li>`).join('')}
      </ul>
      <div class="entry__custom">
        <input id="player-new" type="text" maxlength="14" placeholder="Spieler hinzufügen" />
        <button id="player-add" class="btn btn-primary">＋</button>
      </div>

      <h2 class="imp-h">Einstellungen</h2>
      <div class="imp-row">
        <span>Anzahl Impostor</span>
        <div class="imp-stepper">
          <button id="imp-minus" class="stepper-btn">−</button>
          <span id="imp-count" class="stepper-val">${Math.min(state.numImpostors, maxImp)}</span>
          <button id="imp-plus" class="stepper-btn">+</button>
        </div>
      </div>
      <div class="imp-row">
        <span>Impostor bekommt Hinweis</span>
        <button id="hint-toggle" class="toggle ${state.hint ? 'on' : ''}" role="switch" aria-checked="${state.hint}"><span class="toggle__knob"></span></button>
      </div>
      <div class="imp-row imp-row--col">
        <span>Kategorie</span>
        <select id="cat-select" class="imp-select">
          <option value="${RANDOM_CAT}" ${state.category === RANDOM_CAT ? 'selected' : ''}>Zufällig (alle)</option>
          ${CATEGORIES.map(c => `<option value="${escapeHtml(c)}" ${state.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
      </div>

      <button id="start-btn" class="btn btn-primary btn-wide imp-start" ${canStart ? '' : 'disabled'}>Runde starten</button>
      ${canStart ? '' : '<p class="imp-note">Mindestens 3 Spieler nötig.</p>'}
    </div>`;

  // Spielernamen
  screen.querySelectorAll('#players-list input').forEach(inp => {
    inp.addEventListener('input', () => { state.players[Number(inp.dataset.idx)] = inp.value; save(); });
    inp.addEventListener('blur', () => { if (!inp.value.trim()) { state.players[Number(inp.dataset.idx)] = 'Spieler'; } save(); });
  });
  screen.querySelectorAll('#players-list .del').forEach(btn => {
    btn.addEventListener('click', () => { state.players.splice(Number(btn.dataset.idx), 1); save(); render(); });
  });
  const addInput = document.getElementById('player-new');
  const addPlayer = () => {
    const name = addInput.value.trim() || `Spieler ${state.players.length + 1}`;
    state.players.push(name); addInput.value = ''; save(); render();
  };
  document.getElementById('player-add').addEventListener('click', addPlayer);
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

  // Einstellungen
  document.getElementById('imp-minus').addEventListener('click', () => { state.numImpostors = Math.max(1, Math.min(state.numImpostors, maxImp) - 1); save(); render(); });
  document.getElementById('imp-plus').addEventListener('click', () => { state.numImpostors = Math.min(maxImp, Math.min(state.numImpostors, maxImp) + 1); save(); render(); });
  document.getElementById('hint-toggle').addEventListener('click', () => { state.hint = !state.hint; save(); render(); });
  document.getElementById('cat-select').addEventListener('change', e => { state.category = e.target.value; save(); });
  document.getElementById('start-btn').addEventListener('click', () => { if (canStart) startRound(); });
}

/* --- Reveal: Übergabe-Bildschirm --- */
function renderCover() {
  const name = state.players[round.pos];
  screen.innerHTML = `
    <div class="imp-cover">
      <div class="imp-cover__eye">${eyeIcon()}</div>
      <p class="imp-cover__pass">Gib das Handy an</p>
      <h2 class="imp-cover__name">${escapeHtml(name)}</h2>
      <button id="reveal-btn" class="btn btn-primary btn-wide">Aufdecken</button>
      <p class="imp-note">${round.pos + 1} von ${state.players.length}</p>
    </div>`;
  document.getElementById('reveal-btn').addEventListener('click', () => { phase = 'reveal-card'; render(); });
}

/* --- Reveal: Rollenkarte --- */
function renderCard() {
  const isImp = round.impostors.has(round.pos);
  const last = round.pos === state.players.length - 1;
  const name = state.players[round.pos];

  const inner = isImp
    ? `<div class="imp-card imp-card--imp">
         <div class="imp-card__role">${eyeIcon()} Du bist Impostor</div>
         ${state.hint
           ? `<div class="imp-card__hint">Hinweis: <strong>${escapeHtml(round.hintWord)}</strong></div>`
           : `<div class="imp-card__hint">Du kennst das Wort nicht.<br>Tu so, als wüsstest du es!</div>`}
       </div>`
    : `<div class="imp-card">
         <div class="imp-card__label">Das geheime Wort</div>
         <div class="imp-card__word">${escapeHtml(round.word)}</div>
         <div class="imp-card__cat">${escapeHtml(round.category)}</div>
       </div>`;

  screen.innerHTML = `
    <div class="imp-reveal">
      <p class="imp-reveal__name">${escapeHtml(name)}</p>
      ${inner}
      <button id="next-btn" class="btn btn-primary btn-wide">${last ? 'Fertig – losspielen' : 'Verstanden – weitergeben'}</button>
    </div>`;
  document.getElementById('next-btn').addEventListener('click', () => {
    if (last) { phase = 'discuss'; }
    else { round.pos++; phase = 'reveal-cover'; }
    render();
  });
}

/* --- Diskussion --- */
function renderDiscuss() {
  const starter = sample(state.players);
  screen.innerHTML = `
    <div class="imp-discuss">
      <div class="imp-cover__eye">${eyeIcon()}</div>
      <h2 class="imp-h imp-center">Alle bereit!</h2>
      <p class="imp-discuss__text">
        Beschreibt reihum das Wort mit <strong>einem</strong> Hinweis.<br>
        Wer klingt verdächtig? Diskutiert und stimmt ab, wer der Impostor ist.
      </p>
      <div class="imp-starter"><span>Beginnt:</span> <strong>${escapeHtml(starter)}</strong></div>
      <button id="resolve-btn" class="btn btn-primary btn-wide">Auflösung anzeigen</button>
      <button id="back-setup" class="btn btn-ghost btn-wide">Abbrechen</button>
    </div>`;
  document.getElementById('resolve-btn').addEventListener('click', () => { phase = 'result'; render(); });
  document.getElementById('back-setup').addEventListener('click', () => { phase = 'setup'; render(); });
}

/* --- Auflösung --- */
function renderResult() {
  const imps = state.players.filter((_, i) => round.impostors.has(i));
  screen.innerHTML = `
    <div class="imp-result">
      <div class="imp-card">
        <div class="imp-card__label">Das Wort war</div>
        <div class="imp-card__word">${escapeHtml(round.word)}</div>
        <div class="imp-card__cat">${escapeHtml(round.category)}</div>
      </div>
      <div class="imp-result__imp">
        <span class="imp-result__label">${imps.length > 1 ? 'Impostor waren' : 'Impostor war'}</span>
        <strong>${imps.map(escapeHtml).join(' & ')}</strong>
      </div>
      <button id="again-btn" class="btn btn-primary btn-wide">Neue Runde (gleiche Spieler)</button>
      <button id="setup-btn" class="btn btn-ghost btn-wide">Zurück zum Setup</button>
    </div>`;
  document.getElementById('again-btn').addEventListener('click', startRound);
  document.getElementById('setup-btn').addEventListener('click', () => { phase = 'setup'; render(); });
}

/* ---------- Icons ---------- */
function eyeIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`; }
function trashIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`; }

/* ---------- Service Worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
