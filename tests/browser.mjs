import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const profile = await mkdtemp(join(tmpdir(), 'kids-hub-browser-'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  const path = resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
  if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const file = path === root ? join(root, 'index.html') : path;
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browserPath = process.env.BROWSER_PATH || join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const browser = spawn(browserPath, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let launchError;
browser.on('error', (error) => { launchError = error; });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
let socket;
let serial = 0;
const pending = new Map();
const exceptions = [];
const loadedDocuments = new Set();

async function until(probe, label, attempts = 200) {
  for (let i = 0; i < attempts; i++) {
    if (await probe()) return;
    await sleep(50);
  }
  throw new Error(`Timed out: ${label}`);
}

function command(method, params = {}) {
  const id = ++serial;
  return new Promise((done, fail) => {
    const timer = setTimeout(() => { pending.delete(id); fail(new Error(`CDP timed out: ${method}`)); }, 15000);
    pending.set(id, { done: (value) => { clearTimeout(timer); done(value); }, fail: (error) => { clearTimeout(timer); fail(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

const ready = (expression, label) => until(async () => {
  try { return await evaluate(expression); }
  catch (error) {
    if (/Inspected target navigated|Cannot find context|Execution context was destroyed/.test(error.message)) return false;
    throw error;
  }
}, label);
const click = (id) => evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
const stats = () => evaluate('JSON.parse(localStorage.getItem("kids_hub_stats_v1"))');
async function navigate(route = '/') {
  const navigation = await command('Page.navigate', { url: `${origin}/#${route}` });
  if (navigation.errorText) throw new Error(navigation.errorText);
  if (navigation.loaderId) await until(() => loadedDocuments.has(navigation.loaderId), 'document load');
  await ready('document.getElementById("category-filters")?.children.length > 0', 'app bootstrap');
  await ready('!document.getElementById("picker-overlay").classList.contains("open")', 'saved mascot');
}

async function answerMath(correct = true) {
  await ready('document.querySelector("#prompt .equation") && !document.querySelector("#answers .numpad-btn").disabled', 'math question');
  await evaluate(String.raw`(() => {
    const text = document.querySelector('#prompt .equation').textContent;
    const [, left, operator, right] = text.match(/(\d+)\s*([+×−÷])\s*(\d+)/);
    const a = Number(left), b = Number(right);
    const value = operator === '+' ? a + b : operator === '×' ? a * b : operator === '−' ? a - b : a / b;
    for (const digit of String(value ${correct ? '' : '+ 1'})) document.dispatchEvent(new KeyboardEvent('keydown', { key: digit }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
  })()`);
}

try {
  let port;
  await until(async () => {
    if (launchError) throw launchError;
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; return false; }
  }, 'Edge debugger');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', fail, { once: true }); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.fail(new Error(message.error.message));
      else request.done(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    else if (message.method === 'Page.lifecycleEvent' && message.params.name === 'load') loadedDocuments.add(message.params.loaderId);
  });
  await command('Runtime.enable');
  await command('Page.enable');
  await command('Page.setLifecycleEventsEnabled', { enabled: true });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `Math.random = () => 0.25; if (location.origin === ${JSON.stringify(origin)} && !localStorage.getItem('kids_hub_stats_v1')) localStorage.setItem('kids_hub_stats_v1', JSON.stringify({ mascot: '🦊', totalCorrect: 7, problems: { '3x4': { correct: 2, wrong: 1 } } }));` });
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate();
  await ready('!!navigator.serviceWorker.controller', 'initial offline installation');
  await navigate();
  assert.equal(await evaluate('document.querySelectorAll(".game-card").length'), 13);
  assert.equal((await stats()).totalCorrect, 7, 'legacy stats preserved');
  await evaluate('Array.from(document.querySelectorAll("#category-filters button")).find(b => b.textContent === "Time").click()');
  assert.equal(await evaluate('document.querySelectorAll(".game-card").length'), 2);
  await click('all-games-btn');
  assert.equal(await evaluate('document.getElementById("carousel-dots").hidden'), true);
  assert.equal(await evaluate('document.getElementById("games-grid").classList.contains("games-grid-view")'), true);
  console.log('PASS: discovery filters, grid, and legacy progress');

  const matrix = await evaluate(`(async () => {
    let count = 0;
    for (const id of ['usstates', 'europe']) {
      const { game } = await import('./games/' + id + '.js');
      for (const mode of game.modes.filter(m => m.kind === 'play')) {
        for (const level of [1, 2, 3]) {
          const config = mode.selection ? { region: mode.selection.options[0].value } : {};
          const context = { modeId: mode.id, level, modeConfig: config };
          const q = await game.createQuestion(context);
          const replay = await game.createQuestion({ ...context, reviewItem: q.learning.data });
          if (q.prompt !== replay.prompt || q.correctValue !== replay.correctValue || !q.explanation) throw new Error('Geography replay mismatch');
          if (q.answers.length !== 4) throw new Error('Geography answer count');
          if (mode.id === 'quick') {
            for (const [recent, mastered] of [[[true], false], [[true, true, true], true]]) {
              const html = await game.renderModeView('map', { stats: { learning: { [id]: { [q.learning.key]: { correct: 3, wrong: 10, recent } } } } });
              const doc = new DOMParser().parseFromString(html, 'text/html');
              if (doc.getElementById(q.learning.data.code).classList.contains('map-mastered') !== mastered) throw new Error('Map mastery threshold mismatch');
            }
          }
          count++;
        }
      }
    }
    return count;
  })()`);
  assert.equal(matrix, 24);
  console.log('PASS: all geography modes and levels regenerate the same map/fact');

  await navigate('/multiplication/practice?table=3&level=1');
  await answerMath(false);
  await ready('!document.getElementById("next-question-btn").hidden', 'mistake explanation');
  const before = await stats();
  assert.ok(await evaluate('document.querySelectorAll(".learning-dot").length > 0'));
  await evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }))');
  await sleep(1100);
  assert.deepEqual((await stats()).learning, before.learning, 'no duplicate submission or automatic advancement');
  await click('next-question-btn');
  await answerMath(true);
  await ready('!document.getElementById("next-question-btn").hidden', 'practice pauses after success');
  for (let round = 2; round < 15; round++) { await click('next-question-btn'); await answerMath(true); }
  await click('next-question-btn');
  await ready('document.getElementById("screen-results").classList.contains("active")', 'results');
  assert.equal(await evaluate('document.getElementById("result-correct").textContent'), '14/15');
  assert.ok((await stats()).passport.badges.includes('bounce-back'));
  assert.ok((await stats()).passport.games.includes('multiplication'));
  await navigate('/multiplication/practice?table=3&level=1');
  for (let round = 0; round < 15; round++) {
    await answerMath(true);
    await click('next-question-btn');
  }
  await ready('document.getElementById("screen-results").classList.contains("active")', 'second strong session');
  assert.equal((await stats()).levels.multiplication.level, 2);
  await navigate('/multiplication');
  await ready('document.getElementById("screen-mode-menu").classList.contains("active")', 'recommended level menu');
  assert.equal(await evaluate('document.getElementById("level-select").value'), '2');
  assert.ok(await evaluate('document.getElementById("level-description").textContent.includes("10")'));
  console.log('PASS: teaching visuals, manual Next, keyboard lock, scoring, mastery, and improvement rewards');

  await navigate('/addition/quick?level=1');
  await answerMath(false);
  await ready('!document.getElementById("next-question-btn").hidden', 'quick mistake pauses');
  const missed = Object.keys((await stats()).learning.addition)[0];
  await navigate('/addition/review?level=1');
  await answerMath(true);
  await click('next-question-btn');
  await ready('document.getElementById("screen-results").classList.contains("active")', 'review results');
  assert.equal((await stats()).learning.addition[missed].correct, 1);
  assert.equal((await stats()).highScores.addition, undefined, 'review does not save a high score');
  await click('btn-review');
  await answerMath(true);
  await click('next-question-btn');
  await ready('document.getElementById("screen-results").classList.contains("active")', 'second review');
  await click('btn-review');
  await answerMath(true);
  await click('next-question-btn');
  await ready('document.getElementById("screen-results").classList.contains("active")', 'third review');
  assert.equal((await stats()).learning.addition[missed].needsReview, false);
  assert.equal(await evaluate('document.getElementById("btn-review").hidden'), true);
  console.log('PASS: persisted review across reloads, replay, and three-success retirement');

  await navigate('/addition/practice?table=1&level=1');
  await answerMath(false);
  await click('next-question-btn');
  await answerMath(true);
  await click('next-question-btn');
  await answerMath(true);
  await click('next-question-btn');
  await ready('document.getElementById("numpad-display")?.textContent === "?"', 'spaced review question');
  assert.equal(await evaluate(String.raw`document.querySelector("#prompt .equation").textContent.replace(/\s/g, "")`), '1+2=?');
  await click('game-back-btn');
  await navigate('/subtraction/quick?level=1');
  await answerMath(true);
  await click('game-back-btn');
  await sleep(1100);
  assert.equal(await evaluate('document.getElementById("screen-mode-menu").classList.contains("active")'), true);
  console.log('PASS: spaced review and cancelled delayed advancement');

  await navigate('/clock/quick?level=1');
  await ready('document.querySelectorAll("#answers .answer-btn").length === 2', 'starter choices');
  await navigate('/clock/quick?level=2');
  await ready('document.querySelectorAll("#answers .answer-btn").length === 3', 'growing choices');
  await navigate('/clock/quick?level=3');
  await ready('document.querySelectorAll("#answers .answer-btn").length === 4', 'explorer choices');
  assert.equal(await evaluate('location.hash.includes("level=3")'), true);
  await navigate('/clock/challenge?level=3');
  await ready('document.getElementById("timer-value").textContent === "60"', 'challenge timer');
  await evaluate('document.querySelector("#answers .answer-btn").click()');
  await sleep(1100);
  assert.equal(await evaluate('document.getElementById("next-question-btn").hidden'), true);
  assert.ok(Number(await evaluate('document.getElementById("timer-value").textContent')) < 60);
  await click('game-back-btn');
  const timer = await evaluate('document.getElementById("timer-value").textContent');
  await sleep(1100);
  assert.equal(await evaluate('document.getElementById("timer-value").textContent'), timer);
  console.log('PASS: level answer counts, deep links, and uninterrupted/cancellable challenges');

  await navigate('/flashword/sight?level=1');
  await ready('document.querySelector(".flash-word") && document.querySelector("#answers .answer-btn").disabled', 'flash exposure');
  await click('game-back-btn');
  await navigate('/reading/quick?level=1');
  await evaluate(`(async () => {
    const { game } = await import('./games/reading.js');
    const question = game.createQuestion({ level: 1, reviewItem: { word: document.querySelector('.reading-word').textContent } });
    Array.from(document.querySelectorAll('#answers .answer-btn')).find(button => button.dataset.value !== question.correctValue).click();
  })()`);
  await sleep(1300);
  const locked = await evaluate('document.querySelectorAll("#answers .answer-btn:disabled").length');
  assert.ok(locked > 0, 'old Flash Word timer cannot unlock a later game');
  await click('game-back-btn');
  await navigate('/passport');
  assert.equal(await evaluate('document.querySelectorAll(".passport-stamp").length'), 18);
  await click('passport-back-btn');
  assert.equal(await evaluate('document.getElementById("continue-btn").hidden'), false);
  await click('continue-btn');
  await ready('document.getElementById("game-title").textContent.includes("Word Reading")', 'continue shortcut');
  for (const id of ['clock', 'reading']) {
    await navigate('/' + id + '/quick?level=1');
    for (let round = 0; round < 10; round++) {
      await ready('document.querySelector("#answers .answer-btn") && !document.querySelector("#answers .answer-btn").disabled', 'untimed question');
      await evaluate(`(async () => {
        let correct;
        if (${JSON.stringify(id)} === 'clock') {
          const degrees = Number(document.querySelector('.clock-hand.hour').style.transform.match(/[0-9.]+/)[0]);
          const minutes = Number(document.querySelector('.clock-hand.minute').style.transform.match(/[0-9.]+/)[0]) / 6;
          correct = String(Math.floor(degrees / 30) || 12) + ':' + String(minutes).padStart(2, '0');
        } else {
          const { game } = await import('./games/reading.js');
          correct = game.createQuestion({ level: 1, reviewItem: { word: document.querySelector('.reading-word').textContent } }).correctValue;
        }
        Array.from(document.querySelectorAll('#answers .answer-btn')).find(button => button.dataset.value !== correct).click();
      })()`);
      await ready('!document.getElementById("next-question-btn").hidden', 'explanation Next');
      await ready('new DOMMatrix(getComputedStyle(document.querySelector(".screen.active")).transform).isIdentity', 'screen transition completion');
      const bounds = await evaluate('(() => { const button = document.getElementById("next-question-btn"); button.scrollIntoView({ block: "nearest", behavior: "instant" }); const box = button.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: innerHeight }; })()');
      assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.height, `Next remains reachable on mobile: ${JSON.stringify(bounds)}`);
      await click('next-question-btn');
    }
    await ready('document.getElementById("screen-results").classList.contains("active")', 'subject exploration results');
  }
  assert.ok((await stats()).passport.badges.includes('curious-explorer'));
  await click('btn-go-home');
  await click('mascot-btn');
  assert.equal(await evaluate('document.querySelectorAll("#animal-options .animal-btn").length'), 6);
  await evaluate('Array.from(document.querySelectorAll("#animal-options .animal-btn")).find(button => button.textContent === "🦄").click()');
  assert.equal((await stats()).mascot, '🦄');
  await navigate('/');
  assert.equal(await evaluate('document.documentElement.dataset.animal'), '🦄');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
  await click('all-games-btn');
  assert.ok(await evaluate('document.querySelector(".home-content").scrollWidth <= innerWidth'));
  await navigate('/passport');
  assert.ok(await evaluate('document.querySelector(".passport-body").getBoundingClientRect().right <= innerWidth'));
  console.log('PASS: flash cleanup, passport, and continue shortcut');

  await navigate('/');
  await ready('!!navigator.serviceWorker.controller', 'service-worker control');
  const cached = await evaluate('(async () => { const cache = await caches.open("kids-hub-v64"); return (await cache.keys()).map(r => new URL(r.url).pathname); })()');
  assert.ok(cached.includes('/learning.js'));
  await command('Network.enable');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await navigate('/division/quick?level=1');
  await answerMath(false);
  assert.ok(await evaluate('!document.getElementById("answer-explanation").hidden'));
  await navigate('/europe/quick?level=1');
  await ready('!!document.querySelector(".us-map-highlight")', 'offline map');
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  console.log('PASS: offline reloads, learning module, and SVG geography assets; no browser exceptions');
  console.log('All browser regressions passed.');
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    await command('Browser.close').catch((error) => console.error('Browser close:', error.message));
    socket.close();
  }
  if (browser.exitCode === null) browser.kill();
  await new Promise((done) => server.close(done));
  await sleep(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}