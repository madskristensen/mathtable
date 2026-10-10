import { LEVELS, BADGES, escapeHtml, isMastered, gameSkills, reviewSkills, masterySummary,
  recordLearning, recommendedLevel, completeLearningSession } from './learning.js';

const STORAGE_KEY = 'kids_hub_stats_v1';
const DEFAULT_ROUNDS = 10;
const MAX_HIGH_SCORES = 10;
const MASCOT_ANIMATION_DURATION_MS = 600;
const ANSWER_REVEAL_MS = 900;
const HOME_ROUTE = '/';
const USE_JS_VIEWPORT_HEIGHT =
  typeof CSS === 'undefined' ||
  typeof CSS.supports !== 'function' ||
  !CSS.supports('height', '100dvh');

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

const ANIMALS = ['🦊', '🐺', '🐯', '🐶', '🐱', '🦄'];
const DEFAULT_MASCOT = ANIMALS[0];
const REWARD_MASCOT = '\uD83E\uDD84';

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
  categoryFilter: 'all',
  gridView: false,
  answerTimeout: null,
  selectedLevel: 1,
  carouselCleanup: null,
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
    learning: {},
    levels: {},
    lastGame: null,
    passport: { games: [], categories: [], badges: [], improved: false },
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    const unlocked = parsed.passport?.badges?.includes('curious-explorer');
    const mascot = ANIMALS.includes(parsed.mascot) || (unlocked && parsed.mascot === REWARD_MASCOT)
      ? parsed.mascot : DEFAULT_MASCOT;
    return {
      ...defaultStats(),
      ...parsed,
      mascot,
      highScores: parsed.highScores || {},
      problems: parsed.problems || {},
      learning: parsed.learning || {},
      levels: parsed.levels || {},
      passport: { ...defaultStats().passport, ...parsed.passport },
    };
  } catch (error) {
    reportStorageError('Your progress could not be read. Saved data has not been changed.', error);
    throw error;
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    reportStorageError('Your progress could not be saved. Check that browser storage is available.', error);
    throw error;
  }
}

function reportStorageError(message, error) {
  console.error(message, error);
  let notice = $('storage-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'storage-notice';
    notice.className = 'update-banner';
    notice.setAttribute('role', 'alert');
    document.body.appendChild(notice);
  }
  notice.textContent = message;
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
  return loadStats().mascot;
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

function recordProblemResult(fact, correct) {
  const stats = loadStats();
  const key = fact.key || `${fact.a}x${fact.b}`;
  const entry = stats.problems[key] || (stats.problems[key] = { correct: 0, wrong: 0 });
  entry[correct ? 'correct' : 'wrong'] += 1;
  saveStats(stats);
}

// ---- Mascot UI -------------------------------------------------------------

function applyAnimalTheme(animal) {
  // Apply on the root <html> element (not <body>) so the per-animal
  // `--bg-*` custom properties also cascade to the safe-area paint layers.
  // iOS Safari does not reliably re-sample browser chrome colors until the
  // page is reopened, so the dynamic part has to be painted by the page.
  document.documentElement.dataset.animal = animal || DEFAULT_MASCOT;
  const rootStyle = getComputedStyle(document.documentElement);
  const bgStart = rootStyle.getPropertyValue('--bg-start').trim();
  if (bgStart) {
    document.documentElement.style.backgroundColor = bgStart;
    document.body.style.backgroundColor = bgStart;
    setThemeColorMeta(bgStart);
  }
}

function setThemeColorMeta(color) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

function updateDynamicViewportHeight() {
  if (!USE_JS_VIEWPORT_HEIGHT) return;
  const height = window.visualViewport?.height || window.innerHeight;
  if (height) document.documentElement.style.setProperty('--app-height', `${height}px`);
}

function initDynamicViewportHeight() {
  updateDynamicViewportHeight();
  if (!USE_JS_VIEWPORT_HEIGHT) return;
  window.addEventListener('resize', updateDynamicViewportHeight);
  window.addEventListener('orientationchange', updateDynamicViewportHeight);
  window.visualViewport?.addEventListener('resize', updateDynamicViewportHeight);
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

  const animals = stats.passport.badges.includes('curious-explorer') ? [...ANIMALS, REWARD_MASCOT] : ANIMALS;
  animals.forEach((animal) => {
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
  if (state.carouselCleanup) state.carouselCleanup();
  carousel.classList.toggle('games-grid-view', state.gridView);
  dotsContainer.hidden = state.gridView;
  carousel.innerHTML = '';
  dotsContainer.innerHTML = '';

  const stats = loadStats();
  const gameIds = Object.keys(GAME_REGISTRY).filter((id) => state.categoryFilter === 'all'
    || GAME_REGISTRY[id].category === state.categoryFilter);
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
      scoreLabel: `${masterySummary(stats, gameId).mastered} skills mastered`,
      onClick: () => startGame(gameId),
    });
    const mastery = masterySummary(stats, gameId);
    const detail = document.createElement('span');
    detail.className = 'game-card-progress';
    detail.textContent = `${mastery.practiced} practiced · ${highScoreLabel(gameId)}`;
    card.appendChild(detail);
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
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateActiveDot();
    });
  };
  carousel.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateActiveDot);
  // Initial sync once layout has settled.
  requestAnimationFrame(updateActiveDot);

  // Mouse drag to scroll the carousel on desktop.
  let isDown = false, startX = 0, scrollLeft = 0;
  const onMouseDown = (e) => {
    if (state.gridView) return;
    isDown = true;
    carousel.style.cursor = 'grabbing';
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  };
  carousel.addEventListener('mousedown', onMouseDown);
  const stopDrag = () => { isDown = false; carousel.style.cursor = ''; };
  carousel.addEventListener('mouseleave', stopDrag);
  carousel.addEventListener('mouseup', stopDrag);
  const onMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    carousel.scrollLeft = scrollLeft - ((e.pageX - carousel.offsetLeft) - startX);
  };
  carousel.addEventListener('mousemove', onMouseMove);
  state.carouselCleanup = () => {
    cancelAnimationFrame(scrollFrame);
    carousel.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', updateActiveDot);
    carousel.removeEventListener('mousedown', onMouseDown);
    carousel.removeEventListener('mouseleave', stopDrag);
    carousel.removeEventListener('mouseup', stopDrag);
    carousel.removeEventListener('mousemove', onMouseMove);
  };
}

function renderHomeTools() {
  const root = $('category-filters');
  root.innerHTML = '';
  Object.entries({ all: { label: 'All subjects' }, ...CATEGORIES }).forEach(([id, category]) => {
    const button = document.createElement('button');
    button.className = 'learning-btn';
    button.textContent = category.label;
    button.setAttribute('aria-pressed', String(state.categoryFilter === id));
    button.addEventListener('click', () => {
      state.categoryFilter = id;
      renderHomeTools();
      renderGameCards();
      $('games-grid').scrollLeft = 0;
    });
    root.appendChild(button);
  });
  const last = loadStats().lastGame;
  $('continue-btn').hidden = !last || !GAME_REGISTRY[last.gameId];
  if (last && GAME_REGISTRY[last.gameId]) $('continue-btn').textContent = `Continue ${GAME_REGISTRY[last.gameId].title}`;
}

function showPassport(options = {}) {
  stopActiveSession();
  const stats = loadStats();
  const stamps = Object.entries(GAME_REGISTRY).map(([id, game]) => {
    const earned = stats.passport.games.includes(id);
    return `<div class="passport-stamp ${earned ? 'earned' : ''}"><span>${game.icon}</span>
      <strong>${escapeHtml(game.title)}</strong><small>${earned ? 'Explored!' : 'Finish a game to earn this stamp'}</small></div>`;
  }).join('');
  const badges = BADGES.map((badge) => `<div class="passport-stamp ${stats.passport.badges.includes(badge.id) ? 'earned' : ''}">
    <span>${badge.icon}</span><strong>${badge.title}</strong><small>${badge.description}</small>
    <small>${stats.passport.badges.includes(badge.id) ? 'Earned!' : 'Not earned yet'}</small></div>`).join('');
  $('passport-body').innerHTML = `<h3>Adventure stamps</h3><div class="passport-grid">${stamps}</div>
    <h3>Improvement rewards</h3><div class="passport-grid">${badges}</div>`;
  showScreen('passport', { ...options, route: '/passport' });
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
  subtitle.textContent = summaries.length ? 'Keep exploring and watch your skills grow!' : 'Pick a game and start an adventure!';
}

// ---- Mode menu / picker ----------------------------------------------------

function getGameModes(game) {
  const modes = Array.isArray(game.modes) ? game.modes : [];
  return [...modes,
    { id: 'review', title: 'Practice my tricky ones', icon: '💪', description: 'Revisit missed skills at your own pace.', kind: 'play' },
    { id: 'mastery', title: 'My Skills', icon: '🌱', description: 'See the skills you are learning and mastering.', kind: 'view' },
  ];
}

function getMode(game, modeId) {
  return getGameModes(game).find((mode) => mode.id === modeId) || null;
}

function renderModeCards(gameId, game) {
  const list = $('mode-list');
  list.innerHTML = '';

  getGameModes(game).forEach((mode, index) => {
    if (mode.id === 'review' && !reviewSkills(loadStats(), gameId).length) return;
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
  stopActiveSession();
  state.pendingGameId = gameId;
  state.selectedLevel = recommendedLevel(loadStats(), gameId);
  const levels = game.levels || ['Fewer choices', 'More choices', 'All choices'];
  $('level-select').innerHTML = LEVELS.map((label, index) => `<option value="${index + 1}">${label}</option>`).join('');
  $('level-select').value = String(state.selectedLevel);
  $('level-description').textContent = levels[state.selectedLevel - 1];
  $('mode-game-title').textContent = game.title;
  document.querySelector('#screen-mode-menu .mode-subtitle').textContent = 'Pick how you want to play';
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
      startMode(state.pendingGameId, mode.id, { [selection.key]: value, level: state.selectedLevel });
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

  if (mode.id === 'mastery') {
    const stats = loadStats();
    const skills = gameSkills(stats, game.id);
    const summary = masterySummary(stats, game.id);
    viewRoot.innerHTML = `<p>${summary.mastered} mastered / ${summary.practiced} practiced. Mastery needs at least three correct answers and 80% accuracy across the last five tries.</p>
      <div class="skills-grid">${skills.map(([, skill]) => `<div class="skill-tile ${isMastered(skill) ? 'mastered' : ''}">
        <strong>${escapeHtml(skill.label)}</strong><span>${isMastered(skill) ? 'Mastered' : 'Learning'}${skill.needsReview ? ' · Ready to review' : ''}</span>
      </div>`).join('') || '<p>Play a game to start growing your skills!</p>'}</div>`;
    return;
  }
  viewRoot.innerHTML = typeof game.renderModeView === 'function'
    ? await game.renderModeView(mode.id, { stats: loadStats() })
    : '<p class="mode-view-empty">Nothing to show yet.</p>';
}

async function chooseMode(gameId, modeId) {
  const game = await loadGame(gameId);
  state.currentGame = game;
  const mode = getMode(game, modeId);
  if (!mode) { startMode(gameId, null); return; }
  if (mode.selection) { renderModeOptionPicker(gameId, mode); return; }
  if (mode.kind === 'view') { showModeView(game, mode); return; }
  startMode(gameId, mode.id, { level: state.selectedLevel });
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
  state.session.answerLocked = false;
  $('answer-explanation').hidden = true;
  $('answer-explanation').innerHTML = '';
  $('next-question-btn').hidden = true;

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
  document.querySelector('.game-body').scrollTop = 0;
  if (question.onRender) question.onRender();
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
  if (!state.session || state.session.ended || state.session.answerLocked || !display
      || !$('screen-game').classList.contains('active')) return;

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

function stopActiveSession() {
  stopSessionTimer();
  clearTimeout(state.answerTimeout);
  state.answerTimeout = null;
  if (state.currentQuestion?.onLeave) state.currentQuestion.onLeave();
  if (state.session) state.session.ended = true;
  $('next-question-btn').hidden = true;
  $('answer-explanation').hidden = true;
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
  if (!state.session || state.session.ended || state.session.answerLocked) return;
  const session = state.session;
  session.answerLocked = true;

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
  if (fact) recordProblemResult(fact, isCorrect);
  const stats = loadStats();
  const improved = recordLearning(stats, session.gameId, state.currentQuestion,
    state.currentQuestion.sourceModeId || session.modeId, isCorrect);
  saveStats(stats);
  if (improved) setFeedback(`You got a tricky one right! ${getMascot()}`, 'correct-fb');

  if (onReveal) onReveal(isCorrect);

  updateSessionDisplay();
  if ((!isCorrect && !session.timedSeconds) || session.modeId === 'practice' || session.modeId === 'review') {
    const explanation = $('answer-explanation');
    explanation.innerHTML = state.currentQuestion.explanation;
    explanation.hidden = false;
    $('next-question-btn').hidden = false;
    $('next-question-btn').textContent = session.maxRounds && session.round + 1 >= session.maxRounds ? 'See results' : 'Next';
    $('next-question-btn').focus({ preventScroll: true });
    $('next-question-btn').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } else {
    state.answerTimeout = setTimeout(() => {
      if (state.session !== session || session.ended) return;
      advanceRound();
    }, ANSWER_REVEAL_MS);
  }
}

function submitAnswer(value, selectedButton) {
  if (!state.session || state.session.ended || state.session.answerLocked) return;
  lockAnswers();
  applyAnswerOutcome(value, {
    correctFeedback: (delta) => `Nice! ${getMascot()} +${delta}`,
    wrongFeedback: () => `Oops! Try the next one ${getMascot()}`,
    onReveal: (isCorrect) => revealAnswerButtons(isCorrect, selectedButton),
  });
}

function submitNumpadAnswer(value) {
  if (!state.session || state.session.ended || state.session.answerLocked) return;
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
  const session = state.session;
  clearTimeout(state.answerTimeout);
  $('next-question-btn').hidden = true;
  if (state.currentQuestion?.onLeave) state.currentQuestion.onLeave();
  state.session.round += 1;

  if (state.session.maxRounds && state.session.round >= state.session.maxRounds) {
    endGame();
    return;
  }
  updateSessionDisplay();
  const question = await createSessionQuestion(session);
  if (state.session !== session || session.ended) return;
  state.currentQuestion = question;
  renderQuestion();
}

async function createSessionQuestion(session) {
  const stats = loadStats();
  let skill;
  if (session.modeId === 'review') {
    skill = stats.learning[session.gameId]?.[session.reviewKeys[session.round]];
    if (!skill) throw new Error('This review skill is no longer available.');
  } else if (!session.timedSeconds && session.round % 4 === 3) {
    skill = reviewSkills(stats, session.gameId).find(([key]) => key !== state.currentQuestion?.learning.key)?.[1];
  }
  const context = skill ? { ...session, modeId: skill.modeId, reviewItem: skill.data } : session;
  const question = await state.currentGame.createQuestion(context);
  if (!question.learning || !question.explanation) throw new Error('This game is missing its learning description.');
  question.sourceModeId = context.modeId;
  if (question.answers) {
    const correct = question.answers.find((answer) => answer.value === question.correctValue);
    if (!correct) throw new Error('The question is missing its correct answer.');
    const count = session.level + 1;
    const choices = question.answers.filter((answer) => answer !== correct).slice(0, count - 1);
    choices.splice(Math.floor(Math.random() * (choices.length + 1)), 0, correct);
    question.answers = choices;
  }
  return question;
}

async function startMode(gameId, modeId, modeConfig = {}, options = {}) {
  stopActiveSession();
  setTimerVisible(false);

  const game = state.currentGame;
  const mode = modeId ? getMode(game, modeId) : null;
  const stats = loadStats();
  const level = Number(modeConfig.level || recommendedLevel(stats, gameId));
  if (![1, 2, 3].includes(level)) throw new Error('Choose a learning level from 1 to 3.');
  modeConfig = { ...modeConfig, level };
  const reviewKeys = modeId === 'review' ? reviewSkills(stats, gameId).slice(0, 10).map(([key]) => key) : [];
  if (modeId === 'review' && !reviewKeys.length) {
    renderModeSelection(gameId, game, options);
    document.querySelector('#screen-mode-menu .mode-subtitle').textContent = 'No tricky skills to review yet. Pick a game mode to start learning!';
    return;
  }

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
    answerLocked: true,
    level,
    reviewKeys,
  };

  if (modeId === 'review') {
    session.maxRounds = reviewKeys.length;
  } else if (typeof game.initSession === 'function') {
    Object.assign(session, game.initSession(modeId, modeConfig, session) || {});
  }

  state.currentMode = mode;
  state.session = session;
  state.pendingGameId = gameId;
  if (modeId !== 'review') {
    stats.lastGame = { gameId, modeId, modeConfig };
    saveStats(stats);
  }

  const modeSuffix = mode ? ` — ${mode.title}` : '';
  $('game-title').textContent = `${game.title}${modeSuffix} · ${LEVELS[level - 1]}`;
  updateMascotDisplay();
  updateSessionDisplay();

  $('prompt').innerHTML = '<div class="question-title">Loading…</div>';
  $('answers').innerHTML = '';
  showScreen('game', { ...options, route: buildRoute({ gameId, modeId, modeConfig }) });

  const question = await createSessionQuestion(session);
  if (state.session !== session || session.ended) return;
  state.currentQuestion = question;
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
  stopActiveSession();

  const session = state.session;
  const stats = loadStats();
  stats.bestStreak = Math.max(stats.bestStreak, session.bestStreak);
  stats.totalCorrect += session.correct;
  const learningOutcome = completeLearningSession(stats, session, GAME_REGISTRY[session.gameId].category);
  saveStats(stats);

  // Skip high-score entries for sessions with no answers (e.g. immediate timeout).
  const isHighScore = session.total > 0 && session.modeId !== 'review'
    && saveHighScore(session.gameId, session.score, session.correct, session.total);
  $('new-high-score').style.display = isHighScore ? '' : 'none';

  $('result-score').textContent = session.score;
  $('result-correct').textContent = `${session.correct}/${session.total}`;
  $('result-best-streak').textContent = session.bestStreak;
  const mastery = masterySummary(stats, session.gameId);
  $('learning-results').innerHTML = `<p>${mastery.mastered} skills mastered · ${mastery.practiced} practiced</p>
    ${learningOutcome.promoted ? `<p>Ready to grow! Try ${LEVELS[recommendedLevel(stats, session.gameId) - 1]} next time.</p>` : ''}
    ${learningOutcome.rewards.map((id) => { const badge = BADGES.find((item) => item.id === id); return `<p>${badge.icon} New reward: ${badge.title}</p>`; }).join('')}`;
  $('btn-review').hidden = !reviewSkills(stats, session.gameId).length;
  renderAnimalPicker();

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
  stopActiveSession();
  setTimerVisible(false);

  state.currentGame = null;
  state.currentMode = null;
  state.currentQuestion = null;
  state.session = null;
  state.pendingGameId = null;

  updateHomeStats();
  updateMascotDisplay();
  renderGameCards();
  renderHomeTools();
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
  stopActiveSession();
  const { skipHistory = true, replaceHistory = false } = options;
  const { gameId, modeId, modeConfig } = parseRoute(route);

  if (gameId === 'passport') {
    showPassport({ skipHistory, replaceHistory });
    return;
  }

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
      startMode(gameId, mode.id, modeConfig, { skipHistory, replaceHistory });
    }
    return;
  }

  if (mode.kind === 'view') {
    showModeView(game, mode, { skipHistory, replaceHistory });
    return;
  }
  startMode(gameId, mode.id, modeConfig, { skipHistory, replaceHistory });
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
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Learning Hub operation failed:', event.reason);
    const active = document.querySelector('.screen.active');
    if (active?.id === 'screen-game') {
      stopActiveSession();
      setFeedback('Could not load this activity. Go back and try again.', 'wrong-fb');
    } else {
      alert('Could not open this activity. Please try again.');
    }
  });
  $('level-select').addEventListener('change', () => {
    state.selectedLevel = Number($('level-select').value);
    $('level-description').textContent = (state.currentGame.levels || ['Fewer choices', 'More choices', 'All choices'])[state.selectedLevel - 1];
  });
  $('all-games-btn').addEventListener('click', () => {
    state.gridView = !state.gridView;
    $('all-games-btn').textContent = state.gridView ? 'Show carousel' : 'See all games';
    $('all-games-btn').setAttribute('aria-pressed', String(state.gridView));
    renderGameCards();
  });
  $('passport-btn').addEventListener('click', () => showPassport());
  $('passport-back-btn').addEventListener('click', () => goHome());
  $('continue-btn').addEventListener('click', async () => {
    const last = loadStats().lastGame;
    if (!last) return;
    state.currentGame = await loadGame(last.gameId);
    updateDailyStreak(loadStats());
    state.pendingGameId = last.gameId;
    startMode(last.gameId, last.modeId, last.modeConfig);
  });
  $('next-question-btn').addEventListener('click', () => {
    if (state.session?.answerLocked && !state.session.ended && !$('next-question-btn').hidden) advanceRound();
  });
  $('btn-review').addEventListener('click', () => {
    startMode(state.session.gameId, 'review', { level: state.session.level });
  });

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
  initDynamicViewportHeight();
  bindEvents();
  renderAnimalPicker();
  renderGameCards();
  renderHomeTools();
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
