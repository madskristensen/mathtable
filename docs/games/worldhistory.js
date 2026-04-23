// World History — kid-friendly multiple-choice trivia spanning the
// ancient world through the modern era. Distractors are drawn from the
// same era's answer pool so wrong choices stay plausible.
import { shuffle, randomItem } from './_shared.js';

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
  { q: 'What material did ancient Egyptians write on, made from a river plant?', a: 'Papyrus',
    choices: ['Papyrus', 'Paper', 'Cloth', 'Leather'] },
  { q: 'Which queen was the last pharaoh of ancient Egypt?', a: 'Cleopatra',
    choices: ['Cleopatra', 'Nefertiti', 'Hatshepsut', 'Isis'] },
  { q: 'What did the ancient Greeks compete in every four years at Olympia?', a: 'The Olympic Games',
    choices: ['The Olympic Games', 'The World Cup', 'The Colosseum Games', 'The Marathon'] },
  { q: 'Which ancient empire was known for building roads that connected Europe and Asia?', a: 'Persian Empire',
    choices: ['Persian Empire', 'Greek Empire', 'Egyptian Empire', 'Chinese Empire'] },
  { q: 'What was the forum in ancient Rome used for?', a: 'Public meetings and markets',
    choices: ['Public meetings and markets', 'Gladiator fights', 'Horse races', 'Building pyramids'] },
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
  { q: 'What did medieval monks spend years copying by hand?', a: 'Books',
    choices: ['Books', 'Maps', 'Paintings', 'Coins'] },
  { q: 'What was a young knight-in-training called?', a: 'A squire',
    choices: ['A squire', 'A prince', 'A duke', 'A peasant'] },
  { q: 'Which Viking explorer reached North America around the year 1000?', a: 'Leif Erikson',
    choices: ['Leif Erikson', 'Erik the Red', 'Ragnar', 'Harald'] },
  { q: 'What material did the Chinese invent that changed how battles were fought?', a: 'Gunpowder',
    choices: ['Gunpowder', 'Steel', 'Concrete', 'Dynamite'] },
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
  { q: 'Which country sent Columbus on his famous voyage in 1492?', a: 'Spain',
    choices: ['Spain', 'England', 'France', 'Portugal'] },
  { q: 'What invention by Gutenberg helped spread books all over Europe?', a: 'The printing press',
    choices: ['The printing press', 'The telescope', 'The compass', 'The typewriter'] },
  { q: 'Which civilization built Machu Picchu high in the mountains?', a: 'The Incas',
    choices: ['The Incas', 'The Aztecs', 'The Mayans', 'The Olmecs'] },
  { q: 'What did explorers call the land of North and South America?', a: 'The New World',
    choices: ['The New World', 'The Lost World', 'The Old World', 'The Far East'] },
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
  { q: 'Which famous ship sank after hitting an iceberg in 1912?', a: 'The Titanic',
    choices: ['The Titanic', 'The Mayflower', 'The Lusitania', 'The Bismarck'] },
  { q: 'What was the name of the first satellite launched into space in 1957?', a: 'Sputnik',
    choices: ['Sputnik', 'Apollo', 'Explorer', 'Voyager'] },
  { q: 'Which country hosted the first modern Olympic Games in 1896?', a: 'Greece',
    choices: ['Greece', 'France', 'England', 'United States'] },
  { q: 'What did people call the race between the US and Soviet Union to reach space?', a: 'The Space Race',
    choices: ['The Space Race', 'The Moon Race', 'The Star Wars', 'The Rocket Race'] },
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

  initSession() {
    return { maxRounds: 10 };
  },

  createQuestion(session) {
    const pool = poolForMode(session?.modeId);
    const question = randomItem(pool);
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
