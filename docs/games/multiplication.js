import { createArithmeticGame, randomInt } from './_shared.js';

export const game = createArithmeticGame({
  id: 'multiplication',
  title: 'Multiplication',
  icon: '✖️',
  description: 'Solve multiplication facts quickly.',
  symbol: '×',
  practice: {
    label: 'Pick a table',
    options: Array.from({ length: 12 }, (_, i) => i + 1),
    defaultValue: 2,
  },
  pickPair: ({ isPractice, table }) => ({
    a: isPractice ? table : randomInt(1, 12),
    b: randomInt(1, 12),
  }),
  compute: (a, b) => a * b,
  practiceDescription: 'Pick one table and drill it.',
  mapTitle: 'Multiplication Map',
  mapDescription: 'See mastery across all 144 facts.',
  map: {
    symbol: '×',
    mapKeySep: 'x',
    dim: 12,
    totalFacts: 144,
    cellTitle: (a, b) => `${a}×${b} = ${a * b}`,
  },
});
