// Flash Word — a word appears for a brief moment, then the player picks
// which word they saw from 4 visually-similar options. Trains whole-word
// recognition (the perceptual skill behind reading fluency).
import { shuffle, randomItem } from './_shared.js';

// ---- Word banks ------------------------------------------------------------

// High-frequency sight words (Dolch / Fry inspired).
const SIGHT_WORDS = [
  'the', 'and', 'was', 'said', 'they', 'what', 'when', 'with', 'have', 'this',
  'that', 'from', 'were', 'your', 'been', 'will', 'them', 'than', 'then',
  'where', 'there', 'their', 'these', 'those', 'about', 'after', 'again',
  'every', 'first', 'found', 'great', 'house', 'horse', 'little', 'people',
  'should', 'would', 'could', 'because', 'before', 'through', 'thought',
  'though', 'which', 'while', 'write', 'water', 'under', 'always', 'never',
  'only', 'other', 'right', 'might', 'night', 'light',
];

// Short CVC / CVCC words for early readers.
const SHORT_WORDS = [
  'cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'pat',
  'can', 'cap', 'car', 'cab', 'cup', 'cut', 'cot', 'cop',
  'dog', 'log', 'fog', 'jog', 'bog', 'hog', 'dot', 'dig',
  'pen', 'hen', 'ten', 'men', 'pet', 'peg', 'bed', 'red',
  'big', 'fig', 'pig', 'wig', 'bin', 'bit', 'bug', 'bus',
  'top', 'hop', 'mop', 'pop', 'sun', 'run', 'fun', 'bun',
  'fish', 'dish', 'wish', 'wash', 'wing', 'king', 'ring', 'sing',
  'jump', 'dump', 'bump', 'lump', 'pump', 'plum',
  'hand', 'sand', 'land', 'band', 'hard', 'herd', 'help', 'hold',
  'tree', 'free', 'feet', 'feel', 'fell', 'tell', 'bell', 'well',
  'milk', 'silk', 'six', 'mix', 'box', 'fox',
];

// Longer words (6–8 letters) for fluent readers.
const LONG_WORDS = [
  'animal', 'school', 'flower', 'window', 'garden', 'people', 'before',
  'because', 'morning', 'evening', 'rainbow', 'dolphin', 'monster', 'planet',
  'rocket', 'dragon', 'jungle', 'pencil', 'pocket', 'sister', 'sunset',
  'winter', 'summer', 'spring', 'autumn', 'village', 'captain', 'machine',
  'number', 'orange', 'outside', 'painter', 'pirate', 'playing', 'reading',
  'science', 'singer', 'station', 'student', 'teacher', 'thunder', 'tunnel',
  'weather', 'whisker', 'kitchen', 'library', 'holiday', 'present', 'journey',
  'mountain', 'elephant', 'bicycle', 'birthday', 'dinosaur', 'football',
  'umbrella', 'sandwich', 'computer', 'magician', 'princess', 'treasure',
];

// Famous confusable groups — the kinds of words slow readers stumble on.
// Distractors for "tricky" mode are drawn ONLY from the same group, so
// the kid has to actually read, not just match shapes.
const TRICKY_GROUPS = [
  ['where', 'were', 'wear', 'here', 'there'],
  ['through', 'thought', 'though', 'tough', 'rough'],
  ['quiet', 'quite', 'quit', 'quote'],
  ['house', 'horse', 'hose', 'whose', 'house'],
  ['form', 'from', 'farm', 'firm', 'fork'],
  ['then', 'than', 'that', 'this', 'them'],
  ['lose', 'loose', 'close', 'chose', 'choose'],
  ['breath', 'breathe', 'bread', 'break', 'breach'],
  ['weather', 'whether', 'wether', 'feather', 'wither'],
  ['allowed', 'aloud', 'allow', 'around', 'along'],
  ['saw', 'was', 'say', 'way', 'sat'],
  ['won', 'one', 'own', 'now', 'own'],
  ['walk', 'wake', 'walk', 'talk', 'work', 'word'],
  ['cloud', 'could', 'would', 'should', 'clout'],
  ['dairy', 'diary', 'daily', 'dirty'],
].map((g) => [...new Set(g)]).filter((g) => g.length >= 4);

function bankForMode(modeId) {
  if (modeId === 'short')  return SHORT_WORDS;
  if (modeId === 'long')   return LONG_WORDS;
  if (modeId === 'tricky') return null; // handled separately
  return SIGHT_WORDS;
}

// ---- Distractor selection --------------------------------------------------

function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost));
    }
    prev = curr;
  }
  return prev[n];
}

// Pick visually-similar distractors: same length first, prefer same first
// letter, then prefer the smallest edit distance (most confusable).
function pickDistractors(target, bank, count = 3) {
  const ranked = bank
    .filter((w) => w !== target && w.length === target.length)
    .map((w) => ({ w, dist: editDistance(w, target), sameFirst: w[0] === target[0] }))
    .sort((a, b) => {
      if (a.sameFirst !== b.sameFirst) return a.sameFirst ? -1 : 1;
      return a.dist - b.dist;
    });

  // Take the top-N most confusable, then sample randomly so the same
  // distractors don't appear every round.
  const top = ranked.slice(0, Math.max(count * 4, 12)).map((c) => c.w);

  // Fall back to any remaining word if we don't have enough same-length matches.
  let pool = top;
  if (pool.length < count) {
    const extras = bank.filter((w) => w !== target && !pool.includes(w));
    pool = [...pool, ...extras];
  }
  return shuffle(pool).slice(0, count);
}

function pickFromGroup(target, group, count = 3) {
  const pool = group.filter((w) => w !== target);
  return shuffle(pool).slice(0, count);
}

// ---- Exposure timing -------------------------------------------------------

function exposureForStreak(streak) {
  if (streak >= 10) return 120;
  if (streak >= 7)  return 200;
  if (streak >= 5)  return 300;
  if (streak >= 3)  return 400;
  if (streak >= 1)  return 600;
  return 800;
}

// ---- Flash mechanism -------------------------------------------------------
//
// The framework calls `createQuestion` and then synchronously renders the
// returned prompt + answer buttons. We schedule the hide on the next animation
// frame so the DOM is in place when the timer fires.

let pendingHideId = null;

function cancelPendingHide() {
  if (pendingHideId !== null) {
    clearTimeout(pendingHideId);
    pendingHideId = null;
  }
}

function scheduleFlash(exposureMs) {
  cancelPendingHide();
  requestAnimationFrame(() => {
    const el = document.querySelector('.flash-word');
    const buttons = document.querySelectorAll('#answers .answer-btn');

    // Disable answers until the word disappears so the kid can't peek-and-click.
    buttons.forEach((btn) => { btn.disabled = true; });

    pendingHideId = setTimeout(() => {
      pendingHideId = null;
      const word = document.querySelector('.flash-word');
      if (word) {
        word.textContent = '•••';
        word.classList.add('flash-word--hidden');
      }
      document.querySelectorAll('#answers .answer-btn').forEach((btn) => {
        btn.disabled = false;
      });
    }, exposureMs);
  });
}

// ---- Game module -----------------------------------------------------------

export const game = {
  id: 'flashword',
  title: 'Flash Word',
  icon: '⚡',
  description: 'A word flashes for a moment — pick which one you saw!',
  defaultMode: 'sight',

  modes: [
    {
      id: 'sight',
      title: 'Sight Words',
      icon: '👀',
      description: 'Common words every reader should know by sight.',
      kind: 'play',
    },
    {
      id: 'short',
      title: 'Short Words',
      icon: '🔤',
      description: 'Three- and four-letter words. A gentle warm-up.',
      kind: 'play',
    },
    {
      id: 'long',
      title: 'Long Words',
      icon: '📏',
      description: 'Six-to-eight-letter words for fluent readers.',
      kind: 'play',
    },
    {
      id: 'tricky',
      title: 'Tricky Pairs',
      icon: '🎯',
      description: 'Easy-to-confuse words. Look closely!',
      kind: 'play',
    },
  ],

  initSession() {
    return { maxRounds: 10 };
  },

  createQuestion(session) {
    const exposureMs = exposureForStreak(session?.streak || 0);

    let target;
    let distractors;
    if (session?.modeId === 'tricky') {
      const group = randomItem(TRICKY_GROUPS);
      target = randomItem(group);
      distractors = pickFromGroup(target, group, 3);
    } else {
      const bank = bankForMode(session?.modeId);
      target = randomItem(bank);
      distractors = pickDistractors(target, bank, 3);
    }

    const answers = shuffle([target, ...distractors]).map((w) => ({
      value: w,
      label: `<span class="flash-answer">${w}</span>`,
    }));

    scheduleFlash(exposureMs);

    return {
      prompt: `
        <div class="flash-prompt">
          <div class="flash-word">${target}</div>
          <div class="flash-hint">What word did you see?</div>
        </div>`,
      answers,
      correctValue: target,
    };
  },
};
