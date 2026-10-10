import test from 'node:test';
import assert from 'node:assert/strict';
import { recordLearning, reviewSkills, masterySummary, isMastered, recommendedLevel,
  completeLearningSession, escapeHtml } from '../docs/learning.js';

const fresh = () => ({ learning: {}, levels: {}, passport: { games: [], categories: [], badges: [], improved: false } });
const question = (key = '3x4') => ({ learning: { key, label: '3 times 4', data: { a: 3, b: 4 } } });
const session = (overrides = {}) => ({ gameId: 'multiplication', modeId: 'quick', level: 1, total: 10, correct: 8, timedSeconds: 0, ...overrides });

test('mastery needs repeated success, not a single lucky answer', () => {
  const stats = fresh();
  recordLearning(stats, 'multiplication', question(), 'quick', true);
  assert.equal(masterySummary(stats, 'multiplication').mastered, 0);
  recordLearning(stats, 'multiplication', question(), 'quick', true);
  assert.equal(masterySummary(stats, 'multiplication').mastered, 0);
  recordLearning(stats, 'multiplication', question(), 'quick', true);
  assert.equal(masterySummary(stats, 'multiplication').mastered, 1);
  recordLearning(stats, 'multiplication', question(), 'quick', false);
  assert.equal(masterySummary(stats, 'multiplication').mastered, 0);
  recordLearning(stats, 'multiplication', question(), 'quick', true);
  assert.equal(masterySummary(stats, 'multiplication').mastered, 1);
  assert.equal(isMastered({ correct: 20, recent: [false, false, true, true, true] }), false);
});

test('arithmetic maps use recent mastery and clock distractors stay finite and level-appropriate', async () => {
  const { game: math } = await import('../docs/games/multiplication.js');
  const data = { learning: { multiplication: { '3x4': { correct: 3, wrong: 10, recent: [true, true, true] } } } };
  assert.ok(math.renderModeView('map', { stats: data }).includes('map-cell map-mastered" title="3×4 = 12"'));
  const { game: clock } = await import('../docs/games/clock.js');
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    const q = clock.createQuestion({ modeId: 'quick', level: 1 });
    assert.equal(new Set(q.answers.map((answer) => answer.value)).size, 4);
    assert.ok(q.answers.every((answer) => answer.value.endsWith(':00')));
  } finally {
    Math.random = originalRandom;
  }
});

test('missed skills persist as small replay descriptors until three consecutive correct answers', () => {
  const stats = fresh();
  recordLearning(stats, 'multiplication', question(), 'practice', false);
  const restored = JSON.parse(JSON.stringify(stats));
  assert.deepEqual(reviewSkills(restored, 'multiplication')[0][1].data, { a: 3, b: 4 });
  assert.equal(reviewSkills(restored, 'multiplication')[0][1].modeId, 'practice');
  assert.equal(recordLearning(restored, 'multiplication', question(), 'practice', true), true);
  recordLearning(restored, 'multiplication', question(), 'practice', true);
  assert.equal(reviewSkills(restored, 'multiplication').length, 1);
  recordLearning(restored, 'multiplication', question(), 'practice', true);
  assert.equal(reviewSkills(restored, 'multiplication').length, 0);
});

test('skills do not collide across games and review order is oldest first', () => {
  const stats = fresh();
  recordLearning(stats, 'addition', question('3+4'), 'quick', false);
  recordLearning(stats, 'multiplication', question(), 'quick', true);
  assert.equal(reviewSkills(stats, 'multiplication').length, 0);
  recordLearning(stats, 'addition', question('1+2'), 'quick', false);
  stats.learning.addition['3+4'].lastSeen = 1;
  stats.learning.addition['1+2'].lastSeen = 2;
  assert.deepEqual(reviewSkills(stats, 'addition').map(([key]) => key), ['3+4', '1+2']);
});

test('two sessions of at least ten answers and 80% accuracy advance the recommendation', () => {
  const stats = fresh();
  assert.equal(completeLearningSession(stats, session({ total: 9, correct: 9 }), 'math').promoted, false);
  assert.equal(completeLearningSession(stats, session(), 'math').promoted, false);
  assert.equal(recommendedLevel(stats, 'multiplication'), 1);
  assert.equal(completeLearningSession(stats, session(), 'math').promoted, true);
  assert.equal(recommendedLevel(stats, 'multiplication'), 2);
  assert.equal(completeLearningSession(stats, session({ level: 1, correct: 10 }), 'math').promoted, false);
  completeLearningSession(stats, session({ level: 2 }), 'math');
  completeLearningSession(stats, session({ level: 2, correct: 7 }), 'math');
  assert.equal(completeLearningSession(stats, session({ level: 2 }), 'math').promoted, false);
  assert.equal(completeLearningSession(stats, session({ level: 2 }), 'math').promoted, true);
  assert.equal(recommendedLevel(stats, 'multiplication'), 3);
  assert.equal(completeLearningSession(stats, session({ level: 3 }), 'math').promoted, false);
});

test('review and timed sessions cannot inflate level progress; empty sessions earn nothing', () => {
  const stats = fresh();
  completeLearningSession(stats, session({ total: 0 }), 'math');
  assert.deepEqual(stats.passport.badges, []);
  for (let i = 0; i < 3; i++) {
    completeLearningSession(stats, session({ modeId: 'review', correct: 10 }), 'math');
    completeLearningSession(stats, session({ timedSeconds: 60, correct: 10 }), 'math');
  }
  assert.equal(recommendedLevel(stats, 'multiplication'), 1);
});

test('passport rewards exploration and improvement, not perfect scores or attendance', () => {
  const stats = fresh();
  assert.deepEqual(completeLearningSession(stats, session({ correct: 0 }), 'math').rewards, ['first-adventure']);
  assert.deepEqual(completeLearningSession(stats, session({ correct: 0 }), 'math').rewards, []);
  recordLearning(stats, 'multiplication', question(), 'quick', false);
  recordLearning(stats, 'multiplication', question(), 'quick', true);
  assert.deepEqual(completeLearningSession(stats, session({ correct: 1 }), 'math').rewards, ['bounce-back']);
  completeLearningSession(stats, session({ gameId: 'clock', correct: 0 }), 'time');
  assert.deepEqual(completeLearningSession(stats, session({ gameId: 'reading', correct: 0 }), 'reading').rewards, ['curious-explorer']);
  for (let i = 0; i < 5; i++) {
    for (let n = 0; n < 3; n++) recordLearning(stats, 'multiplication', question(String(i)), 'quick', true);
  }
  assert.ok(completeLearningSession(stats, session({ correct: 0 }), 'math').rewards.includes('skill-builder'));
});

test('all non-geography game questions regenerate identical facts from replay data at every level', async () => {
  const ids = ['addition', 'subtraction', 'multiplication', 'division', 'clock', 'timemath', 'reading', 'flashword', 'worldhistory', 'ushistory', 'mythology'];
  for (const id of ids) {
    const { game } = await import(`../docs/games/${id}.js`);
    for (const mode of game.modes.filter((mode) => mode.kind === 'play')) {
      for (const level of [1, 2, 3]) {
        const config = mode.selection ? { [mode.selection.key]: typeof mode.selection.options[0] === 'object' ? mode.selection.options[0].value : mode.selection.options[0] } : {};
        const base = { modeId: mode.id, level, streak: 0, maxRounds: 10, modeConfig: config };
        const context = { ...base, ...game.initSession(mode.id, config, base) };
        const original = await game.createQuestion(context);
        const replay = await game.createQuestion({ ...context, reviewItem: original.learning.data });
        assert.equal(replay.correctValue, original.correctValue, `${id}/${mode.id}/${level}`);
        assert.equal(replay.learning.key, original.learning.key);
        assert.equal(replay.prompt, original.prompt);
        assert.ok(replay.explanation.length > 30);
        if (replay.answers) assert.ok(replay.answers.some((answer) => answer.value === replay.correctValue));
        if (original.meta?.fact) assert.ok(original.meta.fact.key);
      }
    }
  }
});

test('arithmetic ranges and clock intervals match each level', async () => {
  for (const id of ['addition', 'subtraction', 'multiplication', 'division', 'clock']) {
    const { game } = await import(`../docs/games/${id}.js`);
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < 100; i++) {
        const q = game.createQuestion({ modeId: 'quick', level });
        if (id === 'clock') {
          assert.ok((level === 1 ? [0] : level === 2 ? [0, 30] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]).includes(q.learning.data.minute));
        } else {
          const limit = [5, 10, ['addition', 'subtraction'].includes(id) ? 20 : 12][level - 1];
          assert.ok(q.learning.data.b <= limit);
          assert.ok((id === 'division' ? q.correctValue : q.learning.data.a) <= limit);
          assert.ok(Number.isInteger(q.correctValue) && q.correctValue >= 0);
        }
      }
    }
  }
});

test('dynamic progress labels are HTML escaped', () => {
  assert.equal(escapeHtml('<script>"&\'</script>'), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
});