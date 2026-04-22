function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildAnswers(correct) {
  const set = new Set([correct]);
  while (set.size < 4) {
    const delta = randomInt(-12, 12);
    const option = Math.max(0, correct + delta);
    set.add(option);
  }

  return shuffle([...set]).map((value) => ({
    value,
    label: `<span class="answer-main">${value}</span>`,
  }));
}

function getFactAccuracy(stats, a, b) {
  const key = `${a}x${b}`;
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

  const header = ['<div class="map-header">×</div>'];
  for (let b = 1; b <= 12; b++) {
    header.push(`<div class="map-header">${b}</div>`);
  }

  const rows = [];
  for (let a = 1; a <= 12; a++) {
    rows.push(`<div class="map-header">${a}</div>`);

    for (let b = 1; b <= 12; b++) {
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

      rows.push(`<div class="map-cell ${cls}" title="${a}×${b} = ${a * b}">${label}</div>`);
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
  id: 'multiplication',
  title: 'Multiplication Table',
  icon: '✖️',
  description: 'Solve multiplication facts quickly.',
  defaultMode: 'quick',
  modes: [
    {
      id: 'quick',
      title: 'Quick Game',
      icon: '⚡',
      description: '10 random facts with score and streak.',
      kind: 'play',
    },
    {
      id: 'practice',
      title: 'Practice',
      icon: '📚',
      description: 'Pick one table and drill it.',
      kind: 'play',
      selection: {
        key: 'table',
        label: 'Pick a table',
        options: Array.from({ length: 12 }, (_, index) => index + 1),
      },
    },
    {
      id: 'challenge',
      title: 'Challenge',
      icon: '🏆',
      description: 'Score as much as possible in 60 seconds.',
      kind: 'play',
    },
    {
      id: 'map',
      title: 'Multiplication Map',
      icon: '🗺️',
      description: 'See mastery across all 144 facts.',
      kind: 'view',
    },
  ],
  initSession(modeId, modeConfig, baseSession) {
    if (modeId === 'practice') {
      return {
        maxRounds: 15,
        table: modeConfig.table || 2,
      };
    }

    if (modeId === 'challenge') {
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
    const isPractice = session.modeId === 'practice';
    const a = isPractice ? Number(session.table || 2) : randomInt(1, 12);
    const b = randomInt(1, 12);
    const correct = a * b;

    return {
      prompt: `
        <div class="question-title">What is this?</div>
        <div class="equation">${a} × ${b} = ?</div>
      `,
      answers: buildAnswers(correct),
      correctValue: correct,
      meta: {
        fact: { a, b },
      },
    };
  },
  renderModeView(modeId, context) {
    if (modeId !== 'map') return '<p class="mode-view-empty">Mode not available.</p>';
    return renderProgressMap(context.stats || {});
  },
};
