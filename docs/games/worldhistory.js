// World History — kid-friendly multiple-choice trivia spanning the
// ancient world through the modern era. Distractors are drawn from the
// same era's answer pool so wrong choices stay plausible.
import { shuffle } from './_shared.js';

// Each question: { q, a, choices? }
// If `choices` is omitted, three distractors are picked from other answers
// in the same era pool.

const ANCIENT = [
  { q: 'Which ancient civilization built the Great Pyramids?', a: 'Egyptians' },
  { q: 'Which river was the heart of ancient Egypt?', a: 'The Nile' },
  { q: 'Who were the famous warriors of ancient Sparta?', a: 'Spartans' },
  { q: 'Which ancient city held the first Olympic Games?', a: 'Olympia' },
  { q: 'What kind of writing did the ancient Egyptians use?', a: 'Hieroglyphs',
    choices: ['Hieroglyphs', 'Emoji', 'Cursive', 'Braille'] },
  { q: 'Who was the boy king of ancient Egypt?', a: 'Tutankhamun',
    choices: ['Tutankhamun', 'Cleopatra', 'Ramses', 'Caesar'] },
  { q: 'Which empire was ruled by Julius Caesar?', a: 'Roman Empire' },
  { q: 'What language did the ancient Romans speak?', a: 'Latin',
    choices: ['Latin', 'Greek', 'English', 'Arabic'] },
  { q: 'Who built the Colosseum?', a: 'Romans' },
  { q: 'Which wall was built to keep out invaders from the north of China?', a: 'The Great Wall of China',
    choices: ['The Great Wall of China', 'Hadrian\u2019s Wall', 'The Berlin Wall', 'The Wall of Troy'] },
  { q: 'Who taught about kindness and wisdom in ancient China?', a: 'Confucius',
    choices: ['Confucius', 'Aristotle', 'Plato', 'Socrates'] },
  { q: 'Which ancient Greek thinker taught Alexander the Great?', a: 'Aristotle',
    choices: ['Aristotle', 'Pythagoras', 'Homer', 'Archimedes'] },
  { q: 'Who sailed a long journey home in the story of the Odyssey?', a: 'Odysseus',
    choices: ['Odysseus', 'Hercules', 'Achilles', 'Jason'] },
  { q: 'Which civilization invented the wheel and writing in Mesopotamia?', a: 'Sumerians',
    choices: ['Sumerians', 'Vikings', 'Mongols', 'Aztecs'] },
];

const MEDIEVAL = [
  { q: 'What did knights wear into battle?', a: 'Armor',
    choices: ['Armor', 'Tuxedos', 'Pajamas', 'Raincoats'] },
  { q: 'Who led the Mongol Empire across Asia?', a: 'Genghis Khan',
    choices: ['Genghis Khan', 'King Arthur', 'Charlemagne', 'Marco Polo'] },
  { q: 'Which seafaring warriors came from Scandinavia?', a: 'Vikings',
    choices: ['Vikings', 'Samurai', 'Pirates', 'Romans'] },
  { q: 'Who was the legendary king with the Knights of the Round Table?', a: 'King Arthur',
    choices: ['King Arthur', 'King Tut', 'King Henry', 'King Louis'] },
  { q: 'What were tall stone homes for nobles called?', a: 'Castles',
    choices: ['Castles', 'Cabins', 'Tents', 'Igloos'] },
  { q: 'Which Italian explorer traveled to China and met Kublai Khan?', a: 'Marco Polo',
    choices: ['Marco Polo', 'Christopher Columbus', 'Vasco da Gama', 'Leif Erikson'] },
  { q: 'What were Japanese warrior nobles called?', a: 'Samurai',
    choices: ['Samurai', 'Vikings', 'Knights', 'Gladiators'] },
  { q: 'Which sickness spread across medieval Europe in the 1300s?', a: 'The Black Death',
    choices: ['The Black Death', 'The Common Cold', 'Chicken Pox', 'The Flu'] },
  { q: 'Who tried to free France and was guided by visions?', a: 'Joan of Arc',
    choices: ['Joan of Arc', 'Cleopatra', 'Queen Victoria', 'Marie Antoinette'] },
  { q: 'Which empire stretched across the Mediterranean in the early Middle Ages?', a: 'Byzantine Empire',
    choices: ['Byzantine Empire', 'British Empire', 'Aztec Empire', 'Mongol Empire'] },
  { q: 'What was a peasant farmer who worked a noble\u2019s land called?', a: 'Serf',
    choices: ['Serf', 'Squire', 'Knight', 'Bishop'] },
];

const EXPLORATION = [
  { q: 'Who sailed across the Atlantic in 1492?', a: 'Christopher Columbus',
    choices: ['Christopher Columbus', 'Marco Polo', 'James Cook', 'Magellan'] },
  { q: 'Whose crew first sailed all the way around the world?', a: 'Magellan',
    choices: ['Magellan', 'Columbus', 'Drake', 'Cabot'] },
  { q: 'Which empire ruled most of South America in the 1400s?', a: 'Inca Empire',
    choices: ['Inca Empire', 'Roman Empire', 'Mongol Empire', 'Ottoman Empire'] },
  { q: 'Which empire built the city of Tenochtitlan in Mexico?', a: 'Aztecs',
    choices: ['Aztecs', 'Mayans', 'Incas', 'Olmecs'] },
  { q: 'Which Italian artist painted the Mona Lisa?', a: 'Leonardo da Vinci',
    choices: ['Leonardo da Vinci', 'Michelangelo', 'Picasso', 'Van Gogh'] },
  { q: 'Which artist painted the ceiling of the Sistine Chapel?', a: 'Michelangelo',
    choices: ['Michelangelo', 'Raphael', 'Donatello', 'Monet'] },
  { q: 'Which English playwright wrote Romeo and Juliet?', a: 'William Shakespeare',
    choices: ['William Shakespeare', 'Charles Dickens', 'Mark Twain', 'Homer'] },
  { q: 'Which scientist said the Earth goes around the Sun?', a: 'Copernicus',
    choices: ['Copernicus', 'Newton', 'Einstein', 'Darwin'] },
  { q: 'What rebirth of art and learning began in Italy in the 1400s?', a: 'The Renaissance',
    choices: ['The Renaissance', 'The Reformation', 'The Enlightenment', 'The Revolution'] },
];

const MODERN = [
  { q: 'Which two countries fought in World War II as Allies and Axis?', a: 'Many countries on both sides',
    choices: ['Many countries on both sides', 'Just France and Spain', 'Only the US and UK', 'Only Germany and Italy'] },
  { q: 'Who led India\u2019s peaceful fight for independence?', a: 'Mahatma Gandhi',
    choices: ['Mahatma Gandhi', 'Nelson Mandela', 'Winston Churchill', 'Napoleon'] },
  { q: 'Who became the first president of a free South Africa?', a: 'Nelson Mandela',
    choices: ['Nelson Mandela', 'Mahatma Gandhi', 'Barack Obama', 'Kofi Annan'] },
  { q: 'Which French emperor was defeated at Waterloo?', a: 'Napoleon',
    choices: ['Napoleon', 'Louis XIV', 'Charlemagne', 'De Gaulle'] },
  { q: 'Which queen ruled Britain for most of the 1800s?', a: 'Queen Victoria',
    choices: ['Queen Victoria', 'Queen Elizabeth I', 'Queen Mary', 'Queen Anne'] },
  { q: 'Which wall divided a German city until 1989?', a: 'The Berlin Wall',
    choices: ['The Berlin Wall', 'The Great Wall', 'Hadrian\u2019s Wall', 'The Iron Wall'] },
  { q: 'Who was the first person to step on the Moon?', a: 'Neil Armstrong',
    choices: ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'] },
  { q: 'Who was the first person to travel to outer space?', a: 'Yuri Gagarin',
    choices: ['Yuri Gagarin', 'Neil Armstrong', 'Sally Ride', 'Alan Shepard'] },
  { q: 'Which scientist came up with the theory of relativity?', a: 'Albert Einstein',
    choices: ['Albert Einstein', 'Isaac Newton', 'Galileo', 'Stephen Hawking'] },
  { q: 'Which big change brought factories and steam engines to the world?', a: 'The Industrial Revolution',
    choices: ['The Industrial Revolution', 'The French Revolution', 'The Renaissance', 'The Cold War'] },
  { q: 'Which scientist showed how living things change over time?', a: 'Charles Darwin',
    choices: ['Charles Darwin', 'Isaac Newton', 'Marie Curie', 'Louis Pasteur'] },
  { q: 'Which scientist discovered radioactivity and won two Nobel Prizes?', a: 'Marie Curie',
    choices: ['Marie Curie', 'Rosalind Franklin', 'Ada Lovelace', 'Florence Nightingale'] },
];

const POOLS = {
  ancient: ANCIENT,
  medieval: MEDIEVAL,
  exploration: EXPLORATION,
  modern: MODERN,
};

function poolForMode(modeId) {
  if (modeId && POOLS[modeId]) return POOLS[modeId];
  // 'all' or unknown — combine everything.
  return [...ANCIENT, ...MEDIEVAL, ...EXPLORATION, ...MODERN];
}

function pickQuestion(session, pool) {
  if (!pool.length) throw new Error('Question pool is empty.');
  if (!Array.isArray(session._questionOrder)) {
    session._questionOrder = shuffle(pool.map((_, index) => index));
  }
  const index = session._questionOrder.pop();
  if (index === undefined) throw new Error('Question order exhausted unexpectedly.');
  return pool[index];
}

function buildAnswers(question, pool) {
  if (Array.isArray(question.choices) && question.choices.length >= 2) {
    return shuffle(question.choices).map((c) => ({ value: c, label: `<span class="history-answer">${c}</span>` }));
  }
  const distractors = shuffle(pool.filter((p) => p.a !== question.a)).slice(0, 3).map((p) => p.a);
  return shuffle([question.a, ...distractors]).map((c) => ({
    value: c,
    label: `<span class="history-answer">${c}</span>`,
  }));
}

export const game = {
  id: 'worldhistory',
  title: 'World History',
  icon: '🌐',
  description: 'Travel through time and meet the world!',
  defaultMode: 'all',

  modes: [
    { id: 'all',         title: 'All Eras',           icon: '🌐', description: 'A mix from every era of world history.', kind: 'play' },
    { id: 'ancient',     title: 'Ancient World',      icon: '🏺', description: 'Egypt, Greece, Rome and more.',          kind: 'play' },
    { id: 'medieval',    title: 'Middle Ages',        icon: '🏰', description: 'Knights, Vikings, Samurai and Khans.',   kind: 'play' },
    { id: 'exploration', title: 'Renaissance & Explorers', icon: '⛵', description: 'New worlds, new ideas, great art.', kind: 'play' },
    { id: 'modern',      title: 'Modern Times',       icon: '🚀', description: 'Industry, world wars, the space age.',   kind: 'play' },
  ],

  initSession(modeId) {
    const poolSize = poolForMode(modeId).length;
    return {
      maxRounds: Math.min(10, poolSize),
      _questionOrder: [],
    };
  },

  createQuestion(session) {
    const pool = poolForMode(session?.modeId);
    const question = pickQuestion(session, pool);
    return {
      prompt: `
        <div class="history-prompt">
          <div class="history-question">${question.q}</div>
        </div>`,
      answers: buildAnswers(question, pool),
      correctValue: question.a,
    };
  },
};
