// Word-bank entries: { word, emoji, category }
// category: 'animals' | 'food' | 'things'
import { shuffle } from './_shared.js';

const WORDS = [
  // Animals
  { word: 'CAT',      emoji: '🐱', category: 'animals' },
  { word: 'DOG',      emoji: '🐶', category: 'animals' },
  { word: 'COW',      emoji: '🐮', category: 'animals' },
  { word: 'PIG',      emoji: '🐷', category: 'animals' },
  { word: 'DUCK',     emoji: '🐥', category: 'animals' },
  { word: 'FISH',     emoji: '🐟', category: 'animals' },
  { word: 'BIRD',     emoji: '🐦', category: 'animals' },
  { word: 'FROG',     emoji: '🐸', category: 'animals' },
  { word: 'BEAR',     emoji: '🐻', category: 'animals' },
  { word: 'LION',     emoji: '🦁', category: 'animals' },
  { word: 'HORSE',    emoji: '🐴', category: 'animals' },
  { word: 'RABBIT',   emoji: '🐰', category: 'animals' },
  { word: 'MONKEY',   emoji: '🐒', category: 'animals' },
  { word: 'TURTLE',   emoji: '🐢', category: 'animals' },
  { word: 'BEE',      emoji: '🐝', category: 'animals' },

  // Fruits & Food
  { word: 'APPLE',    emoji: '🍎', category: 'food' },
  { word: 'BANANA',   emoji: '🍌', category: 'food' },
  { word: 'ORANGE',   emoji: '🍊', category: 'food' },
  { word: 'GRAPE',    emoji: '🍇', category: 'food' },
  { word: 'CAKE',     emoji: '🎂', category: 'food' },
  { word: 'PIZZA',    emoji: '🍕', category: 'food' },
  { word: 'BREAD',    emoji: '🍞', category: 'food' },
  { word: 'COOKIE',   emoji: '🍪', category: 'food' },
  { word: 'EGG',      emoji: '🥚', category: 'food' },
  { word: 'CORN',     emoji: '🌽', category: 'food' },
  { word: 'CARROT',   emoji: '🥕', category: 'food' },
  { word: 'STRAWBERRY', emoji: '🍓', category: 'food' },
  { word: 'WATERMELON', emoji: '🍉', category: 'food' },
  { word: 'CHERRY',   emoji: '🍒', category: 'food' },
  { word: 'LEMON',    emoji: '🍋', category: 'food' },

  // Things (vehicles, nature, objects)
  { word: 'CAR',      emoji: '🚗', category: 'things' },
  { word: 'BUS',      emoji: '🚌', category: 'things' },
  { word: 'BIKE',     emoji: '🚲', category: 'things' },
  { word: 'BOAT',     emoji: '⛵', category: 'things' },
  { word: 'PLANE',    emoji: '✈️', category: 'things' },
  { word: 'TRAIN',    emoji: '🚂', category: 'things' },
  { word: 'SUN',      emoji: '☀️', category: 'things' },
  { word: 'MOON',     emoji: '🌙', category: 'things' },
  { word: 'STAR',     emoji: '⭐', category: 'things' },
  { word: 'FLOWER',   emoji: '🌸', category: 'things' },
  { word: 'TREE',     emoji: '🌲', category: 'things' },
  { word: 'HOUSE',    emoji: '🏠', category: 'things' },
  { word: 'BALL',     emoji: '⚽', category: 'things' },
  { word: 'BOOK',     emoji: '📚', category: 'things' },
  { word: 'HEART',    emoji: '❤️', category: 'things' },
];

const ALL_EMOJIS = WORDS.map((w) => w.emoji);

function wordsForMode(modeId) {
  if (modeId === 'animals') return WORDS.filter((w) => w.category === 'animals');
  if (modeId === 'food')    return WORDS.filter((w) => w.category === 'food');
  if (modeId === 'things')  return WORDS.filter((w) => w.category === 'things');
  return WORDS; // 'quick' = all
}

// Track which words have been seen this session to avoid immediate repeats
function pickWord(session, pool) {
  const seen = session._seenIndexes || [];
  // Reset once all words have been shown
  const available = pool.length > seen.length
    ? pool.filter((_, i) => !seen.includes(i))
    : pool;

  const poolToUse = available.length > 0 ? available : pool;
  const entry = poolToUse[Math.floor(Math.random() * poolToUse.length)];
  const globalIdx = pool.indexOf(entry);

  session._seenIndexes = seen.length >= pool.length - 1 ? [] : [...seen, globalIdx];
  return entry;
}

function buildAnswers(correct) {
  // Pick 3 distractors from ALL_EMOJIS (excluding correct)
  const distractors = shuffle(ALL_EMOJIS.filter((e) => e !== correct.emoji)).slice(0, 3);
  const choices = shuffle([
    { value: correct.emoji, label: `<span class="reading-emoji">${correct.emoji}</span>`, correct: true },
    ...distractors.map((e) => ({ value: e, label: `<span class="reading-emoji">${e}</span>`, correct: false })),
  ]);
  return choices;
}

export const game = {
  id: 'reading',
  title: 'Word Reading',
  icon: '🔤',
  description: 'Read the word and pick the matching picture!',
  defaultMode: 'quick',

  modes: [
    {
      id: 'quick',
      title: 'All Words',
      icon: '🌈',
      description: 'Animals, food, and things — all mixed together.',
      kind: 'play',
    },
    {
      id: 'animals',
      title: 'Animals',
      icon: '🐾',
      description: 'Animals only.',
      kind: 'play',
    },
    {
      id: 'food',
      title: 'Fruits & Food',
      icon: '🍎',
      description: 'Fruits and yummy food.',
      kind: 'play',
    },
    {
      id: 'things',
      title: 'Things',
      icon: '🚗',
      description: 'Vehicles, nature, and everyday objects.',
      kind: 'play',
    },
  ],

  initSession(modeId) {
    return { maxRounds: 10, _seenIndexes: [] };
  },

  createQuestion(session) {
    const pool = wordsForMode(session.modeId);
    const entry = pickWord(session, pool);
    const answers = buildAnswers(entry);

    return {
      prompt: `
        <div class="reading-prompt">
          <div class="reading-word">${entry.word}</div>
          <div class="reading-hint">Which picture matches the word?</div>
        </div>`,
      answers,
      answerClass: 'answer-btn--emoji',
      correctValue: entry.emoji,
    };
  },
};
