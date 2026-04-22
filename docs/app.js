/* ============================================
   MATH CHAMP — Game Logic
   ============================================ */

// --- State ---
let gameMode = null;        // 'quick' | 'practice' | 'challenge' | 'review'
let practiceTable = null;
let currentA = 0;
let currentB = 0;
let inputValue = '';
let score = 0;
let streak = 0;
let bestStreak = 0;
let correctCount = 0;
let totalCount = 0;
let wrongProblems = [];
let timerInterval = null;
let timeLeft = 60;
let lastGameMode = null;
let lastPracticeTable = null;
let isProcessing = false;
let reviewQueue = [];

// =============================================
// SOUND ENGINE (Web Audio API — no files needed)
// =============================================
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

function soundTap() {
  playTone(800, 0.05, 'sine', 0.08);
}

function soundCorrect() {
  playTone(523, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.15), 80);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.15), 160);
}

function soundWrong() {
  playTone(300, 0.15, 'square', 0.1);
  setTimeout(() => playTone(250, 0.2, 'square', 0.1), 120);
}

function soundStreak() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.15, 'sine', 0.12), i * 80));
}

function soundHighScore() {
  const notes = [523, 659, 784, 880, 1047];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.2, 'triangle', 0.15), i * 100));
}

function soundTimerTick() {
  playTone(1000, 0.03, 'sine', 0.06);
}

// =============================================
// HAPTIC FEEDBACK
// =============================================
function haptic(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* not available */ }
}

function hapticTap()     { haptic(10); }
function hapticCorrect() { haptic([20, 30, 20]); }
function hapticWrong()   { haptic([50, 30, 50]); }
function hapticStreak()  { haptic([20, 20, 20, 20, 40]); }

// =============================================
// MASCOT
// =============================================
const FOX_SVG = '<img src="fox.svg" class="mascot-svg" alt="">';
const FOX_CHAR = '🦊';

const mascotStates = {
  idle:     [FOX_CHAR, FOX_CHAR, FOX_CHAR],
  correct:  [FOX_CHAR, '🎉', '⭐', FOX_CHAR, '✨'],
  wrong:    [FOX_CHAR],
  streak5:  [FOX_CHAR, '🔥', '🏆'],
  streak10: ['🏆', '👑', FOX_CHAR],
  thinking: [FOX_CHAR],
};

function setMascot(state, animate = 'bounce') {
  const el = document.getElementById('mascot');
  const faces = mascotStates[state] || mascotStates.idle;
  const chosen = faces[Math.floor(Math.random() * faces.length)];
  el.innerHTML = chosen === FOX_CHAR ? FOX_SVG : chosen;
  el.className = 'mascot';
  if (animate) {
    void el.offsetWidth; // force reflow
    el.classList.add(animate);
  }
}



// =============================================
// PERSISTENT STATS (localStorage)
// =============================================
const STORAGE_KEY = 'mathchamp_stats';

function loadStats() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && data.problems) return data;
    return defaultStats();
  } catch {
    return defaultStats();
  }
}

function defaultStats() {
  return {
    bestStreak: 0,
    totalSolved: 0,
    problems: {},
    dailyStreak: 0,
    lastPlayDate: null,
    highScores: { quick: [], challenge: [] },
  };
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch { /* localStorage might be full */ }
}

function recordProblem(a, b, correct) {
  const stats = loadStats();
  const key = `${a}x${b}`;
  if (!stats.problems[key]) {
    stats.problems[key] = { correct: 0, wrong: 0 };
  }
  if (correct) {
    stats.problems[key].correct++;
    stats.totalSolved++;
  } else {
    stats.problems[key].wrong++;
  }
  if (bestStreak > stats.bestStreak) {
    stats.bestStreak = bestStreak;
  }
  saveStats(stats);
}

// =============================================
// DAILY STREAK
// =============================================
function updateDailyStreak() {
  const stats = loadStats();
  const today = new Date().toDateString();
  const lastPlay = stats.lastPlayDate;

  if (lastPlay === today) return; // already counted today

  if (lastPlay) {
    const last = new Date(lastPlay);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / 86400000);
    if (diffDays === 1) {
      stats.dailyStreak++;
    } else if (diffDays > 1) {
      stats.dailyStreak = 1;
    }
  } else {
    stats.dailyStreak = 1;
  }

  stats.lastPlayDate = today;
  saveStats(stats);
}

function getDailyStreak() {
  const stats = loadStats();
  const today = new Date().toDateString();
  const lastPlay = stats.lastPlayDate;
  if (!lastPlay) return 0;
  const diffDays = Math.round((new Date(today) - new Date(lastPlay)) / 86400000);
  if (diffDays > 1) return 0; // streak broken
  return stats.dailyStreak || 0;
}

// =============================================
// HIGH SCORES
// =============================================
function saveHighScore(mode, scoreVal, correctCnt, totalCnt) {
  const stats = loadStats();
  if (!stats.highScores) stats.highScores = { quick: [], challenge: [] };
  if (!stats.highScores[mode]) stats.highScores[mode] = [];

  const entry = {
    score: scoreVal,
    correct: correctCnt,
    total: totalCnt,
    date: new Date().toLocaleDateString(),
  };

  stats.highScores[mode].push(entry);
  stats.highScores[mode].sort((a, b) => b.score - a.score);
  stats.highScores[mode] = stats.highScores[mode].slice(0, 10);
  saveStats(stats);

  // Return true if this is a new #1
  return stats.highScores[mode][0].score === scoreVal &&
         stats.highScores[mode][0].date === entry.date;
}

function showHighScores() {
  const stats = loadStats();
  const hs = stats.highScores || { quick: [], challenge: [] };

  renderScoreList('scores-challenge', hs.challenge || []);
  renderScoreList('scores-quick', hs.quick || []);
  showScreen('scores');
}

function renderScoreList(containerId, list) {
  const el = document.getElementById(containerId);
  if (list.length === 0) {
    el.innerHTML = '<div class="scores-empty">No scores yet — go play!</div>';
    return;
  }
  el.innerHTML = list.map((s, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return `
      <div class="score-entry">
        <span class="score-rank ${rankClass}">#${i + 1}</span>
        <div class="score-details">
          <span class="score-value">${s.score} pts</span>
          <span class="score-date">${s.date}</span>
        </div>
        <span class="score-accuracy">${pct}%</span>
      </div>
    `;
  }).join('');
}

// =============================================
// MASTERY HELPERS
// =============================================
function getMastery(table) {
  const stats = loadStats();
  let total = 0, correct = 0;
  for (let i = 1; i <= 12; i++) {
    const key = `${table}x${i}`;
    const p = stats.problems[key];
    if (p) {
      total += p.correct + p.wrong;
      correct += p.correct;
    }
  }
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

function getFactAccuracy(a, b) {
  const stats = loadStats();
  const key = `${a}x${b}`;
  const p = stats.problems[key];
  if (!p || (p.correct + p.wrong === 0)) return -1; // never attempted
  return p.correct / (p.correct + p.wrong);
}

function getMasteredCount() {
  let count = 0;
  for (let t = 1; t <= 12; t++) {
    if (getMastery(t) >= 90) count++;
  }
  return count;
}

// =============================================
// PROGRESS MAP
// =============================================
function showProgressMap() {
  const grid = document.getElementById('progress-grid');
  grid.innerHTML = '';

  // Corner cell (empty)
  const corner = document.createElement('div');
  corner.className = 'grid-header';
  corner.textContent = '×';
  grid.appendChild(corner);

  // Column headers
  for (let b = 1; b <= 12; b++) {
    const h = document.createElement('div');
    h.className = 'grid-header';
    h.textContent = b;
    grid.appendChild(h);
  }

  let masteredCount = 0;
  let learningCount = 0;
  let goodCount = 0;
  let newCount = 0;

  for (let a = 1; a <= 12; a++) {
    // Row header
    const rh = document.createElement('div');
    rh.className = 'grid-header';
    rh.textContent = a;
    grid.appendChild(rh);

    for (let b = 1; b <= 12; b++) {
      const cell = document.createElement('div');
      const acc = getFactAccuracy(a, b);
      let cls, label;

      if (acc < 0) {
        cls = 'cell-new'; label = ''; newCount++;
      } else if (acc < 0.6) {
        cls = 'cell-learning'; label = Math.round(acc * 100); learningCount++;
      } else if (acc < 0.9) {
        cls = 'cell-good'; label = Math.round(acc * 100); goodCount++;
      } else {
        cls = 'cell-mastered'; label = '✓'; masteredCount++;
      }

      cell.className = `grid-cell ${cls}`;
      cell.textContent = label;
      cell.title = `${a}×${b} = ${a * b}`;
      grid.appendChild(cell);
    }
  }

  const total = 144;
  const summary = document.getElementById('progress-summary');
  summary.textContent = `✓ ${masteredCount} mastered · ${goodCount} good · ${learningCount} learning · ${newCount} new — ${Math.round((masteredCount / total) * 100)}% complete`;

  showScreen('progress');
}

// =============================================
// PROBLEM GENERATION (adaptive)
// =============================================
function generateProblem() {
  if (gameMode === 'practice' && practiceTable) {
    return generateAdaptive(practiceTable, practiceTable);
  }
  return generateAdaptive(1, 12);
}

function generateAdaptive(minTable, maxTable) {
  const stats = loadStats();
  const candidates = [];

  for (let a = minTable; a <= maxTable; a++) {
    for (let b = 1; b <= 12; b++) {
      const key = `${a}x${b}`;
      const p = stats.problems[key];
      let weight = 3;
      if (p) {
        const accuracy = p.correct / (p.correct + p.wrong);
        if (accuracy < 0.5) weight = 10;
        else if (accuracy < 0.75) weight = 6;
        else if (accuracy >= 0.95 && p.correct + p.wrong > 5) weight = 1;
      } else {
        weight = 5;
      }
      for (let w = 0; w < weight; w++) {
        candidates.push([a, b]);
      }
    }
  }

  let attempts = 0;
  let a, b;
  do {
    const idx = Math.floor(Math.random() * candidates.length);
    [a, b] = candidates[idx];
    attempts++;
  } while (a === currentA && b === currentB && attempts < 20);

  return [a, b];
}

// =============================================
// SCREEN NAVIGATION
// =============================================

// Screens that should push a history entry when navigated to
const PUSHABLE_SCREENS = new Set(['picker', 'progress', 'scores', 'game', 'results']);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');

  if (PUSHABLE_SCREENS.has(id)) {
    history.pushState({ screen: id }, '', '');
  } else {
    // home — replace so the stack doesn't grow on every goHome()
    history.replaceState({ screen: 'home' }, '', '');
  }
}

function goHome() {
  stopTimer();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  history.replaceState({ screen: 'home' }, '', '');
  updateHomeStats();
}

// Handle hardware / browser back button
window.addEventListener('popstate', (e) => {
  const screen = e.state?.screen ?? 'home';

  if (screen === 'game') {
    // Navigating back TO game isn't meaningful — go home instead
    goHome();
    return;
  }

  if (screen === 'results') {
    // Navigating back to results also makes little sense — go home
    goHome();
    return;
  }

  if (screen === 'home') {
    // If a game is in progress stop it first
    if (document.getElementById('screen-game').classList.contains('active')) {
      stopTimer();
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-home').classList.add('active');
    history.replaceState({ screen: 'home' }, '', '');
    updateHomeStats();
    return;
  }

  // picker / progress / scores — safe to just show the screen
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screen}`)?.classList.add('active');
});

function updateHomeStats() {
  const stats = loadStats();
  document.getElementById('home-streak').textContent = stats.bestStreak;
  document.getElementById('home-total').textContent = stats.totalSolved;
  document.getElementById('home-mastered').textContent = getMasteredCount();
  document.getElementById('daily-count').textContent = getDailyStreak();
}

// =============================================
// TABLE PICKER
// =============================================
function showTablePicker() {
  const grid = document.getElementById('table-grid');
  grid.innerHTML = '';
  for (let t = 1; t <= 12; t++) {
    const btn = document.createElement('button');
    btn.className = `table-btn table-btn-${t}`;
    const mastery = getMastery(t);
    btn.innerHTML = `
      <span>${t}</span>
      <span class="mastery">${mastery}%</span>
      ${mastery >= 90 ? '<span class="mastery-star">⭐</span>' : ''}
    `;
    btn.onclick = () => startPractice(t);
    grid.appendChild(btn);
  }
  showScreen('picker');
}

// =============================================
// GAME START
// =============================================
function resetGame() {
  score = 0;
  streak = 0;
  bestStreak = 0;
  correctCount = 0;
  totalCount = 0;
  wrongProblems = [];
  inputValue = '';
  isProcessing = false;
  reviewQueue = [];
  updateDisplay();
  setMascot('thinking', null);
}

function startQuickPlay() {
  gameMode = 'quick';
  lastGameMode = 'quick';
  practiceTable = null;
  resetGame();
  updateDailyStreak();
  document.getElementById('timer-display').style.display = 'none';
  showScreen('game');
  nextProblem();
}

function startPractice(table) {
  gameMode = 'practice';
  lastGameMode = 'practice';
  practiceTable = table;
  lastPracticeTable = table;
  resetGame();
  updateDailyStreak();
  document.getElementById('timer-display').style.display = 'none';
  showScreen('game');
  nextProblem();
}

function startChallenge() {
  gameMode = 'challenge';
  lastGameMode = 'challenge';
  practiceTable = null;
  resetGame();
  updateDailyStreak();
  timeLeft = 60;
  document.getElementById('timer-display').style.display = '';
  document.getElementById('timer-value').textContent = '60';
  document.getElementById('timer-display').classList.remove('warning');
  showScreen('game');
  nextProblem();
  startTimer();
}

function startReview() {
  if (wrongProblems.length === 0) return;

  // Build unique review queue from wrong problems
  const seen = new Set();
  reviewQueue = [];
  for (const p of wrongProblems) {
    const key = `${p.a}x${p.b}`;
    if (!seen.has(key)) {
      seen.add(key);
      reviewQueue.push({ a: p.a, b: p.b });
    }
  }

  gameMode = 'review';
  score = 0;
  streak = 0;
  bestStreak = 0;
  correctCount = 0;
  totalCount = 0;
  wrongProblems = [];
  inputValue = '';
  isProcessing = false;
  updateDisplay();
  setMascot('thinking', null);

  document.getElementById('timer-display').style.display = 'none';
  showScreen('game');
  nextProblem();
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer-value').textContent = timeLeft;
    if (timeLeft <= 10) {
      document.getElementById('timer-display').classList.add('warning');
      soundTimerTick();
    }
    if (timeLeft <= 0) {
      stopTimer();
      endGame();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// =============================================
// GAMEPLAY
// =============================================
function nextProblem() {
  let a, b;
  if (gameMode === 'review' && reviewQueue.length > 0) {
    const item = reviewQueue.shift();
    a = item.a;
    b = item.b;
  } else if (gameMode === 'review') {
    endGame();
    return;
  } else {
    [a, b] = generateProblem();
  }

  currentA = a;
  currentB = b;
  inputValue = '';
  isProcessing = false;
  document.getElementById('num-a').textContent = a;
  document.getElementById('num-b').textContent = b;
  updateAnswerDisplay();
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('problem').className = 'problem';
  setMascot('thinking', null);
}

function pressNum(n) {
  if (isProcessing) return;
  if (inputValue.length >= 3) return;
  inputValue += n;
  updateAnswerDisplay();
  soundTap();
  hapticTap();
}

function clearAnswer() {
  if (isProcessing) return;
  inputValue = inputValue.slice(0, -1);
  updateAnswerDisplay();
  soundTap();
}

function updateAnswerDisplay() {
  const display = document.getElementById('answer-display');
  display.textContent = inputValue || '?';
  display.classList.toggle('has-value', inputValue.length > 0);
}

function submitAnswer() {
  if (isProcessing || !inputValue) return;
  isProcessing = true;

  const answer = parseInt(inputValue, 10);
  const correct = currentA * currentB;
  const isCorrect = answer === correct;
  totalCount++;

  if (isCorrect) {
    handleCorrect();
  } else {
    handleWrong(correct);
  }

  if (gameMode !== 'review') {
    recordProblem(currentA, currentB, isCorrect);
  }

  // Auto-advance
  setTimeout(() => {
    if (gameMode === 'review') {
      if (reviewQueue.length === 0) {
        endGame();
      } else {
        nextProblem();
      }
    } else if (gameMode === 'quick' && totalCount >= 20) {
      endGame();
    } else if (gameMode === 'practice' && totalCount >= 15) {
      endGame();
    } else {
      nextProblem();
    }
  }, isCorrect ? 600 : 1400);
}

function handleCorrect() {
  streak++;
  correctCount++;
  if (streak > bestStreak) bestStreak = streak;

  const points = 10 + Math.min(streak * 2, 20);
  score += points;

  document.getElementById('problem').classList.add('correct');
  const fb = document.getElementById('feedback');
  fb.className = 'feedback correct-fb';

  const phrases = ['Nice! 🎉', 'Awesome! ⭐', 'Perfect! 💪', 'Wow! 🔥', 'Yes! 🚀', 'Nailed it! 💥'];
  fb.textContent = phrases[Math.floor(Math.random() * phrases.length)] + ` +${points}`;

  soundCorrect();
  hapticCorrect();
  updateDisplay();

  // Mascot reacts to streak
  if (streak >= 10) {
    setMascot('streak10', 'dance');
  } else if (streak >= 5) {
    setMascot('streak5', 'bounce');
  } else {
    setMascot('correct', 'bounce');
  }

  // Small confetti on every correct answer
  launchConfettiSmall();

  // Big confetti + streak sounds at milestone streaks
  if (streak > 0 && streak % 5 === 0) {
    launchConfetti();
    soundStreak();
    hapticStreak();
  }

  // Animate streak fire
  const fire = document.getElementById('streak-fire');
  fire.classList.add('big');
  setTimeout(() => fire.classList.remove('big'), 200);

  // Score pop
  const scoreEl = document.getElementById('score-count');
  scoreEl.classList.remove('score-pop');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pop');

  // Answer flash green then clear
  const answerEl = document.getElementById('answer-display');
  answerEl.classList.add('answer-correct-flash');
  setTimeout(() => answerEl.classList.remove('answer-correct-flash'), 400);
}

function spawnPawBurst() {
  const emojis = ['🐾', '⭐', '✨', '🦊', '💥'];
  const originEl = document.getElementById('problem');
  if (!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('span');
    el.className = 'paw-particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const angle = (i / 6) * 2 * Math.PI + Math.random() * 0.5;
    const dist = 60 + Math.random() * 50;
    el.style.left = cx + 'px';
    el.style.top  = cy + 'px';
    el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }
}

function handleWrong(correct) {
  streak = 0;
  document.getElementById('problem').classList.add('wrong');
  const fb = document.getElementById('feedback');
  fb.className = 'feedback wrong-fb';
  fb.textContent = `${currentA} × ${currentB} = ${correct}`;

  wrongProblems.push({ a: currentA, b: currentB, given: parseInt(inputValue), answer: correct });

  soundWrong();
  hapticWrong();
  setMascot('wrong', 'shake');
  updateDisplay();
}

function updateDisplay() {
  document.getElementById('streak-count').textContent = streak;
  document.getElementById('score-count').textContent = score;
}

// =============================================
// END GAME / RESULTS
// =============================================
function endGame() {
  stopTimer();

  document.getElementById('result-score').textContent = score;
  document.getElementById('result-correct').textContent = `${correctCount}/${totalCount}`;
  document.getElementById('result-best-streak').textContent = bestStreak;

  const pct = totalCount > 0 ? correctCount / totalCount : 0;
  const header = document.getElementById('results-header');
  if (pct >= 0.9) {
    header.innerHTML = '<span class="results-emoji">🌟</span><h2>Amazing!</h2>';
  } else if (pct >= 0.7) {
    header.innerHTML = '<span class="results-emoji">💪</span><h2>Great Job!</h2>';
  } else if (pct >= 0.5) {
    header.innerHTML = '<span class="results-emoji">👍</span><h2>Good Effort!</h2>';
  } else {
    header.innerHTML = '<span class="results-emoji">📚</span><h2>Keep Practicing!</h2>';
  }

  // High score tracking (not for review or practice)
  const hsEl = document.getElementById('new-high-score');
  if ((gameMode === 'quick' || gameMode === 'challenge') && totalCount > 0) {
    const isNewHS = saveHighScore(gameMode, score, correctCount, totalCount);
    if (isNewHS) {
      hsEl.style.display = '';
      soundHighScore();
      launchConfetti();
    } else {
      hsEl.style.display = 'none';
    }
  } else {
    hsEl.style.display = 'none';
  }

  // Trouble spots
  const troubleDiv = document.getElementById('trouble-spots');
  const troubleList = document.getElementById('trouble-list');
  const reviewBtn = document.getElementById('btn-review');

  if (wrongProblems.length > 0) {
    troubleDiv.style.display = '';
    reviewBtn.style.display = '';
    const seen = new Set();
    troubleList.innerHTML = '';
    for (const p of wrongProblems) {
      const key = `${p.a}x${p.b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const item = document.createElement('div');
      item.className = 'trouble-item';
      item.innerHTML = `
        <span>${p.a} × ${p.b}</span>
        <span class="correct-answer">= ${p.answer}</span>
      `;
      troubleList.appendChild(item);
    }
  } else {
    troubleDiv.style.display = 'none';
    reviewBtn.style.display = 'none';
  }

  if (pct >= 0.8 && gameMode !== 'review') launchConfetti();
  showScreen('results');
}

function playAgain() {
  if (lastGameMode === 'quick') startQuickPlay();
  else if (lastGameMode === 'practice') startPractice(lastPracticeTable);
  else if (lastGameMode === 'challenge') startChallenge();
  else goHome();
}

// =============================================
// CONFETTI
// =============================================
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimId = null;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

function launchConfettiSmall() {
  const colors = ['#6c5ce7', '#e84393', '#00b894', '#f39c12', '#0984e3', '#fd79a8', '#fdcb6e', '#ff6b6b'];
  for (let i = 0; i < 15; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10 - Math.random() * 20,
      w: 5 + Math.random() * 4,
      h: 3 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 5,
      vy: 2 + Math.random() * 3,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      life: 1,
    });
  }
  if (!confettiAnimId) animateConfetti();
}

function launchConfetti() {
  const colors = ['#6c5ce7', '#e84393', '#00b894', '#f39c12', '#0984e3', '#fd79a8', '#fdcb6e', '#ff6b6b'];
  for (let i = 0; i < 60; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10 - Math.random() * 40,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      life: 1,
    });
  }
  if (!confettiAnimId) animateConfetti();
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.rotation += p.rotationSpeed;
    p.life -= 0.008;

    if (p.life <= 0 || p.y > confettiCanvas.height + 20) {
      confettiParticles.splice(i, 1);
      continue;
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = p.life;
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  }

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
  }
}

// =============================================
// KEYBOARD SUPPORT
// =============================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('screen-game').classList.contains('active')) {
      endGame();
    }
    return;
  }
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  if (e.key >= '0' && e.key <= '9') pressNum(parseInt(e.key));
  else if (e.key === 'Backspace') clearAnswer();
  else if (e.key === 'Enter') submitAnswer();
});

// Resume AudioContext on first user interaction (iOS requirement)
document.addEventListener('touchstart', () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

// =============================================
// INIT
// =============================================
updateHomeStats();
// Seed initial history state so popstate always has a state object
history.replaceState({ screen: 'home' }, '', '');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
