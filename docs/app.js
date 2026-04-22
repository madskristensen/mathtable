const STORAGE_KEY = 'kids_hub_stats_v1';
const DEFAULT_ROUNDS = 10;
const MAX_HIGH_SCORES = 10;
const MASCOT_ANIMATION_DURATION_MS = 450;
const HOME_ROUTE = '/';

const GAME_REGISTRY = {
  multiplication: {
    title: 'Multiplication',
    icon: '✖️',
    description: 'Quick Game, Practice, Challenge, and Multiplication Map.',
    defaultMode: 'quick',
    loader: () => import('./games/multiplication.js?v=15'),
  },
  addition: {
    title: 'Addition',
    icon: '➕',
    description: 'Quick Game, Practice, Challenge, and Addition Map.',
    defaultMode: 'quick',
    loader: () => import('./games/addition.js'),
  },
  subtraction: {
    title: 'Subtraction',
    icon: '➖',
    description: 'Quick Game, Practice, Challenge, and Subtraction Map.',
    defaultMode: 'quick',
    loader: () => import('./games/subtraction.js'),
  },
  division: {
    title: 'Division',
    icon: '➗',
    description: 'Quick Game, Practice, Challenge, and Division Map.',
    defaultMode: 'quick',
    loader: () => import('./games/division.js'),
  },
  clock: {
    title: 'Tell Time (Analog Clock)',
    icon: '🕒',
    description: 'Quick Game, Practice, and Challenge.',
    defaultMode: 'quick',
    loader: () => import('./games/clock.js?v=15'),
  },
  timemath: {
    title: 'Time Math',
    icon: '⏱️',
    description: 'Add and subtract time. Quick Game, Practice, and Challenge.',
    defaultMode: 'quick',
    loader: () => import('./games/timemath.js'),
  },
  reading: {
    title: 'Word Reading',
    icon: '🔤',
    description: 'Read the word and pick the matching picture!',
    defaultMode: 'quick',
    loader: () => import('./games/reading.js'),
  },
};

const ANIMALS = ['🦊', '🐺', '🐯', '🐶', '🐱'];
const DEFAULT_MASCOT = ANIMALS[0];

const state = {
  loadedGames: {},
  currentGame: null,
  currentMode: null,
  currentQuestion: null,
  session: null,
  timerInterval: null,
  timeLeft: 0,
  pendingGameId: null,
  pendingMode: null,
  mascotReactionTimeout: null,
  isHandlingPopState: false,
  currentRoute: HOME_ROUTE,
};

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
  if (modeId) {
    route += `/${encodeURIComponent(modeId)}`;
  }

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
    .map((segment) => decodeURIComponent(segment));

  const modeConfig = {};
  routeUrl.searchParams.forEach((value, key) => {
    modeConfig[key] = value;
  });

  return {
    normalized,
    gameId: segments[0] || null,
    modeId: segments[1] || null,
    modeConfig,
  };
}

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

function updateDailyStreak(stats) {
  const today = new Date().toDateString();
  if (stats.lastPlayDate === today) return;

  if (!stats.lastPlayDate) {
    stats.dailyStreak = 1;
  } else {
    const diff = Math.round((new Date(today) - new Date(stats.lastPlayDate)) / 86400000);
    stats.dailyStreak = diff === 1 ? stats.dailyStreak + 1 : 1;
  }

  stats.lastPlayDate = today;
  saveStats(stats);
}

function getVisibleDailyStreak(stats) {
  if (!stats.lastPlayDate) return 0;
  const today = new Date().toDateString();
  const diff = Math.round((new Date(today) - new Date(stats.lastPlayDate)) / 86400000);
  return diff > 1 ? 0 : stats.dailyStreak;
}

function showScreen(id, options = {}) {
  const { skipHistory = false, replaceHistory = false, route = state.currentRoute || getHashRoute() } = options;
  state.currentRoute = normalizeRoute(route);
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');

  if (skipHistory || state.isHandlingPopState) return;

  const nextState = { screen: id, route: state.currentRoute };
  const nextUrl = `#${state.currentRoute}`;
  if (replaceHistory) {
    window.history.replaceState(nextState, '', nextUrl);
  } else {
    window.history.pushState(nextState, '', nextUrl);
  }
}

function getMascot() {
  const mascot = loadStats().mascot;
  return ANIMALS.includes(mascot) ? mascot : DEFAULT_MASCOT;
}

function applyAnimalTheme(animal) {
  document.body.dataset.animal = animal || DEFAULT_MASCOT;
}

function updateMascotDisplay() {
  const mascot = getMascot();
  const inGameEl = document.getElementById('mascot');
  if (inGameEl) inGameEl.textContent = mascot;
  const homeBtn = document.getElementById('mascot-btn');
  if (homeBtn) homeBtn.textContent = mascot;
  applyAnimalTheme(mascot);
}

function animateMascotReaction(isCorrect) {
  const mascot = document.getElementById('mascot');
  if (!mascot) return;

  mascot.classList.remove('celebrate', 'shake');
  void mascot.offsetWidth;
  mascot.classList.add(isCorrect ? 'celebrate' : 'shake');

  if (state.mascotReactionTimeout) {
    clearTimeout(state.mascotReactionTimeout);
  }

  state.mascotReactionTimeout = setTimeout(() => {
    mascot.classList.remove('celebrate', 'shake');
    state.mascotReactionTimeout = null;
  }, MASCOT_ANIMATION_DURATION_MS);
}

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
    if (elapsed >= DURATION_MS) {
      canvas.remove();
      return;
    }
    const alpha = elapsed < DURATION_MS * 0.7 ? 1 : 1 - (elapsed - DURATION_MS * 0.7) / (DURATION_MS * 0.3);
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
      if (p.shape === 'rect') {
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function updateHomeStats() {
  const stats = loadStats();
  document.getElementById('home-best-streak').textContent = stats.bestStreak;
  document.getElementById('home-total').textContent = stats.totalCorrect;
  document.getElementById('daily-count').textContent = getVisibleDailyStreak(stats);
}

function openAnimalPicker() {
  document.getElementById('picker-overlay').classList.add('open');
}

function closeAnimalPicker() {
  document.getElementById('picker-overlay').classList.remove('open');
}

function renderAnimalPicker() {
  const stats = loadStats();
  const root = document.getElementById('animal-options');
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

async function loadGame(gameId) {
  if (!state.loadedGames[gameId]) {
    const module = await GAME_REGISTRY[gameId].loader();
    state.loadedGames[gameId] = module.game;
  }
  return state.loadedGames[gameId];
}

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

async function renderGameCards() {
  const carousel = document.getElementById('games-grid');
  const dotsContainer = document.getElementById('carousel-dots');
  carousel.innerHTML = '';
  dotsContainer.innerHTML = '';

  const gameIds = Object.keys(GAME_REGISTRY);

  gameIds.forEach((gameId, index) => {
    const game = GAME_REGISTRY[gameId];
    const card = document.createElement('button');
    card.className = 'game-card';
    card.style.setProperty('--card-accent', CARD_ACCENTS[index % CARD_ACCENTS.length]);
    const best = getHighScore(gameId);
    const highScoreLabel = best ? `High score: ${best.score}` : 'High score: —';
    card.innerHTML = `
      <span class="game-card-icon">${game.icon}</span>
      <span class="game-card-title">${game.title}</span>
      <span class="game-card-desc">${game.description}</span>
      <span class="game-card-score">${highScoreLabel}</span>
    `;
    card.addEventListener('click', () => startGame(gameId));
    carousel.appendChild(card);

    // dot
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to ${game.title}`);
    dot.addEventListener('click', () => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    dotsContainer.appendChild(dot);
  });

  // Update active dot on scroll
  const dots = dotsContainer.querySelectorAll('.carousel-dot');
  const cards = carousel.querySelectorAll('.game-card');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio >= 0.5) {
          const idx = Array.from(cards).indexOf(entry.target);
          dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        }
      });
    },
    { root: carousel, threshold: 0.5 }
  );
  cards.forEach((c) => observer.observe(c));

  // Mouse drag to scroll
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  carousel.addEventListener('mousedown', (e) => {
    isDown = true;
    carousel.style.cursor = 'grabbing';
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });
  carousel.addEventListener('mouseleave', () => { isDown = false; carousel.style.cursor = ''; });
  carousel.addEventListener('mouseup', () => { isDown = false; carousel.style.cursor = ''; });
  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    carousel.scrollLeft = scrollLeft - (x - startX);
  });
}

function getGameHighScoreEntries(stats, gameId) {
  const entries = [];
  const primary = stats.highScores[gameId];
  if (Array.isArray(primary)) {
    entries.push(...primary);
  }

  const legacyPrefix = `${gameId}:`;
  Object.entries(stats.highScores).forEach(([key, value]) => {
    if (key.startsWith(legacyPrefix) && Array.isArray(value)) {
      entries.push(...value);
    }
  });

  return entries.sort((a, b) => b.score - a.score).slice(0, MAX_HIGH_SCORES);
}

function getHighScore(gameId) {
  const stats = loadStats();
  return getGameHighScoreEntries(stats, gameId)[0] || null;
}

function saveHighScore(gameId, score, correct, total) {
  const stats = loadStats();
  const key = gameId;
  const list = getGameHighScoreEntries(stats, gameId);

  list.push({
    score,
    correct,
    total,
    date: new Date().toLocaleDateString(),
  });

  list.sort((a, b) => b.score - a.score);
  stats.highScores[key] = list.slice(0, MAX_HIGH_SCORES);

  const legacyPrefix = `${gameId}:`;
  Object.keys(stats.highScores).forEach((existingKey) => {
    if (existingKey.startsWith(legacyPrefix)) {
      delete stats.highScores[existingKey];
    }
  });

  saveStats(stats);

  const best = stats.highScores[key][0];
  return best && best.score === score;
}

function updateHomeSubtitle() {
  const gameSummaries = Object.entries(GAME_REGISTRY).map(([gameId, metadata]) => {
    const best = getHighScore(gameId);
    return best ? `${metadata.title} best ${best.score}` : null;
  });

  const filteredSummaries = gameSummaries.filter(Boolean);
  const subtitle = document.querySelector('.subtitle');
  subtitle.textContent = filteredSummaries.length > 0
    ? `${filteredSummaries.join(' • ')}.`
    : 'Pick a game and keep your streak alive!';
}

function setFeedback(text, className = '') {
  const feedback = document.getElementById('feedback');
  feedback.className = `feedback ${className}`.trim();
  feedback.textContent = text;
}

function updateSessionDisplay() {
  const session = state.session;
  if (!session) return;

  document.getElementById('streak-count').textContent = session.streak;
  document.getElementById('score-count').textContent = session.score;

  const progressEl = document.getElementById('round-progress');
  if (session.maxRounds) {
    progressEl.textContent = `${session.round + 1}/${session.maxRounds}`;
  } else {
    progressEl.textContent = `${session.total} answered`;
  }
}

function renderQuestion() {
  const question = state.currentQuestion;
  const prompt = document.getElementById('prompt');
  const answers = document.getElementById('answers');

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

function renderNumpad(container) {
  const display = document.querySelector('#prompt .numpad-inline-display');
  const grid = document.createElement('div');
  grid.className = 'numpad-grid';

  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '✓'];
  keys.forEach((key) => {
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
  if (state.session && state.session.ended) return;
  if (!display) return;

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

function submitNumpadAnswer(value) {
  document.querySelectorAll('.numpad-btn').forEach((btn) => { btn.disabled = true; });
  const isCorrect = value === state.currentQuestion.correctValue;
  state.session.total += 1;

  if (isCorrect) {
    state.session.correct += 1;
    state.session.streak += 1;
    state.session.bestStreak = Math.max(state.session.bestStreak, state.session.streak);
    state.session.score += 10 + Math.min(state.session.streak * 2, 20);
    setFeedback(`Nice! ${getMascot()} +${10 + Math.min(state.session.streak * 2, 20)}`, 'correct-fb');
    animateMascotReaction(true);
    launchConfetti();
  } else {
    state.session.streak = 0;
    setFeedback(`Oops! The answer was ${state.currentQuestion.correctValue} ${getMascot()}`, 'wrong-fb');
    animateMascotReaction(false);
  }

  const fact = state.currentQuestion.meta && state.currentQuestion.meta.fact;
  if (fact) {
    recordProblemResult(fact.a, fact.b, isCorrect);
  }

  const display = document.querySelector('#prompt .numpad-inline-display');
  if (display) {
    display.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  updateSessionDisplay();

  setTimeout(() => {
    if (!state.session || state.session.ended) return;
    advanceRound();
  }, 900);
}

function stopSessionTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function setTimerVisible(isVisible) {
  const timer = document.getElementById('timer-display');
  timer.style.display = isVisible ? '' : 'none';
}

function startSessionTimer(seconds) {
  stopSessionTimer();
  state.timeLeft = seconds;
  const timerValue = document.getElementById('timer-value');
  timerValue.textContent = String(state.timeLeft);
  setTimerVisible(true);

  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    timerValue.textContent = String(Math.max(state.timeLeft, 0));

    if (state.timeLeft <= 0) {
      stopSessionTimer();
      if (state.session && !state.session.ended) {
        endGame();
      }
    }
  }, 1000);
}

function getGameModes(game) {
  return Array.isArray(game.modes) ? game.modes : [];
}

function getMode(game, modeId) {
  return getGameModes(game).find((mode) => mode.id === modeId) || null;
}

function renderModeCards(gameId, game) {
  const list = document.getElementById('mode-list');
  list.innerHTML = '';

  getGameModes(game).forEach((mode, index) => {
    const btn = document.createElement('button');
    btn.className = 'mode-card';
    btn.style.setProperty('--mode-accent', CARD_ACCENTS[index % CARD_ACCENTS.length]);
    const best = mode.kind === 'play' ? getHighScore(gameId) : null;
    const highScoreLabel = mode.kind === 'play'
      ? (best ? `High score: ${best.score}` : 'High score: —')
      : '';
    btn.innerHTML = `
      <span class="mode-card-icon">${mode.icon || '🎮'}</span>
      <span class="mode-card-title">${mode.title}</span>
      <span class="mode-card-desc">${mode.description || ''}</span>
      <span class="mode-card-score">${highScoreLabel}</span>
    `;
    btn.addEventListener('click', () => chooseMode(gameId, mode.id));
    list.appendChild(btn);
  });
}

function renderModeSelection(gameId, game, options = {}) {
  const { skipHistory = false, replaceHistory = false } = options;
  state.pendingGameId = gameId;
  state.pendingMode = null;

  document.getElementById('mode-game-title').textContent = game.title;
  renderModeCards(gameId, game);
  showScreen('mode-menu', {
    skipHistory,
    replaceHistory,
    route: buildRoute({ gameId }),
  });
}

function renderModeOptionPicker(gameId, mode, options = {}) {
  const { skipHistory = false, replaceHistory = false } = options;
  state.pendingGameId = gameId;
  state.pendingMode = mode;
  const optionsWrap = document.getElementById('mode-option-grid');
  optionsWrap.innerHTML = '';

  const selection = mode.selection;
  document.getElementById('mode-option-title').textContent = selection.label;

  selection.options.forEach((option) => {
    const value = typeof option === 'object' ? option.value : option;
    const label = typeof option === 'object' ? option.label : String(option);

    const btn = document.createElement('button');
    btn.className = 'table-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      startMode(state.pendingGameId, mode.id, {
        [selection.key]: value,
      });
    });
    optionsWrap.appendChild(btn);
  });

  showScreen('mode-option-picker', {
    skipHistory,
    replaceHistory,
    route: buildRoute({ gameId, modeId: mode.id }),
  });
}

function updateModeViewTitle(title) {
  document.getElementById('mode-view-title').textContent = title;
}

async function chooseMode(gameId, modeId) {
  const game = await loadGame(gameId);
  const mode = getMode(game, modeId);
  if (!mode) {
    startMode(gameId, null);
    return;
  }

  if (mode.selection) {
    renderModeOptionPicker(gameId, mode);
    return;
  }

  if (mode.kind === 'view') {
    showModeView(game, mode);
    return;
  }

  startMode(gameId, mode.id);
}

function showModeView(game, mode, options = {}) {
  const { skipHistory = false, replaceHistory = false } = options;
  state.pendingGameId = game.id;
  state.pendingMode = mode;
  const viewRoot = document.getElementById('mode-view-body');
  updateModeViewTitle(`${game.title} — ${mode.title}`);

  if (typeof game.renderModeView === 'function') {
    viewRoot.innerHTML = game.renderModeView(mode.id, { stats: loadStats() });
  } else {
    viewRoot.innerHTML = '<p class="mode-view-empty">Nothing to show yet.</p>';
  }

  showScreen('mode-view', {
    skipHistory,
    replaceHistory,
    route: buildRoute({ gameId: game.id, modeId: mode.id }),
  });
}

function startMode(gameId, modeId, modeConfig = {}, options = {}) {
  const { skipHistory = false, replaceHistory = false } = options;
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
  document.getElementById('game-title').textContent = `${game.title}${modeSuffix}`;
  updateMascotDisplay();
  updateSessionDisplay();

  state.currentQuestion = game.createQuestion(state.session);
  renderQuestion();
  showScreen('game', {
    skipHistory,
    replaceHistory,
    route: buildRoute({ gameId, modeId, modeConfig }),
  });

  if (session.timedSeconds > 0) {
    startSessionTimer(session.timedSeconds);
  }
}

async function startGame(gameId) {
  const game = await loadGame(gameId);
  const stats = loadStats();
  updateDailyStreak(stats);

  state.currentGame = game;

  const modes = getGameModes(game);
  if (modes.length > 0) {
    renderModeSelection(gameId, game);
    return;
  }

  startMode(gameId, null);
}

function lockAnswers() {
  document.querySelectorAll('.answer-btn').forEach((btn) => {
    btn.disabled = true;
  });
}

function revealAnswer(isCorrect, selectedButton) {
  const { correctValue } = state.currentQuestion;
  document.querySelectorAll('.answer-btn').forEach((btn) => {
    const value = btn.dataset.value;
    if (value === String(correctValue)) {
      btn.classList.add('correct');
    }
  });
  if (!isCorrect && selectedButton) selectedButton.classList.add('wrong');
}

function recordProblemResult(a, b, correct) {
  const stats = loadStats();
  const key = `${a}x${b}`;
  if (!stats.problems[key]) {
    stats.problems[key] = { correct: 0, wrong: 0 };
  }

  if (correct) {
    stats.problems[key].correct += 1;
  } else {
    stats.problems[key].wrong += 1;
  }

  saveStats(stats);
}

function advanceRound() {
  if (!state.session || state.session.ended) return;

  state.session.round += 1;

  if (state.session.maxRounds && state.session.round >= state.session.maxRounds) {
    endGame();
    return;
  }

  updateSessionDisplay();
  state.currentQuestion = state.currentGame.createQuestion(state.session);
  renderQuestion();
}

function submitAnswer(value, selectedButton) {
  if (!state.session || state.session.ended) return;

  lockAnswers();

  const isCorrect = value === state.currentQuestion.correctValue;
  state.session.total += 1;

  if (isCorrect) {
    state.session.correct += 1;
    state.session.streak += 1;
    state.session.bestStreak = Math.max(state.session.bestStreak, state.session.streak);
    state.session.score += 10 + Math.min(state.session.streak * 2, 20);
    setFeedback(`Nice! ${getMascot()} +${10 + Math.min(state.session.streak * 2, 20)}`, 'correct-fb');
    animateMascotReaction(true);
    launchConfetti();
  } else {
    state.session.streak = 0;
    setFeedback(`Oops! Try the next one ${getMascot()}`, 'wrong-fb');
    animateMascotReaction(false);
  }

  const fact = state.currentQuestion.meta && state.currentQuestion.meta.fact;
  if (fact) {
    recordProblemResult(fact.a, fact.b, isCorrect);
  }

  revealAnswer(isCorrect, selectedButton);
  updateSessionDisplay();

  setTimeout(() => {
    if (!state.session || state.session.ended) return;
    advanceRound();
  }, 900);
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

  // Skip high score entries when no question was answered (for example, an immediate timeout).
  const trackScores = session.total > 0;
  const isHighScore = trackScores
    ? saveHighScore(session.gameId, session.score, session.correct, session.total)
    : false;
  document.getElementById('new-high-score').style.display = isHighScore ? '' : 'none';

  document.getElementById('result-score').textContent = session.score;
  document.getElementById('result-correct').textContent = `${session.correct}/${session.total}`;
  document.getElementById('result-best-streak').textContent = session.bestStreak;

  const header = document.getElementById('results-header');
  const accuracy = session.total > 0 ? session.correct / session.total : 0;
  if (accuracy >= 0.9) header.innerHTML = '<span class="results-emoji">🌟</span><h2>Amazing!</h2>';
  else if (accuracy >= 0.7) header.innerHTML = '<span class="results-emoji">💪</span><h2>Great Job!</h2>';
  else header.innerHTML = '<span class="results-emoji">📚</span><h2>Keep Practicing!</h2>';

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
  const { skipHistory = false, replaceHistory = false } = options;
  stopSessionTimer();
  setTimerVisible(false);

  state.currentGame = null;
  state.currentMode = null;
  state.currentQuestion = null;
  state.session = null;
  state.pendingGameId = null;
  state.pendingMode = null;

  updateHomeStats();
  updateMascotDisplay();
  renderGameCards();
  updateHomeSubtitle();
  showScreen('home', {
    skipHistory,
    replaceHistory,
    route: HOME_ROUTE,
  });
}

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

  const stats = loadStats();
  updateDailyStreak(stats);

  if (!modeId) {
    const modes = getGameModes(game);
    if (modes.length > 0) {
      renderModeSelection(gameId, game, { skipHistory, replaceHistory });
      return;
    }
    startMode(gameId, null, {}, { skipHistory, replaceHistory });
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
      return;
    }
    startMode(gameId, mode.id, { [mode.selection.key]: selectedValue }, { skipHistory, replaceHistory });
    return;
  }

  if (mode.kind === 'view') {
    showModeView(game, mode, { skipHistory, replaceHistory });
    return;
  }

  startMode(gameId, mode.id, {}, { skipHistory, replaceHistory });
}

function handlePopState(event) {
  const route = event.state && event.state.route ? event.state.route : getHashRoute();
  state.isHandlingPopState = true;
  navigateToRoute(route, { skipHistory: true })
    .finally(() => {
      state.isHandlingPopState = false;
    });
}

function bindEvents() {
  window.addEventListener('popstate', handlePopState);

  document.addEventListener('keydown', (e) => {
    if (!state.currentQuestion?.useNumpad) return;
    const display = document.querySelector('#prompt .numpad-inline-display');
    if (!display) return;
    if (e.key >= '0' && e.key <= '9') handleNumpadKey(e.key, display);
    else if (e.key === 'Backspace') handleNumpadKey('⌫', display);
    else if (e.key === 'Enter') { e.preventDefault(); handleNumpadKey('✓', display); }
  });

  document.getElementById('mascot-btn').addEventListener('click', openAnimalPicker);
  document.getElementById('picker-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAnimalPicker();
  });

  document.getElementById('game-back-btn').addEventListener('click', goHome);
  document.getElementById('btn-go-home').addEventListener('click', goHome);
  document.getElementById('btn-play-again').addEventListener('click', () => {
    if (!state.currentGame || !state.session) {
      goHome();
      return;
    }
    startMode(state.session.gameId, state.session.modeId, state.session.modeConfig || {});
  });

  document.getElementById('mode-menu-back-btn').addEventListener('click', goHome);
  document.getElementById('mode-option-back-btn').addEventListener('click', () => {
    if (!state.currentGame || !state.pendingGameId) {
      goHome();
      return;
    }
    renderModeSelection(state.pendingGameId, state.currentGame);
  });
  document.getElementById('mode-view-back-btn').addEventListener('click', () => {
    if (!state.currentGame || !state.pendingGameId) {
      goHome();
      return;
    }
    renderModeSelection(state.pendingGameId, state.currentGame);
  });
}

async function init() {
  bindEvents();
  renderAnimalPicker();
  await renderGameCards();
  updateHomeStats();
  updateMascotDisplay();
  updateHomeSubtitle();
  await navigateToRoute(getHashRoute(), { skipHistory: true });

  // Show picker on first ever load (no animal saved yet)
  const raw = localStorage.getItem(STORAGE_KEY);
  const hasSavedAnimal = raw && JSON.parse(raw).mascot;
  if (!hasSavedAnimal) {
    openAnimalPicker();
  }

  const activeScreen = document.querySelector('.screen.active');
  const activeScreenId = activeScreen ? activeScreen.id.replace('screen-', '') : 'home';
  window.history.replaceState(
    { screen: activeScreenId, route: state.currentRoute },
    '',
    `#${state.currentRoute}`,
  );

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
    });
  }
}

init();
