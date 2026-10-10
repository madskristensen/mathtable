import { createArithmeticGame, randomInt } from './_shared.js';

export const game = createArithmeticGame({
  id: 'addition',
  title: 'Addition',
  icon: '➕',
  description: 'Solve addition facts quickly.',
  symbol: '+',
  practice: {
    label: 'Pick a number',
    options: Array.from({ length: 20 }, (_, i) => i + 1),
    defaultValue: 1,
  },
  pickPair: ({ isPractice, table, limit }) => ({
    a: isPractice ? table : randomInt(1, limit),
    b: randomInt(1, limit),
  }),
  compute: (a, b) => a + b,
  practiceDescription: 'Pick one number and drill it.',
  mapTitle: 'Addition Map',
  mapDescription: 'See mastery across all 400 facts.',
  map: {
    symbol: '+',
    mapKeySep: '+',
    dim: 20,
    totalFacts: 400,
    cellTitle: (a, b) => `${a}+${b} = ${a + b}`,
    gridStyle: ' style="--map-cols: 21"',
  },
});
