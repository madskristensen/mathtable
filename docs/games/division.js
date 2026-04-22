import { createArithmeticGame, randomInt } from './_shared.js';

export const game = createArithmeticGame({
  id: 'division',
  title: 'Division',
  icon: '➗',
  description: 'Solve division facts quickly.',
  symbol: '÷',
  practice: {
    label: 'Pick a divisor',
    options: Array.from({ length: 12 }, (_, i) => i + 1),
    defaultValue: 2,
  },
  pickPair: ({ isPractice, table }) => {
    const divisor = isPractice ? table : randomInt(1, 12);
    const quotient = randomInt(1, 12);
    return { a: divisor * quotient, b: divisor };
  },
  compute: (dividend, divisor) => dividend / divisor,
  factMeta: (dividend, divisor) => ({ dividend, divisor }),
  practiceDescription: 'Pick one divisor and drill it.',
  mapTitle: 'Division Map',
  mapDescription: 'See mastery across all 144 facts.',
  map: {
    symbol: '÷',
    dim: 12,
    totalFacts: 144,
    // a = divisor, b = quotient; dividend = a * b.
    mapKey: (a, b) => `${a * b}÷${a}`,
    cellTitle: (a, b) => `${a * b}÷${a} = ${b}`,
  },
});
