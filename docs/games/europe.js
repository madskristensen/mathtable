import { MODE_IDS, randomInt, shuffle } from './_shared.js';
import { COUNTRIES, COUNTRY_CODES, REGIONS, codesByRegion } from './data/europe.js';

const SVG_URL = './games/data/europe.svg?v=1';
// Cropped viewBox: keep the frame tight on western/central/southern Europe.
// Russia renders but its eastern reach simply spills outside this viewport,
// so the rest of the continent stays large and the layout doesn't shift.
const VIEWBOX = '40 270 470 470';
const KNOWN = new Set(COUNTRY_CODES);

let svgPromise = null;
function loadSvgRoot() {
  if (!svgPromise) {
    svgPromise = fetch(SVG_URL)
      .then((r) => r.text())
      .then((text) => new DOMParser().parseFromString(text, 'image/svg+xml').documentElement);
  }
  return svgPromise;
}
loadSvgRoot().catch(() => { svgPromise = null; });

function stripInlineStyling(clone) {
  // The source SVG ships an inline <defs><style>.land { fill: #CCCCCC; ... }</style>
  // and every country path has class="land". That inline stylesheet wins over our
  // external CSS, so we drop both before applying our own classes.
  clone.querySelectorAll('defs').forEach((d) => d.remove());
  clone.querySelectorAll('style').forEach((s) => s.remove());
  clone.querySelectorAll('path').forEach((p) => {
    p.removeAttribute('class');
    p.removeAttribute('style');
    // Hide any path we don't have metadata for (Svalbard, Kazakhstan, the
    // Caucasus states, microstate dependencies) so they don't render as black.
    if (!KNOWN.has(p.id)) p.setAttribute('display', 'none');
  });
}

function svgWithHighlight(svgRoot, highlightCode) {
  const clone = svgRoot.cloneNode(true);
  stripInlineStyling(clone);
  clone.classList.add('us-map-svg');
  clone.removeAttribute('width');
  clone.removeAttribute('height');
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', VIEWBOX);
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  COUNTRY_CODES.forEach((code) => {
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
  return COUNTRY_CODES;
}

function pickDistractors(correctCode, pool) {
  const others = pool.filter((c) => c !== correctCode);
  const topUp = others.length >= 3
    ? others
    : [...new Set([...others, ...COUNTRY_CODES.filter((c) => c !== correctCode)])];
  return shuffle(topUp).slice(0, 3);
}

function buildAnswers(correctCode, pool) {
  const codes = shuffle([correctCode, ...pickDistractors(correctCode, pool)]);
  return codes.map((code) => ({
    value: code,
    label: `<span class="answer-main">${COUNTRIES[code].name}</span>`,
  }));
}

function renderHeatMap(svgRoot, stats) {
  const clone = svgRoot.cloneNode(true);
  stripInlineStyling(clone);
  clone.classList.add('us-map-svg', 'us-map-heatmap');
  clone.removeAttribute('width');
  clone.removeAttribute('height');
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', VIEWBOX);
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const counters = { masteredCount: 0, goodCount: 0, learningCount: 0, newCount: 0 };

  COUNTRY_CODES.forEach((code) => {
    const path = clone.getElementById(code);
    if (!path) return;
    path.classList.add('us-map-state');
    const fact = stats.problems?.[`euctryx${code}`];
    const total = (fact?.correct || 0) + (fact?.wrong || 0);
    let cls;
    if (total === 0) {
      cls = 'map-new';
      counters.newCount += 1;
    } else {
      const acc = (fact.correct || 0) / total;
      if (acc < 0.6) { cls = 'map-learning'; counters.learningCount += 1; }
      else if (acc < 0.9) { cls = 'map-good'; counters.goodCount += 1; }
      else { cls = 'map-mastered'; counters.masteredCount += 1; }
    }
    path.classList.add(cls);
    path.setAttribute('fill', '');
    path.setAttribute('title', `${COUNTRIES[code].name}${total ? ` — ${Math.round((fact.correct / total) * 100)}%` : ''}`);
  });

  const completion = Math.round((counters.masteredCount / COUNTRY_CODES.length) * 100);
  return `
    <div class="mode-view-copy">Play Quick Game, Practice, and Challenge to fill your map.</div>
    <div class="us-map-wrap eu-map-wrap">${clone.outerHTML}</div>
    <div class="multiplication-map-summary">✓ ${counters.masteredCount} mastered · ${counters.goodCount} good · ${counters.learningCount} learning · ${counters.newCount} new — ${completion}% complete</div>
  `;
}

const REGION_OPTIONS = Object.entries(REGIONS).map(([id, info]) => ({
  value: id,
  label: `${info.icon} ${info.label}`,
}));

export const game = {
  id: 'europe',
  title: 'Find the Country',
  icon: '🇪🇺',
  description: 'A European country is highlighted — pick its name!',
  defaultMode: MODE_IDS.QUICK,
  modes: [
    {
      id: MODE_IDS.QUICK,
      title: 'Quick Game',
      icon: '⚡',
      description: '10 random countries with score and streak.',
      kind: 'play',
    },
    {
      id: MODE_IDS.PRACTICE,
      title: 'Practice',
      icon: '✏️',
      description: 'Pick one region of Europe and drill it.',
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
      id: MODE_IDS.MAP,
      title: 'Europe Map',
      icon: '🗺️',
      description: 'See mastery across all European countries.',
      kind: 'view',
    },
  ],
  initSession(modeId, modeConfig, baseSession) {
    if (modeId === MODE_IDS.PRACTICE) return { maxRounds: 10 };
    if (modeId === MODE_IDS.CHALLENGE) return { maxRounds: null, timedSeconds: 60 };
    return { maxRounds: baseSession.maxRounds };
  },
  async createQuestion(session) {
    const svgRoot = await loadSvgRoot();
    const pool = pickAnswerPool(session);
    const correctCode = pool[randomInt(0, pool.length - 1)];
    const countryName = COUNTRIES[correctCode].name;

    return {
      prompt: `
        <div class="question-title">Which country is highlighted?</div>
        <div class="us-map-wrap eu-map-wrap">${svgWithHighlight(svgRoot, correctCode)}</div>
      `,
      answers: buildAnswers(correctCode, pool),
      answerClass: 'answer-btn--state',
      correctValue: correctCode,
      // Stored as key "euctryx${CODE}" by recordProblemResult — drives the heat map.
      meta: { fact: { a: 'euctry', b: correctCode }, countryName },
    };
  },
  async renderModeView(modeId, { stats }) {
    if (modeId !== MODE_IDS.MAP) return '<p class="mode-view-empty">Mode not available.</p>';
    const svgRoot = await loadSvgRoot();
    return renderHeatMap(svgRoot, stats || {});
  },
};
