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

export const game = {
  id: 'multiplication',
  title: 'Multiplication Table',
  icon: '✖️',
  description: 'Solve multiplication facts quickly.',
  createQuestion() {
    const a = randomInt(1, 12);
    const b = randomInt(1, 12);
    const correct = a * b;

    return {
      prompt: `
        <div class="question-title">What is this?</div>
        <div class="equation">${a} × ${b} = ?</div>
      `,
      answers: buildAnswers(correct),
      correctValue: correct,
    };
  },
};
