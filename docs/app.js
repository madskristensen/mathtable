const STORAGE_KEY = 'kids_hub_stats_v1';
const GAME_REGISTRY = {
  multiplication: {
    title: 'Multiplication Table',
    icon: '✖️',
    description: 'Solve multiplication facts quickly.',
    loader: () => import('./games/multiplication.js'),
  },
  clock: {
    title: 'Tell Time (Analog Clock)',
    icon: '🕒',
    description: 'Read the analog clock and pick the time.',
    loader: () => import('./games/clock.js'),
  },
};

const GAME_COUNT = 10;
const ANIMALS = ['🦊', '🐼', '🐯', '🐶', '🐨', '🦁', '🐸', '🐧'];

const state = {
  loadedGames: {},
  currentGame: null,
  currentQuestion: null,
  session: null,
};

function defaultStats() {
  return {
    bestStreak: 0,
    totalCorrect: 0,
    dailyStreak: 0,
    lastPlayDate: null,
    mascot: '🦊',
    highScores: {},
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    return {
      ...defaultStats(),
      ...parsed,
      highScores: parsed.highScores || {},
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
  return loadStats().mascot || '🦊';
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

function getHighScore(gameId) {
  const stats = loadStats();
  return (stats.highScores[gameId] || [])[0] || null;
}

function saveHighScore(gameId, score, correct, total) {
  const stats = loadStats();
  const list = stats.highScores[gameId] || [];

  list.push({
    score,
    correct,
    total,
    date: new Date().toLocaleDateString(),
  });

  list.sort((a, b) => b.score - a.score);
  stats.highScores[gameId] = list.slice(0, 10);
  saveStats(stats);

  const best = stats.highScores[gameId][0];
  return best && best.score === score;
}

function setFeedback(text, className = '') {
  const feedback = document.getElementById('feedback');
  feedback.className = `feedback ${className}`.trim();
  feedback.textContent = text;
}

function updateSessionDisplay() {
  const session = state.session;
  document.getElementById('streak-count').textContent = session.streak;
  document.getElementById('score-count').textContent = session.score;
  document.getElementById('round-progress').textContent = `${session.round + 1}/${GAME_COUNT}`;
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

async function startGame(gameId) {
  const game = await loadGame(gameId);
  const stats = loadStats();
  updateDailyStreak(stats);

  state.currentGame = game;
  state.session = {
    round: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    total: 0,
    gameId,
  };

  document.getElementById('game-title').textContent = game.title;
  updateMascotDisplay();
  updateSessionDisplay();
  state.currentQuestion = game.createQuestion(state.session);
  renderQuestion();
  showScreen('game');
}

function lockAnswers() {
  document.querySelectorAll('.answer-btn').forEach((btn) => {
    btn.disabled = true;
  });
}

function revealAnswer(isCorrect, selectedButton) {
  const { correctValue } = state.currentQuestion;
  document.querySelectorAll('.answer-btn').forEach((btn) => {
    const value = btn.getAttribute('data-value') || btn.dataset.value;
    if (value === String(correctValue)) {
      btn.classList.add('correct');
    }
  });
  if (!isCorrect && selectedButton) selectedButton.classList.add('wrong');
}

function renderAnswersWithValues() {
  const answerButtons = document.querySelectorAll('.answer-btn');
  state.currentQuestion.answers.forEach((answer, idx) => {
    answerButtons[idx].dataset.value = String(answer.value);
  });
}

function advanceRound() {
  state.session.round += 1;

  if (state.session.round >= GAME_COUNT) {
    endGame();
    return;
  }

  updateSessionDisplay();
  state.currentQuestion = state.currentGame.createQuestion(state.session);
  renderQuestion();
  renderAnswersWithValues();
}

function submitAnswer(value, selectedButton) {
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

  renderAnswersWithValues();
  revealAnswer(isCorrect, selectedButton);
  updateSessionDisplay();

  setTimeout(advanceRound, 900);
}

function endGame() {
  const session = state.session;
  const stats = loadStats();

  stats.bestStreak = Math.max(stats.bestStreak, session.bestStreak);
  stats.totalCorrect += session.correct;
  saveStats(stats);

  const isHighScore = saveHighScore(session.gameId, session.score, session.correct, session.total);
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
  state.currentGame = null;
  state.currentQuestion = null;
  state.session = null;
  updateHomeStats();
  updateMascotDisplay();
  showScreen('home');
}

function bindEvents() {
  document.getElementById('game-back-btn').addEventListener('click', goHome);
  document.getElementById('btn-go-home').addEventListener('click', goHome);
  document.getElementById('btn-play-again').addEventListener('click', () => {
    if (!state.session) {
      goHome();
      return;
    }
    startGame(state.session.gameId);
  });
}

async function init() {
  bindEvents();
  renderAnimalPicker();
  await renderGameCards();
  updateHomeStats();
  updateMascotDisplay();
  showScreen('home');

  const topMultiplication = getHighScore('multiplication');
  const topClock = getHighScore('clock');
  if (topMultiplication || topClock) {
    const subtitle = document.querySelector('.subtitle');
    const parts = [];
    if (topMultiplication) parts.push(`Times table best ${topMultiplication.score}`);
    if (topClock) parts.push(`Clock best ${topClock.score}`);
    subtitle.textContent = `${parts.join(' • ')}.`;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

init();
