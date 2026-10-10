import { MODE_IDS, randomInt, shuffle, pad2 } from './_shared.js';

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function formatTime(hour12, minute) {
  return `${hour12}:${pad2(minute)}`;
}

function makeClockMarkup(hour12, minute) {
  const hourForRotation = hour12 % 12;
  const minuteDeg = minute * 6;
  const hourDeg = hourForRotation * 30 + minute * 0.5;

  const numbers = Array.from({ length: 12 })
    .map((_, idx) => {
      const num = idx === 0 ? 12 : idx;
      const angleDeg = idx * 30;
      return `<span class="clock-number" style="--num-rotation:${angleDeg}deg">${num}</span>`;
    })
    .join('');

  return `
    <div class="question-title">What time is shown?</div>
    <div class="clock-face-wrap">
      <div class="clock-face">
        ${numbers}
        <span class="clock-hand hour" style="transform: rotate(${hourDeg}deg)"></span>
        <span class="clock-hand minute" style="transform: rotate(${minuteDeg}deg)"></span>
        <span class="clock-center"></span>
      </div>
    </div>
  `;
}

function buildAnswers(hour, minute, minutes) {
  const correct = formatTime(hour, minute);
  const candidates = new Set([
    ...Array.from({ length: 12 }, (_, index) => formatTime(index + 1, minute)),
    ...minutes.map((value) => formatTime(hour, value)),
  ]);
  candidates.delete(correct);
  const options = [correct, ...shuffle([...candidates]).slice(0, 3)];
  return shuffle(options).map((value) => ({ value, label: `<span class="answer-main">${value}</span>` }));
}

export const game = {
  id: 'clock',
  title: 'Tell Time (Analog Clock)',
  icon: '🕒',
  description: 'Read the analog clock and pick the time.',
  levels: ['Whole hours', 'Hours and half hours', 'Five-minute intervals'],
  defaultMode: MODE_IDS.QUICK,
  modes: [
    {
      id: MODE_IDS.QUICK,
      title: 'Quick Game',
      icon: '⚡',
      description: '10 random times with score and streak.',
      kind: 'play',
    },
    {
      id: MODE_IDS.PRACTICE,
      title: 'Practice',
      icon: '✏️',
      description: 'Pick one hour and drill it.',
      kind: 'play',
      selection: {
        key: 'hour',
        label: 'Pick an hour',
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
  ],
  initSession(modeId, modeConfig, baseSession) {
    if (modeId === MODE_IDS.PRACTICE) {
      return {
        maxRounds: 15,
        hour: Number(modeConfig.hour || 1),
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
    const minutes = session.level === 1 ? [0] : session.level === 2 ? [0, 30] : MINUTES;
    const hour = session.reviewItem?.hour ?? (isPractice ? Number(session.hour || 1) : randomInt(1, 12));
    const minute = session.reviewItem?.minute ?? minutes[randomInt(0, minutes.length - 1)];

    return {
      prompt: makeClockMarkup(hour, minute),
      answers: buildAnswers(hour, minute, minutes),
      correctValue: formatTime(hour, minute),
      explanation: `<p>The short hand shows the hour: ${hour}. The long hand shows ${minute} minutes.</p>
        <p>Count by fives around the clock: each number is five minutes. ${minute === 0 ? 'At 12, the minute hand means zero minutes.' : `The long hand points to ${minute / 5}: ${minute / 5} times 5 = ${minute}.`}</p>
        <div class="clock-teaching">${makeClockMarkup(hour, minute)}</div><p>So the time is <strong>${formatTime(hour, minute)}</strong>.</p>`,
      learning: { key: formatTime(hour, minute), label: formatTime(hour, minute), data: { hour, minute } },
    };
  },
};
