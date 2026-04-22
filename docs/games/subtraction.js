import { createArithmeticGame, randomInt } from './_shared.js';

export const game = createArithmeticGame({
  id: 'subtraction',
  title: 'Subtraction',
  icon: '➖',
  description: 'Solve subtraction facts quickly.',
  symbol: '−',
  practice: {
    label: 'Pick a number',
    options: Array.from({ length: 19 }, (_, i) => i + 2),
    defaultValue: 2,
  },
  pickPair: ({ isPractice, table }) => {
    const a = isPractice ? table : randomInt(2, 20);
    return { a, b: randomInt(1, a) };
  },
  compute: (a, b) => a - b,
  practiceDescription: 'Pick a starting number and drill it.',
  mapTitle: 'Subtraction Map',
  mapDescription: 'See mastery across all subtraction facts.',
  map: {
    symbol: '−',
    mapKeySep: '-',
    dim: 20,
    totalFacts: 210,
    isValidPair: (a, b) => b <= a,
    cellTitle: (a, b) => `${a}−${b} = ${a - b}`,
    gridStyle: ' style="--map-cols: 21"',
  },
});
