// Shared helpers and factories used by individual game modules.
import { escapeHtml, isMastered } from '../learning.js';

export const MODE_IDS = {
  QUICK: 'quick',
  PRACTICE: 'practice',
  CHALLENGE: 'challenge',
  CAPITALS: 'capitals',
  MAP: 'map',
};

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomItem(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

export function shuffle(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// ---- Arithmetic game factory ------------------------------------------------
//
// Removes the heavy duplication between addition / subtraction / multiplication
// / division. Each game supplies a small `config` describing:
//
//   symbol            visible operator (e.g. '×', '−')
//   description       game-card description
//   pickPair(session) -> { a, b } based on session/practice config
//   compute(a, b)     -> correct numeric answer
//   factMeta(a, b)    -> object stored in question.meta.fact (preserves
//                        existing per-game shape)
//   map               { symbol, mapKeySep, dim, totalFacts, isValidPair?,
//                        cellTitle?, gridStyle? }
//   practice          { label, options, defaultValue }
//   mapTitle          card title for the map mode
//
// The factory then exposes the standard `game` object that the hub expects.

function getFactAccuracy(stats, key, gameId) {
  const skill = stats.learning?.[gameId]?.[key];
  const fact = skill || stats.problems?.[key];
  if (!fact) return -1;
  if (skill && isMastered(skill)) return 1;
  const total = (fact.correct || 0) + (fact.wrong || 0);
  if (total === 0) return -1;
  return Math.min((fact.correct || 0) / total, skill ? 0.89 : 1);
}

function classifyAccuracy(acc, counters) {
  if (acc < 0) {
    counters.newCount += 1;
    return { cls: 'map-new', label: '' };
  }
  if (acc < 0.6) {
    counters.learningCount += 1;
    return { cls: 'map-learning', label: String(Math.round(acc * 100)) };
  }
  if (acc < 0.9) {
    counters.goodCount += 1;
    return { cls: 'map-good', label: String(Math.round(acc * 100)) };
  }
  counters.masteredCount += 1;
  return { cls: 'map-mastered', label: '✓' };
}

function renderArithmeticMap(stats, mapConfig, gameId) {
  const {
    symbol,
    mapKeySep = symbol,
    dim,
    totalFacts,
    isValidPair = () => true,
    cellTitle,
    mapKey = (a, b) => `${a}${mapKeySep}${b}`,
    gridStyle = '',
  } = mapConfig;

  const counters = { masteredCount: 0, learningCount: 0, goodCount: 0, newCount: 0 };
  const header = [`<div class="map-header">${symbol}</div>`];
  for (let b = 1; b <= dim; b++) header.push(`<div class="map-header">${b}</div>`);

  const rows = [];
  for (let a = 1; a <= dim; a++) {
    rows.push(`<div class="map-header">${a}</div>`);
    for (let b = 1; b <= dim; b++) {
      if (!isValidPair(a, b)) {
        rows.push('<div class="map-cell map-na"></div>');
        continue;
      }
      const acc = getFactAccuracy(stats, mapKey(a, b), gameId);
      const { cls, label } = classifyAccuracy(acc, counters);
      const title = cellTitle ? cellTitle(a, b) : `${a}${symbol}${b}`;
      rows.push(`<div class="map-cell ${cls}" title="${title}">${label}</div>`);
    }
  }

  const completion = Math.round((counters.masteredCount / totalFacts) * 100);
  return `
    <div class="mode-view-copy">Practice different modes to fill your map.</div>
    <div class="multiplication-map-grid"${gridStyle}>${header.join('')}${rows.join('')}</div>
    <div class="multiplication-map-summary">✓ ${counters.masteredCount} mastered · ${counters.goodCount} good · ${counters.learningCount} learning · ${counters.newCount} new — ${completion}% complete</div>
  `;
}

export function createArithmeticGame(config) {
  const {
    id,
    title,
    icon,
    description,
    symbol,
    practice,
    pickPair,
    compute,
    factMeta = (a, b) => ({ a, b }),
    map,
    mapTitle,
    mapDescription,
    practiceDescription,
  } = config;

  return {
    id,
    title,
    icon,
    description,
    levels: ['Numbers up to 5 (your chosen practice number is kept)', 'Numbers up to 10', `Numbers up to ${map.dim}`],
    defaultMode: MODE_IDS.QUICK,
    modes: [
      {
        id: MODE_IDS.QUICK,
        title: 'Quick Game',
        icon: '⚡',
        description: '10 random facts with score and streak.',
        kind: 'play',
      },
      {
        id: MODE_IDS.PRACTICE,
        title: 'Practice',
        icon: '✏️',
        description: practiceDescription,
        kind: 'play',
        selection: {
          key: 'table',
          label: practice.label,
          options: practice.options,
        },
      },
      {
        id: MODE_IDS.CHALLENGE,
        title: 'Challenge',
        icon: '🏆',
        description: 'Score as much as possible in 60 seconds.',
        kind: 'play',
      },
      {
        id: MODE_IDS.MAP,
        title: mapTitle,
        icon: '🗺️',
        description: mapDescription,
        kind: 'view',
      },
    ],
    initSession(modeId, modeConfig, baseSession) {
      if (modeId === MODE_IDS.PRACTICE) {
        return {
          maxRounds: 15,
          table: modeConfig.table || practice.defaultValue,
        };
      }
      if (modeId === MODE_IDS.CHALLENGE) {
        return { maxRounds: null, timedSeconds: 60 };
      }
      return { maxRounds: baseSession.maxRounds };
    },
    createQuestion(session) {
      const isPractice = session?.modeId === MODE_IDS.PRACTICE;
      const limit = [5, 10, map.dim][(session?.level || 1) - 1];
      const { a, b } = session.reviewItem || pickPair({ isPractice, table: Number(session?.table) || practice.defaultValue, limit });
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1 || a > 144 || b > 20) {
        throw new Error('This arithmetic fact is not valid.');
      }
      const correct = compute(a, b);
      const key = `${a}${id === 'multiplication' ? 'x' : id === 'subtraction' ? '-' : symbol}${b}`;
      const dots = (count) => '<span class="learning-dot" aria-hidden="true"></span>'.repeat(count);
      let explanation;
      if (id === 'addition') {
        explanation = `<p>Start with ${a}, then count ${b} more. ${a} + ${b} = ${correct}.</p>
          <div class="dot-groups"><div aria-label="${a} dots">${dots(a)}</div><b>+</b><div aria-label="${b} dots">${dots(b)}</div></div>`;
      } else if (id === 'subtraction') {
        explanation = `<p>Start with ${a}. Take away ${b}. ${correct} remain.</p>
          <div class="dot-groups"><div aria-label="${correct} remaining dots">${dots(correct)}</div><div class="removed-dots" aria-label="${b} dots taken away">${dots(b)}</div></div>`;
      } else {
        const groups = id === 'division' ? b : a;
        const perGroup = id === 'division' ? correct : b;
        explanation = `<p>${id === 'division' ? `Share ${a} equally among ${b} groups. Each group gets ${correct}.` : `${a} groups of ${b} make ${correct}.`}</p>
          <div class="dot-groups">${Array.from({ length: groups }, () => `<div aria-label="${perGroup} dots">${dots(perGroup)}</div>`).join('')}</div>`;
      }
      return {
        prompt: `
        <div class="question-title">What is this?</div>
        <div class="equation">${a} ${symbol} ${b} = <span id="numpad-display" class="numpad-inline-display">?</span></div>
      `,
        useNumpad: true,
        correctValue: correct,
        explanation,
        learning: { key, label: `${a} ${symbol} ${b} = ${correct}`, data: { a, b } },
        meta: { fact: { ...factMeta(a, b), key } },
      };
    },
    renderModeView(modeId, context) {
      if (modeId !== MODE_IDS.MAP) return '<p class="mode-view-empty">Mode not available.</p>';
      return renderArithmeticMap(context.stats || {}, map, id);
    },
  };
}

export function historyLearning(question, context) {
  return {
    explanation: `<p>${escapeHtml(question.q)}</p><p><strong>${escapeHtml(question.a)}</strong></p>
      <p>${escapeHtml(question.explanation || context)}</p>
      <p>Say the question and answer together, then try remembering the answer without looking.</p>`,
    learning: { key: question.q, label: question.q, data: { q: question.q } },
  };
}
