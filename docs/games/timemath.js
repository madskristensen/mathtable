const ADD_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90];
const SUBTRACT_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90];
const ELAPSED_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

const MODE_IDS = {
  QUICK: 'quick',
  PRACTICE: 'practice',
  CHALLENGE: 'challenge',
};

const OPERATION_OPTIONS = [
  { value: 'add', label: 'Adding time' },
  { value: 'subtract', label: 'Subtracting time' },
  { value: 'elapsed', label: 'Elapsed time' },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function shuffle(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

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

function createAddQuestion() {
  const startMin = randomStartMinutes();
  const duration = randomItem(ADD_DURATIONS);
  const resultMin = startMin + duration;
  const startStr = minutesToTimeString(startMin);
  const resultStr = minutesToTimeString(resultMin);
  const durationLabel = duration === 60 ? '1 hour' : duration === 90 ? '1 hour 30 min' : `${duration} min`;

  return {
    prompt: `
      <div class="question-title">What time is it after?</div>
      <div class="equation">${startStr} + ${durationLabel} = <span class="equation-blank">?</span></div>
    `,
    answers: buildTimeAnswers(resultMin, resultStr),
    correctValue: resultStr,
  };
}

function createSubtractQuestion() {
  const startMin = randomStartMinutes();
  const duration = randomItem(SUBTRACT_DURATIONS);
  const resultMin = startMin - duration;
  const startStr = minutesToTimeString(startMin);
  const resultStr = minutesToTimeString(resultMin);
  const durationLabel = duration === 60 ? '1 hour' : duration === 90 ? '1 hour 30 min' : `${duration} min`;

  return {
    prompt: `
      <div class="question-title">What time was it before?</div>
      <div class="equation">${startStr} − ${durationLabel} = <span class="equation-blank">?</span></div>
    `,
    answers: buildTimeAnswers(resultMin, resultStr),
    correctValue: resultStr,
  };
}

function createElapsedQuestion() {
  const startMin = randomStartMinutes();
  const duration = randomItem(ELAPSED_DURATIONS);
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
  };
}

function createQuestionForOperation(operation) {
  if (operation === 'subtract') return createSubtractQuestion();
  if (operation === 'elapsed') return createElapsedQuestion();
  return createAddQuestion();
}

function pickRandomOperation() {
  return randomItem(['add', 'subtract', 'elapsed']);
}

export const game = {
  id: 'timemath',
  title: 'Time Math',
  icon: '⏱️',
  description: 'Add and subtract time. What is 6:45 AM + 20 minutes?',
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
    const operation = isPractice ? (session.operation || 'add') : pickRandomOperation();
    return createQuestionForOperation(operation);
  },
};
