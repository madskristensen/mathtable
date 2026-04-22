function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const MODE_IDS = {
  QUICK: 'quick',
  PRACTICE: 'practice',
  CHALLENGE: 'challenge',
  MAP: 'map',
};

function getFactAccuracy(stats, a, b) {
  const key = `${a}-${b}`;
  const fact = stats.problems?.[key];
  if (!fact) return -1;

  const total = (fact.correct || 0) + (fact.wrong || 0);
  if (total === 0) return -1;
  return (fact.correct || 0) / total;
}

function renderProgressMap(stats) {
  let masteredCount = 0;
  let learningCount = 0;
  let goodCount = 0;
  let newCount = 0;

  // For subtraction we show: rows = minuend (2–20), cols = subtrahend (1 to minuend-1)
  // To keep the grid simple, we use a fixed 20x20 grid and only count valid pairs (a >= b).
  const header = ['<div class="map-header">−</div>'];
  for (let b = 1; b <= 20; b++) {
    header.push(`<div class="map-header">${b}</div>`);
  }

  const rows = [];
  for (let a = 1; a <= 20; a++) {
    rows.push(`<div class="map-header">${a}</div>`);

    for (let b = 1; b <= 20; b++) {
      if (b > a) {
        rows.push('<div class="map-cell map-na"></div>');
        continue;
      }

      const acc = getFactAccuracy(stats, a, b);
      let cls = 'map-new';
      let label = '';

      if (acc < 0) {
        newCount += 1;
      } else if (acc < 0.6) {
        cls = 'map-learning';
        label = `${Math.round(acc * 100)}`;
        learningCount += 1;
      } else if (acc < 0.9) {
        cls = 'map-good';
        label = `${Math.round(acc * 100)}`;
        goodCount += 1;
      } else {
        cls = 'map-mastered';
        label = '✓';
        masteredCount += 1;
      }

      rows.push(`<div class="map-cell ${cls}" title="${a}−${b} = ${a - b}">${label}</div>`);
    }
  }

  // Valid pairs: b from 1 to a, for a from 1 to 20 => 20*21/2 = 210 facts
  const total = 210;
  const completion = Math.round((masteredCount / total) * 100);

  return `
    <div class="mode-view-copy">Practice different modes to fill your map.</div>
    <div class="multiplication-map-grid" style="--map-cols: 21">${header.join('')}${rows.join('')}</div>
    <div class="multiplication-map-summary">✓ ${masteredCount} mastered · ${goodCount} good · ${learningCount} learning · ${newCount} new — ${completion}% complete</div>
  `;
}

export const game = {
  id: 'subtraction',
  title: 'Subtraction',
  icon: '➖',
  description: 'Solve subtraction facts quickly.',
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
      description: 'Pick a starting number and drill it.',
      kind: 'play',
      selection: {
        key: 'table',
        label: 'Pick a number',
        options: Array.from({ length: 19 }, (_, index) => index + 2),
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
      title: 'Subtraction Map',
      icon: '🗺️',
      description: 'See mastery across all subtraction facts.',
      kind: 'view',
    },
  ],
  initSession(modeId, modeConfig, baseSession) {
    if (modeId === MODE_IDS.PRACTICE) {
      return {
        maxRounds: 15,
        table: modeConfig.table || 2,
      };
    }

    if (modeId === MODE_IDS.CHALLENGE) {
      return {
        maxRounds: null,
        timedSeconds: 60,
      };
    }

    return {
      maxRounds: baseSession.maxRounds,
    };
  },
  createQuestion(session) {
    const isPractice = session.modeId === MODE_IDS.PRACTICE;
    const a = isPractice ? Number(session.table || 2) : randomInt(2, 20);
    const b = randomInt(1, a);
    const correct = a - b;

    return {
      prompt: `
        <div class="question-title">What is this?</div>
        <div class="equation">${a} − ${b} = <span id="numpad-display" class="numpad-inline-display">?</span></div>
      `,
      useNumpad: true,
      correctValue: correct,
      meta: {
        fact: { a, b },
      },
    };
  },
  renderModeView(modeId, context) {
    if (modeId !== MODE_IDS.MAP) return '<p class="mode-view-empty">Mode not available.</p>';
    return renderProgressMap(context.stats || {});
  },
};
