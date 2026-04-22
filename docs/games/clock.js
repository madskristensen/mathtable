const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

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

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTime(hour12, minute) {
  return `${hour12}:${pad2(minute)}`;
}

function makeClockMarkup(hour12, minute) {
  const hourForRotation = hour12 % 12;
  const minuteDeg = minute * 6;
  const hourDeg = hourForRotation * 30 + minute * 0.5;

  const ticks = Array.from({ length: 12 })
    .map((_, idx) => `<span class="clock-tick" style="--tick-rotation:${idx * 30}deg"></span>`)
    .join('');

  return `
    <div class="question-title">What time is shown?</div>
    <div class="clock-face-wrap">
      <div class="clock-face">
        ${ticks}
        <span class="clock-hand hour" style="transform: rotate(${hourDeg}deg)"></span>
        <span class="clock-hand minute" style="transform: rotate(${minuteDeg}deg)"></span>
        <span class="clock-center"></span>
      </div>
    </div>
  `;
}

function buildAnswers(hour, minute) {
  const correct = formatTime(hour, minute);
  const options = new Set([correct]);

  while (options.size < 4) {
    const minuteShift = MINUTES[randomInt(0, MINUTES.length - 1)];
    const hourShift = randomInt(1, 12);
    const useMinuteShift = Math.random() > 0.5;

    const fakeMinute = useMinuteShift ? minuteShift : minute;
    const fakeHour = useMinuteShift ? hour : hourShift;
    options.add(formatTime(fakeHour, fakeMinute));
  }

  return shuffle([...options]).map((value) => ({ value, label: `<span class="answer-main">${value}</span>` }));
}

export const game = {
  id: 'clock',
  title: 'Tell Time (Analog Clock)',
  icon: '🕒',
  description: 'Read the analog clock and pick the time.',
  createQuestion() {
    const hour = randomInt(1, 12);
    const minute = MINUTES[randomInt(0, MINUTES.length - 1)];

    return {
      prompt: makeClockMarkup(hour, minute),
      answers: buildAnswers(hour, minute),
      correctValue: formatTime(hour, minute),
    };
  },
};
