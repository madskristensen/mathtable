// US History — kid-friendly multiple-choice trivia covering the
// founding of the United States through modern times. Distractors are
// drawn from the same era's answer pool so wrong choices stay plausible.
import { shuffle } from './_shared.js';

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
  { q: 'How many original colonies declared independence from Britain?', a: '13',
    choices: ['13', '50', '7', '20'] },
  { q: 'Where did George Washington and his troops spend a freezing winter during the Revolution?', a: 'Valley Forge',
    choices: ['Valley Forge', 'Philadelphia', 'Boston', 'New York'] },
  { q: 'Which Founding Father helped write the Declaration AND later became the third president?', a: 'Thomas Jefferson',
    choices: ['Thomas Jefferson', 'John Adams', 'Benjamin Franklin', 'James Madison'] },
  { q: 'What was the famous act where colonists dumped tea into Boston Harbor to protest?', a: 'The Boston Tea Party',
    choices: ['The Boston Tea Party', 'The Stamp Act', 'The Tea Revolt', 'The Harbor Protest'] },
  { q: 'Which Founding Father said "Give me liberty, or give me death!"?', a: 'Patrick Henry',
    choices: ['Patrick Henry', 'Benjamin Franklin', 'Samuel Adams', 'Thomas Paine'] },
  { q: 'Where did the British surrender to end the American Revolution?', a: 'Yorktown',
    choices: ['Yorktown', 'Philadelphia', 'Boston', 'Lexington'] },
  { q: 'What was the last battle of the American Revolution?', a: 'The Battle of Yorktown',
    choices: ['The Battle of Yorktown', 'The Battle of Bunker Hill', 'The Battle of Saratoga', 'The Battle of Trenton'] },
  { q: 'What city was the first capital of the United States?', a: 'New York City',
    choices: ['New York City', 'Philadelphia', 'Washington, D.C.', 'Boston'] },
  { q: 'Which famous pamphlet by Thomas Paine encouraged colonists to seek independence?', a: 'Common Sense',
    choices: ['Common Sense', 'The Federalist', 'Poor Richard', 'The Rights of Man'] },
  { q: 'What did Benjamin Franklin help start that brings books to everyone?', a: 'The public library',
    choices: ['The public library', 'The post office', 'The newspaper', 'The university'] },
  { q: 'Who was the second President of the United States?', a: 'John Adams',
    choices: ['John Adams', 'Thomas Jefferson', 'James Madison', 'Alexander Hamilton'] },
  { q: 'Which famous woman asked her husband to "remember the ladies" during the founding?', a: 'Abigail Adams',
    choices: ['Abigail Adams', 'Martha Washington', 'Dolley Madison', 'Betsy Ross'] },
  { q: 'Who is said to have sewn the first American flag?', a: 'Betsy Ross',
    choices: ['Betsy Ross', 'Martha Washington', 'Abigail Adams', 'Dolley Madison'] },
  { q: 'What river did George Washington famously cross on Christmas night 1776?', a: 'The Delaware River',
    choices: ['The Delaware River', 'The Potomac River', 'The Hudson River', 'The Mississippi River'] },
  { q: 'Which French general helped the Americans win the Revolution?', a: 'Lafayette',
    choices: ['Lafayette', 'Napoleon', 'Rochambeau', 'De Gaulle'] },
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
  { q: 'Which US president made the Louisiana Purchase from France?', a: 'Thomas Jefferson',
    choices: ['Thomas Jefferson', 'George Washington', 'James Monroe', 'John Adams'] },
  { q: 'What was the name of the canal that connected the Great Lakes to the Atlantic Ocean?', a: 'The Erie Canal',
    choices: ['The Erie Canal', 'The Panama Canal', 'The Suez Canal', 'The Hudson Canal'] },
  { q: 'Which famous frontiersman fought at the Alamo in Texas?', a: 'Davy Crockett',
    choices: ['Davy Crockett', 'Daniel Boone', 'Buffalo Bill', 'Kit Carson'] },
  { q: 'What mode of transport connected the east and west coasts by 1869?', a: 'The railroad',
    choices: ['The railroad', 'A highway', 'A canal', 'A stagecoach route'] },
  { q: 'Which state was the 49th to join the US, purchased from Russia?', a: 'Alaska',
    choices: ['Alaska', 'Hawaii', 'Texas', 'California'] },
  { q: 'What famous battle cry was used at the Alamo in Texas?', a: 'Remember the Alamo!',
    choices: ['Remember the Alamo!', 'Don\'t give up the ship!', 'Give me liberty!', 'We the people!'] },
  { q: 'Which river did Lewis and Clark follow west to the Pacific?', a: 'The Missouri River',
    choices: ['The Missouri River', 'The Mississippi River', 'The Colorado River', 'The Ohio River'] },
  { q: 'What did people call the long journey west in covered wagons?', a: 'Wagon trains',
    choices: ['Wagon trains', 'Caravans', 'Convoys', 'Stagecoaches'] },
  { q: 'Which territory became a state after gold was discovered there in 1848?', a: 'California',
    choices: ['California', 'Oregon', 'Nevada', 'Colorado'] },
  { q: 'What did the Pony Express carry across the country at top speed?', a: 'Mail',
    choices: ['Mail', 'Gold', 'Soldiers', 'Food'] },
  { q: 'Who said "Mr. Watson, come here" in the first telephone call?', a: 'Alexander Graham Bell',
    choices: ['Alexander Graham Bell', 'Thomas Edison', 'Samuel Morse', 'Benjamin Franklin'] },
  { q: 'What was the name of the last state to join before the Civil War?', a: 'Kansas',
    choices: ['Kansas', 'Texas', 'Oregon', 'Minnesota'] },
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
  { q: 'Which famous speech by Lincoln talked about "government of the people, by the people"?', a: 'The Gettysburg Address',
    choices: ['The Gettysburg Address', 'The Emancipation Proclamation', 'The Inaugural Address', 'The Farewell Address'] },
  { q: 'What secret network helped enslaved people escape to freedom in the North?', a: 'The Underground Railroad',
    choices: ['The Underground Railroad', 'The Freedom Trail', 'The Liberty Line', 'The Escape Route'] },
  { q: 'Who was a formerly enslaved man who became a powerful speaker against slavery?', a: 'Frederick Douglass',
    choices: ['Frederick Douglass', 'Booker T. Washington', 'W.E.B. Du Bois', 'John Brown'] },
  { q: 'Which city was the capital of the Confederacy?', a: 'Richmond, Virginia',
    choices: ['Richmond, Virginia', 'Atlanta, Georgia', 'Charleston, South Carolina', 'Montgomery, Alabama'] },
  { q: 'What famous song about freedom did soldiers sing during the Civil War?', a: 'Battle Hymn of the Republic',
    choices: ['Battle Hymn of the Republic', 'The Star-Spangled Banner', 'America the Beautiful', 'Yankee Doodle'] },
  { q: 'Which woman was known as "Moses" for leading people to freedom?', a: 'Harriet Tubman',
    choices: ['Harriet Tubman', 'Sojourner Truth', 'Rosa Parks', 'Clara Barton'] },
  { q: 'What kind of ship fought in the famous battle between the Monitor and the Merrimack?', a: 'Ironclad ships',
    choices: ['Ironclad ships', 'Wooden sailboats', 'Submarines', 'Steamboats'] },
  { q: 'Which nurse started the American Red Cross during the Civil War era?', a: 'Clara Barton',
    choices: ['Clara Barton', 'Florence Nightingale', 'Dorothea Dix', 'Mary Todd Lincoln'] },
  { q: 'What did people in the North call soldiers who fought to keep the Union together?', a: 'Union soldiers',
    choices: ['Union soldiers', 'Rebels', 'Minutemen', 'Patriots'] },
  { q: 'Which woman gave a famous speech called "Ain\'t I a Woman?"?', a: 'Sojourner Truth',
    choices: ['Sojourner Truth', 'Harriet Tubman', 'Rosa Parks', 'Harriet Beecher Stowe'] },
  { q: 'Which book about slavery helped start the Civil War debate?', a: 'Uncle Tom\'s Cabin',
    choices: ['Uncle Tom\'s Cabin', 'The Autobiography of Frederick Douglass', 'Common Sense', 'The Jungle'] },
  { q: 'Where did the Civil War officially end when Lee surrendered to Grant?', a: 'Appomattox Court House',
    choices: ['Appomattox Court House', 'Gettysburg', 'Richmond', 'Washington, D.C.'] },
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
  { q: 'What sport did Jackie Robinson integrate when he joined the Brooklyn Dodgers?', a: 'Baseball',
    choices: ['Baseball', 'Basketball', 'Football', 'Soccer'] },
  { q: 'Which brave girl walked into an all-white school in New Orleans in 1960?', a: 'Ruby Bridges',
    choices: ['Ruby Bridges', 'Rosa Parks', 'Harriet Tubman', 'Maya Angelou'] },
  { q: 'What hard economic time in the 1930s left many Americans without jobs?', a: 'The Great Depression',
    choices: ['The Great Depression', 'The Dust Bowl', 'The Recession', 'The Gold Rush'] },
  { q: 'Which amendment gave women the right to vote in 1920?', a: 'The 19th Amendment',
    choices: ['The 19th Amendment', 'The 13th Amendment', 'The 1st Amendment', 'The 21st Amendment'] },
  { q: 'Which president started the national park system to protect nature?', a: 'Theodore Roosevelt',
    choices: ['Theodore Roosevelt', 'Abraham Lincoln', 'Thomas Jefferson', 'Franklin D. Roosevelt'] },
  { q: 'What event on December 7, 1941 brought the US into World War II?', a: 'The attack on Pearl Harbor',
    choices: ['The attack on Pearl Harbor', 'D-Day', 'The sinking of the Titanic', 'The Battle of Midway'] },
  { q: 'Which first lady was known for fighting for human rights around the world?', a: 'Eleanor Roosevelt',
    choices: ['Eleanor Roosevelt', 'Dolley Madison', 'Jackie Kennedy', 'Martha Washington'] },
  { q: 'What did the US build in the 1950s to connect the whole country by road?', a: 'The Interstate Highway System',
    choices: ['The Interstate Highway System', 'The Railroad', 'Route 66', 'The Turnpike'] },
  { q: 'Which American woman was the first to travel to space?', a: 'Sally Ride',
    choices: ['Sally Ride', 'Mae Jemison', 'Amelia Earhart', 'Christa McAuliffe'] },
  { q: 'Who was the Supreme Court Justice known for fighting for equal rights?', a: 'Thurgood Marshall',
    choices: ['Thurgood Marshall', 'John Marshall', 'Earl Warren', 'Ruth Bader Ginsburg'] },
  { q: 'What famous march did Martin Luther King Jr. lead to Washington, D.C. in 1963?', a: 'The March on Washington',
    choices: ['The March on Washington', 'The Freedom March', 'The Selma March', 'The Peace March'] },
  { q: 'Which US war was fought in Southeast Asia in the 1960s and 70s?', a: 'The Vietnam War',
    choices: ['The Vietnam War', 'The Korean War', 'World War II', 'The Gulf War'] },
  { q: 'What did the Civil Rights Act of 1964 make illegal?', a: 'Discrimination based on race',
    choices: ['Discrimination based on race', 'Owning property', 'Voting in elections', 'Traveling between states'] },
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
  { q: 'Which branch of government makes the laws?', a: 'Congress',
    choices: ['Congress', 'The President', 'The Supreme Court', 'The Pentagon'] },
  { q: 'Which body of water did pioneers cross the Great Plains to eventually reach?', a: 'The Pacific Ocean',
    choices: ['The Pacific Ocean', 'The Atlantic Ocean', 'The Gulf of Mexico', 'The Great Lakes'] },
  { q: 'What famous bell in Philadelphia cracked and became a symbol of freedom?', a: 'The Liberty Bell',
    choices: ['The Liberty Bell', 'The Freedom Bell', 'The Independence Bell', 'The Justice Bell'] },
  { q: 'What is the US national anthem called?', a: 'The Star-Spangled Banner',
    choices: ['The Star-Spangled Banner', 'America the Beautiful', 'God Bless America', 'My Country Tis of Thee'] },
  { q: 'Which building does the President of the United States live in?', a: 'The White House',
    choices: ['The White House', 'The Capitol', 'The Pentagon', 'The Supreme Court'] },
  { q: 'What motto is printed on all US coins and paper money?', a: 'In God We Trust',
    choices: ['In God We Trust', 'E Pluribus Unum', 'Liberty and Justice', 'We the People'] },
  { q: 'Which holiday honors US military veterans every November?', a: 'Veterans Day',
    choices: ['Veterans Day', 'Memorial Day', 'Armed Forces Day', 'Independence Day'] },
  { q: 'Where does the US Congress meet to make laws?', a: 'The Capitol Building',
    choices: ['The Capitol Building', 'The White House', 'The Pentagon', 'The Supreme Court'] },
  { q: 'What famous statue in New York Harbor was a gift from France?', a: 'The Statue of Liberty',
    choices: ['The Statue of Liberty', 'The Empire State Building', 'The Brooklyn Bridge', 'Central Park'] },
  { q: 'How many branches of government does the US have?', a: '3',
    choices: ['3', '2', '4', '5'] },
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

function pickQuestion(session, pool) {
  if (!pool.length) throw new Error('Question pool is empty.');
  if (!Array.isArray(session._questionOrder)) {
    session._questionOrder = shuffle(pool.map((_, index) => index));
  }
  const index = session._questionOrder.pop();
  if (index === undefined) {
    throw new Error('Question order exhausted. This should not happen as maxRounds is capped to pool size.');
  }
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

  initSession(modeId) {
    const poolSize = poolForMode(modeId).length;
    return {
      maxRounds: Math.min(10, poolSize),
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
