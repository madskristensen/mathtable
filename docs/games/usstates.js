import { MODE_IDS, randomInt, shuffle } from './_shared.js';
import { STATES, STATE_CODES, REGIONS, codesByRegion } from './data/us-states.js';
import { isMastered } from '../learning.js';

const SVG_URL = './games/data/us-states.svg?v=1';

// Cache the parsed SVG document so we don't re-fetch every question.
let svgPromise = null;

function loadSvgRoot() {
  if (!svgPromise) {
    svgPromise = fetch(SVG_URL)
      .then((r) => r.text())
      .then((text) => new DOMParser().parseFromString(text, 'image/svg+xml').documentElement);
  }
  return svgPromise;
}

// Kick off the fetch as soon as this module is imported so the first
// question is ready quickly.
loadSvgRoot().catch(() => { svgPromise = null; });

function svgWithHighlight(svgRoot, highlightCode) {
  const clone = svgRoot.cloneNode(true);
  clone.classList.add('us-map-svg');
  clone.removeAttribute('width');
  clone.removeAttribute('height');
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', '0 0 959 593');
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  STATE_CODES.forEach((code) => {
    const path = clone.getElementById(code);
    if (!path) return;
    path.classList.add('us-map-state');
    if (code === highlightCode) path.classList.add('us-map-highlight');
  });
  return clone.outerHTML;
}

function pickAnswerPool(session) {
  const region = session?.modeConfig?.region;
  if (region && REGIONS[region]) return codesByRegion(region);
  if (session?.level === 1) return codesByRegion('northeast');
  if (session?.level === 2) return [...codesByRegion('northeast'), ...codesByRegion('midwest')];
  return STATE_CODES;
}

function pickDistractors(correctCode, pool) {
  const others = pool.filter((c) => c !== correctCode);
  // If the practice region has very few states, top up from the full list.
  const topUp = others.length >= 3
    ? others
    : [...new Set([...others, ...STATE_CODES.filter((c) => c !== correctCode)])];
  return shuffle(topUp).slice(0, 3);
}

function buildAnswers(correctCode, pool, mode) {
  const codes = shuffle([correctCode, ...pickDistractors(correctCode, pool)]);
  if (mode === MODE_IDS.CAPITALS) {
    return codes.map((code) => ({
      value: STATES[code].capital,
      label: `<span class="answer-main">${STATES[code].capital}</span>`,
    }));
  }
  return codes.map((code) => ({
    value: code,
    label: `<span class="answer-main">${STATES[code].name}</span>`,
  }));
}

function renderHeatMap(svgRoot, stats) {
  const clone = svgRoot.cloneNode(true);
  clone.classList.add('us-map-svg', 'us-map-heatmap');
  clone.removeAttribute('width');
  clone.removeAttribute('height');
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', '0 0 959 593');
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const counters = { masteredCount: 0, goodCount: 0, learningCount: 0, newCount: 0 };

  STATE_CODES.forEach((code) => {
    const path = clone.getElementById(code);
    if (!path) return;
    path.classList.add('us-map-state');
    const skill = stats.learning?.usstates?.[`state:${code}`];
    const fact = skill || stats.problems?.[`statex${code}`];
    const total = (fact?.correct || 0) + (fact?.wrong || 0);
    let cls;
    if (total === 0) {
      cls = 'map-new';
      counters.newCount += 1;
    } else {
      const acc = skill && isMastered(skill) ? 1 : Math.min((fact.correct || 0) / total, skill ? 0.89 : 1);
      if (acc < 0.6) { cls = 'map-learning'; counters.learningCount += 1; }
      else if (acc < 0.9) { cls = 'map-good'; counters.goodCount += 1; }
      else if (!skill || isMastered(skill)) { cls = 'map-mastered'; counters.masteredCount += 1; }
      else { cls = 'map-good'; counters.goodCount += 1; }
    }
    path.classList.add(cls);
    path.setAttribute('fill', '');
    path.setAttribute('title', `${STATES[code].name}${total ? ` — ${Math.round((fact.correct / total) * 100)}%` : ''}`);
  });

  const completion = Math.round((counters.masteredCount / STATE_CODES.length) * 100);
  return `
    <div class="mode-view-copy">Play Quick Game, Practice, and Challenge to fill your map.</div>
    <div class="us-map-wrap">${clone.outerHTML}</div>
    <div class="multiplication-map-summary">✓ ${counters.masteredCount} mastered · ${counters.goodCount} good · ${counters.learningCount} learning · ${counters.newCount} new — ${completion}% complete</div>
  `;
}

const REGION_OPTIONS = Object.entries(REGIONS).map(([id, info]) => ({
  value: id,
  label: `${info.icon} ${info.label}`,
}));

export const game = {
  id: 'usstates',
  title: 'Find the State',
  icon: '🗺️',
  description: 'A US state is highlighted — pick its name!',
  levels: ['Northeast (or your chosen practice region)', 'Northeast and Midwest', 'All 50 states'],
  defaultMode: MODE_IDS.QUICK,
  modes: [
    {
      id: MODE_IDS.QUICK,
      title: 'Quick Game',
      icon: '⚡',
      description: '10 random states with score and streak.',
      kind: 'play',
    },
    {
      id: MODE_IDS.PRACTICE,
      title: 'Practice',
      icon: '✏️',
      description: 'Pick one region and drill it.',
      kind: 'play',
      selection: {
        key: 'region',
        label: 'Pick a region',
        options: REGION_OPTIONS,
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
      id: MODE_IDS.CAPITALS,
      title: 'Capitals',
      icon: '🏛️',
      description: 'A state is highlighted — pick its capital!',
      kind: 'play',
    },
    {
      id: MODE_IDS.MAP,
      title: 'States Map',
      icon: '🗺️',
      description: 'See mastery across all 50 states.',
      kind: 'view',
    },
  ],
  initSession(modeId, modeConfig, baseSession) {
    if (modeId === MODE_IDS.PRACTICE) {
      return { maxRounds: 10 };
    }
    if (modeId === MODE_IDS.CHALLENGE) {
      return { maxRounds: null, timedSeconds: 60 };
    }
    if (modeId === MODE_IDS.CAPITALS) {
      return { maxRounds: 10 };
    }
    return { maxRounds: baseSession.maxRounds };
  },
  async createQuestion(session) {
    const svgRoot = await loadSvgRoot();
    const pool = pickAnswerPool(session);
    const correctCode = session.reviewItem?.code || pool[randomInt(0, pool.length - 1)];
    const stateName = STATES[correctCode].name;
    const isCapitals = session?.modeId === MODE_IDS.CAPITALS;

    if (isCapitals) {
      return {
        prompt: `
          <div class="question-title">What is the capital of <strong>${stateName}</strong>?</div>
          <div class="us-map-wrap">${svgWithHighlight(svgRoot, correctCode)}</div>
        `,
        answers: buildAnswers(correctCode, pool, MODE_IDS.CAPITALS),
        answerClass: 'answer-btn--state',
        correctValue: STATES[correctCode].capital,
        explanation: `<p><strong>${STATES[correctCode].capital}</strong> is the capital of ${stateName}.</p>
          <p>${stateName} is in the ${REGIONS[STATES[correctCode].region].label}. A capital is where the state government works.</p>`,
        learning: { key: `capital:${correctCode}`, label: `${stateName}: capital`, data: { code: correctCode } },
        // Stored as key "capx${CODE}" by recordProblemResult.
        meta: { fact: { a: 'cap', b: correctCode } },
      };
    }

    return {
      prompt: `
        <div class="question-title">Which state is highlighted?</div>
        <div class="us-map-wrap">${svgWithHighlight(svgRoot, correctCode)}</div>
      `,
      answers: buildAnswers(correctCode, pool),
      answerClass: 'answer-btn--state',
      correctValue: correctCode,
      explanation: `<p>The highlighted state is <strong>${stateName}</strong>, in the ${REGIONS[STATES[correctCode].region].label}.</p>
        <p>Its capital is ${STATES[correctCode].capital}. Look at its shape and position on the map before trying again.</p>`,
      learning: { key: `state:${correctCode}`, label: stateName, data: { code: correctCode } },
      // Stored as key "statex${CODE}" by recordProblemResult — drives the heat map.
      meta: { fact: { a: 'state', b: correctCode }, stateName },
    };
  },
  async renderModeView(modeId, { stats }) {
    if (modeId !== MODE_IDS.MAP) return '<p class="mode-view-empty">Mode not available.</p>';
    const svgRoot = await loadSvgRoot();
    return renderHeatMap(svgRoot, stats || {});
  },
};
