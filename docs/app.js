const STORAGE_KEY = 'kids_hub_stats_v1';
const DEFAULT_ROUNDS = 10;

const GAME_REGISTRY = {
  multiplication: {
    title: 'Multiplication Table',
    icon: '✖️',
    description: 'Quick Game, Practice, Challenge, and Multiplication Map.',
    defaultMode: 'quick',
    loader: () => import('./games/multiplication.js'),
  },
  clock: {
    title: 'Tell Time (Analog Clock)',
    icon: '🕒',
    description: 'Read the analog clock and pick the time.',
    loader: () => import('./games/clock.js'),
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
};

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

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');
}

function getMascot() {
  const mascot = loadStats().mascot;
  return ANIMALS.includes(mascot) ? mascot : DEFAULT_MASCOT;
}

function updateMascotDisplay() {
  document.getElementById('mascot').textContent = getMascot();
}

function updateHomeStats() {
  const stats = loadStats();
  document.getElementById('home-best-streak').textContent = stats.bestStreak;
  document.getElementById('home-total').textContent = stats.totalCorrect;
  document.getElementById('daily-count').textContent = getVisibleDailyStreak(stats);
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

async function renderGameCards() {
  const grid = document.getElementById('games-grid');
  grid.innerHTML = '';

  const gameIds = Object.keys(GAME_REGISTRY);
  for (const gameId of gameIds) {
    const game = GAME_REGISTRY[gameId];
    const card = document.createElement('button');
    card.className = 'game-card';
    card.innerHTML = `
      <span class="game-card-icon">${game.icon}</span>
      <span class="game-card-title">${game.title}</span>
      <span class="game-card-desc">${game.description}</span>
    `;
    card.addEventListener('click', () => startGame(gameId));
    grid.appendChild(card);
  }
}

function getHighScore(gameId, modeId = null) {
  const stats = loadStats();
  const key = modeId ? `${gameId}:${modeId}` : gameId;
  return (stats.highScores[key] || [])[0] || null;
}

function saveHighScore(gameId, modeId, score, correct, total) {
  const stats = loadStats();
  const key = modeId ? `${gameId}:${modeId}` : gameId;
  const list = stats.highScores[key] || [];

  list.push({
    score,
    correct,
    total,
    date: new Date().toLocaleDateString(),
  });

  list.sort((a, b) => b.score - a.score);
  stats.highScores[key] = list.slice(0, 10);
  saveStats(stats);

  const best = stats.highScores[key][0];
  return best && best.score === score;
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

  question.answers.forEach((answer) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.innerHTML = answer.label;
    btn.dataset.value = String(answer.value);
    btn.addEventListener('click', () => submitAnswer(answer.value, btn));
    answers.appendChild(btn);
  });

  setFeedback('');
}

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6c5ce7', '#e84393', '#00b894', '#f39c12', '#0984e3', '#fdcb6e'];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 3,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= 0.015;

      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    if (particles.some((p) => p.life > 0)) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  tick();
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

  getGameModes(game).forEach((mode) => {
    const btn = document.createElement('button');
    btn.className = 'mode-card';
    btn.innerHTML = `
      <span class="mode-card-icon">${mode.icon || '🎮'}</span>
      <span class="mode-card-title">${mode.title}</span>
      <span class="mode-card-desc">${mode.description || ''}</span>
    `;
    btn.addEventListener('click', () => chooseMode(gameId, mode.id));
    list.appendChild(btn);
  });
}

function renderModeSelection(gameId, game) {
  state.pendingGameId = gameId;
  state.pendingMode = null;

  document.getElementById('mode-game-title').textContent = game.title;
  renderModeCards(gameId, game);
  showScreen('mode-menu');
}

function renderModeOptionPicker(mode) {
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

  showScreen('mode-option-picker');
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
    renderModeOptionPicker(mode);
    return;
  }

  if (mode.kind === 'view') {
    showModeView(game, mode);
    return;
  }

  startMode(gameId, mode.id);
}

function showModeView(game, mode) {
  const viewRoot = document.getElementById('mode-view-body');
  updateModeViewTitle(`${game.title} — ${mode.title}`);

  if (typeof game.renderModeView === 'function') {
    viewRoot.innerHTML = game.renderModeView(mode.id, { stats: loadStats() });
  } else {
    viewRoot.innerHTML = '<p class="mode-view-empty">Nothing to show yet.</p>';
  }

  showScreen('mode-view');
}

function startMode(gameId, modeId, modeConfig = {}) {
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
  showScreen('game');

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
  } else {
    state.session.streak = 0;
    setFeedback(`Oops! Try the next one ${getMascot()}`, 'wrong-fb');
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
    ? saveHighScore(session.gameId, session.modeId, session.score, session.correct, session.total)
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

  showScreen('results');
  updateHomeStats();
}

function goHome() {
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
  showScreen('home');
}

function bindEvents() {
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
  showScreen('home');

  const gameSummaries = Object.entries(GAME_REGISTRY).map(([gameId, metadata]) => {
    const defaultMode = metadata.defaultMode || null;
    const best = getHighScore(gameId, defaultMode);
    return best ? `${metadata.title} best ${best.score}` : null;
  });

  const filteredSummaries = gameSummaries.filter(Boolean);
  if (filteredSummaries.length > 0) {
    const subtitle = document.querySelector('.subtitle');
    subtitle.textContent = `${filteredSummaries.join(' • ')}.`;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

init();
