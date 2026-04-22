function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const MODE_IDS = {
  QUICK: 'quick',
  PRACTICE: 'practice',
  CHALLENGE: 'challenge',
  MAP: 'map',
};

function getFactAccuracy(stats, dividend, divisor) {
  const key = `${dividend}÷${divisor}`;
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

  // Rows = divisor (1–12), cols = quotient (1–12), dividend = divisor * quotient
  const header = ['<div class="map-header">÷</div>'];
  for (let quotient = 1; quotient <= 12; quotient++) {
    header.push(`<div class="map-header">${quotient}</div>`);
  }

  const rows = [];
  for (let divisor = 1; divisor <= 12; divisor++) {
    rows.push(`<div class="map-header">${divisor}</div>`);

    for (let quotient = 1; quotient <= 12; quotient++) {
      const dividend = divisor * quotient;
      const acc = getFactAccuracy(stats, dividend, divisor);
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

      rows.push(`<div class="map-cell ${cls}" title="${dividend}÷${divisor} = ${quotient}">${label}</div>`);
    }
  }

  const completion = Math.round((masteredCount / 144) * 100);

  return `
    <div class="mode-view-copy">Practice different modes to fill your map.</div>
    <div class="multiplication-map-grid">${header.join('')}${rows.join('')}</div>
    <div class="multiplication-map-summary">✓ ${masteredCount} mastered · ${goodCount} good · ${learningCount} learning · ${newCount} new — ${completion}% complete</div>
  `;
}

export const game = {
  id: 'division',
  title: 'Division',
  icon: '➗',
  description: 'Solve division facts quickly.',
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
      description: 'Pick one divisor and drill it.',
      kind: 'play',
      selection: {
        key: 'table',
        label: 'Pick a divisor',
        options: Array.from({ length: 12 }, (_, index) => index + 1),
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
      title: 'Division Map',
      icon: '🗺️',
      description: 'See mastery across all 144 facts.',
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
    const divisor = isPractice ? Number(session.table || 2) : randomInt(1, 12);
    const quotient = randomInt(1, 12);
    const dividend = divisor * quotient;

    return {
      prompt: `
        <div class="question-title">What is this?</div>
        <div class="equation">${dividend} ÷ ${divisor} = <span id="numpad-display" class="numpad-inline-display">?</span></div>
      `,
      useNumpad: true,
      correctValue: quotient,
      meta: {
        fact: { dividend, divisor },
      },
    };
  },
  renderModeView(modeId, context) {
    if (modeId !== MODE_IDS.MAP) return '<p class="mode-view-empty">Mode not available.</p>';
    return renderProgressMap(context.stats || {});
  },
};
