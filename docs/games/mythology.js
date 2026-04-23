// Mythology — kid-friendly multiple-choice trivia about gods, heroes,
// and famous stories from Norse, Greek, Roman, and Egyptian mythology.
// Distractors are drawn from the same pantheon's answer pool so wrong
// choices stay plausible.
import { shuffle, randomItem } from './_shared.js';

// Each question: { q, a, choices? }
// If `choices` is omitted, three distractors are picked from other answers
// in the same pantheon pool.

const NORSE = [
  { q: 'Who is the Norse god of thunder with a mighty hammer?', a: 'Thor' },
  { q: 'What is the name of Thor\u2019s hammer?', a: 'Mjolnir',
    choices: ['Mjolnir', 'Gungnir', 'Excalibur', 'Stormbreaker'] },
  { q: 'Who is the chief of the Norse gods, ruler of Asgard?', a: 'Odin' },
  { q: 'Which trickster god often causes trouble for the Aesir?', a: 'Loki' },
  { q: 'What is the rainbow bridge to Asgard called?', a: 'Bifrost',
    choices: ['Bifrost', 'Yggdrasil', 'Valhalla', 'Midgard'] },
  { q: 'What is the great tree that holds the nine worlds together?', a: 'Yggdrasil',
    choices: ['Yggdrasil', 'Bifrost', 'Mjolnir', 'Sleipnir'] },
  { q: 'Where do brave Norse warriors go after death?', a: 'Valhalla',
    choices: ['Valhalla', 'Asgard', 'Helheim', 'Midgard'] },
  { q: 'Who is the Norse goddess of love and beauty?', a: 'Freya' },
  { q: 'What is the name of Odin\u2019s eight-legged horse?', a: 'Sleipnir',
    choices: ['Sleipnir', 'Pegasus', 'Bucephalus', 'Shadowfax'] },
  { q: 'Which giant wolf is destined to fight Odin at Ragnarok?', a: 'Fenrir',
    choices: ['Fenrir', 'Jormungandr', 'Garm', 'Skoll'] },
  { q: 'What is the giant serpent that circles the world?', a: 'Jormungandr',
    choices: ['Jormungandr', 'Fenrir', 'Nidhogg', 'Hydra'] },
  { q: 'What do the Norse call the world of humans?', a: 'Midgard',
    choices: ['Midgard', 'Asgard', 'Jotunheim', 'Alfheim'] },
  { q: 'Who guards the Bifrost bridge with a great horn?', a: 'Heimdall',
    choices: ['Heimdall', 'Tyr', 'Baldur', 'Freyr'] },
  { q: 'What is the great final battle of the Norse gods called?', a: 'Ragnarok',
    choices: ['Ragnarok', 'Armageddon', 'Twilight', 'Fimbulwinter'] },
];

const GREEK = [
  { q: 'Who is the king of the Greek gods?', a: 'Zeus' },
  { q: 'Who is the Greek god of the sea?', a: 'Poseidon' },
  { q: 'Who is the Greek god of the underworld?', a: 'Hades' },
  { q: 'Which goddess of wisdom was born from Zeus\u2019s head?', a: 'Athena' },
  { q: 'Who is the Greek goddess of love and beauty?', a: 'Aphrodite' },
  { q: 'Which speedy messenger god wears winged sandals?', a: 'Hermes',
    choices: ['Hermes', 'Apollo', 'Ares', 'Dionysus'] },
  { q: 'Who is the Greek god of the sun, music, and poetry?', a: 'Apollo' },
  { q: 'Which goddess of the hunt is Apollo\u2019s twin sister?', a: 'Artemis',
    choices: ['Artemis', 'Athena', 'Hera', 'Demeter'] },
  { q: 'Which Greek hero was famous for his twelve labors?', a: 'Hercules',
    choices: ['Hercules', 'Perseus', 'Achilles', 'Theseus'] },
  { q: 'Which hero defeated the Minotaur in the labyrinth?', a: 'Theseus',
    choices: ['Theseus', 'Hercules', 'Jason', 'Odysseus'] },
  { q: 'Which hero cut off the head of the snake-haired Medusa?', a: 'Perseus',
    choices: ['Perseus', 'Theseus', 'Hercules', 'Achilles'] },
  { q: 'Which famous flying horse was born from Medusa?', a: 'Pegasus',
    choices: ['Pegasus', 'Sleipnir', 'Centaur', 'Chimera'] },
  { q: 'On which mountain do the Greek gods live?', a: 'Mount Olympus',
    choices: ['Mount Olympus', 'Mount Ida', 'Mount Etna', 'Mount Parnassus'] },
  { q: 'What was the name of the giant wooden horse used to enter Troy?', a: 'The Trojan Horse',
    choices: ['The Trojan Horse', 'Pegasus', 'The Wooden Bull', 'The Argo'] },
  { q: 'Who is the queen of the Greek gods and wife of Zeus?', a: 'Hera' },
];

const ROMAN = [
  { q: 'Who is the king of the Roman gods?', a: 'Jupiter' },
  { q: 'Who is the Roman god of war?', a: 'Mars' },
  { q: 'Who is the Roman goddess of love?', a: 'Venus' },
  { q: 'Who is the Roman messenger god?', a: 'Mercury' },
  { q: 'Who is the Roman god of the sea?', a: 'Neptune' },
  { q: 'Who is the Roman goddess of wisdom?', a: 'Minerva',
    choices: ['Minerva', 'Juno', 'Diana', 'Vesta'] },
  { q: 'Who is the Roman goddess of the hunt and the moon?', a: 'Diana',
    choices: ['Diana', 'Minerva', 'Juno', 'Ceres'] },
  { q: 'Who is the queen of the Roman gods?', a: 'Juno' },
  { q: 'Who is the Roman god of the underworld?', a: 'Pluto' },
  { q: 'Who is the Roman god of the sun and music?', a: 'Apollo' },
  { q: 'Who is the Roman god of fire and the forge?', a: 'Vulcan',
    choices: ['Vulcan', 'Mars', 'Mercury', 'Neptune'] },
  { q: 'Who is the Roman goddess of the harvest?', a: 'Ceres',
    choices: ['Ceres', 'Vesta', 'Diana', 'Juno'] },
  { q: 'Who is the Roman god of wine and parties?', a: 'Bacchus',
    choices: ['Bacchus', 'Apollo', 'Mercury', 'Janus'] },
  { q: 'Which two-faced Roman god looks to the past and the future?', a: 'Janus',
    choices: ['Janus', 'Jupiter', 'Saturn', 'Mars'] },
  { q: 'Which twins were said to have founded Rome?', a: 'Romulus and Remus',
    choices: ['Romulus and Remus', 'Castor and Pollux', 'Apollo and Diana', 'Aeneas and Ascanius'] },
];

const EGYPTIAN = [
  { q: 'Who is the Egyptian sun god?', a: 'Ra' },
  { q: 'Who is the Egyptian god of the dead with the head of a jackal?', a: 'Anubis',
    choices: ['Anubis', 'Horus', 'Set', 'Thoth'] },
  { q: 'Which falcon-headed god is the Egyptian sky god?', a: 'Horus',
    choices: ['Horus', 'Ra', 'Anubis', 'Sobek'] },
  { q: 'Who is the Egyptian goddess of magic and motherhood?', a: 'Isis',
    choices: ['Isis', 'Hathor', 'Bastet', 'Nephthys'] },
  { q: 'Who is the Egyptian god of the afterlife and king of the underworld?', a: 'Osiris',
    choices: ['Osiris', 'Anubis', 'Set', 'Ra'] },
  { q: 'Who is the Egyptian god of chaos and storms?', a: 'Set',
    choices: ['Set', 'Anubis', 'Horus', 'Thoth'] },
  { q: 'Which cat goddess protected homes in ancient Egypt?', a: 'Bastet',
    choices: ['Bastet', 'Sekhmet', 'Hathor', 'Isis'] },
  { q: 'Which ibis-headed god is the Egyptian god of writing and wisdom?', a: 'Thoth',
    choices: ['Thoth', 'Horus', 'Anubis', 'Ra'] },
  { q: 'Which crocodile-headed Egyptian god is linked to the Nile?', a: 'Sobek',
    choices: ['Sobek', 'Set', 'Anubis', 'Horus'] },
  { q: 'What were Egyptian kings called?', a: 'Pharaohs',
    choices: ['Pharaohs', 'Emperors', 'Caesars', 'Sultans'] },
  { q: 'What were the giant tombs built for pharaohs called?', a: 'Pyramids',
    choices: ['Pyramids', 'Ziggurats', 'Temples', 'Obelisks'] },
  { q: 'What is the name for an Egyptian preserved body wrapped in linen?', a: 'A mummy',
    choices: ['A mummy', 'A pharaoh', 'A sphinx', 'A scarab'] },
  { q: 'What creature has a lion\u2019s body and a human head, guarding the pyramids?', a: 'The Sphinx',
    choices: ['The Sphinx', 'The Griffin', 'The Phoenix', 'The Minotaur'] },
  { q: 'Which lion-headed Egyptian goddess is fierce in battle?', a: 'Sekhmet',
    choices: ['Sekhmet', 'Bastet', 'Hathor', 'Isis'] },
  { q: 'Which cow-horned Egyptian goddess represents joy and motherhood?', a: 'Hathor',
    choices: ['Hathor', 'Isis', 'Bastet', 'Nephthys'] },
];

const POOLS = {
  norse: NORSE,
  greek: GREEK,
  roman: ROMAN,
  egyptian: EGYPTIAN,
};

function poolForMode(modeId) {
  if (modeId && POOLS[modeId]) return POOLS[modeId];
  // 'all' or unknown — combine everything.
  return [...NORSE, ...GREEK, ...ROMAN, ...EGYPTIAN];
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
  id: 'mythology',
  title: 'Mythology',
  icon: '\u26A1',
  description: 'Meet the gods and heroes of ancient myths!',
  defaultMode: 'all',

  modes: [
    { id: 'all',      title: 'All Pantheons', icon: '\u26A1',          description: 'A mix from every pantheon.',           kind: 'play' },
    { id: 'norse',    title: 'Norse',         icon: '\uD83D\uDD28',    description: 'Thor, Odin, Loki and the Aesir.',      kind: 'play' },
    { id: 'greek',    title: 'Greek',         icon: '\uD83C\uDFDB\uFE0F', description: 'Zeus, Athena, Hercules and Olympus.', kind: 'play' },
    { id: 'roman',    title: 'Roman',         icon: '\uD83D\uDC51',    description: 'Jupiter, Mars, Venus and the gods of Rome.', kind: 'play' },
    { id: 'egyptian', title: 'Egyptian',      icon: '\uD83D\uDC34',    description: 'Ra, Anubis, Isis and the Nile gods.',  kind: 'play' },
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
