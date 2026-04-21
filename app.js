/* ============================================
   MATH CHAMP — Game Logic
   ============================================ */

// --- State ---
let gameMode = null;        // 'quick' | 'practice' | 'challenge'
let practiceTable = null;   // 1-12 when in practice mode
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

// --- Persistent Stats (localStorage) ---
const STORAGE_KEY = 'mathchamp_stats';

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultStats();
  } catch {
    return defaultStats();
  }
}

function defaultStats() {
  return {
    bestStreak: 0,
    totalSolved: 0,
    // Track per-problem accuracy: key = "AxB", value = { correct, wrong }
    problems: {},
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

function getMasteredCount() {
  let count = 0;
  for (let t = 1; t <= 12; t++) {
    if (getMastery(t) >= 90) count++;
  }
  return count;
}

// --- Problem Generation (adaptive) ---
function generateProblem() {
  if (gameMode === 'practice' && practiceTable) {
    return generateAdaptive(practiceTable, practiceTable);
  }
  // For quick play and challenge, use all tables
  return generateAdaptive(1, 12);
}

function generateAdaptive(minTable, maxTable) {
  const stats = loadStats();
  const candidates = [];

  for (let a = minTable; a <= maxTable; a++) {
    for (let b = 1; b <= 12; b++) {
      const key = `${a}x${b}`;
      const p = stats.problems[key];
      // Weight: more wrong answers = higher weight
      let weight = 3; // base weight
      if (p) {
        const accuracy = p.correct / (p.correct + p.wrong);
        if (accuracy < 0.5) weight = 10;
        else if (accuracy < 0.75) weight = 6;
        else if (accuracy >= 0.95 && p.correct + p.wrong > 5) weight = 1;
      } else {
        weight = 5; // never seen = moderate weight
      }
      for (let w = 0; w < weight; w++) {
        candidates.push([a, b]);
      }
    }
  }

  // Avoid repeating the same problem
  let attempts = 0;
  let a, b;
  do {
    const idx = Math.floor(Math.random() * candidates.length);
    [a, b] = candidates[idx];
    attempts++;
  } while (a === currentA && b === currentB && attempts < 20);

  return [a, b];
}

// --- Screen Navigation ---
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');
}

function goHome() {
  stopTimer();
  showScreen('home');
  updateHomeStats();
}

function updateHomeStats() {
  const stats = loadStats();
  document.getElementById('home-streak').textContent = stats.bestStreak;
  document.getElementById('home-total').textContent = stats.totalSolved;
  document.getElementById('home-mastered').textContent = getMasteredCount();
}

// --- Table Picker ---
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

// --- Game Start ---
function resetGame() {
  score = 0;
  streak = 0;
  bestStreak = 0;
  correctCount = 0;
  totalCount = 0;
  wrongProblems = [];
  inputValue = '';
  isProcessing = false;
  updateDisplay();
}

function startQuickPlay() {
  gameMode = 'quick';
  lastGameMode = 'quick';
  practiceTable = null;
  resetGame();
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
  document.getElementById('timer-display').style.display = 'none';
  showScreen('game');
  nextProblem();
}

function startChallenge() {
  gameMode = 'challenge';
  lastGameMode = 'challenge';
  practiceTable = null;
  resetGame();
  timeLeft = 60;
  document.getElementById('timer-display').style.display = '';
  document.getElementById('timer-value').textContent = '60';
  document.getElementById('timer-display').classList.remove('warning');
  showScreen('game');
  nextProblem();
  startTimer();
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer-value').textContent = timeLeft;
    if (timeLeft <= 10) {
      document.getElementById('timer-display').classList.add('warning');
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

// --- Gameplay ---
function nextProblem() {
  const [a, b] = generateProblem();
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
}

function pressNum(n) {
  if (isProcessing) return;
  if (inputValue.length >= 3) return; // max 3 digits (144)
  inputValue += n;
  updateAnswerDisplay();
}

function clearAnswer() {
  if (isProcessing) return;
  inputValue = inputValue.slice(0, -1);
  updateAnswerDisplay();
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

  recordProblem(currentA, currentB, isCorrect);

  // Auto-advance after delay
  setTimeout(() => {
    if (gameMode === 'quick' && totalCount >= 20) {
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

  // Score: base 10 + streak bonus
  const points = 10 + Math.min(streak * 2, 20);
  score += points;

  document.getElementById('problem').classList.add('correct');
  const fb = document.getElementById('feedback');
  fb.className = 'feedback correct-fb';

  const phrases = ['Nice! 🎉', 'Awesome! ⭐', 'Perfect! 💪', 'Wow! 🔥', 'Yes! 🚀', 'Nailed it! 💥'];
  fb.textContent = phrases[Math.floor(Math.random() * phrases.length)] + ` +${points}`;

  updateDisplay();

  // Confetti for streaks of 5+
  if (streak > 0 && streak % 5 === 0) {
    launchConfetti();
  }

  // Animate streak fire
  const fire = document.getElementById('streak-fire');
  fire.classList.add('big');
  setTimeout(() => fire.classList.remove('big'), 200);
}

function handleWrong(correct) {
  streak = 0;
  document.getElementById('problem').classList.add('wrong');
  const fb = document.getElementById('feedback');
  fb.className = 'feedback wrong-fb';
  fb.textContent = `${currentA} × ${currentB} = ${correct}`;

  wrongProblems.push({ a: currentA, b: currentB, given: parseInt(inputValue), answer: correct });
  updateDisplay();
}

function updateDisplay() {
  document.getElementById('streak-count').textContent = streak;
  document.getElementById('score-count').textContent = score;
}

// --- End Game / Results ---
function endGame() {
  stopTimer();

  document.getElementById('result-score').textContent = score;
  document.getElementById('result-correct').textContent = `${correctCount}/${totalCount}`;
  document.getElementById('result-best-streak').textContent = bestStreak;

  // Results header varies by performance
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

  // Trouble spots
  const troubleDiv = document.getElementById('trouble-spots');
  const troubleList = document.getElementById('trouble-list');
  if (wrongProblems.length > 0) {
    troubleDiv.style.display = '';
    // Deduplicate
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
  }

  if (pct >= 0.8) launchConfetti();
  showScreen('results');
}

function playAgain() {
  if (lastGameMode === 'quick') startQuickPlay();
  else if (lastGameMode === 'practice') startPractice(lastPracticeTable);
  else if (lastGameMode === 'challenge') startChallenge();
  else goHome();
}

// --- Confetti ---
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

// --- Keyboard Support ---
document.addEventListener('keydown', (e) => {
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  if (e.key >= '0' && e.key <= '9') pressNum(parseInt(e.key));
  else if (e.key === 'Backspace') clearAnswer();
  else if (e.key === 'Enter') submitAnswer();
});

// --- Init ---
updateHomeStats();

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
