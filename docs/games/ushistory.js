// US History — kid-friendly multiple-choice trivia covering the
// founding of the United States through modern times. Distractors are
// drawn from the same era's answer pool so wrong choices stay plausible.
import { shuffle, randomItem } from './_shared.js';

// Each question: { q, a, choices? }
// If `choices` is omitted, three distractors are picked from other answers
// in the same era pool.

const FOUNDING = [
  { q: 'Who was the first President of the United States?', a: 'George Washington',
    choices: ['George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'John Adams'] },
  { q: 'In what year did the United States declare independence?', a: '1776',
    choices: ['1776', '1492', '1812', '1620'] },
  { q: 'Which country did the United States declare independence from?', a: 'Great Britain',
    choices: ['Great Britain', 'France', 'Spain', 'Mexico'] },
  { q: 'Who mostly wrote the Declaration of Independence?', a: 'Thomas Jefferson',
    choices: ['Thomas Jefferson', 'George Washington', 'Benjamin Franklin', 'John Hancock'] },
  { q: 'Whose huge signature is at the top of the Declaration of Independence?', a: 'John Hancock',
    choices: ['John Hancock', 'George Washington', 'Paul Revere', 'Thomas Paine'] },
  { q: 'Who flew a kite in a thunderstorm to study lightning?', a: 'Benjamin Franklin',
    choices: ['Benjamin Franklin', 'Thomas Edison', 'Isaac Newton', 'Albert Einstein'] },
  { q: 'Which Native American helped the Pilgrims plant crops?', a: 'Squanto',
    choices: ['Squanto', 'Sacagawea', 'Pocahontas', 'Sitting Bull'] },
  { q: 'Which ship brought the Pilgrims to America in 1620?', a: 'Mayflower',
    choices: ['Mayflower', 'Santa Maria', 'Titanic', 'Nina'] },
  { q: 'Who rode through the night warning "The British are coming!"?', a: 'Paul Revere',
    choices: ['Paul Revere', 'George Washington', 'Patrick Henry', 'John Adams'] },
  { q: 'What is the supreme law of the United States?', a: 'The Constitution',
    choices: ['The Constitution', 'The Mayflower Compact', 'The Declaration', 'The Bill of Rights'] },
  { q: 'What are the first ten amendments to the Constitution called?', a: 'The Bill of Rights',
    choices: ['The Bill of Rights', 'The Articles', 'The Preamble', 'The Ten Commandments'] },
];

const EXPANSION = [
  { q: 'Who led the expedition to explore the western United States?', a: 'Lewis and Clark',
    choices: ['Lewis and Clark', 'Daniel Boone', 'Davy Crockett', 'John Smith'] },
  { q: 'Which Shoshone woman guided Lewis and Clark?', a: 'Sacagawea',
    choices: ['Sacagawea', 'Pocahontas', 'Squanto', 'Harriet Tubman'] },
  { q: 'Which big land deal in 1803 nearly doubled the size of the US?', a: 'Louisiana Purchase',
    choices: ['Louisiana Purchase', 'Alaska Purchase', 'Gadsden Purchase', 'Texas Annexation'] },
  { q: 'In which California event did people rush west looking for gold?', a: 'Gold Rush of 1849',
    choices: ['Gold Rush of 1849', 'Dust Bowl', 'Klondike Rush', 'Oregon Trail'] },
  { q: 'What trail did pioneers follow west in covered wagons?', a: 'The Oregon Trail',
    choices: ['The Oregon Trail', 'The Silk Road', 'Route 66', 'The Appalachian Trail'] },
  { q: 'Who invented the light bulb and the phonograph?', a: 'Thomas Edison',
    choices: ['Thomas Edison', 'Alexander Graham Bell', 'Henry Ford', 'Nikola Tesla'] },
  { q: 'Who invented the telephone?', a: 'Alexander Graham Bell',
    choices: ['Alexander Graham Bell', 'Thomas Edison', 'Samuel Morse', 'Benjamin Franklin'] },
];

const CIVIL_WAR = [
  { q: 'Who was President during the Civil War?', a: 'Abraham Lincoln',
    choices: ['Abraham Lincoln', 'Ulysses S. Grant', 'Andrew Jackson', 'Theodore Roosevelt'] },
  { q: 'In which years was the American Civil War fought?', a: '1861 to 1865',
    choices: ['1861 to 1865', '1776 to 1783', '1914 to 1918', '1939 to 1945'] },
  { q: 'What sides fought in the Civil War?', a: 'The Union and the Confederacy',
    choices: ['The Union and the Confederacy', 'The Allies and the Axis', 'The Patriots and the Loyalists', 'The North and the West'] },
  { q: 'Who led the Confederate army?', a: 'Robert E. Lee',
    choices: ['Robert E. Lee', 'Ulysses S. Grant', 'George Washington', 'Andrew Jackson'] },
  { q: 'Who led the Union army to victory?', a: 'Ulysses S. Grant',
    choices: ['Ulysses S. Grant', 'Robert E. Lee', 'William Sherman', 'George Custer'] },
  { q: 'What document freed enslaved people in Confederate states?', a: 'Emancipation Proclamation',
    choices: ['Emancipation Proclamation', 'Bill of Rights', 'Declaration of Independence', 'Gettysburg Address'] },
  { q: 'Who escaped slavery and helped many others escape on the Underground Railroad?', a: 'Harriet Tubman',
    choices: ['Harriet Tubman', 'Rosa Parks', 'Sojourner Truth', 'Frederick Douglass'] },
  { q: 'Where did Lincoln give his famous speech of 1863?', a: 'Gettysburg',
    choices: ['Gettysburg', 'Philadelphia', 'Washington, D.C.', 'Boston'] },
];

const MODERN_US = [
  { q: 'Who invented the affordable Model T car?', a: 'Henry Ford',
    choices: ['Henry Ford', 'Thomas Edison', 'Steve Jobs', 'Wright Brothers'] },
  { q: 'Which brothers built and flew the first powered airplane?', a: 'The Wright Brothers',
    choices: ['The Wright Brothers', 'The Mario Brothers', 'The Kennedy Brothers', 'The Marx Brothers'] },
  { q: 'Who refused to give up her bus seat in 1955?', a: 'Rosa Parks',
    choices: ['Rosa Parks', 'Harriet Tubman', 'Eleanor Roosevelt', 'Ruby Bridges'] },
  { q: 'Who gave the famous "I Have a Dream" speech?', a: 'Martin Luther King Jr.',
    choices: ['Martin Luther King Jr.', 'Malcolm X', 'Barack Obama', 'John F. Kennedy'] },
  { q: 'Who was the first American president to be on TV often?', a: 'John F. Kennedy',
    choices: ['John F. Kennedy', 'Franklin D. Roosevelt', 'Ronald Reagan', 'Richard Nixon'] },
  { q: 'Who was the first African American President of the US?', a: 'Barack Obama',
    choices: ['Barack Obama', 'Martin Luther King Jr.', 'Jesse Jackson', 'Colin Powell'] },
  { q: 'Which American astronaut was the first to walk on the Moon?', a: 'Neil Armstrong',
    choices: ['Neil Armstrong', 'Buzz Aldrin', 'John Glenn', 'Alan Shepard'] },
  { q: 'Which US president led the country through most of World War II?', a: 'Franklin D. Roosevelt',
    choices: ['Franklin D. Roosevelt', 'Harry Truman', 'Dwight Eisenhower', 'Woodrow Wilson'] },
  { q: 'Which statue in New York welcomed millions of immigrants?', a: 'Statue of Liberty',
    choices: ['Statue of Liberty', 'Lincoln Memorial', 'Mount Rushmore', 'Washington Monument'] },
  { q: 'Which mountain has four giant US presidents carved into it?', a: 'Mount Rushmore',
    choices: ['Mount Rushmore', 'Mount Everest', 'Mount Olympus', 'Mount St. Helens'] },
];

const SYMBOLS = [
  { q: 'How many stars are on the US flag today?', a: '50',
    choices: ['50', '13', '52', '48'] },
  { q: 'How many stripes are on the US flag?', a: '13',
    choices: ['13', '50', '7', '12'] },
  { q: 'What do the 13 stripes on the flag stand for?', a: 'The 13 original colonies',
    choices: ['The 13 original colonies', 'The 13 presidents', 'The 13 amendments', 'The 13 Founding Fathers'] },
  { q: 'What is the capital of the United States?', a: 'Washington, D.C.',
    choices: ['Washington, D.C.', 'New York City', 'Philadelphia', 'Boston'] },
  { q: 'What is the national bird of the United States?', a: 'Bald Eagle',
    choices: ['Bald Eagle', 'Turkey', 'Hawk', 'Robin'] },
  { q: 'On July 4th, Americans celebrate which holiday?', a: 'Independence Day',
    choices: ['Independence Day', 'Thanksgiving', 'Memorial Day', 'Labor Day'] },
  { q: 'Which document begins "We the People"?', a: 'The Constitution',
    choices: ['The Constitution', 'The Declaration of Independence', 'The Bill of Rights', 'The Gettysburg Address'] },
];

const POOLS = {
  founding: FOUNDING,
  expansion: EXPANSION,
  civilwar: CIVIL_WAR,
  modern: MODERN_US,
  symbols: SYMBOLS,
};

function poolForMode(modeId) {
  if (modeId && POOLS[modeId]) return POOLS[modeId];
  return [...FOUNDING, ...EXPANSION, ...CIVIL_WAR, ...MODERN_US, ...SYMBOLS];
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
  id: 'ushistory',
  title: 'US History',
  icon: '🦅',
  description: 'Discover the story of the United States!',
  defaultMode: 'all',

  modes: [
    { id: 'all',       title: 'All Eras',         icon: '🦅', description: 'A mix from across US history.',           kind: 'play' },
    { id: 'founding',  title: 'Founding Era',     icon: '📜', description: 'Pilgrims, the Revolution, the Constitution.', kind: 'play' },
    { id: 'expansion', title: 'Growth & Inventions', icon: '🚂', description: 'Westward, gold, light bulbs, telephones.',  kind: 'play' },
    { id: 'civilwar',  title: 'Civil War Era',    icon: '⚔️', description: 'Lincoln, the Union, the Confederacy.',     kind: 'play' },
    { id: 'modern',    title: 'Modern America',   icon: '🚀', description: 'Cars, planes, civil rights, the Moon.',     kind: 'play' },
    { id: 'symbols',   title: 'Symbols & Capitals', icon: '🇺🇸', description: 'Flag, eagle, holidays and landmarks.',     kind: 'play' },
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
