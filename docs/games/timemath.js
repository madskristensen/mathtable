import { MODE_IDS, randomInt, randomItem, shuffle, pad2 } from './_shared.js';

const SHIFT_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90];
const ELAPSED_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

const OPERATION_OPTIONS = [
  { value: 'add', label: 'Adding time' },
  { value: 'subtract', label: 'Subtracting time' },
  { value: 'elapsed', label: 'Elapsed time' },
];

/** Convert total minutes-since-midnight (0–1439) to "H:MM AM/PM" */
function minutesToTimeString(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${pad2(mins)} ${period}`;
}

/** Generate a random start time aligned to 5-minute intervals, avoiding midnight edges */
function randomStartMinutes() {
  // Range: 6:00 AM (360) to 9:55 PM (1315), steps of 5 min
  const steps = Math.floor((1315 - 360) / 5) + 1;
  return 360 + randomInt(0, steps - 1) * 5;
}

function buildTimeAnswers(correctMinutes, correctStr) {
  const offsets = shuffle([-15, -10, -5, 5, 10, 15, -20, 20, -30, 30, -60, 60]);
  const options = new Set([correctStr]);

  for (const offset of offsets) {
    if (options.size >= 4) break;
    const candidate = minutesToTimeString(correctMinutes + offset);
    if (candidate !== correctStr) options.add(candidate);
  }

  // Fallback: use ±25/±35 if needed
  let extra = 25;
  while (options.size < 4) {
    const candidate = minutesToTimeString(correctMinutes + extra);
    if (candidate !== correctStr) options.add(candidate);
    extra += 10;
  }

  return shuffle([...options]).map((value) => ({
    value,
    label: `<span class="answer-main">${value}</span>`,
  }));
}

function buildElapsedAnswers(correctMinutes) {
  const correct = String(correctMinutes);
  const offsets = shuffle([-15, -10, -5, 5, 10, 15, -20, 20, 30, -30]);
  const options = new Set([correct]);

  for (const offset of offsets) {
    if (options.size >= 4) break;
    const candidate = String(correctMinutes + offset);
    if (Number(candidate) > 0 && candidate !== correct) options.add(candidate);
  }

  let extra = 25;
  while (options.size < 4) {
    const candidate = String(correctMinutes + extra);
    options.add(candidate);
    extra += 5;
  }

  return shuffle([...options]).map((value) => ({
    value,
    label: `<span class="answer-main">${value} min</span>`,
  }));
}

function formatDuration(duration) {
  if (duration === 60) return '1 hour';
  if (duration === 90) return '1 hour 30 min';
  return `${duration} min`;
}

function createShiftQuestion(direction, session) {
  const isAdd = direction === 'add';
  const startMin = session.reviewItem?.startMin ?? gradedStart(session.level);
  const duration = session.reviewItem?.duration ?? randomItem(gradedDurations(session.level, SHIFT_DURATIONS));
  const resultMin = isAdd ? startMin + duration : startMin - duration;
  const startStr = minutesToTimeString(startMin);
  const resultStr = minutesToTimeString(resultMin);
  const operator = isAdd ? '+' : '\u2212';
  const title = isAdd ? 'What time is it after?' : 'What time was it before?';

  return {
    prompt: `
      <div class="question-title">${title}</div>
      <div class="equation">${startStr} ${operator} ${formatDuration(duration)} = <span class="equation-blank">?</span></div>
    `,
    answers: buildTimeAnswers(resultMin, resultStr),
    correctValue: resultStr,
    explanation: `<p>${isAdd ? 'Move forward' : 'Move backward'} ${duration} minutes from ${startStr}.</p>
      <p>One hour is 60 minutes. ${duration >= 60 ? `First move ${Math.floor(duration / 60)} hour(s), then ${duration % 60} more minutes.` : 'When you pass an hour mark, keep counting into the next hour.'}</p>
      <p>${timeSteps(startMin, duration, isAdd ? 1 : -1)}</p><p>The time is <strong>${resultStr}</strong>.</p>`,
    learning: { key: `${direction}:${startMin % 60}:${duration}`, label: `${startStr} ${isAdd ? '+' : '-'} ${duration} min`, data: { operation: direction, startMin, duration } },
  };
}

function createElapsedQuestion(session) {
  const startMin = session.reviewItem?.startMin ?? gradedStart(session.level);
  const duration = session.reviewItem?.duration ?? randomItem(gradedDurations(session.level, ELAPSED_DURATIONS));
  const endMin = startMin + duration;
  const startStr = minutesToTimeString(startMin);
  const endStr = minutesToTimeString(endMin);

  return {
    prompt: `
      <div class="question-title">How many minutes between these times?</div>
      <div class="equation">${startStr} <span class="equation-arrow">→</span> ${endStr} = <span class="equation-blank">?</span> min</div>
    `,
    answers: buildElapsedAnswers(duration),
    correctValue: String(duration),
    explanation: `<p>Count forward from ${startStr} to ${endStr}. Each full hour is 60 minutes.</p>
      <p>${timeSteps(startMin, duration, 1)}</p><p>Altogether, <strong>${duration} minutes</strong> have passed.</p>`,
    learning: { key: `elapsed:${startMin % 60}:${duration}`, label: `${startStr} to ${endStr}`, data: { operation: 'elapsed', startMin, duration } },
  };
}

function createQuestionForOperation(operation, session) {
  if (operation === 'subtract') return createShiftQuestion('subtract', session);
  if (operation === 'elapsed') return createElapsedQuestion(session);
  return createShiftQuestion('add', session);
}

function gradedStart(level) {
  const start = randomStartMinutes();
  const step = level === 1 ? 60 : level === 2 ? 30 : 5;
  return Math.floor(start / step) * step;
}

function gradedDurations(level, fullPool) {
  return level === 1 ? [15, 30, 60] : level === 2 ? [15, 30, 45, 60] : fullPool;
}

function timeSteps(start, duration, direction) {
  const steps = [minutesToTimeString(start)];
  let remaining = duration;
  let current = start;
  while (remaining > 0) {
    const step = Math.min(remaining, 30);
    current += step * direction;
    steps.push(`${direction === 1 ? '+' : '-'}${step} min = ${minutesToTimeString(current)}`);
    remaining -= step;
  }
  return steps.join(' → ');
}

function pickRandomOperation() {
  return randomItem(['add', 'subtract', 'elapsed']);
}

export const game = {
  id: 'timemath',
  title: 'Time Math',
  icon: '⏱️',
  description: 'Add and subtract time. What is 6:45 AM + 20 minutes?',
  levels: ['Start on whole hours; add or subtract 15, 30, or 60 minutes', 'Start on half hours; work with quarter hours', 'Five-minute starts and longer durations'],
  defaultMode: MODE_IDS.QUICK,
  modes: [
    {
      id: MODE_IDS.QUICK,
      title: 'Quick Game',
      icon: '⚡',
      description: '10 mixed time problems with score and streak.',
      kind: 'play',
    },
    {
      id: MODE_IDS.PRACTICE,
      title: 'Practice',
      icon: '✏️',
      description: 'Pick an operation and drill it.',
      kind: 'play',
      selection: {
        key: 'operation',
        label: 'Pick an operation',
        options: OPERATION_OPTIONS,
      },
    },
    {
      id: MODE_IDS.CHALLENGE,
      title: 'Challenge',
      icon: '🏆',
      description: 'Score as much as possible in 60 seconds.',
      kind: 'play',
    },
  ],
  initSession(modeId, modeConfig, baseSession) {
    if (modeId === MODE_IDS.PRACTICE) {
      return {
        maxRounds: 15,
        operation: modeConfig.operation || 'add',
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
    const isPractice = session && session.modeId === MODE_IDS.PRACTICE;
    const operation = session.reviewItem?.operation || (isPractice ? (session.operation || 'add') : pickRandomOperation());
    return createQuestionForOperation(operation, session);
  },
};
