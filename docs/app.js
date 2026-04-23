const STORAGE_KEY = 'kids_hub_stats_v1';
const DEFAULT_ROUNDS = 10;
const MAX_HIGH_SCORES = 10;
const MASCOT_ANIMATION_DURATION_MS = 600;
const ANSWER_REVEAL_MS = 900;
const HOME_ROUTE = '/';

const CATEGORIES = {
  math:      { label: 'Math',      icon: '🔢' },
  time:      { label: 'Time',      icon: '⏰' },
  reading:   { label: 'Reading',   icon: '📖' },
  geography: { label: 'Geography', icon: '🌍' },
  history:   { label: 'History',   icon: '📜' },
};

const GAME_REGISTRY = {
  addition: {
    title: 'Addition',
    icon: '➕',
    category: 'math',
    description: 'Add numbers fast and build your streak!',
    defaultMode: 'quick',
    loader: () => import('./games/addition.js?v=16'),
  },
  subtraction: {
    title: 'Subtraction',
    icon: '➖',
    category: 'math',
    description: 'Take away and race the clock!',
    defaultMode: 'quick',
    loader: () => import('./games/subtraction.js?v=16'),
  },
  multiplication: {
    title: 'Multiplication',
    icon: '✖️',
    category: 'math',
    description: 'Master your times tables!',
    defaultMode: 'quick',
    loader: () => import('./games/multiplication.js?v=16'),
  },
  division: {
    title: 'Division',
    icon: '➗',
    category: 'math',
    description: 'Split numbers and become a division pro!',
    defaultMode: 'quick',
    loader: () => import('./games/division.js?v=16'),
  },
  clock: {
    title: 'Tell Time (Analog Clock)',
    icon: '🕒',
    category: 'time',
    description: 'Read the clock hands like a pro!',
    defaultMode: 'quick',
    loader: () => import('./games/clock.js?v=16'),
  },
  timemath: {
    title: 'Time Math',
    icon: '⏱️',
    category: 'time',
    description: 'Add and subtract minutes and hours!',
    defaultMode: 'quick',
    loader: () => import('./games/timemath.js?v=16'),
  },
  reading: {
    title: 'Word Reading',
    icon: '🔤',
    category: 'reading',
    description: 'Read the word and pick the picture!',
    defaultMode: 'quick',
    loader: () => import('./games/reading.js?v=16'),
  },
  flashword: {
    title: 'Flash Word',
    icon: '⚡',
    category: 'reading',
    description: 'A word flashes — can you spot it?',
    defaultMode: 'sight',
    loader: () => import('./games/flashword.js?v=16'),
  },
  usstates: {
    title: 'Find the State',
    icon: '🗺️',
    category: 'geography',
    description: 'Spot US states on the map!',
    defaultMode: 'quick',
    loader: () => import('./games/usstates.js?v=2'),
  },
  europe: {
    title: 'Find the Country',
    icon: '🇪🇺',
    category: 'geography',
    description: 'Explore Europe and learn its countries!',
    defaultMode: 'quick',
    loader: () => import('./games/europe.js?v=9'),
  },
  worldhistory: {
    title: 'World History',
    icon: '🌐',
    category: 'history',
    description: 'Travel through time and meet the world!',
    defaultMode: 'all',
    loader: () => import('./games/worldhistory.js?v=1'),
  },
  ushistory: {
    title: 'US History',
    icon: '🦅',
    category: 'history',
    description: 'Discover the story of the United States!',
    defaultMode: 'all',
    loader: () => import('./games/ushistory.js?v=1'),
  },
  mythology: {
    title: 'Mythology',
    icon: '⚡',
    category: 'history',
    description: 'Meet the gods and heroes of ancient myths!',
    defaultMode: 'all',
    loader: () => import('./games/mythology.js?v=1'),
  },
};

const ANIMALS = ['🦊', '🐺', '🐯', '🐶', '🐱'];
const DEFAULT_MASCOT = ANIMALS[0];

const CARD_ACCENTS = [
  '#e8540a', // orange-red
  '#7c3aed', // purple
  '#0ea5e9', // sky blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
];

const state = {
  loadedGames: {},
  currentGame: null,
  currentMode: null,
  currentQuestion: null,
  session: null,
  timerInterval: null,
  timeLeft: 0,
  pendingGameId: null,
  mascotReactionTimeout: null,
  mascotSurpriseTimeout: null,
  isHandlingPopState: false,
  currentRoute: HOME_ROUTE,
};

const $ = (id) => document.getElementById(id);

// ---- Routing ---------------------------------------------------------------

function normalizeRoute(route) {
  if (typeof route !== 'string' || !route.trim()) return HOME_ROUTE;
  let normalized = route.trim();
  if (normalized.startsWith('#')) normalized = normalized.slice(1);
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
}

function getHashRoute() {
  return normalizeRoute(window.location.hash);
}

function buildRoute({ gameId = null, modeId = null, modeConfig = {} } = {}) {
  if (!gameId) return HOME_ROUTE;
  let route = `/${encodeURIComponent(gameId)}`;
  if (modeId) route += `/${encodeURIComponent(modeId)}`;

  const params = new URLSearchParams();
  Object.entries(modeConfig || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

function parseRoute(route) {
  const normalized = normalizeRoute(route);
  const routeUrl = new URL(normalized, window.location.origin);
  const segments = routeUrl.pathname
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);

  const modeConfig = {};
  routeUrl.searchParams.forEach((value, key) => { modeConfig[key] = value; });

  return {
    normalized,
    gameId: segments[0] || null,
    modeId: segments[1] || null,
    modeConfig,
  };
}

// ---- Stats / persistence ---------------------------------------------------

function defaultStats() {
  return {
    bestStreak: 0,
    totalCorrect: 0,
    dailyStreak: 0,
    lastPlayDate: null,
    mascot: DEFAULT_MASCOT,
    highScores: {},
    problems: {},
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    const mascot = ANIMALS.includes(parsed.mascot) ? parsed.mascot : DEFAULT_MASCOT;
    return {
      ...defaultStats(),
      ...parsed,
      mascot,
      highScores: parsed.highScores || {},
      problems: parsed.problems || {},
    };
  } catch {
    return defaultStats();
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function daysBetween(fromIso, toIso) {
  return Math.round((new Date(toIso) - new Date(fromIso)) / 86400000);
}

function updateDailyStreak(stats) {
  const today = new Date().toDateString();
  if (stats.lastPlayDate === today) return;

  if (!stats.lastPlayDate) {
    stats.dailyStreak = 1;
  } else {
    stats.dailyStreak = daysBetween(stats.lastPlayDate, today) === 1 ? stats.dailyStreak + 1 : 1;
  }

  stats.lastPlayDate = today;
  saveStats(stats);
}

function getVisibleDailyStreak(stats) {
  if (!stats.lastPlayDate) return 0;
  const today = new Date().toDateString();
  return daysBetween(stats.lastPlayDate, today) > 1 ? 0 : stats.dailyStreak;
}

function getMascot() {
  const mascot = loadStats().mascot;
  return ANIMALS.includes(mascot) ? mascot : DEFAULT_MASCOT;
}

function legacyHighScoreKeys(highScores, gameId) {
  const prefix = `${gameId}:`;
  return Object.keys(highScores).filter((k) => k.startsWith(prefix));
}

function getGameHighScoreEntries(stats, gameId) {
  const entries = [];
  if (Array.isArray(stats.highScores[gameId])) entries.push(...stats.highScores[gameId]);
  legacyHighScoreKeys(stats.highScores, gameId).forEach((k) => {
    if (Array.isArray(stats.highScores[k])) entries.push(...stats.highScores[k]);
  });
  return entries.sort((a, b) => b.score - a.score).slice(0, MAX_HIGH_SCORES);
}

function getHighScore(gameId) {
  return getGameHighScoreEntries(loadStats(), gameId)[0] || null;
}

function saveHighScore(gameId, score, correct, total) {
  const stats = loadStats();
  const entries = getGameHighScoreEntries(stats, gameId);
  entries.push({ score, correct, total, date: new Date().toLocaleDateString() });
  entries.sort((a, b) => b.score - a.score);
  stats.highScores[gameId] = entries.slice(0, MAX_HIGH_SCORES);

  // Drop legacy "gameId:modeId" buckets — they're folded into the main list above.
  legacyHighScoreKeys(stats.highScores, gameId).forEach((k) => {
    delete stats.highScores[k];
  });

  saveStats(stats);
  return stats.highScores[gameId][0]?.score === score;
}

function recordProblemResult(a, b, correct) {
  const stats = loadStats();
  const key = `${a}x${b}`;
  const entry = stats.problems[key] || (stats.problems[key] = { correct: 0, wrong: 0 });
  entry[correct ? 'correct' : 'wrong'] += 1;
  saveStats(stats);
}

// ---- Mascot UI -------------------------------------------------------------

function applyAnimalTheme(animal) {
  document.body.dataset.animal = animal || DEFAULT_MASCOT;
}

function updateMascotDisplay() {
  const mascot = getMascot();
  const inGameEl = $('mascot');
  if (inGameEl) inGameEl.textContent = mascot;
  const modeMenuEl = $('mode-menu-mascot');
  if (modeMenuEl) modeMenuEl.textContent = mascot;
  const homeBtn = $('mascot-btn');
  if (homeBtn) homeBtn.textContent = mascot;
  applyAnimalTheme(mascot);
}

function animateMascotReaction(isCorrect) {
  const mascot = $('mascot');
  if (!mascot) return;

  mascot.classList.remove('celebrate', 'shake');
  void mascot.offsetWidth; // reflow to restart animation
  mascot.classList.add(isCorrect ? 'celebrate' : 'shake');

  if (state.mascotReactionTimeout) clearTimeout(state.mascotReactionTimeout);
  state.mascotReactionTimeout = setTimeout(() => {
    mascot.classList.remove('celebrate', 'shake');
    state.mascotReactionTimeout = null;
  }, MASCOT_ANIMATION_DURATION_MS);
}

function openAnimalPicker()  { $('picker-overlay').classList.add('open'); }
function closeAnimalPicker() { $('picker-overlay').classList.remove('open'); }

// Periodic random surprise animations for the home mascot
const MASCOT_SURPRISES = ['mascot-hop', 'mascot-spin', 'mascot-wiggle'];

function scheduleMascotSurprise() {
  clearTimeout(state.mascotSurpriseTimeout);
  const delay = 6000 + Math.random() * 6000; // 6-12 seconds
  state.mascotSurpriseTimeout = setTimeout(() => {
    const btn = $('mascot-btn');
    const homeScreen = $('screen-home');
    if (btn && homeScreen && homeScreen.classList.contains('active')) {
      const cls = MASCOT_SURPRISES[Math.floor(Math.random() * MASCOT_SURPRISES.length)];
      btn.classList.add(cls);
      btn.addEventListener('animationend', () => btn.classList.remove(cls), { once: true });
    }
    scheduleMascotSurprise();
  }, delay);
}

function stopMascotSurprises() {
  clearTimeout(state.mascotSurpriseTimeout);
  state.mascotSurpriseTimeout = null;
}

function renderAnimalPicker() {
  const stats = loadStats();
  const root = $('animal-options');
  root.innerHTML = '';

  ANIMALS.forEach((animal) => {
    const btn = document.createElement('button');
    btn.className = `animal-btn ${stats.mascot === animal ? 'active' : ''}`;
    btn.textContent = animal;
    btn.addEventListener('click', () => {
      const next = loadStats();
      next.mascot = animal;
      saveStats(next);
      renderAnimalPicker();
      updateMascotDisplay();
      closeAnimalPicker();
    });
    root.appendChild(btn);
  });
}

// ---- Confetti --------------------------------------------------------------

function launchConfetti() {
  const COLORS = ['#ff595e','#ffca3a','#6a4c93','#1982c4','#8ac926','#ff924c','#ffffff'];
  const PARTICLE_COUNT = 80;
  const DURATION_MS = 1400;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: canvas.height * (0.3 + Math.random() * 0.3),
    r: 5 + Math.random() * 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 9,
    vy: -(6 + Math.random() * 7),
    gravity: 0.35,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.3,
    shape: Math.random() < 0.5 ? 'rect' : 'circle',
  }));

  const start = performance.now();
  function draw(now) {
    const elapsed = now - start;
    if (elapsed >= DURATION_MS) { canvas.remove(); return; }
    const alpha = elapsed < DURATION_MS * 0.7
      ? 1
      : 1 - (elapsed - DURATION_MS * 0.7) / (DURATION_MS * 0.3);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// ---- Screen + history navigation ------------------------------------------

function showScreen(id, options = {}) {
  const {
    skipHistory = false,
    replaceHistory = false,
    route = state.currentRoute || getHashRoute(),
  } = options;
  state.currentRoute = normalizeRoute(route);

  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(`screen-${id}`).classList.add('active');

  // Start/stop mascot surprise animations based on active screen
  if (id === 'home') scheduleMascotSurprise();
  else stopMascotSurprises();

  if (skipHistory || state.isHandlingPopState) return;

  const nextState = { screen: id, route: state.currentRoute };
  const nextUrl = `#${state.currentRoute}`;
  if (replaceHistory) window.history.replaceState(nextState, '', nextUrl);
  else                window.history.pushState(nextState, '', nextUrl);
}

// ---- Card rendering --------------------------------------------------------

function createCard({ accentVar, accent, icon, title, desc, scoreLabel, className, onClick }) {
  const btn = document.createElement('button');
  btn.className = className;
  if (accentVar) btn.style.setProperty(accentVar, accent);
  btn.innerHTML = `
    <span class="${className}-icon">${icon}</span>
    <span class="${className}-title">${title}</span>
    <span class="${className}-desc">${desc}</span>
    <span class="${className}-score">${scoreLabel}</span>
  `;
  btn.addEventListener('click', onClick);
  return btn;
}

function highScoreLabel(gameId) {
  const best = getHighScore(gameId);
  return best ? `High score: ${best.score}` : 'High score: —';
}

// Best accuracy (correct / total) across all stored runs for a game.
// Returns null if the game has no recorded runs with answered questions.
function getBestAccuracy(gameId) {
  const entries = getGameHighScoreEntries(loadStats(), gameId);
  let best = null;
  for (const entry of entries) {
    if (!entry || !entry.total) continue;
    const acc = entry.correct / entry.total;
    if (best === null || acc > best) best = acc;
  }
  return best;
}

// Star-rating HTML used on home-screen game cards. Encourages kids to keep
// playing by visualising progress: empty stars when a game hasn't been
// played, more filled stars as best accuracy improves.
function progressStarsHtml(gameId) {
  const acc = getBestAccuracy(gameId);
  let filled;
  let label;
  if (acc === null) {
    filled = 0;
    label = 'Not played yet — tap to start!';
  } else {
    filled = acc >= 1 ? 5
      : acc >= 0.8 ? 4
      : acc >= 0.6 ? 3
      : acc >= 0.4 ? 2
      : acc > 0    ? 1
      : 0;
    label = `Best accuracy: ${Math.round(acc * 100)}%`;
  }
  let stars = '';
  for (let i = 0; i < 5; i++) {
    const cls = i < filled ? 'star filled' : 'star empty';
    const glyph = i < filled ? '★' : '☆';
    stars += `<span class="${cls}" aria-hidden="true">${glyph}</span>`;
  }
  return `<span class="stars" role="img" aria-label="${label}" title="${label}">${stars}</span>`;
}

// ---- Home screen -----------------------------------------------------------

function renderGameCards() {
  const carousel = $('games-grid');
  const dotsContainer = $('carousel-dots');
  carousel.innerHTML = '';
  dotsContainer.innerHTML = '';

  const gameIds = Object.keys(GAME_REGISTRY);
  let currentGroupRow = null;
  let lastCategory = null;
  gameIds.forEach((gameId, index) => {
    const game = GAME_REGISTRY[gameId];

    if (!currentGroupRow || game.category !== lastCategory) {
      const group = document.createElement('div');
      group.className = 'category-group';

      if (game.category) {
        const meta = CATEGORIES[game.category];
        const header = document.createElement('div');
        header.className = 'category-header';
        header.setAttribute('aria-hidden', 'true');
        header.innerHTML = `
          <span class="category-header-label">${meta?.label ?? game.category}</span>
        `;
        group.appendChild(header);
      }

      currentGroupRow = document.createElement('div');
      currentGroupRow.className = 'category-cards';
      group.appendChild(currentGroupRow);
      carousel.appendChild(group);
      lastCategory = game.category;
    }

    const card = createCard({
      className: 'game-card',
      accentVar: '--card-accent',
      accent: CARD_ACCENTS[index % CARD_ACCENTS.length],
      icon: game.icon,
      title: game.title,
      desc: game.description,
      scoreLabel: progressStarsHtml(gameId),
      onClick: () => startGame(gameId),
    });
    currentGroupRow.appendChild(card);

    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to ${game.title}`);
    dot.addEventListener('click', () => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    dotsContainer.appendChild(dot);
  });

  // Keep the active dot in sync with the card whose centre is closest to
  // the carousel's centre. Using "closest to centre" (rather than an
  // IntersectionObserver threshold) avoids the case where multiple cards
  // are fully visible at once and the wrong one wins.
  const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
  const cards = Array.from(carousel.querySelectorAll('.game-card'));

  const updateActiveDot = () => {
    if (!cards.length) return;
    let bestIdx;
    // At the scroll extremes the last/first card may never reach the
    // carousel centre, so snap to the end card explicitly.
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    if (carousel.scrollLeft >= maxScroll - 1) {
      bestIdx = cards.length - 1;
    } else if (carousel.scrollLeft <= 1) {
      bestIdx = 0;
    } else {
      const carouselRect = carousel.getBoundingClientRect();
      const carouselCentre = carouselRect.left + carouselRect.width / 2;
      let bestDist = Infinity;
      bestIdx = 0;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const cardCentre = r.left + r.width / 2;
        const dist = Math.abs(cardCentre - carouselCentre);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
    }
    dots.forEach((d, i) => d.classList.toggle('active', i === bestIdx));
  };

  let scrollFrame = 0;
  carousel.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateActiveDot();
    });
  }, { passive: true });
  window.addEventListener('resize', updateActiveDot);
  // Initial sync once layout has settled.
  requestAnimationFrame(updateActiveDot);

  // Mouse drag to scroll the carousel on desktop.
  let isDown = false, startX = 0, scrollLeft = 0;
  carousel.addEventListener('mousedown', (e) => {
    isDown = true;
    carousel.style.cursor = 'grabbing';
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });
  const stopDrag = () => { isDown = false; carousel.style.cursor = ''; };
  carousel.addEventListener('mouseleave', stopDrag);
  carousel.addEventListener('mouseup', stopDrag);
  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    carousel.scrollLeft = scrollLeft - ((e.pageX - carousel.offsetLeft) - startX);
  });
}

function updateHomeStats() {
  const stats = loadStats();
  $('home-best-streak').textContent = stats.bestStreak;
  $('home-total').textContent = stats.totalCorrect;
  $('daily-count').textContent = getVisibleDailyStreak(stats);
}

function updateHomeSubtitle() {
  const summaries = Object.entries(GAME_REGISTRY)
    .map(([gameId, metadata]) => {
      const best = getHighScore(gameId);
      return best ? `${metadata.title} best ${best.score}` : null;
    })
    .filter(Boolean);

  const subtitle = document.querySelector('.subtitle');
  subtitle.textContent = summaries.length
    ? `${summaries.join(' • ')}.`
    : 'Pick a game and keep your streak alive!';
}

// ---- Mode menu / picker ----------------------------------------------------

function getGameModes(game) {
  return Array.isArray(game.modes) ? game.modes : [];
}

function getMode(game, modeId) {
  return getGameModes(game).find((mode) => mode.id === modeId) || null;
}

function renderModeCards(gameId, game) {
  const list = $('mode-list');
  list.innerHTML = '';

  getGameModes(game).forEach((mode, index) => {
    const scoreLabel = mode.kind === 'play' ? highScoreLabel(gameId) : '';
    list.appendChild(createCard({
      className: 'mode-card',
      accentVar: '--mode-accent',
      accent: CARD_ACCENTS[index % CARD_ACCENTS.length],
      icon: mode.icon || '🎮',
      title: mode.title,
      desc: mode.description || '',
      scoreLabel,
      onClick: () => chooseMode(gameId, mode.id),
    }));
  });
}

function renderModeSelection(gameId, game, options = {}) {
  state.pendingGameId = gameId;
  $('mode-game-title').textContent = game.title;
  renderModeCards(gameId, game);
  showScreen('mode-menu', { ...options, route: buildRoute({ gameId }) });
}

function renderModeOptionPicker(gameId, mode, options = {}) {
  state.pendingGameId = gameId;
  const optionsWrap = $('mode-option-grid');
  optionsWrap.innerHTML = '';

  const selection = mode.selection;
  $('mode-option-title').textContent = selection.label;

  const isTextual = selection.options.some((option) => {
    const label = typeof option === 'object' ? option.label : String(option);
    return !/^\d+$/.test(String(label).trim());
  });
  optionsWrap.classList.toggle('table-grid--text', isTextual);

  selection.options.forEach((option) => {
    const value = typeof option === 'object' ? option.value : option;
    const label = typeof option === 'object' ? option.label : String(option);
    const btn = document.createElement('button');
    btn.className = 'table-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      startMode(state.pendingGameId, mode.id, { [selection.key]: value });
    });
    optionsWrap.appendChild(btn);
  });

  showScreen('mode-option-picker', { ...options, route: buildRoute({ gameId, modeId: mode.id }) });
}

async function showModeView(game, mode, options = {}) {
  state.pendingGameId = game.id;
  const viewRoot = $('mode-view-body');
  $('mode-view-title').textContent = `${game.title} — ${mode.title}`;

  viewRoot.innerHTML = '<p class="mode-view-empty">Loading…</p>';
  showScreen('mode-view', { ...options, route: buildRoute({ gameId: game.id, modeId: mode.id }) });

  viewRoot.innerHTML = typeof game.renderModeView === 'function'
    ? await game.renderModeView(mode.id, { stats: loadStats() })
    : '<p class="mode-view-empty">Nothing to show yet.</p>';
}

async function chooseMode(gameId, modeId) {
  const game = await loadGame(gameId);
  const mode = getMode(game, modeId);
  if (!mode) { startMode(gameId, null); return; }
  if (mode.selection) { renderModeOptionPicker(gameId, mode); return; }
  if (mode.kind === 'view') { showModeView(game, mode); return; }
  startMode(gameId, mode.id);
}

// ---- Game session ----------------------------------------------------------

function setFeedback(text, className = '') {
  const feedback = $('feedback');
  feedback.className = `feedback ${className}`.trim();
  feedback.textContent = text;
}

function updateSessionDisplay() {
  const session = state.session;
  if (!session) return;

  $('streak-count').textContent = session.streak;
  $('score-count').textContent = session.score;
  $('round-progress').textContent = session.maxRounds
    ? `${session.round + 1}/${session.maxRounds}`
    : `${session.total} answered`;
}

function renderQuestion() {
  const question = state.currentQuestion;
  const prompt = $('prompt');
  const answers = $('answers');

  prompt.innerHTML = question.prompt;
  answers.innerHTML = '';

  if (question.useNumpad) {
    renderNumpad(answers);
  } else {
    question.answers.forEach((answer) => {
      const btn = document.createElement('button');
      btn.className = question.answerClass ? `answer-btn ${question.answerClass}` : 'answer-btn';
      btn.innerHTML = answer.label;
      btn.dataset.value = String(answer.value);
      btn.addEventListener('click', () => submitAnswer(answer.value, btn));
      answers.appendChild(btn);
    });
  }

  setFeedback('');
}

const NUMPAD_KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
function renderNumpad(container) {
  const display = document.querySelector('#prompt .numpad-inline-display');
  const grid = document.createElement('div');
  grid.className = 'numpad-grid';

  NUMPAD_KEYS.forEach((key) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'numpad-btn';
    if (key === '⌫') btn.classList.add('numpad-back');
    if (key === '✓') btn.classList.add('numpad-go');
    btn.textContent = key;
    btn.addEventListener('click', () => handleNumpadKey(key, display));
    grid.appendChild(btn);
  });
  container.appendChild(grid);
}

function handleNumpadKey(key, display) {
  if (state.session?.ended || !display) return;

  const current = display.textContent === '?' ? '' : display.textContent;
  if (key === '⌫') {
    const next = current.slice(0, -1);
    display.textContent = next === '' ? '?' : next;
  } else if (key === '✓') {
    const value = parseInt(current, 10);
    if (current === '' || isNaN(value)) return;
    submitNumpadAnswer(value);
  } else {
    if (current.length >= 4) return;
    display.textContent = current + key;
  }
}

// ---- Timer -----------------------------------------------------------------

function stopSessionTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function setTimerVisible(isVisible) {
  $('timer-display').style.display = isVisible ? '' : 'none';
}

function startSessionTimer(seconds) {
  stopSessionTimer();
  state.timeLeft = seconds;
  const timerValue = $('timer-value');
  timerValue.textContent = String(state.timeLeft);
  setTimerVisible(true);

  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    timerValue.textContent = String(Math.max(state.timeLeft, 0));
    if (state.timeLeft <= 0) {
      stopSessionTimer();
      if (state.session && !state.session.ended) endGame();
    }
  }, 1000);
}

// ---- Answer submission -----------------------------------------------------

function lockAnswers() {
  document.querySelectorAll('.answer-btn').forEach((btn) => { btn.disabled = true; });
}

function lockNumpad() {
  document.querySelectorAll('.numpad-btn').forEach((btn) => { btn.disabled = true; });
}

function revealAnswerButtons(isCorrect, selectedButton) {
  const { correctValue } = state.currentQuestion;
  document.querySelectorAll('.answer-btn').forEach((btn) => {
    if (btn.dataset.value === String(correctValue)) btn.classList.add('correct');
  });
  if (!isCorrect && selectedButton) selectedButton.classList.add('wrong');
}

function computeScoreDelta(streak) {
  return 10 + Math.min(streak * 2, 20);
}

// Shared core for both multi-choice and numpad answers.
function applyAnswerOutcome(value, { onReveal, correctFeedback, wrongFeedback }) {
  if (!state.session || state.session.ended) return;

  const isCorrect = value === state.currentQuestion.correctValue;
  state.session.total += 1;

  if (isCorrect) {
    state.session.correct += 1;
    state.session.streak += 1;
    state.session.bestStreak = Math.max(state.session.bestStreak, state.session.streak);
    const delta = computeScoreDelta(state.session.streak);
    state.session.score += delta;
    setFeedback(correctFeedback(delta), 'correct-fb');
    animateMascotReaction(true);
    launchConfetti();
  } else {
    state.session.streak = 0;
    setFeedback(wrongFeedback(), 'wrong-fb');
    animateMascotReaction(false);
  }

  const fact = state.currentQuestion.meta?.fact;
  if (fact) recordProblemResult(fact.a, fact.b, isCorrect);

  if (onReveal) onReveal(isCorrect);

  updateSessionDisplay();
  setTimeout(() => {
    if (!state.session || state.session.ended) return;
    advanceRound();
  }, ANSWER_REVEAL_MS);
}

function submitAnswer(value, selectedButton) {
  if (!state.session || state.session.ended) return;
  lockAnswers();
  applyAnswerOutcome(value, {
    correctFeedback: (delta) => `Nice! ${getMascot()} +${delta}`,
    wrongFeedback: () => `Oops! Try the next one ${getMascot()}`,
    onReveal: (isCorrect) => revealAnswerButtons(isCorrect, selectedButton),
  });
}

function submitNumpadAnswer(value) {
  if (!state.session || state.session.ended) return;
  lockNumpad();
  applyAnswerOutcome(value, {
    correctFeedback: (delta) => `Nice! ${getMascot()} +${delta}`,
    wrongFeedback: () => `Oops! The answer was ${state.currentQuestion.correctValue} ${getMascot()}`,
    onReveal: (isCorrect) => {
      const display = document.querySelector('#prompt .numpad-inline-display');
      if (display) display.classList.add(isCorrect ? 'correct' : 'wrong');
    },
  });
}

// ---- Round / game lifecycle ------------------------------------------------

async function advanceRound() {
  if (!state.session || state.session.ended) return;
  state.session.round += 1;

  if (state.session.maxRounds && state.session.round >= state.session.maxRounds) {
    endGame();
    return;
  }
  updateSessionDisplay();
  state.currentQuestion = await state.currentGame.createQuestion(state.session);
  if (!state.session || state.session.ended) return;
  renderQuestion();
}

async function startMode(gameId, modeId, modeConfig = {}, options = {}) {
  stopSessionTimer();
  setTimerVisible(false);

  const game = state.currentGame;
  const mode = modeId ? getMode(game, modeId) : null;

  const session = {
    round: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    total: 0,
    gameId,
    modeId,
    modeConfig,
    maxRounds: DEFAULT_ROUNDS,
    timedSeconds: 0,
    ended: false,
  };

  if (typeof game.initSession === 'function') {
    Object.assign(session, game.initSession(modeId, modeConfig, session) || {});
  }

  state.currentMode = mode;
  state.session = session;

  const modeSuffix = mode ? ` — ${mode.title}` : '';
  $('game-title').textContent = `${game.title}${modeSuffix}`;
  updateMascotDisplay();
  updateSessionDisplay();

  $('prompt').innerHTML = '<div class="question-title">Loading…</div>';
  $('answers').innerHTML = '';
  showScreen('game', { ...options, route: buildRoute({ gameId, modeId, modeConfig }) });

  state.currentQuestion = await game.createQuestion(state.session);
  if (state.session !== session || session.ended) return;
  renderQuestion();

  if (session.timedSeconds > 0) startSessionTimer(session.timedSeconds);
}

async function loadGame(gameId) {
  if (!state.loadedGames[gameId]) {
    const module = await GAME_REGISTRY[gameId].loader();
    state.loadedGames[gameId] = module.game;
  }
  return state.loadedGames[gameId];
}

async function startGame(gameId) {
  const game = await loadGame(gameId);
  updateDailyStreak(loadStats());
  state.currentGame = game;

  if (getGameModes(game).length > 0) {
    renderModeSelection(gameId, game);
    return;
  }
  startMode(gameId, null);
}

function endGame() {
  if (!state.session || state.session.ended) return;
  state.session.ended = true;
  stopSessionTimer();

  const session = state.session;
  const stats = loadStats();
  stats.bestStreak = Math.max(stats.bestStreak, session.bestStreak);
  stats.totalCorrect += session.correct;
  saveStats(stats);

  // Skip high-score entries for sessions with no answers (e.g. immediate timeout).
  const isHighScore = session.total > 0
    && saveHighScore(session.gameId, session.score, session.correct, session.total);
  $('new-high-score').style.display = isHighScore ? '' : 'none';

  $('result-score').textContent = session.score;
  $('result-correct').textContent = `${session.correct}/${session.total}`;
  $('result-best-streak').textContent = session.bestStreak;

  const accuracy = session.total > 0 ? session.correct / session.total : 0;
  const header = $('results-header');
  if (accuracy >= 0.9)      header.innerHTML = '<span class="results-emoji">🌟</span><h2>Amazing!</h2>';
  else if (accuracy >= 0.7) header.innerHTML = '<span class="results-emoji">💪</span><h2>Great Job!</h2>';
  else                      header.innerHTML = '<span class="results-emoji">📚</span><h2>Keep Practicing!</h2>';

  if (accuracy >= 0.8) launchConfetti();

  showScreen('results', {
    route: buildRoute({
      gameId: session.gameId,
      modeId: session.modeId,
      modeConfig: session.modeConfig,
    }),
  });
  updateHomeStats();
}

function goHome(options = {}) {
  stopSessionTimer();
  setTimerVisible(false);

  state.currentGame = null;
  state.currentMode = null;
  state.currentQuestion = null;
  state.session = null;
  state.pendingGameId = null;

  updateHomeStats();
  updateMascotDisplay();
  renderGameCards();
  updateHomeSubtitle();
  showScreen('home', { ...options, route: HOME_ROUTE });
}

function goBackToModeMenu() {
  if (!state.currentGame || !state.pendingGameId) {
    goHome();
    return;
  }
  renderModeSelection(state.pendingGameId, state.currentGame);
}

// ---- Routing-driven navigation --------------------------------------------

async function navigateToRoute(route, options = {}) {
  const { skipHistory = true, replaceHistory = false } = options;
  const { gameId, modeId, modeConfig } = parseRoute(route);

  if (!gameId) {
    goHome({ skipHistory, replaceHistory });
    return;
  }
  if (!GAME_REGISTRY[gameId]) {
    goHome({ skipHistory: false, replaceHistory: true });
    return;
  }

  const game = await loadGame(gameId);
  state.currentGame = game;
  updateDailyStreak(loadStats());

  if (!modeId) {
    if (getGameModes(game).length > 0) {
      renderModeSelection(gameId, game, { skipHistory, replaceHistory });
    } else {
      startMode(gameId, null, {}, { skipHistory, replaceHistory });
    }
    return;
  }

  const mode = getMode(game, modeId);
  if (!mode) {
    renderModeSelection(gameId, game, { skipHistory, replaceHistory });
    return;
  }

  if (mode.selection) {
    const selectedValue = modeConfig[mode.selection.key];
    if (selectedValue === undefined) {
      renderModeOptionPicker(gameId, mode, { skipHistory, replaceHistory });
    } else {
      startMode(gameId, mode.id, { [mode.selection.key]: selectedValue }, { skipHistory, replaceHistory });
    }
    return;
  }

  if (mode.kind === 'view') {
    showModeView(game, mode, { skipHistory, replaceHistory });
    return;
  }
  startMode(gameId, mode.id, {}, { skipHistory, replaceHistory });
}

function handlePopState(event) {
  const route = event.state?.route || getHashRoute();
  state.isHandlingPopState = true;
  navigateToRoute(route, { skipHistory: true })
    .finally(() => { state.isHandlingPopState = false; });
}

// ---- Bootstrap -------------------------------------------------------------

function bindEvents() {
  window.addEventListener('popstate', handlePopState);

  document.addEventListener('keydown', (e) => {
    if (!state.currentQuestion?.useNumpad) return;
    const display = document.querySelector('#prompt .numpad-inline-display');
    if (!display) return;
    if (e.key >= '0' && e.key <= '9') handleNumpadKey(e.key, display);
    else if (e.key === 'Backspace')   handleNumpadKey('⌫', display);
    else if (e.key === 'Enter')       { e.preventDefault(); handleNumpadKey('✓', display); }
  });

  $('mascot-btn').addEventListener('click', openAnimalPicker);
  $('picker-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAnimalPicker();
  });

  $('game-back-btn').addEventListener('click', () => goBackToModeMenu());
  $('btn-go-home').addEventListener('click', () => goHome());
  $('btn-play-again').addEventListener('click', () => {
    if (!state.currentGame || !state.session) { goHome(); return; }
    startMode(state.session.gameId, state.session.modeId, state.session.modeConfig || {});
  });

  $('mode-menu-back-btn').addEventListener('click', () => goHome());
  $('mode-option-back-btn').addEventListener('click', goBackToModeMenu);
  $('mode-view-back-btn').addEventListener('click', goBackToModeMenu);

  // Esc key acts as the back button on every screen except home, walking
  // up one level at a time until reaching the home screen.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    // Close the animal picker first if it's open.
    const picker = $('picker-overlay');
    if (picker && picker.classList.contains('open')) {
      e.preventDefault();
      closeAnimalPicker();
      return;
    }

    const active = document.querySelector('.screen.active');
    if (!active || active.id === 'screen-home') return;

    const backBtn =
      active.querySelector('.back-btn') ||
      active.querySelector('#btn-go-home');
    if (backBtn) {
      e.preventDefault();
      backBtn.click();
    }
  });
}

async function init() {
  bindEvents();
  renderAnimalPicker();
  renderGameCards();
  updateHomeStats();
  updateMascotDisplay();
  updateHomeSubtitle();
  scheduleMascotSurprise();
  await navigateToRoute(getHashRoute(), { skipHistory: true });

  // Show picker on first ever load (no animal saved yet).
  const raw = localStorage.getItem(STORAGE_KEY);
  const hasSavedAnimal = raw && JSON.parse(raw).mascot;
  if (!hasSavedAnimal) openAnimalPicker();

  const activeScreen = document.querySelector('.screen.active');
  const activeScreenId = activeScreen ? activeScreen.id.replace('screen-', '') : 'home';
  window.history.replaceState(
    { screen: activeScreenId, route: state.currentRoute },
    '',
    `#${state.currentRoute}`,
  );

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js', { updateViaCache: 'none' })
        .then((registration) => setupUpdateChecks(registration))
        .catch(() => {});
    });
  }
}

// Cache-first PWA update flow:
//   - The service worker serves cached assets immediately (fast, offline-ready).
//   - This function asks the browser to re-check sw.js periodically. When the
//     file changes byte-for-byte, the browser installs the new worker in the
//     background and fires `updatefound`. Once it reaches the `installed`
//     state with an existing controller present, an update is ready to apply.
//   - We then show a small banner. On confirm, we tell the waiting worker to
//     skipWaiting(); the resulting `controllerchange` triggers a reload so
//     the new version takes over cleanly.
function setupUpdateChecks(registration) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const promptUpdate = (worker) => {
    showUpdateBanner(() => {
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  // A worker may already be waiting from a previous visit.
  if (registration.waiting && navigator.serviceWorker.controller) {
    promptUpdate(registration.waiting);
  }

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        promptUpdate(newWorker);
      }
    });
  });

  // Re-check for a new sw.js when the tab becomes visible and every 30 minutes.
  const checkForUpdate = () => registration.update().catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  setInterval(checkForUpdate, 30 * 60 * 1000);
}

function showUpdateBanner(onConfirm) {
  if (document.getElementById('update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.className = 'update-banner';
  banner.innerHTML = `
    <span class="update-banner-text">A new version is available.</span>
    <button type="button" class="update-banner-btn" id="update-banner-reload">Reload</button>
    <button type="button" class="update-banner-close" id="update-banner-close" aria-label="Dismiss">×</button>
  `;
  document.body.appendChild(banner);
  document.getElementById('update-banner-reload').addEventListener('click', () => {
    banner.remove();
    onConfirm();
  });
  document.getElementById('update-banner-close').addEventListener('click', () => {
    banner.remove();
  });
}

init();
